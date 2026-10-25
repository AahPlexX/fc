export interface RawMediaProgress {
  readonly progress: number;
  readonly time: number;
}

export interface MediaProgressState {
  readonly mode: "determinate" | "indeterminate";
  readonly percent: number | null;
  readonly timeSeconds: number | null;
}

const normalizeTimeSeconds = (timeMicroseconds: number): number | null =>
  Number.isFinite(timeMicroseconds) && timeMicroseconds >= 0 ? timeMicroseconds / 1_000_000 : null;

export const normalizeMediaProgress = (
  event: RawMediaProgress,
  progressReliable: boolean,
): MediaProgressState => {
  const timeSeconds = normalizeTimeSeconds(event.time);
  const hasReliableProgress = progressReliable && Number.isFinite(event.progress) && event.progress >= 0;

  if (!hasReliableProgress) {
    return {
      mode: "indeterminate",
      percent: null,
      timeSeconds,
    };
  }

  return {
    mode: "determinate",
    percent: Math.round(Math.min(1, event.progress) * 10_000) / 100,
    timeSeconds,
  };
};
