import { describe, expect, it, vi } from "vitest";
import {
  MediaAdapter,
  type MediaAdapterDependencies,
  type MediaEngine,
  type MediaTranscodeRequest,
} from "../../src/core/mediaAdapter";
import { normalizeMediaProgress } from "../../src/core/mediaProgress";

const request = (jobId: string, progressReliable = true): MediaTranscodeRequest => ({
  jobId,
  inputName: `${jobId}.webm`,
  outputName: `${jobId}.mp4`,
  inputBytes: new Uint8Array([1, 2, 3]),
  args: ["-i", `${jobId}.webm`, `${jobId}.mp4`],
  progressReliable,
});

const createEngine = (overrides: Partial<MediaEngine> = {}): MediaEngine => ({
  load: vi.fn(async () => true),
  writeFile: vi.fn(async () => true),
  exec: vi.fn(async () => 0),
  readFile: vi.fn(async () => new Uint8Array([9, 8, 7])),
  deleteFile: vi.fn(async () => true),
  on: vi.fn(),
  off: vi.fn(),
  terminate: vi.fn(),
  ...overrides,
});

const loadConfig = {
  coreURL: "/assets/ffmpeg-core.js",
  wasmURL: "/assets/ffmpeg-core.wasm",
  classWorkerURL: "/assets/ffmpeg-worker.js",
};

describe("Phase 10 media adapter contracts", () => {
  it("only exposes determinate progress for explicitly reliable routes", () => {
    expect(normalizeMediaProgress({ progress: 0.42, time: 2_500_000 }, true)).toEqual({
      mode: "determinate",
      percent: 42,
      timeSeconds: 2.5,
    });
    expect(normalizeMediaProgress({ progress: 0.42, time: 2_500_000 }, false)).toEqual({
      mode: "indeterminate",
      percent: null,
      timeSeconds: 2.5,
    });
    expect(normalizeMediaProgress({ progress: Number.NaN, time: -1 }, true)).toEqual({
      mode: "indeterminate",
      percent: null,
      timeSeconds: null,
    });
  });

  it("lazy-loads one engine, transcodes in its virtual FS, reports progress, and cleans temporary files", async () => {
    let progressCallback: ((event: { progress: number; time: number }) => void) | undefined;
    const engine = createEngine({
      on: vi.fn((_event, callback) => {
        progressCallback = callback;
      }),
      exec: vi.fn(async () => {
        progressCallback?.({ progress: 0.5, time: 1_000_000 });
        return 0;
      }),
    });
    const dependencies: MediaAdapterDependencies = {
      createEngine: vi.fn(async () => engine),
      loadConfig,
    };
    const adapter = new MediaAdapter(dependencies);
    const progress = vi.fn();

    await expect(adapter.transcode(request("job-a"), progress)).resolves.toEqual(new Uint8Array([9, 8, 7]));
    await expect(adapter.transcode(request("job-b"), progress)).resolves.toEqual(new Uint8Array([9, 8, 7]));

    expect(dependencies.createEngine).toHaveBeenCalledOnce();
    expect(engine.load).toHaveBeenCalledOnce();
    expect(engine.load).toHaveBeenCalledWith(loadConfig);
    expect(engine.writeFile).toHaveBeenCalledTimes(2);
    expect(engine.exec).toHaveBeenCalledWith(["-i", "job-a.webm", "job-a.mp4"]);
    expect(progress).toHaveBeenCalledWith({ mode: "determinate", percent: 50, timeSeconds: 1 });
    expect(engine.deleteFile).toHaveBeenCalledWith("job-a.webm");
    expect(engine.deleteFile).toHaveBeenCalledWith("job-a.mp4");
  });

  it("terminates an active job and requires a fresh engine before subsequent work", async () => {
    let rejectExec: ((reason: Error) => void) | undefined;
    const firstEngine = createEngine({
      exec: vi.fn(
        () =>
          new Promise<number>((_resolve, reject) => {
            rejectExec = reject;
          }),
      ),
      terminate: vi.fn(() => rejectExec?.(new Error("called FFmpeg.terminate()"))),
    });
    const secondEngine = createEngine();
    const dependencies: MediaAdapterDependencies = {
      createEngine: vi
        .fn<() => Promise<MediaEngine>>()
        .mockResolvedValueOnce(firstEngine)
        .mockResolvedValueOnce(secondEngine),
      loadConfig,
    };
    const adapter = new MediaAdapter(dependencies);

    const pending = adapter.transcode(request("job-cancel"));
    await vi.waitFor(() => expect(firstEngine.exec).toHaveBeenCalledOnce());
    expect(adapter.cancel("job-cancel")).toBe(true);
    await expect(pending).rejects.toThrow(/terminate/i);

    await expect(adapter.transcode(request("job-next"))).resolves.toEqual(new Uint8Array([9, 8, 7]));
    expect(firstEngine.terminate).toHaveBeenCalledOnce();
    expect(dependencies.createEngine).toHaveBeenCalledTimes(2);
    expect(secondEngine.load).toHaveBeenCalledOnce();
  });
});
