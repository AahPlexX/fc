import { describe, expect, it, vi } from "vitest";
import {
  convertRaster,
  createCancellationRegistry,
  getRasterMimeType,
  type RasterDependencies,
} from "../../src/workers/image.worker";
import { normalizeMetadata } from "../../src/workers/metadata.worker";

const createBitmap = (): ImageBitmap =>
  ({ width: 12, height: 8, close: vi.fn() }) as unknown as ImageBitmap;

describe("Phase 7 image and metadata worker contracts", () => {
  it("maps browser-native raster targets to exact MIME types", () => {
    expect(getRasterMimeType("png")).toBe("image/png");
    expect(getRasterMimeType("jpeg")).toBe("image/jpeg");
    expect(getRasterMimeType("webp")).toBe("image/webp");
    expect(getRasterMimeType("avif")).toBe("image/avif");
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
      gps: {
        Latitude: 30.4,
        Longitude: -90.1,
      },
      xmp: {
        _raw: "<script>unsafe()</script>",
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
        { group: "gps", name: "Latitude", value: 30.4 },
      ]),
    );
    expect(entries.some((entry) => entry.group === "xmp" || entry.name === "image")).toBe(false);
  });
});
