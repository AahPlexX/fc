export type TabularSourceFormat = "csv" | "tsv" | "json" | "md";
export type TabularTargetFormat = "csv" | "tsv" | "json" | "md" | "html";
export type TabularValue = string | number | boolean | null;

export interface TabularTable {
	readonly columns: readonly string[];
	readonly rows: readonly (readonly TabularValue[])[];
}

export interface TabularLimits {
	readonly maxInputBytes: number;
	readonly maxRows: number;
	readonly maxColumns: number;
	readonly maxCells: number;
	readonly maxOutputBytes: number;
}

export const DEFAULT_TABULAR_LIMITS: Readonly<TabularLimits> = Object.freeze({
	maxInputBytes: 64 * 1024 * 1024,
	maxRows: 250_000,
	maxColumns: 2_000,
	maxCells: 2_000_000,
	maxOutputBytes: 64 * 1024 * 1024,
});

const utf8ByteLength = (text: string): number => {
	let bytes = 0;
	for (let index = 0; index < text.length; index += 1) {
		const code = text.charCodeAt(index);
		if (code <= 0x7f) bytes += 1;
		else if (code <= 0x7ff) bytes += 2;
		else if (
			code >= 0xd800 &&
			code <= 0xdbff &&
			index + 1 < text.length &&
			(text.charCodeAt(index + 1) & 0xfc00) === 0xdc00
		) {
			bytes += 4;
			index += 1;
		} else bytes += 3;
	}
	return bytes;
};

const assertInputLimit = (inputBytes: number, limits: TabularLimits): void => {
	if (inputBytes > limits.maxInputBytes) {
		throw new Error(
			`Tabular input exceeds the configured input limit of ${limits.maxInputBytes} bytes (64 MiB default)`,
		);
	}
};

const assertTableShape = (table: TabularTable, limits: TabularLimits): void => {
	if (table.rows.length > limits.maxRows) {
		throw new Error(
			`Tabular data exceeds the configured row limit of ${limits.maxRows} data rows`,
		);
	}
	if (table.columns.length > limits.maxColumns) {
		throw new Error(
			`Tabular data exceeds the configured column limit of ${limits.maxColumns} columns`,
		);
	}
	if (table.rows.length * table.columns.length > limits.maxCells) {
		throw new Error(
			`Tabular data exceeds the configured canonical cell limit of ${limits.maxCells} cells`,
		);
	}
};

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

