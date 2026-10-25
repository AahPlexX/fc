import type { ConversionJob, FormatId } from "../core/types";

export interface JobCardProps {
	readonly job: ConversionJob;
	readonly targets: readonly FormatId[];
	readonly onTargetChange: (jobId: string, target: FormatId | null) => void;
	readonly onCancel: (jobId: string) => void;
	readonly onConvert?: () => void;
	readonly onMetadata?: () => void;
	readonly onPreview?: () => void;
	readonly onDownload?: () => void;
	readonly onRemove?: () => void;
	readonly onPagesChange?: (pages: readonly number[]) => void;
	readonly onImageOptionsChange?: (options: {
		quality: number;
		maxWidth: number;
	}) => void;
	readonly busy?: boolean;
	readonly now?: number;
}

const TERMINAL_STATUSES = new Set<ConversionJob["status"]>([
	"COMPLETED",
	"CANCELLED",
	"FAILED",
]);

const formatBytes = (bytes: number): string => {
	if (bytes < 1024) {
		return `${bytes} B`;
	}
	if (bytes < 1024 * 1024) {
		return `${(bytes / 1024).toFixed(1)} KB`;
	}
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const JobCard = ({
	job,
	targets,
	onTargetChange,
	onCancel,
	onConvert,
	onMetadata,
	onPreview,
	onDownload,
	onRemove,
	onPagesChange,
	onImageOptionsChange,
	busy = false,
	now = Date.now(),
}: JobCardProps) => {
	const isTerminal = TERMINAL_STATUSES.has(job.status);
	const running = [
		"INITIALIZING_ENGINE",
		"INSPECTING_METADATA",
		"CONVERTING",
		"WRITING_METADATA",
	].includes(job.status);
	const targetId = `target-${job.id}`;
	const progressLabelId = `progress-${job.id}`;

	return (
		<article className="job-card" data-status={job.status.toLowerCase()}>
			<header className="job-card-header">
				<div>
					<p className="job-domain">
						{job.detectedFormat.domain ?? "Needs inspection"}
					</p>
					<h3>{job.sourceFile.name}</h3>
					<p className="job-meta">
						{job.detectedFormat.format.toUpperCase()} ·{" "}
						{formatBytes(job.sourceFile.size)}
					</p>
				</div>
				<span className="status-badge">{job.status.replaceAll("_", " ")}</span>
			</header>

			<label className="field-control" htmlFor={targetId}>
				<span>Target format</span>
				<select
					id={targetId}
					value={job.targetFormat ?? ""}
					disabled={
						running || job.status === "COMPLETED" || targets.length === 0
					}
					onChange={(event) =>
						onTargetChange(
							job.id,
							(event.currentTarget.value || null) as FormatId | null,
						)
					}
				>
					<option value="">Select target</option>
					{targets.map((target) => (
						<option key={target} value={target}>
							{target.toUpperCase()}
						</option>
					))}
				</select>
			</label>

			{job.detectedFormat.domain === "image" && (
				<fieldset className="image-options">
					<legend>Image settings</legend>
					<label className="field-control">
						Quality
						<input
							type="range"
							min="10"
							max="100"
							step="5"
							value={Math.round((job.imageOptions?.quality ?? 0.85) * 100)}
							disabled={running || job.status === "COMPLETED"}
							onChange={(event) =>
								onImageOptionsChange?.({
									quality: Number(event.currentTarget.value) / 100,
									maxWidth: job.imageOptions?.maxWidth ?? 0,
								})
							}
						/>
					</label>
					<label className="field-control">
						Maximum width
						<select
							value={job.imageOptions?.maxWidth ?? 0}
							disabled={running || job.status === "COMPLETED"}
							onChange={(event) =>
								onImageOptionsChange?.({
									quality: job.imageOptions?.quality ?? 0.85,
									maxWidth: Number(event.currentTarget.value),
								})
							}
						>
							<option value="0">Original size</option>
							<option value="256">256 px</option>
							<option value="1024">1024 px</option>
							<option value="1920">1920 px</option>
							<option value="3840">3840 px</option>
						</select>
					</label>
				</fieldset>
			)}
			{job.sourceFile.size > 500_000_000 && (
				<p className="memory-warning">
					Large file: over 500 MB. Your browser may run out of memory.
				</p>
			)}
			{job.detectedFormat.format === "pdf" && (
				<label className="field-control">
					Pages (comma-separated; empty = all for PDF, page 1 for image)
					<input
						aria-label={`Pages for ${job.sourceFile.name}`}
						placeholder="e.g. 1,3,4"
						disabled={running || job.status === "COMPLETED"}
						onChange={(event) => {
							const value = event.currentTarget.value;
							const pages = value.trim()
								? value.split(",").map((n) => Number(n.trim()))
								: [];
							event.currentTarget.setCustomValidity(
								pages.every((n) => Number.isInteger(n) && n > 0)
									? ""
									: "Enter positive page numbers separated by commas",
							);
							onPagesChange?.(pages);
						}}
					/>
				</label>
			)}
			<div className="job-progress-block" aria-busy={running}>
				<div className="job-progress-copy">
					<span id={progressLabelId} role="status">
						{job.statusMessage}
					</span>
					<span>
						{job.progressPercent === null
							? "—"
							: `${Math.round(job.progressPercent)}%`}
					</span>
				</div>
				<progress
					aria-labelledby={progressLabelId}
					max={100}
					value={job.progressPercent ?? undefined}
				>
					{job.progressPercent === null
						? "Working"
						: `${Math.round(job.progressPercent)}%`}
				</progress>
			</div>

			{job.startedAtMs && (
				<p className="job-meta">
					Elapsed:{" "}
					{Math.max(
						0,
						Math.floor(((job.completedAtMs ?? now) - job.startedAtMs) / 1000),
					)}
					s
					{job.outputBlob
						? ` · Output ${formatBytes(job.outputBlob.size)} (${Math.round((job.outputBlob.size / job.sourceFile.size - 1) * 100)}%)`
						: ""}
				</p>
			)}
			<div className="job-actions">
				<button
					className="primary-action"
					type="button"
					disabled={
						busy || running || job.status === "COMPLETED" || !job.targetFormat
					}
					onClick={onConvert}
				>
					Convert
				</button>
				<button
					type="button"
					disabled={busy || job.status === "COMPLETED"}
					onClick={onMetadata}
				>
					Metadata ({job.originalMetadata.length} tags)
				</button>
				<button type="button" disabled={running} onClick={onPreview}>
					Preview
				</button>
				{job.outputBlob && (
					<button type="button" onClick={onDownload}>
						Download
					</button>
				)}
				<button type="button" disabled={running} onClick={onRemove}>
					Remove
				</button>
				<button
					type="button"
					disabled={isTerminal}
					onClick={() => onCancel(job.id)}
				>
					Cancel
				</button>
			</div>
		</article>
	);
};
