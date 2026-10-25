import type { FormatId } from "./types";

export interface ExportEntry {
  readonly name: string;
  readonly blob: Blob;
}

export const buildOutputFileName = (_sourceName: string, _target: FormatId): string => "";

export const deduplicateFileNames = (names: readonly string[]): readonly string[] => [...names];

export const createBatchArchive = async (_entries: readonly ExportEntry[]): Promise<Blob> =>
  new Blob([], { type: "application/zip" });

export const triggerBlobDownload = (_blob: Blob, _fileName: string): void => undefined;
