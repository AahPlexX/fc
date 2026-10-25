export type RasterTarget = "png" | "jpeg" | "webp" | "avif" | "bmp" | "ico";

export interface RasterRequest {
  readonly jobId: string;
  readonly source: Blob;
  readonly target: RasterTarget;
  readonly quality?: number;
  readonly maxWidth?: number;
  readonly metadataPolicy?: { readonly stripAllMetadata: boolean; readonly overrides: Readonly<Record<string, string>> };
}

export interface RasterDependencies {
  readonly decode: (source: Blob) => Promise<ImageBitmap>;
  readonly encode: (bitmap: ImageBitmap, mimeType: string, quality?: number, maxWidth?: number) => Promise<Blob>;
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
  bmp: "image/bmp",
  ico: "image/x-icon",
};

export const encodeBmp = (width: number, height: number, rgba: Uint8ClampedArray): Blob => {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 || rgba.length !== width * height * 4) {
    throw new RangeError("Invalid BMP dimensions or pixel data");
  }
  const stride = Math.ceil((width * 3) / 4) * 4;
  const pixelBytes = stride * height;
  const bytes = new Uint8Array(54 + pixelBytes);
  const view = new DataView(bytes.buffer);
  bytes[0] = 0x42; bytes[1] = 0x4d;
  view.setUint32(2, bytes.length, true); view.setUint32(10, 54, true);
  view.setUint32(14, 40, true); view.setInt32(18, width, true); view.setInt32(22, height, true);
  view.setUint16(26, 1, true); view.setUint16(28, 24, true); view.setUint32(34, pixelBytes, true);
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const src = ((height - 1 - y) * width + x) * 4;
    const dst = 54 + y * stride + x * 3;
    bytes[dst] = rgba[src + 2] ?? 0; bytes[dst + 1] = rgba[src + 1] ?? 0; bytes[dst + 2] = rgba[src] ?? 0;
  }
  return new Blob([bytes], { type: "image/bmp" });
};

export const encodeIco = async (pngImages: readonly Blob[]): Promise<Blob> => {
  if (!pngImages.length || pngImages.length > 255 || pngImages.some((image) => image.type !== "image/png")) {
    throw new TypeError("ICO requires one or more PNG images");
  }
  const payloads = await Promise.all(pngImages.map((image) => image.arrayBuffer()));
  const directorySize = 6 + 16 * payloads.length;
  const totalSize = directorySize + payloads.reduce((sum, payload) => sum + payload.byteLength, 0);
  const bytes = new Uint8Array(totalSize);
  const view = new DataView(bytes.buffer);
  view.setUint16(2, 1, true); view.setUint16(4, payloads.length, true);
  let offset = directorySize;
  payloads.forEach((payload, index) => {
    const entry = 6 + index * 16;
    const pngView = new DataView(payload);
    const pngWidth = payload.byteLength >= 24 ? pngView.getUint32(16, false) : 0;
    const pngHeight = payload.byteLength >= 24 ? pngView.getUint32(20, false) : 0;
    bytes[entry] = pngWidth >= 256 ? 0 : pngWidth; bytes[entry + 1] = pngHeight >= 256 ? 0 : pngHeight;
    view.setUint16(entry + 4, 1, true); view.setUint16(entry + 6, 32, true);
    view.setUint32(entry + 8, payload.byteLength, true); view.setUint32(entry + 12, offset, true);
    bytes.set(new Uint8Array(payload), offset); offset += payload.byteLength;
  });
  return new Blob([bytes], { type: "image/x-icon" });
};

export const applyJpegMetadata = async (
  sourceJpeg: string, encodedJpeg: string, stripAll: boolean, overrides: Readonly<Record<string, string>>,
): Promise<string> => {
  const piexif = (await import("piexifjs")).default;
  let output = stripAll ? piexif.remove(encodedJpeg) : encodedJpeg;
  let exif: ReturnType<typeof piexif.load>;
  if (stripAll) {
    exif = { "0th": {}, Exif: {}, GPS: {}, Interop: {}, "1st": {} };
  } else {
    try { exif = piexif.load(sourceJpeg); } catch { exif = { "0th": {}, Exif: {}, GPS: {}, Interop: {}, "1st": {} }; }
  }
  const names: Readonly<Record<string, number>> = {
    Artist: piexif.ImageIFD.Artist, Copyright: piexif.ImageIFD.Copyright,
    ImageDescription: piexif.ImageIFD.ImageDescription, Software: piexif.ImageIFD.Software,
  };
  exif["0th"] ??= {};
  for (const [name, value] of Object.entries(overrides)) if (names[name] !== undefined) exif["0th"][names[name]] = value;
  if (Object.keys(exif["0th"] ?? {}).length || Object.keys(exif.Exif ?? {}).length || Object.keys(exif.GPS ?? {}).length) {
    output = piexif.insert(piexif.dump(exif), output);
  }
  return output;
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

const blobDataUrl = async (blob: Blob): Promise<string> => {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000) binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return `data:${blob.type};base64,${btoa(binary)}`;
};

