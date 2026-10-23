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

export const DropzoneHeader = (_props: DropzoneHeaderProps) => (
  <section className="dropzone-header" aria-labelledby="import-heading">
    <h2 id="import-heading">Import files</h2>
  </section>
);
