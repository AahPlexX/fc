import type { ConversionJob, FormatId } from "../core/types";

export interface JobCardProps {
  readonly job: ConversionJob;
  readonly targets: readonly FormatId[];
  readonly onTargetChange: (jobId: string, target: FormatId | null) => void;
  readonly onCancel: (jobId: string) => void;
}

export const JobCard = ({ job }: JobCardProps) => (
  <article className="job-card">
    <h3>{job.sourceFile.name}</h3>
    <p>{job.statusMessage}</p>
  </article>
);
