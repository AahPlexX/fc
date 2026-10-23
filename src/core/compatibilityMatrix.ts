import type { DetectedFormat, FormatId } from "./types";

export interface ConversionCapabilities {
  readonly avifEncode: boolean;
}

const DEFAULT_CAPABILITIES: ConversionCapabilities = {
  avifEncode: false,
};

export const getCompatibleTargets = (
  _source: DetectedFormat,
  _capabilities: ConversionCapabilities = DEFAULT_CAPABILITIES,
): readonly FormatId[] => [];
