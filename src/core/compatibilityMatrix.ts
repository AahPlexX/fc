import type { DetectedFormat, FormatId } from "./types";

export interface ConversionCapabilities {
  readonly avifEncode: boolean;
}

const DEFAULT_CAPABILITIES: ConversionCapabilities = {
  avifEncode: false,
};

const IMAGE_TARGETS: readonly FormatId[] = ["png", "jpeg", "webp", "bmp", "ico", "pdf"];
const IMAGE_TARGETS_WITH_AVIF: readonly FormatId[] = ["png", "jpeg", "webp", "avif", "bmp", "ico", "pdf"];
const AUDIO_TARGETS: readonly FormatId[] = ["wav", "mp3", "flac", "ogg", "aac", "m4a"];
const VIDEO_TARGETS: readonly FormatId[] = ["mp4", "webm", "mov", "gif", "mp3", "wav", "flac", "aac", "ogg"];
const TABULAR_TARGETS: readonly FormatId[] = ["csv", "tsv", "json", "md", "html"];
const PDF_TARGETS: readonly FormatId[] = ["png", "jpeg", "pdf"];
const MARKDOWN_TARGETS: readonly FormatId[] = ["html", "pdf"];

export const getCompatibleTargets = (
  source: DetectedFormat,
  capabilities: ConversionCapabilities = DEFAULT_CAPABILITIES,
): readonly FormatId[] => {
  if (source.needsProbe || source.domain === null) {
    return [];
  }

  switch (source.domain) {
    case "image":
      return capabilities.avifEncode ? IMAGE_TARGETS_WITH_AVIF : IMAGE_TARGETS;
    case "audio":
      return AUDIO_TARGETS;
    case "video":
      return VIDEO_TARGETS;
    case "tabular":
      return TABULAR_TARGETS;
    case "document":
      if (source.format === "pdf") {
        return PDF_TARGETS;
      }
      if (source.format === "md") {
        return MARKDOWN_TARGETS;
      }
      if (source.format === "txt") return ["txt", "html", "pdf"];
      return [];
    case "archive":
      return [];
  }
};
