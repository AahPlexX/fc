import type { DetectedFormat } from "../core/types";
import { detectBinaryFormat, detectTextFormat } from "../core/magicBytes";

export interface MetadataEntry {
  readonly group: string;
  readonly name: string;
  readonly value: string | number | boolean | readonly string[] | readonly number[];
}

const SAFE_GROUPS = new Set(["file", "exif", "gps", "composite", "iptc", "xmp"]);

const toSafeValue = (
  candidate: unknown,
): string | number | boolean | readonly string[] | readonly number[] | null => {
  if (typeof candidate === "string" || typeof candidate === "number" || typeof candidate === "boolean") {
    return candidate;
  }

  if (Array.isArray(candidate)) {
    if (candidate.every((item) => typeof item === "string")) {
      return candidate as string[];
    }
    if (candidate.every((item) => typeof item === "number")) {
      return candidate as number[];
    }
    return null;
  }

  if (candidate && typeof candidate === "object" && "value" in candidate) {
    return toSafeValue((candidate as { value: unknown }).value);
  }

  return null;
};

export const normalizeMetadata = (groups: Record<string, unknown>): readonly MetadataEntry[] => {
  const entries: MetadataEntry[] = [];

  for (const [group, rawEntries] of Object.entries(groups)) {
    if (!SAFE_GROUPS.has(group) || !rawEntries || typeof rawEntries !== "object") {
      continue;
    }

    for (const [name, rawValue] of Object.entries(rawEntries as Record<string, unknown>)) {
      if (group === "xmp" && (name.toLowerCase() === "_raw" || name.toLowerCase().includes("raw"))) continue;
      const value = toSafeValue(rawValue);
      if (value !== null) {
        entries.push({ group, name, value });
      }
    }
  }

  return entries;
};

export const inspectMetadata = async (bytes: ArrayBuffer): Promise<readonly MetadataEntry[]> => {
  const { load } = await import("exifreader");
  const tags = await load(bytes, {
    async: true,
    expanded: true,
    includeTags: {
      file: true,
      exif: true,
      gps: true,
      composite: true,
      iptc: true,
      xmp: true,
    },
  });

  return normalizeMetadata(tags as unknown as Record<string, unknown>);
};

export const inspectPdfMetadata = async (bytes: Uint8Array): Promise<readonly MetadataEntry[]> => {
  const { PDFDocument } = await import("pdf-lib");
  const pdf = await PDFDocument.load(bytes, { updateMetadata: false });
  const metadata: Record<string, unknown> = {
    pageCount: pdf.getPageCount(), title: pdf.getTitle(), author: pdf.getAuthor(),
    subject: pdf.getSubject(), keywords: pdf.getKeywords(), creator: pdf.getCreator(), producer: pdf.getProducer(),
  };
  return Object.entries(metadata).flatMap(([name, value]) => {
    const safe = toSafeValue(value);
    return safe === null ? [] : [{ group: "pdf", name, value: safe }];
  });
};

const MAX_TEXT_DETECTION_BYTES = 64 * 1024 * 1024;

export interface DetectableFile extends Blob {
  readonly name: string;
  readonly type: string;
}

export const detectFileFormat = async (file: DetectableFile): Promise<DetectedFormat | null> => {
  const header = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  const binary = detectBinaryFormat(header);
  if (binary) return binary;
  if (file.size > MAX_TEXT_DETECTION_BYTES) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  return detectTextFormat(bytes, file.name, file.type);
};

type MetadataWorkerMessage =
  | { readonly type: "inspect"; readonly jobId: string; readonly bytes: ArrayBuffer; readonly format?: "image" | "pdf" }
  | { readonly type: "detect"; readonly jobId: string; readonly file: File };

type MetadataWorkerResponse =
  | { readonly type: "metadata"; readonly jobId: string; readonly entries: readonly MetadataEntry[] }
  | { readonly type: "detected"; readonly jobId: string; readonly detected: DetectedFormat | null }
  | { readonly type: "error"; readonly jobId: string; readonly message: string };

const isDedicatedWorkerScope = (): boolean =>
  typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;

if (isDedicatedWorkerScope()) {
  const scope = globalThis as unknown as DedicatedWorkerGlobalScope;
  scope.addEventListener("message", (event: MessageEvent<MetadataWorkerMessage>) => {
    const message = event.data;
    const { jobId } = message;
    const work = message.type === "detect"
      ? detectFileFormat(message.file).then((detected) => ({ type: "detected", jobId, detected }) as const)
      : (message.format === "pdf" ? inspectPdfMetadata(new Uint8Array(message.bytes)) : inspectMetadata(message.bytes))
        .then((entries) => ({ type: "metadata", jobId, entries }) as const);
    void work
      .then((entries) => {
        scope.postMessage(entries);
      })
      .catch((error: unknown) => {
        const response: MetadataWorkerResponse = {
          type: "error",
          jobId,
          message: error instanceof Error ? error.message : "Metadata inspection failed",
        };
        scope.postMessage(response);
      });
  });
}
