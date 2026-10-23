export interface RawMediaProgress {
  readonly progress: number;
  readonly time: number;
}

export interface MediaProgressState {
  readonly mode: "determinate" | "indeterminate";
  readonly percent: number | null;
  readonly timeSeconds: number | null;
}

export const normalizeMediaProgress = (
  _event: RawMediaProgress,
  _progressReliable: boolean,
): MediaProgressState => ({
  mode: "indeterminate",
  percent: null,
  timeSeconds: null,
});