const parseJson = (text: string, limits: TabularLimits): TabularTable => {
	const parsed: unknown = JSON.parse(text);
	const records = Array.isArray(parsed) ? parsed : [parsed];
	if (records.length > limits.maxRows) {
		throw new Error(
			`Tabular data exceeds the configured row limit of ${limits.maxRows} data rows`,
		);
	}
	if (records.length === 0) return { columns: [], rows: [] };

	if (records.every((record) => Array.isArray(record))) {
		const width = records.reduce(
			(maximum, record) => Math.max(maximum, (record as unknown[]).length),
			0,
		);
		if (width > limits.maxColumns) {
			throw new Error(
				`Tabular data exceeds the configured column limit of ${limits.maxColumns} columns`,
			);
		}
		if (records.length * width > limits.maxCells) {
			throw new Error(
				`Tabular data exceeds the configured canonical cell limit of ${limits.maxCells} cells`,
			);
		}
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
		for (const key in record) {
			if (!Object.hasOwn(record, key)) continue;
			if (!seen.has(key)) {
				if (columns.length >= limits.maxColumns) {
					throw new Error(
						`Tabular data exceeds the configured column limit of ${limits.maxColumns} columns`,
					);
				}
				seen.add(key);
				columns.push(key);
			}
		}
	}
	if (records.length * columns.length > limits.maxCells) {
		throw new Error(
			`Tabular data exceeds the configured canonical cell limit of ${limits.maxCells} cells`,
		);
	}

	return {
		columns,
		rows: (records as Record<string, unknown>[]).map((record) =>
			columns.map((column) =>
				normalizeCell(
					Object.hasOwn(record, column) ? record[column] : undefined,
				),
			),
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

const countMarkdownCells = (line: string): number => {
	const trimmed = line.trim();
	if (!trimmed) return 0;
	let cells = 1;
	let escaped = false;
	for (const character of trimmed) {
		if (escaped) escaped = false;
		else if (character === "\\") escaped = true;
		else if (character === "|") cells += 1;
	}
	if (trimmed.startsWith("|")) cells -= 1;
	if (trimmed.endsWith("|")) cells -= 1;
	return cells;
};

const markdownLines = function* (text: string): Generator<string> {
	let start = 0;
	for (let index = 0; index < text.length; index += 1) {
		if (text[index] !== "\r" && text[index] !== "\n") continue;
		yield text.slice(start, index);
		if (text[index] === "\r" && text[index + 1] === "\n") index += 1;
		start = index + 1;
	}
	yield text.slice(start);
};

const parseMarkdown = (text: string, limits: TabularLimits): TabularTable => {
	const lines = markdownLines(text);
	const iterator = lines[Symbol.iterator]();
	let previous: string | null = null;
	let columns: string[] | null = null;
	let next = iterator.next();
	while (!next.done) {
		const line = next.value;
		if (previous?.includes("|") && line.includes("|")) {
			const headerWidth = countMarkdownCells(previous);
			const delimiterWidth = countMarkdownCells(line);
			if (
				headerWidth > limits.maxColumns ||
				delimiterWidth > limits.maxColumns
			) {
				throw new Error(
					`Tabular data exceeds the configured column limit of ${limits.maxColumns} columns`,
				);
			}
			const header = splitMarkdownRow(previous);
			const delimiter = splitMarkdownRow(line);
			if (
				header.length &&
				delimiter.length === header.length &&
				delimiter.every((cell) => /^:?-{3,}:?$/.test(cell))
			) {
				columns = header;
				break;
			}
		}
		previous = line;
		next = iterator.next();
	}
	if (columns === null)
		throw new Error(
			"Markdown input does not contain a valid table header and alignment delimiter",
		);
	if (columns.length > limits.maxColumns) {
		throw new Error(
			`Tabular data exceeds the configured column limit of ${limits.maxColumns} columns`,
		);
	}
	const rows: TabularValue[][] = [];
	next = iterator.next();
	while (!next.done) {
		const line = next.value;
		if (!line.trim()) break;
		const width = countMarkdownCells(line);
		if (width !== columns.length) {
			throw new Error(
				`Markdown table row has ${width} cells; expected ${columns.length} columns`,
			);
		}
		if (rows.length >= limits.maxRows) {
			throw new Error(
				`Tabular data exceeds the configured row limit of ${limits.maxRows} data rows`,
			);
		}
		if ((rows.length + 1) * columns.length > limits.maxCells) {
			throw new Error(
				`Tabular data exceeds the configured canonical cell limit of ${limits.maxCells} cells`,
			);
		}
		const row = splitMarkdownRow(line);
		rows.push(row);
		next = iterator.next();
	}
	return { columns, rows };
};

export const parseTabular = async (
	text: string,
	format: TabularSourceFormat,
	limits: TabularLimits = DEFAULT_TABULAR_LIMITS,
): Promise<TabularTable> => {
	assertInputLimit(utf8ByteLength(text), limits);
	let table: TabularTable;
	switch (format) {
		case "json":
			table = parseJson(text, limits);
			break;
		case "md":
			table = parseMarkdown(text, limits);
			break;
		case "csv":
			return parseDelimitedBlob(new Blob([text]), ",", () => undefined, limits);
		case "tsv":
			return parseDelimitedBlob(
				new Blob([text]),
				"\t",
				() => undefined,
				limits,
			);
	}
	assertTableShape(table, limits);
	return table;
};

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

interface SerializedTabularOutput {
	readonly parts: readonly string[];
	readonly byteLength: number;
}

const createOutputWriter = (maxBytes: number) => {
	const parts: string[] = [];
	let pending: string[] = [];
	let pendingCharacters = 0;
	let byteLength = 0;
	const flush = (): void => {
		if (pending.length === 0) return;
		parts.push(pending.join(""));
		pending = [];
		pendingCharacters = 0;
	};
	return {
		append(text: string): void {
			const addedBytes = utf8ByteLength(text);
			if (byteLength + addedBytes > maxBytes) {
				throw new Error(
					`Tabular output exceeds the configured UTF-8 output limit of ${maxBytes} bytes (64 MiB default)`,
				);
			}
			byteLength += addedBytes;
			for (let start = 0; start < text.length; ) {
				let end = Math.min(start + 16 * 1024, text.length);
				if (
					end < text.length &&
					text.charCodeAt(end - 1) >= 0xd800 &&
					text.charCodeAt(end - 1) <= 0xdbff
				) {
					end -= 1;
				}
				const piece = text.slice(start, end);
				pending.push(piece);
				pendingCharacters += piece.length;
				if (pendingCharacters >= 64 * 1024) flush();
				start = end;
			}
		},
		finish(): SerializedTabularOutput {
			flush();
			return { parts, byteLength };
		},
	};
};

const serializeTabularParts = async (
	table: TabularTable,
	format: TabularTargetFormat,
	limits: TabularLimits,
): Promise<SerializedTabularOutput> => {
	assertTableShape(table, limits);
	const writer = createOutputWriter(limits.maxOutputBytes);
	switch (format) {
		case "csv":
		case "tsv": {
			const Papa = (await import("papaparse")).default;
			const delimiter = format === "csv" ? "," : "\t";
			const options = { delimiter, newline: "\r\n", escapeFormulae: true };
			writer.append(
				Papa.unparse(
					{ fields: [...table.columns], data: [] },
					{ ...options, header: true },
				),
			);
			for (let index = 0; index < table.rows.length; index += 1) {
				if (index > 0) writer.append("\r\n");
				writer.append(
					Papa.unparse(
						{
							fields: [...table.columns],
							data: [[...(table.rows[index] ?? [])]],
						},
						{ ...options, header: false },
					),
				);
			}
			break;
		}
		case "json": {
			if (table.rows.length === 0) {
				writer.append("[]");
				break;
			}
			writer.append("[\n");
			for (let index = 0; index < table.rows.length; index += 1) {
				if (index > 0) writer.append(",\n");
				const row = table.rows[index] ?? [];
				const object = Object.fromEntries(
					table.columns.map((column, columnIndex) => [
						column,
						row[columnIndex] ?? null,
					]),
				);
				writer.append(
					JSON.stringify(object, null, 2)
						.split("\n")
						.map((line) => `  ${line}`)
						.join("\n"),
				);
			}
			writer.append("\n]");
			break;
		}
		case "md": {
			if (table.columns.length === 0) break;
			writer.append(
				`| ${table.columns.map(escapeMarkdown).join(" | ")} |\n| ${table.columns.map(() => "---").join(" | ")} |`,
			);
			for (const row of table.rows) {
				writer.append(
					`\n| ${row.map((cell) => escapeMarkdown(cell)).join(" | ")} |`,
				);
			}
			break;
		}
		case "html": {
			const emptyTable = renderHtml({ columns: table.columns, rows: [] });
			const marker = "<tbody></tbody>";
			const markerIndex = emptyTable.indexOf(marker);
			const bodyStart = markerIndex + "<tbody>".length;
			writer.append(emptyTable.slice(0, bodyStart));
			for (const row of table.rows) {
				writer.append(
					`<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`,
				);
			}
			writer.append(emptyTable.slice(bodyStart));
			break;
		}
	}
	return writer.finish();
};

export const renderTabular = async (
	table: TabularTable,
	format: TabularTargetFormat,
	limits: TabularLimits = DEFAULT_TABULAR_LIMITS,
): Promise<string> => {
	const output = await serializeTabularParts(table, format, limits);
	return output.parts.join("");
};

export const convertTabular = async (
	text: string,
	source: TabularSourceFormat,
	target: TabularTargetFormat,
	// Existing public conversion accepts an optional internal limits object; it is not a UI setting.
	limits: TabularLimits = DEFAULT_TABULAR_LIMITS,
): Promise<string> =>
	renderTabular(await parseTabular(text, source, limits), target, limits);

export interface TabularProgress {
	readonly progressPercent: number;
	readonly message: string;
}

type TabularProgressReporter = (progress: TabularProgress) => void;

const TABULAR_CHUNK_BYTES = 1024 * 1024;
const TABULAR_PARSE_CHUNK_CHARS = 64 * 1024;
const PAPA_FIELD_PREFIX = "$omniconvert$";

const parseDelimitedBlob = async (
	file: Blob,
	delimiter: string,
	report: TabularProgressReporter,
	limits: TabularLimits,
): Promise<TabularTable> => {
	assertInputLimit(file.size, limits);
	const Papa = (await import("papaparse")).default;
	const columns: string[] = [];
	const fieldKeys: string[] = [];
	const rows: TabularValue[][] = [];
	let partialLine = "";
	let baseIndex = 0;
	let rowsParsed = 0;
	let headerCaptured = false;
	const decoder = new TextDecoder("utf-8");
	let pendingText = "";
	let newlineScanPosition = 0;
	let newlineScanInQuotes = false;
	let newlineScanAtFieldStart = true;
	let recordSeparator = "\n";
	// Papa Parse 5.7.0 exposes ParserHandle; reuse it to keep its RFC parser/header state while decoding UTF-8 across byte slices.
	type ParserHandle = {
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
	const Handle = (
		Papa as unknown as {
			ParserHandle: new (config: Record<string, unknown>) => ParserHandle;
		}
	).ParserHandle;
	let parser: ParserHandle | null = null;
	const findLineEnding = (text: string, isFinal: boolean): string | null => {
		for (let index = newlineScanPosition; index < text.length; ) {
			const character = text[index];
			if (newlineScanInQuotes) {
				if (character === '"') {
					if (index + 1 < text.length && text[index + 1] === '"') {
						index += 2;
						continue;
					}
					if (index + 1 < text.length || isFinal) {
						newlineScanInQuotes = false;
					} else {
						newlineScanPosition = index;
						return null;
					}
				}
				index += 1;
				continue;
			}
			if (character === '"' && newlineScanAtFieldStart) {
				newlineScanInQuotes = true;
				newlineScanAtFieldStart = false;
			} else if (character === delimiter) {
				newlineScanAtFieldStart = true;
			} else if (character === "\n") {
				newlineScanPosition = index + 1;
				return "\n";
			} else if (character === "\r") {
				if (index + 1 < text.length) {
					newlineScanPosition = index + (text[index + 1] === "\n" ? 2 : 1);
					return text[index + 1] === "\n" ? "\r\n" : "\r";
				}
				if (isFinal) {
					newlineScanPosition = index + 1;
					return "\r";
				}
				newlineScanPosition = index;
				return null;
			} else {
				newlineScanAtFieldStart = false;
			}
			index += 1;
		}
		newlineScanPosition = text.length;
		return null;
	};
	const createParser = (newline: string): void => {
		recordSeparator = newline;
		parser = new Handle({
			delimiter,
			header: true,
			skipEmptyLines: false,
			dynamicTyping: false,
			newline,
			transformHeader: (header: string) => `${PAPA_FIELD_PREFIX}${header}`,
		});
	};
	const consumeChunk = (text: string, isFinal: boolean): void => {
		if (!parser) throw new Error("Delimited parser was not initialized");
		let aggregate = partialLine + text;
		partialLine = "";
		if (isFinal && aggregate.length === 0) return;
		// A final record separator terminates the previous record; it does not
		// introduce another empty one. Other empty records are meaningful data.
		if (isFinal && aggregate.endsWith(recordSeparator)) {
			aggregate = aggregate.slice(0, -recordSeparator.length);
			// Papa treats an empty input as no record, even when the final
			// separator itself represents an empty single-field record.
			if (!aggregate) aggregate = '""';
		}
		const result = parser.parse(aggregate, baseIndex, !isFinal);
		if (result.errors.length > 0) {
			throw new Error(
				result.errors[0]?.message ?? "Delimited table parsing failed",
			);
		}
		const fields = result.meta.fields ?? [];
		if (!headerCaptured && fields.length > 0) {
			if (fields.length > limits.maxColumns) {
				throw new Error(
					`Tabular data exceeds the configured column limit of ${limits.maxColumns} columns`,
				);
			}
			for (const field of fields) {
				fieldKeys.push(field);
				columns.push(field.slice(PAPA_FIELD_PREFIX.length));
			}
			headerCaptured = true;
		}
		if (rowsParsed + result.data.length > limits.maxRows) {
			throw new Error(
				`Tabular data exceeds the configured row limit of ${limits.maxRows} data rows`,
			);
		}
		if ((rowsParsed + result.data.length) * columns.length > limits.maxCells) {
			throw new Error(
				`Tabular data exceeds the configured canonical cell limit of ${limits.maxCells} cells`,
			);
		}
		for (const record of result.data) {
			rows.push(
				fieldKeys.map((fieldKey) =>
					Object.hasOwn(record, fieldKey) ? (record[fieldKey] ?? "") : "",
				),
			);
			rowsParsed += 1;
		}
		if (!isFinal) {
			const lastIndex = result.meta.cursor;
			partialLine = aggregate.substring(lastIndex - baseIndex);
			baseIndex = lastIndex;
		}
	};
	const consumeTextChunks = (text: string, isFinal: boolean): void => {
		if (text.length === 0) {
			consumeChunk("", isFinal);
			return;
		}
		for (let start = 0; start < text.length; ) {
			let end = Math.min(start + TABULAR_PARSE_CHUNK_CHARS, text.length);
			if (
				end < text.length &&
				text.charCodeAt(end - 1) >= 0xd800 &&
				text.charCodeAt(end - 1) <= 0xdbff
			) {
				end -= 1;
			}
			consumeChunk(text.slice(start, end), isFinal && end === text.length);
			start = end;
		}
	};
	const processDecodedChunk = (text: string, isFinal: boolean): void => {
		if (parser) {
			if (text || isFinal) consumeTextChunks(text, isFinal);
			return;
		}
		pendingText += text;
		const newline = findLineEnding(pendingText, isFinal);
		if (!newline && !isFinal) return;
		createParser(newline ?? "\n");
		consumeTextChunks(pendingText, isFinal);
		pendingText = "";
	};

	if (file.size === 0) processDecodedChunk("", true);
	for (let offset = 0; offset < file.size; offset += TABULAR_CHUNK_BYTES) {
		const end = Math.min(offset + TABULAR_CHUNK_BYTES, file.size);
		const bytes = new Uint8Array(await file.slice(offset, end).arrayBuffer());
		const isFinal = end === file.size;
		const decoded = decoder.decode(bytes, { stream: !isFinal });
		processDecodedChunk(decoded, isFinal);
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
	limits: TabularLimits = DEFAULT_TABULAR_LIMITS,
): Promise<Blob> => {
	assertInputLimit(file.size, limits);
	report({ progressPercent: 0, message: `Reading ${file.size} input bytes` });
	let table: TabularTable;
	if (source === "csv" || source === "tsv") {
		table = await parseDelimitedBlob(
			file,
			source === "csv" ? "," : "\t",
			report,
			limits,
		);
	} else {
		const input = await file.text();
		table = await parseTabular(input, source, limits);
		report({
			progressPercent: 80,
			message: `Parsed ${table.rows.length} rows from ${file.size} input bytes`,
		});
	}
	report({
		progressPercent: 80,
		message: `Serializing ${table.rows.length} rows`,
	});
	const serialized = await serializeTabularParts(table, target, limits);
	report({
		progressPercent: 95,
		message: `Serialized ${serialized.byteLength} output bytes`,
	});
	const output = new Blob([...serialized.parts], { type: TARGET_MIME[target] });
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
