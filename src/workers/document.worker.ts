export interface PdfMetadataSnapshot {
  readonly pageCount: number;
  readonly title: string | null;
  readonly author: string | null;
  readonly subject: string | null;
  readonly keywords: readonly string[];
  readonly creator: string | null;
  readonly producer: string | null;
}

export interface PdfMetadataPatch {
  readonly title?: string | null;
  readonly author?: string | null;
  readonly subject?: string | null;
  readonly keywords?: readonly string[];
  readonly creator?: string | null;
  readonly producer?: string | null;
}

export type PdfRasterTarget = "png" | "jpeg";

export interface PdfPageViewport {
  readonly width: number;
  readonly height: number;
}

export interface PdfRenderablePage {
  readonly getViewport: (scale: number) => PdfPageViewport;
  readonly render: (canvas: OffscreenCanvas, viewport: PdfPageViewport) => Promise<void>;
  readonly cleanup: () => void;
}

export interface PdfRenderableDocument {
  readonly numPages: number;
  readonly getPage: (pageNumber: number) => Promise<PdfRenderablePage>;
  readonly destroy: () => Promise<void>;
}

export interface PdfRenderDependencies {
  readonly load: (bytes: Uint8Array) => Promise<PdfRenderableDocument>;
  readonly createCanvas: (width: number, height: number) => OffscreenCanvas;
  readonly encode: (canvas: OffscreenCanvas, target: PdfRasterTarget, quality?: number) => Promise<Blob>;
}

export interface RenderedPdfPage {
  readonly blob: Blob;
  readonly pageNumber: number;
  readonly pageCount: number;
  readonly width: number;
  readonly height: number;
}

export const readPdfMetadata = async (_bytes: Uint8Array): Promise<PdfMetadataSnapshot> => ({
  pageCount: 0,
  title: null,
  author: null,
  subject: null,
  keywords: [],
  creator: null,
  producer: null,
});

export const writePdfMetadata = async (
  bytes: Uint8Array,
  _patch: PdfMetadataPatch,
): Promise<Uint8Array> => bytes;

export const renderPdfPage = async (
  _bytes: Uint8Array,
  _pageNumber: number,
  _scale: number,
  _target: PdfRasterTarget,
  _dependencies: PdfRenderDependencies,
): Promise<RenderedPdfPage> => ({
  blob: new Blob(),
  pageNumber: 0,
  pageCount: 0,
  width: 0,
  height: 0,
});
