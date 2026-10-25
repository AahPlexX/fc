import type { FormatId } from "./types";

export interface ExportEntry {
  readonly name: string;
  readonly blob: Blob;
}

const fileParts = (name: string): { stem: string; extension: string } => {
  const leaf = name.split(/[\\/]/).at(-1)?.replaceAll("\0", "").trim() || "file";
  const dot = leaf.lastIndexOf(".");
  if (dot <= 0 || dot === leaf.length - 1) {
    return { stem: leaf, extension: "" };
  }
  return { stem: leaf.slice(0, dot), extension: leaf.slice(dot) };
};

export const buildOutputFileName = (sourceName: string, target: FormatId): string => {
  const { stem } = fileParts(sourceName);
  return `${stem}-converted.${target}`;
};

export const deduplicateFileNames = (names: readonly string[]): readonly string[] => {
  const used = new Set<string>();

  return names.map((name) => {
    const { stem, extension } = fileParts(name);
    let candidate = `${stem}${extension}`;
    let index = 2;
    while (used.has(candidate.toLocaleLowerCase("en-US"))) {
      candidate = `${stem} (${index})${extension}`;
      index += 1;
    }
    used.add(candidate.toLocaleLowerCase("en-US"));
    return candidate;
  });
};

export const createBatchArchive = async (entries: readonly ExportEntry[]): Promise<Blob> => {
  if (entries.length === 0) {
    throw new Error("At least one completed output is required to create a ZIP archive");
  }

  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const names = deduplicateFileNames(entries.map((entry) => entry.name));

  await Promise.all(
    entries.map(async (entry, index) => {
      const name = names[index];
      if (!name) return;
      zip.file(name, new Uint8Array(await entry.blob.arrayBuffer()));
    }),
  );

  return zip.generateAsync({
    type: "blob",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
    streamFiles: true,
  });
};

export const triggerBlobDownload = (blob: Blob, fileName: string): void => {
  if (typeof document === "undefined") {
    throw new Error("Downloads require a browser document");
  }

  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  anchor.rel = "noopener";
  anchor.hidden = true;
  document.body.append(anchor);

  try {
    anchor.click();
  } finally {
    anchor.remove();
    globalThis.setTimeout(() => URL.revokeObjectURL(url), 1_000);
  }
};
