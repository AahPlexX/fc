import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { JobCard } from "../../src/components/JobCard";
import { MetadataDrawer } from "../../src/components/MetadataDrawer";
import { PreviewModal } from "../../src/components/PreviewModal";
import type { ConversionJob } from "../../src/core/types";

const baseJob = (status: ConversionJob["status"]): ConversionJob => ({
	id: "job-ui",
	sourceFile: new File(["fixture"], "sample.jpg", { type: "image/jpeg" }),
	detectedFormat: {
		format: "jpeg",
		mime: "image/jpeg",
		domain: "image",
		evidence: "signature",
		needsProbe: false,
	},
	targetFormat: "webp",
	status,
	progressPercent: status === "COMPLETED" ? 100 : 0,
	statusMessage: status === "COMPLETED" ? "Complete" : "Queued",
	originalMetadata: [
		{
			key: "Artist",
			label: "Artist",
			value: "Original Artist",
			editable: true,
			category: "exif",
		},
		{
			key: "GPSLatitude",
			label: "GPS Latitude",
			value: "30.4",
			editable: false,
			category: "gps",
		},
	],
	metadataPolicy: { stripAllMetadata: false, overrides: {} },
	outputBlob:
		status === "COMPLETED"
			? new Blob(["converted"], { type: "image/webp" })
			: null,
	outputFileName: status === "COMPLETED" ? "sample-converted.webp" : null,
	startedAtMs: null,
	completedAtMs: status === "COMPLETED" ? 1_000 : null,
	errorDetail: null,
});

describe("Phase 11 workbench dialog contracts", () => {
	it("renders an accessible metadata dialog with privacy and editable-field actions", () => {
		const markup = renderToStaticMarkup(
			<MetadataDrawer
				job={baseJob("QUEUED")}
				onClose={() => undefined}
				onApply={() => undefined}
			/>,
		);

		expect(markup).toContain("<dialog");
		expect(markup).toContain("aria-labelledby");
		expect(markup).toContain("Metadata");
		expect(markup).toContain("sample.jpg");
		expect(markup).toContain("Strip all metadata");
		expect(markup).toContain('name="metadata-Artist"');
		expect(markup).toContain("Original Artist");
		expect(markup).toContain("GPS Latitude");
		expect(markup).toContain("Apply metadata");
		expect(markup).toContain("Apply to matching files");
		expect(markup).toContain("Close");
	});

	it("renders a native preview dialog with an image preview and size delta", () => {
		const markup = renderToStaticMarkup(
			<PreviewModal job={baseJob("COMPLETED")} onClose={() => undefined} />,
		);

		expect(markup).toContain("<dialog");
		expect(markup).toContain("Preview");
		expect(markup).toContain("sample.jpg");
		expect(markup).toContain("Source");
		expect(markup).toContain("Output");
		expect(markup).toContain("Original size");
		expect(markup).toContain("Converted size");
		expect(markup).toContain("Close");
	});

	it("exposes the required queue actions without hiding them behind pointer-only interaction", () => {
		const markup = renderToStaticMarkup(
			<JobCard
				job={baseJob("QUEUED")}
				targets={["jpeg", "webp", "png"]}
				onTargetChange={() => undefined}
				onCancel={() => undefined}
			/>,
		);

		expect(markup).toContain("Convert");
		expect(markup).toContain("Metadata");
		expect(markup).toContain("Preview");
		expect(markup).toContain("Remove");
	});
});
