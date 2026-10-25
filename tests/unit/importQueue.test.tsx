import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { DropzoneHeader } from "../../src/components/DropzoneHeader";
import { JobCard } from "../../src/components/JobCard";
import { MetadataDrawer } from "../../src/components/MetadataDrawer";
import { PreviewModal } from "../../src/components/PreviewModal";
import { createQueuedJob } from "../../src/core/jobStore";
import type { ConversionJob, DetectedFormat } from "../../src/core/types";

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

  it("renders metadata inspection, supported editable fields, and privacy policy controls", () => {
    const job: ConversionJob = {
      ...createQueuedJob("meta-1", new File(["image"], "portrait.jpg", { type: "image/jpeg" }), {
        ...source,
        format: "jpeg",
        mime: "image/jpeg",
      }),
      originalMetadata: [
        { key: "Artist", label: "Artist", value: "Ada", editable: true, category: "exif" },
        { key: "GPSLatitude", label: "GPS Latitude", value: "51.5", editable: false, category: "gps" },
      ],
    };
    const markup = renderToStaticMarkup(
      <MetadataDrawer job={job} onClose={() => undefined} onApply={() => undefined} />,
    );

    expect(markup).toContain("Metadata");
    expect(markup).toContain("Artist");
    expect(markup).toContain("GPS Latitude");
    expect(markup).toContain("Strip all metadata");
    expect(markup).toContain("Image re-encoding strips source metadata");
    expect(markup).toContain("Apply metadata");
    expect(markup).not.toContain('name="GPSLatitude"');
  });

  it("renders safe previews by media domain and explains PDF download", () => {
    const job = {
      ...createQueuedJob("preview-1", new File(["<script>unsafe()</script>"], "table.html", { type: "text/html" }), {
        format: "html",
        mime: "text/html",
        domain: "tabular",
        evidence: "structural",
        needsProbe: false,
      }),
      outputBlob: new Blob(["<script>alsoUnsafe()</script>"], { type: "text/html" }),
    };
    const markup = renderToStaticMarkup(<PreviewModal job={job} onClose={() => undefined} />);

    expect(markup).toContain("Preview");
    expect(markup).toContain("Plain text preview");
    expect(markup).not.toContain("<iframe");
    expect(markup).not.toContain("<script>");

    const pdf = createQueuedJob("preview-2", new File(["pdf"], "report.pdf", { type: "application/pdf" }), {
      format: "pdf",
      mime: "application/pdf",
      domain: "document",
      evidence: "signature",
      needsProbe: false,
    });
    const pdfMarkup = renderToStaticMarkup(<PreviewModal job={pdf} onClose={() => undefined} />);
    expect(pdfMarkup).toContain("For safety, download the PDF to view it");
    expect(pdfMarkup).not.toContain("<iframe");
  });
});
