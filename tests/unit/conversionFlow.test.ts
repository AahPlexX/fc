import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";
import {
  buildMediaCommand,
  ConversionOrchestrator,
  planConversion,
  type ConversionRuntime,
  type ConversionUpdate,
} from "../../src/core/conversionOrchestrator";
import {
  buildOutputFileName,
  createBatchArchive,
  deduplicateFileNames,
} from "../../src/core/exportManager";
import { runConversion } from "../../src/core/conversionRunner";
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
  it.each(["failure", "cancellation"] as const)("releases every worker when image preparation ends in %s", async (outcome) => {
    const workers: { terminate: ReturnType<typeof vi.fn> }[] = [];
    let markStarted: () => void = () => undefined;
    const started = new Promise<void>((resolve) => { markStarted = resolve; });
    class TestWorker {
      onmessage: ((event: MessageEvent) => void) | null = null;
      onerror: ((event: ErrorEvent) => void) | null = null;
      terminate = vi.fn();
      constructor() { workers.push(this); }
      postMessage(message: { request: { jobId: string } }) {
        markStarted();
        if (outcome === "failure") queueMicrotask(() => this.onmessage?.({
          data: { jobId: message.request.jobId, type: "error", message: "Image decoding failed" },
        } as MessageEvent));
      }
    }
    vi.stubGlobal("Worker", TestWorker);
    try {
      const controller = new AbortController();
      const pending = runConversion(job("png", "image", "pdf"), controller.signal, () => undefined);
      const rejected = expect(pending).rejects.toThrow(outcome === "failure" ? /decoding failed/i : /cancel/i);
      await started;
      if (outcome === "cancellation") controller.abort();
      await rejected;
      expect(workers.length).toBeGreaterThan(0);
      expect(workers.every((worker) => worker.terminate.mock.calls.length === 1)).toBe(true);
    } finally {
      vi.unstubAllGlobals();
    }
  });

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

  it("dispatches a planned job through the matching runtime and reports loading/converting telemetry", async () => {
    const output = new Blob(["converted"], { type: "image/webp" });
    const runtime: ConversionRuntime = {
      image: vi.fn(async () => output),
      tabular: vi.fn(async () => new Blob()),
      document: vi.fn(async () => new Blob()),
      media: vi.fn(async () => new Blob()),
    };
    const orchestrator = new ConversionOrchestrator(runtime);
    const updates: ConversionUpdate[] = [];
    const sourceJob = job("jpeg", "image", "webp", "portrait.jpg");

    await expect(orchestrator.convert(sourceJob, (update) => updates.push(update))).resolves.toEqual({
      blob: output,
      outputName: "portrait-converted.webp",
    });
    expect(runtime.image).toHaveBeenCalledOnce();
    expect(runtime.tabular).not.toHaveBeenCalled();
    expect(updates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ status: "INITIALIZING_ENGINE", progressPercent: null }),
        expect.objectContaining({ status: "CONVERTING" }),
      ]),
    );
  });
});
