import { useEffect, useRef, useState } from "react";
import type { ConversionJob, MetadataPolicy } from "../core/types";

export interface MetadataDrawerProps {
  readonly job: ConversionJob | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onApply: (jobId: string, policy: MetadataPolicy) => void;
  readonly onApplyToMatching: (jobId: string, policy: MetadataPolicy) => void;
}

const fieldId = (jobId: string, key: string): string =>
  `metadata-${jobId}-${key.replaceAll(/[^a-zA-Z0-9_-]/g, "-")}`;

export const MetadataDrawer = ({
  job,
  open,
  onClose,
  onApply,
  onApplyToMatching,
}: MetadataDrawerProps) => {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [stripAllMetadata, setStripAllMetadata] = useState(job?.metadataPolicy.stripAllMetadata ?? false);
  const [overrides, setOverrides] = useState<Readonly<Record<string, string>>>(job?.metadataPolicy.overrides ?? {});

  useEffect(() => {
    setStripAllMetadata(job?.metadataPolicy.stripAllMetadata ?? false);
    setOverrides(job?.metadataPolicy.overrides ?? {});
  }, [job]);

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

  const policy = (): MetadataPolicy => ({ stripAllMetadata, overrides });

  return (
    <dialog
      ref={dialogRef}
      className="workbench-dialog metadata-dialog"
      open={open}
      aria-labelledby="metadata-dialog-title"
      onCancel={(event) => {
        event.preventDefault();
        onClose();
      }}
    >
      <div className="dialog-shell">
        <header className="dialog-header">
          <div>
            <h2 id="metadata-dialog-title">Metadata — {job.sourceFile.name}</h2>
            <p>{job.originalMetadata.length} discovered field{job.originalMetadata.length === 1 ? "" : "s"}</p>
          </div>
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
        </header>

        <label className="privacy-switch">
          <input
            type="checkbox"
            checked={stripAllMetadata}
            onChange={(event) => setStripAllMetadata(event.currentTarget.checked)}
          />
          <span>
            <strong>Strip all metadata</strong>
            <small>Remove embedded metadata before export. Explicit overrides may be reapplied by a compatible encoder.</small>
          </span>
        </label>

        <div className="metadata-fields">
          {job.originalMetadata.length === 0 ? (
            <p className="dialog-empty">No metadata has been discovered for this file yet.</p>
          ) : (
            job.originalMetadata.map((field) => {
              const id = fieldId(job.id, field.key);
              return (
                <div className="metadata-row" key={`${field.category}-${field.key}`}>
                  <div className="metadata-label">
                    <label htmlFor={field.editable ? id : undefined}>{field.label}</label>
                    <span>{field.category.toUpperCase()}</span>
                  </div>
                  {field.editable ? (
                    <input
                      id={id}
                      name={`metadata-${field.key}`}
                      value={overrides[field.key] ?? field.value}
                      onChange={(event) =>
                        setOverrides((current) => ({ ...current, [field.key]: event.currentTarget.value }))
                      }
                    />
                  ) : (
                    <output>{field.value}</output>
                  )}
                </div>
              );
            })
          )}
        </div>

        <footer className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            Close
          </button>
          <button type="button" className="secondary-button" onClick={() => onApplyToMatching(job.id, policy())}>
            Apply to matching files
          </button>
          <button type="button" className="primary-button" onClick={() => onApply(job.id, policy())}>
            Apply to file
          </button>
        </footer>
      </div>
    </dialog>
  );
};
