import { describe, expect, it } from "vitest";
import { getCompatibleTargets } from "../../src/core/compatibilityMatrix";
import { createQueuedJob, updateJob } from "../../src/core/jobStore";
import type { DetectedFormat } from "../../src/core/types";

const detected = (overrides: Partial<DetectedFormat>): DetectedFormat => ({
  format: "png",
  mime: "image/png",
  domain: "image",
  evidence: "signature",
  needsProbe: false,
  ...overrides,
});

describe("getCompatibleTargets", () => {
  it("keeps image conversions inside image/PDF routes and capability-gates AVIF", () => {
    const source = detected({ format: "png", domain: "image" });
    expect(getCompatibleTargets(source)).toEqual(["png", "jpeg", "webp", "bmp", "ico", "pdf"]);
    expect(getCompatibleTargets(source, { avifEncode: true })).toEqual([
      "png",
      "jpeg",
      "webp",
      "avif",
      "bmp",
      "ico",
      "pdf",
    ]);
  });

  it("keeps audio routes audio-only", () => {
    expect(getCompatibleTargets(detected({ format: "wav", mime: "audio/wav", domain: "audio" }))).toEqual([
      "wav",
      "mp3",
      "flac",
      "ogg",
      "aac",
      "m4a",
    ]);
  });

  it("allows video to video or audio extraction targets", () => {
    expect(getCompatibleTargets(detected({ format: "mp4", mime: "video/mp4", domain: "video" }))).toEqual([
      "mp4",
      "webm",
      "mov",
      "gif",
      "mp3",
      "wav",
      "flac",
      "aac",
      "ogg",
    ]);
  });

  it("keeps tabular routes structural and domain-bound", () => {
    expect(getCompatibleTargets(detected({ format: "csv", mime: "text/csv", domain: "tabular" }))).toEqual([
      "csv",
      "tsv",
      "json",
      "md",
      "html",
    ]);
  });

  it("uses source-specific document routes", () => {
    expect(getCompatibleTargets(detected({ format: "pdf", mime: "application/pdf", domain: "document" }))).toEqual([
      "png",
      "jpeg",
      "pdf",
    ]);
    expect(getCompatibleTargets(detected({ format: "md", mime: "text/markdown", domain: "document" }))).toEqual([
      "html",
      "pdf",
    ]);
  });

  it("returns no conversion targets before an ambiguous container is probed", () => {
    expect(
      getCompatibleTargets(
        detected({ format: "ogg", mime: "application/ogg", domain: null, evidence: "container", needsProbe: true }),
      ),
    ).toEqual([]);
  });
});

describe("job store helpers", () => {
  it("creates queued immutable jobs and updates only the addressed job", () => {
    const file = new File(["x"], "sample.png", { type: "image/png" });
    const source = detected({});
    const first = createQueuedJob("job-1", file, source);
    const second = createQueuedJob("job-2", file, source);

    expect(first.status).toBe("QUEUED");
    expect(first.targetFormat).toBeNull();
    expect(first.progressPercent).toBeNull();

    const updated = updateJob([first, second], "job-1", { status: "CONVERTING", progressPercent: 20 });
    expect(updated[0]?.status).toBe("CONVERTING");
    expect(updated[0]?.progressPercent).toBe(20);
    expect(updated[1]).toBe(second);
  });
});