const dataUrlBlob = (url: string): Blob => {
  const [header, encoded] = url.split(",", 2);
  const mime = /^data:([^;]+)/.exec(header ?? "")?.[1] ?? "image/jpeg";
  const binary = atob(encoded ?? "");
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return new Blob([bytes], { type: mime });
};

export const convertRaster = async (
  request: RasterRequest,
  dependencies: RasterDependencies,
  cancellations: CancellationRegistry,
): Promise<Blob> => {
  let bitmap: ImageBitmap | null = null;
  try {
    throwIfCancelled(request.jobId, cancellations);
    if (request.quality !== undefined && (!Number.isFinite(request.quality) || request.quality < 0 || request.quality > 1)) {
      throw new RangeError("Image quality must be between 0 and 1");
    }
    if (request.maxWidth !== undefined && (!Number.isInteger(request.maxWidth) || request.maxWidth < 1)) {
      throw new RangeError("Maximum image width must be a positive integer");
    }

    bitmap = await dependencies.decode(request.source);
    throwIfCancelled(request.jobId, cancellations);

    const expectedType = getRasterMimeType(request.target);
    let output = await dependencies.encode(bitmap, expectedType, request.quality, request.target === "ico" ? undefined : request.maxWidth);
    throwIfCancelled(request.jobId, cancellations);

    if (request.target === "jpeg" && request.metadataPolicy) {
      const encodedUrl = await blobDataUrl(output);
      const sourceUrl = request.source.type === "image/jpeg" ? await blobDataUrl(request.source) : encodedUrl;
      output = dataUrlBlob(await applyJpegMetadata(sourceUrl, encodedUrl, request.metadataPolicy.stripAllMetadata, request.metadataPolicy.overrides));
    }

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
  encode: async (bitmap, mimeType, quality, maxWidth) => {
    if (mimeType === "image/x-icon") {
      const sizes = [16, 32, 48, 64, 128, 256].filter((size) => size <= Math.max(bitmap.width, bitmap.height));
      const canvases = await Promise.all((sizes.length ? sizes : [16]).map(async (size) => {
        const canvas = new OffscreenCanvas(size, size);
        const context = canvas.getContext("2d");
        if (!context) throw new Error("2D canvas context unavailable");
        context.clearRect(0, 0, size, size);
        const scale = Math.min(size / bitmap.width, size / bitmap.height);
        const width = Math.max(1, Math.round(bitmap.width * scale));
        const height = Math.max(1, Math.round(bitmap.height * scale));
        context.drawImage(bitmap, Math.floor((size - width) / 2), Math.floor((size - height) / 2), width, height);
        return canvas.convertToBlob({ type: "image/png" });
      }));
      return encodeIco(canvases);
    }
    const scale = maxWidth ? Math.min(1, maxWidth / bitmap.width) : 1;
    const outputWidth = Math.max(1, Math.round(bitmap.width * scale));
    const outputHeight = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(outputWidth, outputHeight);
    const context = canvas.getContext("2d");
    if (!context) {
      throw new Error("2D canvas context unavailable");
    }
    context.drawImage(bitmap, 0, 0, outputWidth, outputHeight);

    if (mimeType === "image/bmp") {
      const pixels = context.getImageData(0, 0, outputWidth, outputHeight);
      return encodeBmp(outputWidth, outputHeight, pixels.data);
    }

    const options: ImageEncodeOptions = { type: mimeType };
    if (quality !== undefined && mimeType !== "image/png") {
      options.quality = Math.min(1, Math.max(0, quality));
    }
    return canvas.convertToBlob(options);
  },
};

export const probeRasterEncoder = async (target: RasterTarget): Promise<boolean> => {
  if (target === "png" || target === "bmp" || target === "ico") {
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
