export type TabularSourceFormat = "csv" | "tsv" | "json" | "md";
export type TabularTargetFormat = "csv" | "tsv" | "json" | "md" | "html";
export type TabularValue = string | number | boolean | null;

export interface TabularTable {
	readonly columns: readonly string[];
	readonly rows: readonly (readonly TabularValue[])[];
}

const normalizeCell = (value: unknown): TabularValue => {
	if (
		value === null ||
		typeof value === "string" ||
		typeof value === "number" ||
		typeof value === "boolean"
	) {
		return value;
	}
	if (value === undefined) return null;
	return JSON.stringify(value);
};

const parseJson = (text: string): TabularTable => {
	const parsed: unknown = JSON.parse(text);
	const records = Array.isArray(parsed) ? parsed : [parsed];
	if (records.length === 0) return { columns: [], rows: [] };

	if (records.every((record) => Array.isArray(record))) {
		const width = records.reduce(
			(maximum, record) => Math.max(maximum, (record as unknown[]).length),
			0,
		);
		const columns = Array.from(
			{ length: width },
			(_, index) => `column_${index + 1}`,
		);
		return {
			columns,
			rows: records.map((record) =>
				columns.map((_, index) => normalizeCell((record as unknown[])[index])),
			),
		};
	}

	if (
		!records.every(
			(record) =>
				record !== null && typeof record === "object" && !Array.isArray(record),
		)
	) {
		throw new Error("JSON tabular input must contain objects or row arrays");
	}

	const columns: string[] = [];
	const seen = new Set<string>();
	for (const record of records as Record<string, unknown>[]) {
		for (const key of Object.keys(record)) {
			if (!seen.has(key)) {
				seen.add(key);
				columns.push(key);
			}
		}
	}

	return {
		columns,
		rows: (records as Record<string, unknown>[]).map((record) =>
			columns.map((column) => normalizeCell(record[column])),
		),
	};
};

const decodeMarkdownCell = (value: string): string =>
	value
		.replace(/<br\s*\/?>/gi, "\n")
		.replace(/\\([\\|])/g, "$1")
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&amp;/g, "&");

const splitMarkdownRow = (line: string): string[] => {
	const cells: string[] = [];
	let cell = "";
	let escaped = false;
	for (const character of line.trim()) {
		if (escaped) {
			cell += `\\${character}`;
			escaped = false;
		} else if (character === "\\") {
			escaped = true;
		} else if (character === "|") {
			cells.push(cell.trim());
			cell = "";
		} else {
			cell += character;
		}
	}
	if (escaped) cell += "\\";
	cells.push(cell.trim());
	if (line.trim().startsWith("|")) cells.shift();
	if (line.trim().endsWith("|") && cells.length) cells.pop();
	return cells.map(decodeMarkdownCell);
};

const parseMarkdown = (text: string): TabularTable => {
	const lines = text.replace(/\r\n?/g, "\n").split("\n");
	let headerIndex = -1;
	for (let index = 0; index < lines.length - 1; index += 1) {
		if (!lines[index]?.includes("|") || !lines[index + 1]?.includes("|"))
			continue;
		const header = splitMarkdownRow(lines[index] ?? "");
		const delimiter = splitMarkdownRow(lines[index + 1] ?? "");
		if (
			header.length &&
			delimiter.length === header.length &&
			delimiter.every((cell) => /^:?-{3,}:?$/.test(cell))
		) {
			headerIndex = index;
			break;
		}
	}
	if (headerIndex < 0)
		throw new Error(
			"Markdown input does not contain a valid table header and alignment delimiter",
		);
	const columns = splitMarkdownRow(lines[headerIndex] ?? "");
	const rows: TabularValue[][] = [];
	for (const line of lines.slice(headerIndex + 2)) {
		if (!line.trim()) break;
		const row = splitMarkdownRow(line);
		if (row.length !== columns.length) {
			throw new Error(
				`Markdown table row has ${row.length} cells; expected ${columns.length} columns`,
			);
		}
		rows.push(row);
	}
	return { columns, rows };
};

const parseDelimited = async (
	text: string,
	delimiter: string,
): Promise<TabularTable> => {
	const Papa = (await import("papaparse")).default;
	const result = Papa.parse<Record<string, string>>(text, {
		delimiter,
		header: true,
		skipEmptyLines: "greedy",
		dynamicTyping: false,
	});
	if (result.errors.length > 0) {
		throw new Error(
			result.errors[0]?.message ?? "Delimited table parsing failed",
		);
	}

	const columns = result.meta.fields ?? [];
	return {
		columns,
		rows: result.data.map((record) =>
			columns.map((column) => record[column] ?? ""),
		),
	};
};

