import { describe, expect, it, vi } from "vitest";
import {
  convertRaster,
  createCancellationRegistry,
  getRasterMimeType,
  applyJpegMetadata,
  encodeBmp,
  encodeIco,
  type RasterDependencies,
} from "../../src/workers/image.worker";
import { detectFileFormat, inspectPdfMetadata, normalizeMetadata } from "../../src/workers/metadata.worker";

const createBitmap = (): ImageBitmap =>
  ({ width: 12, height: 8, close: vi.fn() }) as unknown as ImageBitmap;

describe("Phase 7 image and metadata worker contracts", () => {
  it("detects binary signatures from the header and structural text from file bytes", async () => {
    const binary = new File([new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])], "misleading.txt", { type: "text/plain" });
    const json = new File(['{"items":[1,2]}'], "unknown.bin", { type: "application/octet-stream" });
    expect((await detectFileFormat(binary))?.format).toBe("png");
    expect((await detectFileFormat(json))?.format).toBe("json");
  });

  it("maps browser-native raster targets to exact MIME types", () => {
    expect(getRasterMimeType("png")).toBe("image/png");
    expect(getRasterMimeType("jpeg")).toBe("image/jpeg");
    expect(getRasterMimeType("webp")).toBe("image/webp");
    expect(getRasterMimeType("avif")).toBe("image/avif");
    expect(getRasterMimeType("bmp")).toBe("image/bmp");
    expect(getRasterMimeType("ico")).toBe("image/x-icon");
  });

  it("encodes BMP pixels with a valid bitmap header", async () => {
    const blob = encodeBmp(1, 1, new Uint8ClampedArray([255, 0, 0, 255]));
    const bytes = new Uint8Array(await blob.arrayBuffer());
    expect(blob.type).toBe("image/bmp");
    expect(String.fromCharCode(bytes[0] ?? 0, bytes[1] ?? 0)).toBe("BM");
    expect(new DataView(bytes.buffer).getUint32(2, true)).toBe(bytes.length);
  });

  it("writes a multi-resolution ICO directory with PNG payloads", async () => {
    const png = new Blob([new Uint8Array([137, 80, 78, 71])], { type: "image/png" });
    const blob = await encodeIco([png, png]);
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const view = new DataView(bytes.buffer);
    expect(blob.type).toBe("image/x-icon");
    expect(view.getUint16(2, true)).toBe(1);
    expect(view.getUint16(4, true)).toBe(2);
    expect(view.getUint32(18, true)).toBe(38);
  });

  it("rejects malformed JPEG data instead of claiming metadata was written", async () => {
    const source = "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAtRAAAgEDAwIEAwUFBAQAAAF9AQIDAAQRBRIhMUEGE1FhByJxFDKBkaEII0KxwRVS0fAkM2JyggkKFhcYGRolJicoKSo0NTY3ODk6Q0RFRkdISUpTVFVWV1hZWmNkZWZnaGlqc3R1dnd4eXqDhIWGh4iJipKTlJWWl5iZmqKjpKWmp6ipqrKztLW2t7i5usLDxMXGx8jJytLT1NXW19jZ2uHi4+Tl5ufo6erx8vP09fb3+Pn6/8QAHwEAAwEBAQEBAQEBAQAAAAAAAAECAwQFBgcICQoL/8QAtREAAgECBAQDBAcFBAQAAQJ3AAECAxEEBSExBhJBUQdhcRMiMoEIFEKRobHBCSMzUvAVYnLRChYkNOEl8RcYGRomJygpKjU2Nzg5OkNERUZHSElKU1RVVldYWVpjZGVmZ2hpanN0dXZ3eHl6goOEhYaHiImKkpOUlZaXmJmaoqOkpaanqKmqsrO0tba3uLm6wsPExcbHyMnK0tPU1dbX2Nna4uPk5ebn6Onq8vP09fb3+Pn6/9oADAMBAAIRAxEAPwDi6KKK+ZP3E//Z";
    await expect(applyJpegMetadata(source, source, false, { Artist: "Ada" })).rejects.toThrow();
  });

  it("rejects silent encoder fallback when AVIF is requested", async () => {
    const bitmap = createBitmap();
    const dependencies: RasterDependencies = {
      decode: vi.fn(async () => bitmap),
      encode: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
    };

    await expect(
      convertRaster(
        { jobId: "job-avif", source: new Blob(["source"], { type: "image/png" }), target: "avif" },
        dependencies,
        createCancellationRegistry(),
      ),
    ).rejects.toThrow(/AVIF/i);
    expect(bitmap.close).toHaveBeenCalledOnce();
  });

  it("honors cancellation before expensive raster work", async () => {
    const cancellations = createCancellationRegistry();
    cancellations.cancel("job-cancelled");
    const dependencies: RasterDependencies = {
      decode: vi.fn(async () => createBitmap()),
      encode: vi.fn(async () => new Blob(["png"], { type: "image/png" })),
    };

    await expect(
      convertRaster(
        { jobId: "job-cancelled", source: new Blob(["source"]), target: "png" },
        dependencies,
        cancellations,
      ),
    ).rejects.toThrow(/cancel/i);
    expect(dependencies.decode).not.toHaveBeenCalled();
  });

  it("normalizes safe metadata values while dropping raw XMP and binary payloads", () => {
    const entries = normalizeMetadata({
      file: {
        FileType: { value: "jpeg", description: "JPEG" },
        "Image Width": { value: 1920, description: "1920" },
      },
      exif: {
        Make: { value: "Camera Co", description: "Camera Co" },
      },
      iptc: { Byline: { value: "Ada", description: "Ada" } },
      xmp: { Title: { value: "A safe title" }, _raw: "<script>unsafe()</script>" },
      gps: {
        Latitude: 30.4,
        Longitude: -90.1,
      },
      Thumbnail: {
        image: new Uint8Array([1, 2, 3]).buffer,
      },
    });

    expect(entries).toEqual(
      expect.arrayContaining([
        { group: "file", name: "FileType", value: "jpeg" },
        { group: "file", name: "Image Width", value: 1920 },
        { group: "exif", name: "Make", value: "Camera Co" },
        { group: "iptc", name: "Byline", value: "Ada" },
        { group: "xmp", name: "Title", value: "A safe title" },
        { group: "gps", name: "Latitude", value: 30.4 },
      ]),
    );
    expect(entries.some((entry) => entry.name === "_raw" || entry.name === "image")).toBe(false);
  });

  it("inspects PDF creation and modification dates as deterministic ISO values", async () => {
    const { PDFDocument } = await import("pdf-lib");
    const document = await PDFDocument.create();
    document.addPage();
    document.setCreationDate(new Date("2024-01-02T03:04:05.000Z"));
    document.setModificationDate(new Date("2025-06-07T08:09:10.000Z"));
    const bytes = new Uint8Array(await document.save());

    const metadata = await inspectPdfMetadata(bytes);
    expect(metadata).toEqual(
      expect.arrayContaining([
        { group: "pdf", name: "creationDate", value: "2024-01-02T03:04:05.000Z" },
        { group: "pdf", name: "modificationDate", value: "2025-06-07T08:09:10.000Z" },
      ]),
    );
  });
});
