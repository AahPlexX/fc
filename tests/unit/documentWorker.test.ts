import { describe, expect, it, vi } from "vitest";
import {
  readPdfMetadata,
  renderPdfPage,
  writePdfMetadata,
  type PdfRenderDependencies,
} from "../../src/workers/document.worker";
import { createPdfFixture } from "../fixtures/pdf";

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
});
