import type { ConversionJob } from "../core/types";

export interface PreviewModalProps {
  readonly job: ConversionJob | null;
  readonly open: boolean;
  readonly previewUrl: string | null;
  readonly previewText?: string | null;
  readonly onClose: () => void;
}

export const PreviewModal = (_props: PreviewModalProps) => null;
