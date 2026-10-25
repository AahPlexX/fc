import type { FormatId, MetadataPolicy } from "../core/types";

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

export interface ConvertDocumentRequest {
  readonly jobId: string;
  readonly bytes: Uint8Array;
  readonly source: FormatId;
  readonly target: FormatId;
  readonly policy: MetadataPolicy;
  readonly pageNumbers?: readonly number[];
}

export interface MergePdfRequest {
  readonly jobId: string;
  readonly files: readonly { readonly bytes: Uint8Array; readonly format: FormatId }[];
  readonly policy: MetadataPolicy;
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

const applyPdfPolicy = async (document: import("pdf-lib").PDFDocument, policy: MetadataPolicy): Promise<void> => {
  const { PDFName, PDFRef } = await import("pdf-lib");
  if (policy.stripAllMetadata) {
    const infoRef = document.context.trailerInfo.Info;
    const metadataRef = document.catalog.get(PDFName.of("Metadata"));
    if (infoRef instanceof PDFRef) document.context.delete(infoRef);
    if (metadataRef instanceof PDFRef) document.context.delete(metadataRef);
    delete document.context.trailerInfo.Info;
    document.catalog.delete(PDFName.of("Metadata"));
  }
  const overrides = Object.fromEntries(Object.entries(policy.overrides).map(([key,value])=>[key.toLowerCase(),value]));
  const fields: ReadonlyArray<readonly [string, (value: string) => void]> = [
    ["title", (value) => document.setTitle(value)],
    ["author", (value) => document.setAuthor(value)],
    ["subject", (value) => document.setSubject(value)],
    ["creator", (value) => document.setCreator(value)],
    ["producer", (value) => document.setProducer(value)],
  ];
  for (const [key, setter] of fields) {
    const value = overrides[key];
    if (value !== undefined) setter(value);
  }
  if (overrides.keywords !== undefined) document.setKeywords(overrides.keywords.split(/[,;\s]+/).filter(Boolean));
};

const escapeHtml = (value: string): string => value.replace(/[&<>"']/g, (character) => ({
  "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
})[character] ?? character);

const markdownInline = (value: string): string => {
  let safe = escapeHtml(value);
  safe = safe.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (_whole, label: string, rawUrl: string) => {
    const url = rawUrl.trim();
    if (!/^(https?:|mailto:)/i.test(url)) return label;
    return `<a href="${escapeHtml(url)}">${label}</a>`;
  });
  safe = safe.replace(/`([^`]+)`/g, "<code>$1</code>").replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>").replace(/\*([^*]+)\*/g, "<em>$1</em>");
  return safe;
};

const textAsHtml = (text: string, markdown: boolean): string => {
  const lines = text.replace(/\r\n?/g, "\n").split("\n");
  const blocks: string[] = [];
  let paragraph: string[] = [];
  const flush = (): void => {
    if (paragraph.length) {
      const content = paragraph.join(" ");
      blocks.push(`<p>${markdown ? markdownInline(content) : escapeHtml(content)}</p>`);
      paragraph = [];
    }
  };
  for (const line of lines) {
    if (!line.trim()) { flush(); continue; }
    const heading = markdown ? /^(#{1,6})\s+(.*)$/.exec(line) : null;
    if (heading?.[1] && heading[2] !== undefined) {
      flush();
      const level = heading[1].length;
      blocks.push(`<h${level}>${markdownInline(heading[2])}</h${level}>`);
    } else paragraph.push(line);
  }
  flush();
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Converted document</title></head><body>${blocks.join("\n")}</body></html>`;
};

