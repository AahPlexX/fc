export type RasterTarget = "png" | "jpeg" | "webp" | "avif";

export interface RasterRequest {
  readonly jobId: string;
  readonly source: Blob;
  readonly target: RasterTarget;
  readonly quality?: number;
}

export interface RasterDependencies {
  readonly decode: (source: Blob) => Promise<ImageBitmap>;
  readonly encode: (bitmap: ImageBitmap, mimeType: string, quality?: number) => Promise<Blob>;
}

export interface CancellationRegistry {
  readonly cancel: (jobId: string) => void;
  readonly clear: (jobId: string) => void;
  readonly isCancelled: (jobId: string) => boolean;
}

const MIME_TYPES: Readonly<Record<RasterTarget, string>> = {
  png: "image/png",
  jpeg: "image/jpeg",
  webp: "image/webp",
  avif: "image/avif",
};

export class RasterCancelledError extends Error {
  constructor() {
    super("Image conversion cancelled");
    this.name = "RasterCancelledError";
  }
}

export class UnsupportedRasterEncoderError extends Error {
  constructor(target: RasterTarget, actualType: string) {
    super(
      `${target.toUpperCase()} encoder unavailable: browser returned ${actualType || "an untyped blob"} instead`,
    );
    this.name = "UnsupportedRasterEncoderError";
  }
}

export const getRasterMimeType = (target: RasterTarget): string => MIME_TYPES[target];

export const createCancellationRegistry = (): CancellationRegistry => {
  const cancelled = new Set<string>();

  return {
    cancel: (jobId) => cancelled.add(jobId),
    clear: (jobId) => cancelled.delete(jobId),
    isCancelled: (jobId) => cancelled.has(jobId),
  };
};

const throwIfCancelled = (jobId: string, cancellations: CancellationRegistry): void => {
  if (cancellations.isCancelled(jobId)) {
    throw new RasterCancelledError();
  }
};

export const convertRaster = async (
  request: RasterRequest,
  dependencies: RasterDependencies,
  cancellations: CancellationRegistry,
): Promise<Blob> => {
  throwIfCancelled(request.jobId, cancellations);

  let bitmap: ImageBitmap | null = null;
  try {
    bitmap = await dependencies.decode(request.source);
    throwIfCancelled(request.jobId, cancellations);

    const expectedType = getRasterMimeType(request.target);
    const output = await dependencies.encode(bitmap, expectedType, request.quality);
    throwIfCancelled(request.jobId, cancellations);

    if (output.type !== expectedType) {
      throw new UnsupportedRasterEncoderError(request.target, output.type);
    }

    return output;
  } finally {
    bitmap?.close();
    cancellations.clear(request.jobId);
  }
};

const browserDependencies: RasterDependencies = {
  decode: (source) => createImageBitmap(source, { imageOrientation: "from-image" }),
  encode: async (bitmap, mimeType, quality) => {
    const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2D canvas context unavailable");
    }
    context.drawImage(bitmap, 0, 0);

    const options: ImageEncodeOptions = { type: mimeType };
    if (quality !== undefined && mimeType !== "image/png") {
      options.quality = Math.min(1, Math.max(0, quality));
    }
    return canvas.convertToBlob(options);
  },
};

export const probeRasterEncoder = async (target: RasterTarget): Promise<boolean> => {
  if (target === "png") {
    return true;
  }
  if (typeof OffscreenCanvas === "undefined") {
    return false;
  }

  const canvas = new OffscreenCanvas(1, 1);
  const expectedType = getRasterMimeType(target);
  try {
    const output = await canvas.convertToBlob({ type: expectedType, quality: 0.8 });
    return output.type === expectedType;
  } catch {
    return false;
  }
};

type ImageWorkerMessage =
  | { readonly type: "convert"; readonly request: RasterRequest }
  | { readonly type: "cancel"; readonly jobId: string };

type ImageWorkerResponse =
  | { readonly type: "result"; readonly jobId: string; readonly blob: Blob }
  | { readonly type: "cancelled"; readonly jobId: string }
  | { readonly type: "error"; readonly jobId: string; readonly message: string };

const cancellations = createCancellationRegistry();

const isDedicatedWorkerScope = (): boolean =>
  typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;

if (isDedicatedWorkerScope()) {
  const scope = globalThis as unknown as DedicatedWorkerGlobalScope;
  scope.addEventListener("message", (event: MessageEvent<ImageWorkerMessage>) => {
    const message = event.data;
    if (message.type === "cancel") {
      cancellations.cancel(message.jobId);
      return;
    }

    void convertRaster(message.request, browserDependencies, cancellations)
      .then((blob) => {
        const response: ImageWorkerResponse = { type: "result", jobId: message.request.jobId, blob };
        scope.postMessage(response);
      })
      .catch((error: unknown) => {
        const response: ImageWorkerResponse =
          error instanceof RasterCancelledError
            ? { type: "cancelled", jobId: message.request.jobId }
            : {
                type: "error",
                jobId: message.request.jobId,
                message: error instanceof Error ? error.message : "Image conversion failed",
              };
        scope.postMessage(response);
      });
  });
}
