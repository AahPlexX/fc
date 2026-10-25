import { getCompatibleTargets } from "./compatibilityMatrix";
import { buildOutputFileName } from "./exportManager";
import type { ConversionJob, FormatId } from "./types";

export type ConversionEngineKind = "image" | "tabular" | "document" | "media";

export interface ConversionPlan {
  readonly engine: ConversionEngineKind;
  readonly target: FormatId;
  readonly outputName: string;
}

export interface MediaCommandPlan {
  readonly inputName: string;
  readonly outputName: string;
  readonly args: readonly string[];
  readonly progressReliable: boolean;
}

const IMPLEMENTED_IMAGE_TARGETS = new Set<FormatId>(["png", "jpeg", "webp", "avif"]);
const IMPLEMENTED_TABULAR_TARGETS = new Set<FormatId>(["csv", "tsv", "json", "md", "html"]);
const IMPLEMENTED_PDF_TARGETS = new Set<FormatId>(["png", "jpeg", "pdf"]);
const IMPLEMENTED_MEDIA_TARGETS = new Set<FormatId>([
  "wav",
  "mp3",
  "flac",
  "ogg",
  "aac",
  "m4a",
  "mp4",
  "webm",
  "mov",
  "gif",
]);

const isSemanticallyCompatible = (job: ConversionJob, target: FormatId): boolean =>
  getCompatibleTargets(job.detectedFormat, { avifEncode: true }).includes(target);

export const planConversion = (job: ConversionJob): ConversionPlan => {
  const target = job.targetFormat;
  if (!target) {
    throw new Error("A target format must be selected before conversion");
  }
  if (!isSemanticallyCompatible(job, target)) {
    throw new Error(`${job.detectedFormat.format.toUpperCase()} to ${target.toUpperCase()} is not a compatible conversion`);
  }

  let engine: ConversionEngineKind;
  switch (job.detectedFormat.domain) {
    case "image":
      if (!IMPLEMENTED_IMAGE_TARGETS.has(target)) {
        throw new Error(`${target.toUpperCase()} image output is not implemented yet`);
      }
      engine = "image";
      break;
    case "tabular":
      if (!IMPLEMENTED_TABULAR_TARGETS.has(target)) {
        throw new Error(`${target.toUpperCase()} tabular output is not implemented yet`);
      }
      engine = "tabular";
      break;
    case "document":
      if (job.detectedFormat.format !== "pdf" || !IMPLEMENTED_PDF_TARGETS.has(target)) {
        throw new Error(`${job.detectedFormat.format.toUpperCase()} to ${target.toUpperCase()} is not implemented yet`);
      }
      engine = "document";
      break;
    case "audio":
    case "video":
      if (!IMPLEMENTED_MEDIA_TARGETS.has(target)) {
        throw new Error(`${target.toUpperCase()} media output is not implemented yet`);
      }
      engine = "media";
      break;
    default:
      throw new Error(`${job.detectedFormat.format.toUpperCase()} does not have an implemented conversion engine`);
  }

  return {
    engine,
    target,
    outputName: buildOutputFileName(job.sourceFile.name, target),
  };
};

const safeToken = (value: string): string => {
  const normalized = value.replaceAll(/[^a-zA-Z0-9_-]/g, "-").replaceAll(/-+/g, "-");
  return normalized.replaceAll(/^-|-$/g, "") || "job";
};

const AUDIO_ARGS: Readonly<Partial<Record<FormatId, readonly string[]>>> = {
  wav: ["-vn", "-c:a", "pcm_s16le"],
  mp3: ["-vn", "-c:a", "libmp3lame"],
  flac: ["-vn", "-c:a", "flac"],
  ogg: ["-vn", "-c:a", "libvorbis"],
  aac: ["-vn", "-c:a", "aac", "-f", "adts"],
  m4a: ["-vn", "-c:a", "aac"],
};

const VIDEO_ARGS: Readonly<Partial<Record<FormatId, readonly string[]>>> = {
  mp4: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac", "-movflags", "+faststart"],
  mov: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"],
  webm: ["-c:v", "libvpx-vp9", "-c:a", "libopus"],
  gif: ["-vf", "fps=12", "-an"],
};

const METADATA_KEYS: Readonly<Record<string, string>> = {
  artist: "artist",
  title: "title",
  album: "album",
  genre: "genre",
  year: "date",
  comment: "comment",
};

export const buildMediaCommand = (job: ConversionJob): MediaCommandPlan => {
  const target = job.targetFormat;
  if (!target || (job.detectedFormat.domain !== "audio" && job.detectedFormat.domain !== "video")) {
    throw new Error("Media command requires an audio/video source and selected target");
  }
  if (!isSemanticallyCompatible(job, target)) {
    throw new Error(`${job.detectedFormat.format.toUpperCase()} to ${target.toUpperCase()} is not compatible`);
  }

  const codecArgs = AUDIO_ARGS[target] ?? VIDEO_ARGS[target];
  if (!codecArgs) {
    throw new Error(`No FFmpeg recipe is implemented for ${target.toUpperCase()}`);
  }

  const token = safeToken(job.id);
  const inputName = `${token}-input.${job.detectedFormat.format}`;
  const outputName = `${token}-output.${target}`;
  const args: string[] = ["-i", inputName, ...codecArgs];

  if (job.metadataPolicy.stripAllMetadata) {
    args.push("-map_metadata", "-1");
  }

  for (const [rawKey, value] of Object.entries(job.metadataPolicy.overrides)) {
    const mappedKey = METADATA_KEYS[rawKey.toLowerCase()];
    if (mappedKey && value.trim()) {
      args.push("-metadata", `${mappedKey}=${value}`);
    }
  }

  args.push(outputName);
  return {
    inputName,
    outputName,
    args,
    progressReliable: true,
  };
};