const createTextPdf = async (text: string, policy: MetadataPolicy): Promise<Uint8Array> => {
  const { PDFDocument, StandardFonts } = await import("pdf-lib");
  const document = await PDFDocument.create({ updateMetadata: false });
  const font = await document.embedFont(StandardFonts.Helvetica);
  const lines: string[] = [];
  for (const sourceLine of text.replace(/\r\n?/g, "\n").split("\n")) {
    let line = "";
    for (const word of sourceLine.split(/\s+/).filter(Boolean)) {
      try { font.encodeText(word); } catch { throw new Error(`PDF font cannot encode unsupported glyph or character in ${JSON.stringify(word)}`); }
      const candidate = line ? `${line} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, 11) <= 515) line = candidate;
      else {
        if (line) lines.push(line);
        if (font.widthOfTextAtSize(word, 11) > 515) throw new Error(`PDF font cannot wrap unsupported glyph or long character sequence ${JSON.stringify(word)}`);
        line = word;
      }
    }
    lines.push(line);
  }
  const pages = [] as ReturnType<typeof document.addPage>[];
  let page = document.addPage([595, 842]);
  pages.push(page);
  let y = 800;
  for (const line of lines) {
    if (y < 40) { page = document.addPage([595, 842]); pages.push(page); y = 800; }
    page.drawText(line, { x: 40, y, size: 11, font });
    y -= 15;
  }
  await applyPdfPolicy(document, policy);
  return document.save();
};

const pdfBlob = async (document: import("pdf-lib").PDFDocument): Promise<Blob> =>
  new Blob([new Uint8Array(await document.save()).buffer as ArrayBuffer], { type: "application/pdf" });

export const convertDocument = async (request: ConvertDocumentRequest): Promise<Blob> => {
  const { PDFDocument } = await import("pdf-lib");
  const { bytes, source, target, policy } = request;
  if ((source === "md" || source === "txt") && target === "html") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return new Blob([textAsHtml(text, source === "md")], { type: "text/html" });
  }
  if ((source === "md" || source === "txt") && target === "pdf") {
    const text = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return new Blob([new Uint8Array(await createTextPdf(text, policy)).buffer as ArrayBuffer], { type: "application/pdf" });
  }
  if ((source === "png" || source === "jpeg") && target === "pdf") {
    const document = await PDFDocument.create({ updateMetadata: false });
    const image = source === "png" ? await document.embedPng(bytes) : await document.embedJpg(bytes);
    const page = document.addPage([image.width, image.height]);
    page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    await applyPdfPolicy(document, policy);
    return pdfBlob(document);
  }
  if (source === "pdf" && target === "pdf") {
    const document = await PDFDocument.load(bytes, { updateMetadata: false });
    if (request.pageNumbers !== undefined) {
      if (!request.pageNumbers.length) throw new RangeError("At least one PDF page must be selected");
      for (const number of request.pageNumbers) {
        if (!Number.isInteger(number) || number < 1 || number > document.getPageCount()) {
          throw new RangeError(`PDF page ${number} is outside the available 1-${document.getPageCount()} range`);
        }
      }
      const selected = await PDFDocument.create({ updateMetadata: false });
      const pages = await selected.copyPages(document, [...request.pageNumbers].map((number) => number - 1));
      for (const copied of pages) selected.addPage(copied);
      await applyPdfPolicy(selected, policy);
      return pdfBlob(selected);
    }
    await applyPdfPolicy(document, policy);
    return pdfBlob(document);
  }
  throw new Error(`Unsupported document conversion: ${source} to ${target}`);
};

export const mergePdfs = async (request: MergePdfRequest): Promise<Blob> => {
  if (!request.files.length) throw new Error("At least one PDF or image is required to merge");
  const { PDFDocument } = await import("pdf-lib");
  const output = await PDFDocument.create({ updateMetadata: false });
  for (const file of request.files) {
    if (file.format === "pdf") {
      const source = await PDFDocument.load(file.bytes, { updateMetadata: false });
      const pages = await output.copyPages(source, source.getPageIndices());
      for (const page of pages) output.addPage(page);
    } else if (file.format === "png" || file.format === "jpeg") {
      const image = file.format === "png" ? await output.embedPng(file.bytes) : await output.embedJpg(file.bytes);
      const page = output.addPage([image.width, image.height]);
      page.drawImage(image, { x: 0, y: 0, width: image.width, height: image.height });
    } else {
      throw new Error(`Cannot merge ${file.format}; expected PDF, PNG, or JPEG`);
    }
  }
  await applyPdfPolicy(output, request.policy);
  return pdfBlob(output);
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
    }
  | { readonly type: "convert-document" } & ConvertDocumentRequest
  | { readonly type: "merge-pdfs" } & MergePdfRequest;

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
        case "convert-document":
          return {
            type: "result",
            jobId: message.jobId,
            blob: await convertDocument(message),
          } as const;
        case "merge-pdfs":
          return {
            type: "result",
            jobId: message.jobId,
            blob: await mergePdfs(message),
          } as const;
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
