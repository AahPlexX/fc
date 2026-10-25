import type { ConversionJob, FormatId } from "../core/types";

export interface JobCardProps {
  readonly job: ConversionJob;
  readonly targets: readonly FormatId[];
  readonly onTargetChange: (jobId: string, target: FormatId | null) => void;
  readonly onCancel: (jobId: string) => void;
  readonly onConvert?: (jobId: string) => void;
  readonly onMetadata?: (jobId: string) => void;
  readonly onPreview?: (jobId: string) => void;
  readonly onRemove?: (jobId: string) => void;
}

const TERMINAL_STATUSES = new Set<ConversionJob["status"]>(["COMPLETED", "CANCELLED", "FAILED"]);

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
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
  onRemove,
}: JobCardProps) => {
  const isTerminal = TERMINAL_STATUSES.has(job.status);
  const isRunning = !isTerminal && job.status !== "QUEUED";
  const targetId = `target-${job.id}`;
  const progressLabelId = `progress-${job.id}`;

  return (
    <article className="job-card" data-status={job.status.toLowerCase()}>
      <header className="job-card-header">
        <div>
          <p className="job-domain">{job.detectedFormat.domain ?? "Needs inspection"}</p>
          <h3>{job.sourceFile.name}</h3>
          <p className="job-meta">
            {job.detectedFormat.format.toUpperCase()} · {formatBytes(job.sourceFile.size)}
          </p>
        </div>
        <span className="status-badge">{job.status.replaceAll("_", " ")}</span>
      </header>

      <label className="field-control" htmlFor={targetId}>
        <span>Target format</span>
        <select
          id={targetId}
          value={job.targetFormat ?? ""}
          disabled={isRunning || job.status === "COMPLETED" || targets.length === 0}
          onChange={(event) => onTargetChange(job.id, (event.currentTarget.value || null) as FormatId | null)}
        >
          <option value="">Select target</option>
          {targets.map((target) => (
            <option key={target} value={target}>
              {target.toUpperCase()}
            </option>
          ))}
        </select>
      </label>

      <div className="job-progress-block">
        <div className="job-progress-copy">
          <span id={progressLabelId}>{job.statusMessage}</span>
          <span>{job.progressPercent === null ? "—" : `${Math.round(job.progressPercent)}%`}</span>
        </div>
        <progress aria-labelledby={progressLabelId} max={100} value={job.progressPercent ?? undefined}>
          {job.progressPercent === null ? "Working" : `${Math.round(job.progressPercent)}%`}
        </progress>
      </div>

      <fieldset className="job-actions">
        <legend>Actions for {job.sourceFile.name}</legend>
        <button type="button" disabled={!onMetadata || isRunning} onClick={() => onMetadata?.(job.id)}>
          Metadata
        </button>
        <button type="button" disabled={!onPreview || !job.outputBlob} onClick={() => onPreview?.(job.id)}>
          Preview
        </button>
        <button type="button" disabled={!onRemove || isRunning} onClick={() => onRemove?.(job.id)}>
          Remove
        </button>
        <button type="button" disabled={!isRunning} onClick={() => onCancel(job.id)}>
          Cancel
        </button>
        <button
          type="button"
          className="primary-button"
          disabled={!onConvert || !job.targetFormat || isRunning || job.status === "COMPLETED"}
          onClick={() => onConvert?.(job.id)}
        >
          Convert
        </button>
      </fieldset>
    </article>
  );
};
