import { useEffect, useRef } from "react";
import type { ConversionJob } from "../core/types";

export interface PreviewModalProps {
  readonly job: ConversionJob | null;
  readonly open: boolean;
  readonly previewUrl: string | null;
  readonly previewText?: string | null;
  readonly onClose: () => void;
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

export const PreviewModal = ({ job, open, previewUrl, previewText = null, onClose }: PreviewModalProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog || typeof dialog.showModal !== "function") return;
    if (open) {
      if (dialog.open) dialog.close();
      dialog.showModal();
    } else if (dialog.open) {
      dialog.close();
    }
  }, [open]);

  if (!job) return null;

  const convertedSize = job.outputBlob?.size ?? 0;
  const originalSize = job.sourceFile.size;
  const delta = originalSize > 0 && job.outputBlob ? ((convertedSize - originalSize) / originalSize) * 100 : null;
  const domain = job.detectedFormat.domain;

  return (
    <dialog
      ref={dialogRef}
      className="workbench-dialog preview-dialog"
      open={open}
      aria-labelledby="preview-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-shell">
        <header className="dialog-header">
          <div>
            <h2 id="preview-dialog-title">Preview — {job.sourceFile.name}</h2>
            <p>Inspect the converted output before downloading it.</p>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="preview-surface">
          {previewUrl && domain === "image" ? (
            <img src={previewUrl} alt={`Converted preview of ${job.sourceFile.name}`} />
          ) : null}
          {previewUrl && domain === "audio" ? (
            <audio controls src={previewUrl} aria-label={`Converted audio preview of ${job.sourceFile.name}`} />
          ) : null}
          {previewText && domain === "tabular" ? <pre>{previewText}</pre> : null}
          {!previewUrl && !previewText ? (
            <p className="dialog-empty">A preview is available after this file has been converted.</p>
          ) : null}
        </div>

        <dl className="size-comparison">
          <div>
            <dt>Original size</dt>
            <dd>{formatBytes(originalSize)}</dd>
          </div>
          <div>
            <dt>Converted size</dt>
            <dd>{job.outputBlob ? formatBytes(convertedSize) : "Not available"}</dd>
          </div>
          <div>
            <dt>Size delta</dt>
            <dd>{delta === null ? "Not available" : `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%`}</dd>
          </div>
        </dl>

        <footer className="dialog-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            Close
          </button>
        </footer>
      </div>
    </dialog>
  );
};
