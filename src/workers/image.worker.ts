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

export const getRasterMimeType = (_target: RasterTarget): string => "application/octet-stream";

export const createCancellationRegistry = (): CancellationRegistry => ({
  cancel: () => undefined,
  clear: () => undefined,
  isCancelled: () => false,
});

export const convertRaster = async (
  _request: RasterRequest,
  _dependencies: RasterDependencies,
  _cancellations: CancellationRegistry,
): Promise<Blob> => new Blob();
