export type TabularSourceFormat = "csv" | "tsv" | "json";
export type TabularTargetFormat = "csv" | "tsv" | "json" | "md" | "html";
export type TabularValue = string | number | boolean | null;

export interface TabularTable {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly TabularValue[])[];
}

const normalizeCell = (value: unknown): TabularValue => {
  if (value === null || typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
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
    const width = Math.max(...records.map((record) => (record as unknown[]).length));
    const columns = Array.from({ length: width }, (_, index) => `column_${index + 1}`);
    return {
      columns,
      rows: records.map((record) => columns.map((_, index) => normalizeCell((record as unknown[])[index]))),
    };
  }

  if (!records.every((record) => record !== null && typeof record === "object" && !Array.isArray(record))) {
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
    rows: (records as Record<string, unknown>[]).map((record) => columns.map((column) => normalizeCell(record[column]))),
  };
};

const parseDelimited = async (text: string, delimiter: string): Promise<TabularTable> => {
  const Papa = (await import("papaparse")).default;
  const result = Papa.parse<Record<string, string>>(text, {
    delimiter,
    header: true,
    skipEmptyLines: "greedy",
    dynamicTyping: false,
  });
  if (result.errors.length > 0) {
    throw new Error(result.errors[0]?.message ?? "Delimited table parsing failed");
  }

  const columns = result.meta.fields ?? [];
  return {
    columns,
    rows: result.data.map((record) => columns.map((column) => record[column] ?? "")),
  };
};

export const parseTabular = async (text: string, format: TabularSourceFormat): Promise<TabularTable> => {
  switch (format) {
    case "json":
      return parseJson(text);
    case "csv":
      return parseDelimited(text, ",");
    case "tsv":
      return parseDelimited(text, "\t");
  }
};

const rowsAsObjects = (table: TabularTable): readonly Record<string, TabularValue>[] =>
  table.rows.map((row) => Object.fromEntries(table.columns.map((column, index) => [column, row[index] ?? null])));

const escapeMarkdown = (value: TabularValue): string =>
  String(value ?? "")
    .replaceAll("\\", "\\\\")
    .replaceAll("|", "\\|")
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
  const rows = table.rows.map((row) => `| ${row.map((cell) => escapeMarkdown(cell)).join(" | ")} |`);
  return [header, separator, ...rows].join("\n");
};

const renderHtml = (table: TabularTable): string => {
  const header = table.columns.map((column) => `<th scope="col">${escapeHtml(column)}</th>`).join("");
  const rows = table.rows
    .map((row) => `<tr>${row.map((cell) => `<td>${escapeHtml(cell)}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${header}</tr></thead><tbody>${rows}</tbody></table>`;
};

const renderDelimited = async (table: TabularTable, delimiter: string): Promise<string> => {
  const Papa = (await import("papaparse")).default;
  return Papa.unparse(
    { fields: [...table.columns], data: table.rows.map((row) => [...row]) },
    { delimiter, header: true, newline: "\r\n", escapeFormulae: true },
  );
};

export const renderTabular = async (table: TabularTable, format: TabularTargetFormat): Promise<string> => {
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

type TabularWorkerMessage = {
  readonly type: "convert";
  readonly jobId: string;
  readonly text: string;
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
  typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;

if (isDedicatedWorkerScope()) {
  const scope = globalThis as unknown as DedicatedWorkerGlobalScope;
  scope.addEventListener("message", (event: MessageEvent<TabularWorkerMessage>) => {
    const message = event.data;
    void convertTabular(message.text, message.source, message.target)
      .then((text) => {
        scope.postMessage({ type: "result", jobId: message.jobId, text, mime: TARGET_MIME[message.target] });
      })
      .catch((error: unknown) => {
        scope.postMessage({
          type: "error",
          jobId: message.jobId,
          message: error instanceof Error ? error.message : "Tabular conversion failed",
        });
      });
  });
}
