import type { ConversionJob, DetectedFormat } from "./types";

export const createQueuedJob = (id: string, sourceFile: File, detectedFormat: DetectedFormat): ConversionJob => ({
  id,
  sourceFile,
  detectedFormat,
  targetFormat: null,
  status: "QUEUED",
  progressPercent: null,
  statusMessage: "Queued",
  originalMetadata: [],
  metadataPolicy: { stripAllMetadata: false, overrides: {} },
  outputBlob: null,
  outputFileName: null,
  startedAtMs: null,
  completedAtMs: null,
  errorDetail: null,
});

export const updateJob = (
  jobs: readonly ConversionJob[],
  id: string,
  patch: Partial<ConversionJob>,
): readonly ConversionJob[] => jobs.map((job) => (job.id === id ? { ...job, ...patch } : job));

export const removeJob = (jobs: readonly ConversionJob[], id: string): readonly ConversionJob[] =>
  jobs.filter((job) => job.id !== id);
