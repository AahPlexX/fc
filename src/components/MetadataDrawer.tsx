import type { ConversionJob, MetadataPolicy } from "../core/types";

export interface MetadataDrawerProps {
  readonly job: ConversionJob | null;
  readonly open: boolean;
  readonly onClose: () => void;
  readonly onApply: (jobId: string, policy: MetadataPolicy) => void;
  readonly onApplyToMatching: (jobId: string, policy: MetadataPolicy) => void;
}

export const MetadataDrawer = (_props: MetadataDrawerProps) => null;
