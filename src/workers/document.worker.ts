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
  readonly renderToken?: unknown;
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

const normalizeInfoString = (value: string | undefined): string | null => {
  const normalized = value?.trim();
  return normalized ? normalized : null;
};

const normalizeKeywords = (value: string | undefined): readonly string[] => {
  const normalized = value?.trim();
  return normalized ? normalized.split(/\s+/).filter(Boolean) : [];
};

export const readPdfMetadata = async (bytes: Uint8Array): Promise<PdfMetadataSnapshot> => {
  const { PDFDocument } = await import("pdf-lib");
  const document = await PDFDocument.load(bytes, { updateMetadata: false });

  return {
    pageCount: document.getPageCount(),
    title: normalizeInfoString(document.getTitle()),
    author: normalizeInfoString(document.getAuthor()),
    subject: normalizeInfoString(document.getSubject()),
    keywords: normalizeKeywords(document.getKeywords()),
    creator: normalizeInfoString(document.getCreator()),
    producer: normalizeInfoString(document.getProducer()),
  };
};

const setNullableString = (
  value: string | null | undefined,
  setter: (nextValue: string) => void,
): void => {
  if (value !== undefined) {
    setter(value ?? "");
  }
};

export const writePdfMetadata = async (
  bytes: Uint8Array,
  patch: PdfMetadataPatch,
): Promise<Uint8Array> => {
  const { PDFDocument } = await import("pdf-lib");
  const document = await PDFDocument.load(bytes, { updateMetadata: false });

  setNullableString(patch.title, (value) => document.setTitle(value));
  setNullableString(patch.author, (value) => document.setAuthor(value));
  setNullableString(patch.subject, (value) => document.setSubject(value));
  setNullableString(patch.creator, (value) => document.setCreator(value));
  setNullableString(patch.producer, (value) => document.setProducer(value));
  if (patch.keywords !== undefined) {
    document.setKeywords([...patch.keywords]);
  }

  return document.save();
};

const expectedRasterMime = (target: PdfRasterTarget): string =>
  target === "png" ? "image/png" : "image/jpeg";

export const renderPdfPage = async (
  bytes: Uint8Array,
  pageNumber: number,
  scale: number,
  target: PdfRasterTarget,
  dependencies: PdfRenderDependencies,
): Promise<RenderedPdfPage> => {
  if (!Number.isFinite(scale) || scale <= 0) {
    throw new RangeError("PDF render scale must be a finite positive number");
  }

  const document = await dependencies.load(bytes);
  let page: PdfRenderablePage | null = null;

  try {
    if (!Number.isInteger(pageNumber) || pageNumber < 1 || pageNumber > document.numPages) {
      throw new RangeError(`PDF page ${pageNumber} is outside the available 1-${document.numPages} range`);
    }

    page = await document.getPage(pageNumber);
    const viewport = page.getViewport(scale);
    const width = Math.max(1, Math.ceil(viewport.width));
    const height = Math.max(1, Math.ceil(viewport.height));
    const canvas = dependencies.createCanvas(width, height);

    await page.render(canvas, viewport);
    const blob = await dependencies.encode(canvas, target);
    const expectedMime = expectedRasterMime(target);
    if (blob.type !== expectedMime) {
      throw new Error(
        `${target.toUpperCase()} page encoder unavailable: browser returned ${blob.type || "an untyped blob"}`,
      );
    }

    return { blob, pageNumber, pageCount: document.numPages, width, height };
  } finally {
    page?.cleanup();
    await document.destroy();
  }
};

const createBrowserRenderDependencies = async (): Promise<PdfRenderDependencies> => {
  const [pdfjs, workerAsset] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = workerAsset.default;

  return {
    load: async (bytes) => {
      const loadingTask = pdfjs.getDocument({ data: bytes });
      const document = await loadingTask.promise;

      return {
        numPages: document.numPages,
        getPage: async (pageNumber) => {
          const page = await document.getPage(pageNumber);
          return {
            getViewport: (scale) => {
              const viewport = page.getViewport({ scale });
              return { width: viewport.width, height: viewport.height, renderToken: viewport };
            },
            render: async (canvas, viewport) => {
              const context = canvas.getContext("2d");
              if (!context) {
                throw new Error("2D canvas context unavailable for PDF rendering");
              }
              const renderTask = page.render({
                canvas: null,
                canvasContext: context as unknown as CanvasRenderingContext2D,
                viewport: viewport.renderToken as ReturnType<typeof page.getViewport>,
              });
              await renderTask.promise;
            },
            cleanup: () => page.cleanup(),
          };
        },
        destroy: async () => {
          await loadingTask.destroy();
        },
      };
    },
    createCanvas: (width, height) => new OffscreenCanvas(width, height),
    encode: async (canvas, target, quality) => {
      const type = expectedRasterMime(target);
      const options: ImageEncodeOptions = { type };
      if (quality !== undefined && target === "jpeg") {
        options.quality = Math.min(1, Math.max(0, quality));
      }
      return canvas.convertToBlob(options);
    },
  };
};

type DocumentWorkerMessage =
  | { readonly type: "metadata-read"; readonly jobId: string; readonly bytes: Uint8Array }
  | {
      readonly type: "metadata-write";
      readonly jobId: string;
      readonly bytes: Uint8Array;
      readonly patch: PdfMetadataPatch;
    }
  | {
      readonly type: "render-page";
      readonly jobId: string;
      readonly bytes: Uint8Array;
      readonly pageNumber: number;
      readonly scale: number;
      readonly target: PdfRasterTarget;
    };

const isDedicatedWorkerScope = (): boolean =>
  typeof WorkerGlobalScope !== "undefined" && globalThis instanceof WorkerGlobalScope;

if (isDedicatedWorkerScope()) {
  const scope = globalThis as unknown as DedicatedWorkerGlobalScope;
  scope.addEventListener("message", (event: MessageEvent<DocumentWorkerMessage>) => {
    const message = event.data;

    void (async () => {
      switch (message.type) {
        case "metadata-read":
          return { type: "metadata", jobId: message.jobId, metadata: await readPdfMetadata(message.bytes) } as const;
        case "metadata-write":
          return {
            type: "pdf-bytes",
            jobId: message.jobId,
            bytes: await writePdfMetadata(message.bytes, message.patch),
          } as const;
        case "render-page": {
          const dependencies = await createBrowserRenderDependencies();
          return {
            type: "rendered-page",
            jobId: message.jobId,
            result: await renderPdfPage(
              message.bytes,
              message.pageNumber,
              message.scale,
              message.target,
              dependencies,
            ),
          } as const;
        }
      }
    })()
      .then((response) => scope.postMessage(response))
      .catch((error: unknown) => {
        scope.postMessage({
          type: "error",
          jobId: message.jobId,
          message: error instanceof Error ? error.message : "PDF operation failed",
        });
      });
  });
}
