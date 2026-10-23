export type TabularSourceFormat = "csv" | "tsv" | "json";
export type TabularTargetFormat = "csv" | "tsv" | "json" | "md" | "html";
export type TabularValue = string | number | boolean | null;

export interface TabularTable {
  readonly columns: readonly string[];
  readonly rows: readonly (readonly TabularValue[])[];
}

export const parseTabular = async (
  _text: string,
  _format: TabularSourceFormat,
): Promise<TabularTable> => ({ columns: [], rows: [] });

export const renderTabular = async (
  _table: TabularTable,
  _format: TabularTargetFormat,
): Promise<string> => "";

export const convertTabular = async (
  text: string,
  source: TabularSourceFormat,
  target: TabularTargetFormat,
): Promise<string> => renderTabular(await parseTabular(text, source), target);
