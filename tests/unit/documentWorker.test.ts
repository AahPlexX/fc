import { describe, expect, it, vi } from "vitest";
import type { MetadataPolicy } from "../../src/core/types";
import {
  convertDocument,
  mergePdfs,
  type PdfRenderDependencies,
  readPdfMetadata,
  renderPdfPage,
  writePdfMetadata,
} from "../../src/workers/document.worker";
import { createPdfFixture } from "../fixtures/pdf";

const keepMetadata: MetadataPolicy = { stripAllMetadata: false, overrides: {} };

describe("Phase 9 PDF/document worker contracts", () => {
  it("reads document-info metadata and page count from PDF bytes", async () => {
    const bytes = await createPdfFixture();

    await expect(readPdfMetadata(bytes)).resolves.toEqual({
      pageCount: 2,
      title: "OmniConvert fixture",
      author: "AahPlexX",
      subject: "Phase 9 document worker",
      keywords: ["omniconvert", "fixture"],
      creator: "OmniConvert tests",
      producer: "pdf-lib fixture",
    });
  });

  it("writes metadata overrides back to PDF bytes without changing page count", async () => {
    const bytes = await createPdfFixture();
    const updated = await writePdfMetadata(bytes, {
      title: "Updated title",
      author: null,
      keywords: ["updated", "local"],
    });

    await expect(readPdfMetadata(updated)).resolves.toMatchObject({
      pageCount: 2,
      title: "Updated title",
      author: null,
      keywords: ["updated", "local"],
    });
  });

  it("renders a validated 1-based page and always releases page/document resources", async () => {
    const cleanup = vi.fn();
    const destroy = vi.fn(async () => undefined);
    const render = vi.fn(async () => undefined);
    const canvas = { width: 301, height: 151 } as OffscreenCanvas;
    const dependencies: PdfRenderDependencies = {
      load: vi.fn(async () => ({
        numPages: 2,
        getPage: vi.fn(async (pageNumber: number) => {
          expect(pageNumber).toBe(2);
          return {
            getViewport: (scale: number) => {
              expect(scale).toBe(1.5);
              return { width: 300.2, height: 150.4 };
            },
            render,
            cleanup,
          };
        }),
        destroy,
      })),
      createCanvas: vi.fn((width, height) => {
        expect(width).toBe(301);
        expect(height).toBe(151);
        return canvas;
      }),
      encode: vi.fn(async (_canvas, target) => new Blob([target], { type: "image/png" })),
    };

    await expect(renderPdfPage(new Uint8Array([1, 2, 3]), 2, 1.5, "png", dependencies)).resolves.toMatchObject({
      pageNumber: 2,
      pageCount: 2,
      width: 301,
      height: 151,
    });
    expect(render).toHaveBeenCalledOnce();
    expect(cleanup).toHaveBeenCalledOnce();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("rejects out-of-range pages before rendering and still destroys the loaded document", async () => {
    const destroy = vi.fn(async () => undefined);
    const getPage = vi.fn();
    const dependencies: PdfRenderDependencies = {
      load: vi.fn(async () => ({ numPages: 2, getPage, destroy })),
      createCanvas: vi.fn(),
      encode: vi.fn(),
    };

    await expect(renderPdfPage(new Uint8Array([1]), 3, 1, "jpeg", dependencies)).rejects.toThrow(/page 3/i);
    expect(getPage).not.toHaveBeenCalled();
    expect(destroy).toHaveBeenCalledOnce();
  });

  it("extracts the validated requested PDF pages and strips info, XMP, and dates", async () => {
    const bytes = await createPdfFixture();
    const output = await convertDocument({
      jobId: "extract",
      bytes,
      source: "pdf",
      target: "pdf",
      policy: { stripAllMetadata: true, overrides: { title: "kept override" } },
      pageNumbers: [2],
    });
    const { PDFDocument, PDFName } = await import("pdf-lib");
    const result = await PDFDocument.load(new Uint8Array(await output.arrayBuffer()), { updateMetadata: false });

    expect(result.getPageCount()).toBe(1);
    expect(result.getTitle()).toBe("kept override");
    expect(result.getAuthor()).toBeUndefined();
    expect(result.getCreationDate()).toBeUndefined();
    expect(result.getModificationDate()).toBeUndefined();
    expect(result.getCreator()).toBeUndefined();
    expect(result.getProducer()).toBeUndefined();
    expect(result.catalog.get(PDFName.of("Metadata"))).toBeUndefined();
  });

  it("converts text and Markdown to safe standalone HTML and paginated PDFs", async () => {
    const source = new TextEncoder().encode("# Hello\n\nA <script> tag and [link](javascript:alert(1)).");
    const html = await convertDocument({ jobId: "html", bytes: source, source: "md", target: "html", policy: keepMetadata });
    const htmlText = await html.text();
    expect(html.type).toBe("text/html");
    expect(htmlText).toContain("<h1>Hello</h1>");
    expect(htmlText).toContain("&lt;script&gt;");
    expect(htmlText).not.toContain("javascript:");

    const pdf = await convertDocument({ jobId: "text-pdf", bytes: new TextEncoder().encode("Line one\r\nLine two"), source: "txt", target: "pdf", policy: keepMetadata });
    const { PDFDocument } = await import("pdf-lib");
    const parsed = await PDFDocument.load(new Uint8Array(await pdf.arrayBuffer()));
    expect(parsed.getPageCount()).toBeGreaterThanOrEqual(1);
  });

  it("merges PDF and image inputs and rejects invalid page selections or unsupported PDF glyphs", async () => {
    const bytes = await createPdfFixture();
    const merged = await mergePdfs({
      jobId: "merge",
      files: [{ bytes, format: "pdf" }, { bytes: Uint8Array.from(atob("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jL9sAAAAASUVORK5CYII="), (character) => character.charCodeAt(0)), format: "png" }],
      policy: keepMetadata,
    });
    expect(merged.type).toBe("application/pdf");
    await expect(convertDocument({ jobId: "bad-page", bytes, source: "pdf", target: "pdf", policy: keepMetadata, pageNumbers: [0] })).rejects.toThrow(/page/i);
    await expect(convertDocument({ jobId: "glyph", bytes: new TextEncoder().encode("漢字"), source: "txt", target: "pdf", policy: keepMetadata })).rejects.toThrow(/glyph|character/i);
  });
});

it('privacy stripping removes orphaned Info objects as well as dictionary references',async()=>{
 const {PDFDocument}=await import('pdf-lib');
 const output=await convertDocument({jobId:'strip-orphan',bytes:await createPdfFixture(),source:'pdf',target:'pdf',policy:{stripAllMetadata:true,overrides:{Title:'Public title'}}});
 const pdf=await PDFDocument.load(await output.arrayBuffer(),{updateMetadata:false});
 expect(pdf.getTitle()).toBe('Public title');
 expect(pdf.context.enumerateIndirectObjects().map(([,object])=>object.toString()).join('\n')).not.toContain('/Author');
});
