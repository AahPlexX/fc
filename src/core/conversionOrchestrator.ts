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

export const planConversion = (_job: ConversionJob): ConversionPlan => {
  throw new Error("Conversion planning not implemented");
};

export const buildMediaCommand = (_job: ConversionJob): MediaCommandPlan => ({
  inputName: "",
  outputName: "",
  args: [],
  progressReliable: false,
});
