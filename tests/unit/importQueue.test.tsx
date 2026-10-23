import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DropzoneHeader } from "../../src/components/DropzoneHeader";
import { JobCard } from "../../src/components/JobCard";
import { createQueuedJob } from "../../src/core/jobStore";
import type { DetectedFormat } from "../../src/core/types";

const source: DetectedFormat = {
  format: "png",
  mime: "image/png",
  domain: "image",
  evidence: "signature",
  needsProbe: false,
};

describe("Phase 6 import and queue UI contracts", () => {
  it("exposes native file input parity plus drop, paste, batch, and aggregate progress controls", () => {
    const markup = renderToStaticMarkup(
      <DropzoneHeader
        onFiles={() => undefined}
        batchTargets={["png", "jpeg", "webp", "pdf"]}
        selectedBatchTarget={null}
        onBatchTargetChange={() => undefined}
        stripAllMetadata={false}
        onStripMetadataChange={() => undefined}
        activeCount={2}
        aggregateProgress={50}
      />,
    );

    expect(markup).toContain('type="file"');
    expect(markup).toContain("multiple");
    expect(markup).toContain("Drop files");
    expect(markup).toContain("Choose files");
    expect(markup).toContain("Paste files");
    expect(markup).toContain("Batch target");
    expect(markup).toContain("Strip metadata");
    expect(markup).toContain("Queue progress");
    expect(markup).toContain('value="50"');
  });

  it("renders per-file target selection, progress semantics, and cancellation", () => {
    const job = createQueuedJob("job-1", new File(["png"], "sample.png", { type: "image/png" }), source);
    const markup = renderToStaticMarkup(
      <JobCard
        job={job}
        targets={["png", "jpeg", "webp", "pdf"]}
        onTargetChange={() => undefined}
        onCancel={() => undefined}
      />,
    );

    expect(markup).toContain("sample.png");
    expect(markup).toContain("Target format");
    expect(markup).toContain("progress");
    expect(markup).toContain("Cancel");
  });
});
