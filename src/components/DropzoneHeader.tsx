import type { ChangeEventHandler, DragEventHandler } from "react";
import { useEffect, useRef } from "react";
import type { FormatId } from "../core/types";

export interface DropzoneHeaderProps {
  readonly onFiles: (files: readonly File[]) => void;
  readonly batchTargets?: readonly FormatId[];
  readonly selectedBatchTarget?: FormatId | null;
  readonly onBatchTargetChange?: (target: FormatId | null) => void;
  readonly stripAllMetadata?: boolean;
  readonly onStripMetadataChange?: (strip: boolean) => void;
  readonly activeCount?: number;
  readonly aggregateProgress?: number | null;
}

export const DropzoneHeader = ({
  onFiles,
  batchTargets = [],
  selectedBatchTarget = null,
  onBatchTargetChange,
  stripAllMetadata = false,
  onStripMetadataChange,
  activeCount = 0,
  aggregateProgress = null,
}: DropzoneHeaderProps) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handlePaste = (event: ClipboardEvent) => {
      const files = event.clipboardData?.files;
      if (files && files.length > 0) {
        onFiles(Array.from(files));
      }
    };

    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onFiles]);

  const handleInput: ChangeEventHandler<HTMLInputElement> = (event) => {
    const files = Array.from(event.currentTarget.files ?? []);
    if (files.length > 0) {
      onFiles(files);
    }
    event.currentTarget.value = "";
  };

  const handleDragOver: DragEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
  };

  const handleDrop: DragEventHandler<HTMLButtonElement> = (event) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer.files);
    if (files.length > 0) {
      onFiles(files);
    }
  };

  return (
    <>
      <section className="dropzone-header" aria-labelledby="import-heading">
        <div className="dropzone-copy">
          <p className="eyebrow">Local intake</p>
          <h2 id="import-heading">Import files</h2>
          <p>Drop files, choose files, or paste files from the clipboard. File bytes stay on this device.</p>
        </div>

        <div className="import-actions">
          <button
            className="file-drop-button"
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            <span className="file-drop-title">Drop files here</span>
            <span className="file-drop-hint">or choose files</span>
          </button>

          <div className="native-file-control">
            <label htmlFor="file-input">Choose files</label>
            <input ref={inputRef} id="file-input" type="file" multiple onChange={handleInput} />
            <p>Paste files anywhere in the workbench to add them to the queue.</p>
          </div>
        </div>

        <fieldset className="batch-controls">
          <legend>Batch controls</legend>
          <label className="field-control" htmlFor="batch-target">
            <span>Batch target</span>
            <select
              id="batch-target"
              value={selectedBatchTarget ?? ""}
              disabled={activeCount === 0 || batchTargets.length === 0 || !onBatchTargetChange}
              onChange={(event) => onBatchTargetChange?.((event.currentTarget.value || null) as FormatId | null)}
            >
              <option value="">No shared target</option>
              {batchTargets.map((target) => (
                <option key={target} value={target}>
                  {target.toUpperCase()}
                </option>
              ))}
            </select>
          </label>

          <label className="toggle-control">
            <input
              type="checkbox"
              checked={stripAllMetadata}
              disabled={activeCount === 0 || !onStripMetadataChange}
              onChange={(event) => onStripMetadataChange?.(event.currentTarget.checked)}
            />
            <span>Strip metadata</span>
          </label>
        </fieldset>
      </section>

      {activeCount >= 2 ? (
        <aside className="aggregate-progress" aria-live="polite">
          <div className="aggregate-progress-copy">
            <span id="queue-progress-label">Queue progress</span>
            <strong>{aggregateProgress === null ? `${activeCount} active` : `${Math.round(aggregateProgress)}%`}</strong>
          </div>
          <progress aria-labelledby="queue-progress-label" max={100} value={aggregateProgress ?? undefined}>
            {aggregateProgress === null ? "Working" : `${Math.round(aggregateProgress)}%`}
          </progress>
        </aside>
      ) : null}
    </>
  );
};