export const parseTabular = async (
	text: string,
	format: TabularSourceFormat,
): Promise<TabularTable> => {
	switch (format) {
		case "json":
			return parseJson(text);
		case "md":
			return parseMarkdown(text);
		case "csv":
			return parseDelimited(text, ",");
		case "tsv":
			return parseDelimited(text, "\t");
	}
};

const rowsAsObjects = (
	table: TabularTable,
): readonly Record<string, TabularValue>[] =>
	table.rows.map((row) =>
		Object.fromEntries(
			table.columns.map((column, index) => [column, row[index] ?? null]),
		),
	);

const escapeMarkdown = (value: TabularValue): string =>
	String(value ?? "")
		.replaceAll("\\", "\\\\")
		.replaceAll("|", "\\|")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll("\r\n", "<br>")
		.replaceAll("\n", "<br>")
		.replaceAll("\r", "<br>");

const escapeHtml = (value: TabularValue): string =>
	String(value ?? "")
		.replaceAll("&", "&amp;")
		.replaceAll("<", "&lt;")
		.replaceAll(">", "&gt;")
		.replaceAll('"', "&quot;")
		.replaceAll("'", "&#39;");

const renderMarkdown = (table: TabularTable): string => {
	if (table.columns.length === 0) return "";
	const header = `| ${table.columns.map(escapeMarkdown).join(" | ")} |`;
	const separator = `| ${table.columns.map(() => "---").join(" | ")} |`;
	const rows = table.rows.map(
		(row) => `| ${row.map((cell) => escapeMarkdown(cell)).join(" | ")} |`,
	);
	return [header, separator, ...rows].join("\n");
};

