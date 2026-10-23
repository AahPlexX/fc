export type MediaDomain = "image" | "audio" | "video" | "tabular" | "document" | "archive";

export type FormatId =
  | "png"
  | "jpeg"
  | "gif"
  | "webp"
  | "avif"
  | "bmp"
  | "ico"
  | "svg"
  | "wav"
  | "mp3"
  | "flac"
  | "ogg"
  | "aac"
  | "m4a"
  | "mp4"
  | "webm"
  | "mov"
  | "mkv"
  | "csv"
  | "tsv"
  | "json"
  | "md"
  | "html"
  | "txt"
  | "pdf"
  | "zip";

export interface DetectedFormat {
  readonly format: FormatId;
  readonly mime: string;
  readonly domain: MediaDomain | null;
  readonly evidence: "signature" | "container" | "structural";
  readonly needsProbe: boolean;
}

export type JobStatus =
  | "QUEUED"
  | "INITIALIZING_ENGINE"
  | "INSPECTING_METADATA"
  | "CONVERTING"
  | "WRITING_METADATA"
  | "COMPLETED"
  | "CANCELLED"
  | "FAILED";

export type MetadataCategory = "exif" | "gps" | "id3" | "container" | "pdf";

export interface MetadataField {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly editable: boolean;
  readonly category: MetadataCategory;
}

export interface MetadataPolicy {
  readonly stripAllMetadata: boolean;
  readonly overrides: Readonly<Record<string, string>>;
}

export interface ConversionJob {
  readonly id: string;
  readonly sourceFile: File;
  readonly detectedFormat: DetectedFormat;
  readonly targetFormat: FormatId | null;
  readonly status: JobStatus;
  readonly progressPercent: number | null;
  readonly statusMessage: string;
  readonly originalMetadata: readonly MetadataField[];
  readonly metadataPolicy: MetadataPolicy;
  readonly outputBlob: Blob | null;
  readonly outputFileName: string | null;
  readonly startedAtMs: number | null;
  readonly completedAtMs: number | null;
  readonly errorDetail: string | null;
}
