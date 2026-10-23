export interface MetadataEntry {
  readonly group: string;
  readonly name: string;
  readonly value: string | number | boolean | readonly string[] | readonly number[];
}

const SAFE_GROUPS = new Set(["file", "exif", "gps", "composite"]);

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
    },
  });

  return normalizeMetadata(tags as unknown as Record<string, unknown>);
};

type MetadataWorkerMessage = {
  readonly type: "inspect";
  readonly jobId: string;
  readonly bytes: ArrayBuffer;
};

type MetadataWorkerResponse =
  | { readonly type: "metadata"; readonly jobId: string; readonly entries: readonly MetadataEntry[] }
  | { readonly type: "error"; readonly jobId: string; readonly message: string };

const isDedicatedWorkerScope = (): boolean =>
  typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;

if (isDedicatedWorkerScope()) {
  const scope = globalThis as unknown as DedicatedWorkerGlobalScope;
  scope.addEventListener("message", (event: MessageEvent<MetadataWorkerMessage>) => {
    const { jobId, bytes } = event.data;
    void inspectMetadata(bytes)
      .then((entries) => {
        const response: MetadataWorkerResponse = { type: "metadata", jobId, entries };
        scope.postMessage(response);
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