const renderHtml = (table: TabularTable): string => {
	const header = table.columns
		.map((column) => `<th scope="col">${escapeHtml(column)}</th>`)
		.join("");
	const rows = table.rows
		.map(
			(row) =>
				`<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
		)
		.join("");
	return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Converted table</title><style>body{font:16px/1.5 system-ui,sans-serif;margin:2rem;color:#172033}main{max-width:100%;overflow-x:auto}table{border-collapse:collapse;width:100%}th,td{border:1px solid #cbd5e1;padding:.55rem .75rem;text-align:left;vertical-align:top}th{background:#f1f5f9}tbody tr:nth-child(even){background:#f8fafc}</style></head><body><main><table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table></main></body></html>`;
};

const renderDelimited = async (
	table: TabularTable,
	delimiter: string,
): Promise<string> => {
	const Papa = (await import("papaparse")).default;
	return Papa.unparse(
		{ fields: [...table.columns], data: table.rows.map((row) => [...row]) },
		{ delimiter, header: true, newline: "\r\n", escapeFormulae: true },
	);
};

export const renderTabular = async (
	table: TabularTable,
	format: TabularTargetFormat,
): Promise<string> => {
	switch (format) {
		case "csv":
			return renderDelimited(table, ",");
		case "tsv":
			return renderDelimited(table, "\t");
		case "json":
			return JSON.stringify(rowsAsObjects(table), null, 2);
		case "md":
			return renderMarkdown(table);
		case "html":
			return renderHtml(table);
	}
};

export const convertTabular = async (
	text: string,
	source: TabularSourceFormat,
	target: TabularTargetFormat,
): Promise<string> => renderTabular(await parseTabular(text, source), target);

export interface TabularProgress {
	readonly progressPercent: number;
	readonly message: string;
}

type TabularProgressReporter = (progress: TabularProgress) => void;

const MAX_TABULAR_INPUT_BYTES = 64 * 1024 * 1024;
const TABULAR_CHUNK_BYTES = 1024 * 1024;

const parseDelimitedBlob = async (
	file: Blob,
	delimiter: string,
	report: TabularProgressReporter,
): Promise<TabularTable> => {
	const Papa = (await import("papaparse")).default;
	const columns: string[] = [];
	const rows: TabularValue[][] = [];
	let partialLine = "";
	let baseIndex = 0;
	let rowsParsed = 0;
	let headerCaptured = false;
	const decoder = new TextDecoder("utf-8");
	// Papa Parse 5.7.0 exposes ParserHandle; reuse it to keep its RFC parser/header state while decoding UTF-8 across byte slices.
	const Handle = (
		Papa as unknown as {
			ParserHandle: new (
				config: Record<string, unknown>,
			) => {
				parse: (
					input: string,
					baseIndex: number,
					ignoreLastRow: boolean,
				) => {
					data: Record<string, string>[];
					errors: { message: string }[];
					meta: { cursor: number; fields?: string[] };
				};
			};
		}
	).ParserHandle;
	const parser = new Handle({
		delimiter,
		header: true,
		skipEmptyLines: "greedy",
		dynamicTyping: false,
	});
	const consumeChunk = (text: string, isFinal: boolean): void => {
		const aggregate = partialLine + text;
		partialLine = "";
		const result = parser.parse(aggregate, baseIndex, !isFinal);
		if (result.errors.length > 0) {
			throw new Error(
				result.errors[0]?.message ?? "Delimited table parsing failed",
			);
		}
		if (!headerCaptured && result.meta.fields) {
			for (const field of result.meta.fields) columns.push(field);
			headerCaptured = true;
		}
		for (const record of result.data) {
			rows.push(columns.map((column) => record[column] ?? ""));
			rowsParsed += 1;
		}
		if (!isFinal) {
			const lastIndex = result.meta.cursor;
			partialLine = aggregate.substring(lastIndex - baseIndex);
			baseIndex = lastIndex;
		}
	};

	if (file.size === 0) consumeChunk("", true);
	for (let offset = 0; offset < file.size; offset += TABULAR_CHUNK_BYTES) {
		const end = Math.min(offset + TABULAR_CHUNK_BYTES, file.size);
		const bytes = new Uint8Array(await file.slice(offset, end).arrayBuffer());
		const isFinal = end === file.size;
		const decoded = decoder.decode(bytes, { stream: !isFinal });
		if (decoded || isFinal) consumeChunk(decoded, isFinal);
		const readFraction = file.size === 0 ? 1 : end / file.size;
		report({
			progressPercent: Math.min(80, Math.floor(readFraction * 80)),
			message: `Parsed ${rowsParsed} rows; read ${end} of ${file.size} bytes`,
		});
	}
	return { columns, rows };
};

export const convertTabularBlob = async (
	file: Blob,
	source: TabularSourceFormat,
	target: TabularTargetFormat,
	report: TabularProgressReporter = () => undefined,
): Promise<Blob> => {
	if (file.size > MAX_TABULAR_INPUT_BYTES) {
		throw new Error("Tabular input exceeds the 64 MiB limit");
	}
	report({ progressPercent: 0, message: `Reading ${file.size} input bytes` });
	let table: TabularTable;
	if (source === "csv" || source === "tsv") {
		table = await parseDelimitedBlob(
			file,
			source === "csv" ? "," : "\t",
			report,
		);
	} else {
		const input = await file.text();
		table = await parseTabular(input, source);
		report({
			progressPercent: 80,
			message: `Parsed ${table.rows.length} rows from ${file.size} input bytes`,
		});
	}
	report({
		progressPercent: 80,
		message: `Serializing ${table.rows.length} rows`,
	});
	const outputText = await renderTabular(table, target);
	report({
		progressPercent: 95,
		message: `Serialized ${outputText.length} output characters`,
	});
	const output = new Blob([outputText], { type: TARGET_MIME[target] });
	report({
		progressPercent: 100,
		message: `Ready: ${output.size} output bytes from ${table.rows.length} rows`,
	});
	return output;
};

type TabularWorkerMessage = {
	readonly type: "convert";
	readonly jobId: string;
	readonly file?: Blob;
	readonly text?: string;
	readonly source: TabularSourceFormat;
	readonly target: TabularTargetFormat;
};

const TARGET_MIME: Readonly<Record<TabularTargetFormat, string>> = {
	csv: "text/csv;charset=utf-8",
	tsv: "text/tab-separated-values;charset=utf-8",
	json: "application/json;charset=utf-8",
	md: "text/markdown;charset=utf-8",
	html: "text/html;charset=utf-8",
};

const isDedicatedWorkerScope = (): boolean =>
	typeof WorkerGlobalScope !== "undefined" &&
	globalThis instanceof WorkerGlobalScope;

if (isDedicatedWorkerScope()) {
	const scope = globalThis as unknown as DedicatedWorkerGlobalScope;
	scope.addEventListener(
		"message",
		(event: MessageEvent<TabularWorkerMessage>) => {
			const message = event.data;
			void (async () => {
				if (message.file) {
					return convertTabularBlob(
						message.file,
						message.source,
						message.target,
						(progress) =>
							scope.postMessage({
								type: "progress",
								jobId: message.jobId,
								...progress,
							}),
					);
				}
				if (message.text === undefined)
					throw new Error("Tabular conversion input is missing");
				const text = await convertTabular(
					message.text,
					message.source,
					message.target,
				);
				return new Blob([text], { type: TARGET_MIME[message.target] });
			})()
				.then((blob) => {
					scope.postMessage({ type: "result", jobId: message.jobId, blob });
				})
				.catch((error: unknown) => {
					scope.postMessage({
						type: "error",
						jobId: message.jobId,
						message:
							error instanceof Error
								? error.message
								: "Tabular conversion failed",
					});
				});
		},
	);
}
