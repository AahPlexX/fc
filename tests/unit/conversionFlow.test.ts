import JSZip from "jszip";
import { describe, expect, it } from "vitest";
import { buildMediaCommand, planConversion } from "../../src/core/conversionOrchestrator";
import {
  buildOutputFileName,
  createBatchArchive,
  deduplicateFileNames,
} from "../../src/core/exportManager";
import type { ConversionJob, DetectedFormat, FormatId, MediaDomain } from "../../src/core/types";

const job = (
  format: FormatId,
  domain: MediaDomain,
  targetFormat: FormatId,
  fileName = `sample.${format}`,
  metadataOverrides: Readonly<Record<string, string>> = {},
  stripAllMetadata = false,
): ConversionJob => ({
  id: `job-${format}-${targetFormat}`,
  sourceFile: new File(["fixture"], fileName, { type: "application/octet-stream" }),
  detectedFormat: {
    format,
    mime: "application/octet-stream",
    domain,
    evidence: "signature",
    needsProbe: false,
  } satisfies DetectedFormat,
  targetFormat,
  status: "QUEUED",
  progressPercent: 0,
  statusMessage: "Queued",
  originalMetadata: [],
  metadataPolicy: { stripAllMetadata, overrides: metadataOverrides },
  outputBlob: null,
  outputFileName: null,
  startedAtMs: null,
  completedAtMs: null,
  errorDetail: null,
});

describe("Phase 12 conversion and export contracts", () => {
  it("plans each implemented conversion domain and rejects invalid target pairs", () => {
    expect(planConversion(job("jpeg", "image", "webp", "portrait.jpg"))).toEqual({
      engine: "image",
      target: "webp",
      outputName: "portrait-converted.webp",
    });
    expect(planConversion(job("csv", "tabular", "json", "report.csv"))).toMatchObject({ engine: "tabular" });
    expect(planConversion(job("pdf", "document", "jpeg", "paper.pdf"))).toMatchObject({ engine: "document" });
    expect(planConversion(job("wav", "audio", "mp3", "voice.wav"))).toMatchObject({ engine: "media" });
    expect(() => planConversion(job("wav", "audio", "png", "voice.wav"))).toThrow(/compatible/i);
  });

  it("builds metadata-aware audio extraction commands", () => {
    const command = buildMediaCommand(
      job(
        "mp4",
        "video",
        "mp3",
        "clip.mp4",
        { Artist: "Ada", Title: "Local Mix", Comment: "Private export" },
        true,
      ),
    );

    expect(command.inputName).toMatch(/\.mp4$/);
    expect(command.outputName).toMatch(/\.mp3$/);
    expect(command.args).toEqual(
      expect.arrayContaining([
        "-i",
        command.inputName,
        "-vn",
        "-c:a",
        "libmp3lame",
        "-map_metadata",
        "-1",
        "-metadata",
        "artist=Ada",
        "-metadata",
        "title=Local Mix",
        "-metadata",
        "comment=Private export",
        command.outputName,
      ]),
    );
    expect(command.progressReliable).toBe(true);
  });

  it("builds stable converted names and resolves archive collisions deterministically", () => {
    expect(buildOutputFileName("report.final.csv", "json")).toBe("report.final-converted.json");
    expect(buildOutputFileName("README", "html")).toBe("README-converted.html");
    expect(deduplicateFileNames(["photo.webp", "photo.webp", "photo.webp", "data.json"])).toEqual([
      "photo.webp",
      "photo (2).webp",
      "photo (3).webp",
      "data.json",
    ]);
  });

  it("packages Blob outputs into a readable ZIP with collision-safe names", async () => {
    const archive = await createBatchArchive([
      { name: "result.txt", blob: new Blob(["first"], { type: "text/plain" }) },
      { name: "result.txt", blob: new Blob(["second"], { type: "text/plain" }) },
    ]);

    expect(archive.type).toBe("application/zip");
    const zip = await JSZip.loadAsync(await archive.arrayBuffer());
    expect(Object.keys(zip.files).sort()).toEqual(["result (2).txt", "result.txt"]);
    await expect(zip.file("result.txt")?.async("string")).resolves.toBe("first");
    await expect(zip.file("result (2).txt")?.async("string")).resolves.toBe("second");
  });
});
