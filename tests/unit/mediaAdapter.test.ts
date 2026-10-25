import { describe, expect, it, vi } from "vitest";
import {
  MediaAdapter,
  type MediaAdapterDependencies,
  type MediaEngine,
  type MediaTranscodeRequest,
} from "../../src/core/mediaAdapter";
import { normalizeMediaProgress } from "../../src/core/mediaProgress";
import type { DetectedFormat } from "../../src/core/types";

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
    expect(engine.load).toHaveBeenCalledTimes(1);
    expect(engine.load).toHaveBeenCalledWith(loadConfig);
    expect(engine.writeFile).toHaveBeenCalledTimes(2);
    expect(engine.exec).toHaveBeenCalledWith(["-i", "job-a.webm", "job-a.mp4"]);
    expect(progress).toHaveBeenCalledWith({ mode: "determinate", percent: 50, timeSeconds: 1 });
    expect(engine.deleteFile).toHaveBeenCalledWith("job-a.webm");
    expect(engine.deleteFile).toHaveBeenCalledWith("job-a.mp4");
  });

  it("rejects protocol-relative FFmpeg assets", () => {
    expect(
      () =>
        new MediaAdapter({
          createEngine: vi.fn(async () => createEngine()),
          loadConfig: { ...loadConfig, coreURL: "//attacker.example/core.js" },
        }),
    ).toThrow(/same-origin/i);
  });

  it("terminates the engine and settles promptly when cancelled during load", async () => {
    let finishLoad: ((loaded: boolean) => void) | undefined;
    const freshEngine = createEngine();
    const engine = createEngine({
      load: vi.fn(() => new Promise<boolean>((resolve) => (finishLoad = resolve))),
    });
    const create = vi.fn<() => Promise<MediaEngine>>()
      .mockResolvedValueOnce(engine)
      .mockResolvedValueOnce(freshEngine);
    const adapter = new MediaAdapter({ createEngine: create, loadConfig });
    const pending = adapter.transcode(request("job-loading"));

    await vi.waitFor(() => expect(engine.load).toHaveBeenCalledOnce());
    expect(adapter.cancel("job-loading")).toBe(true);
    await expect(pending).rejects.toThrow(/cancelled/i);
    expect(engine.terminate).toHaveBeenCalledOnce();
    expect(engine.writeFile).not.toHaveBeenCalled();
    await expect(adapter.transcode(request("job-after-load-cancel"))).resolves.toEqual(new Uint8Array([9, 8, 7]));
    finishLoad?.(true);
    await Promise.resolve();
    expect(engine.terminate).toHaveBeenCalledOnce();
    await expect(adapter.transcode(request("job-after-old-load-settles"))).resolves.toEqual(new Uint8Array([9, 8, 7]));
    expect(create).toHaveBeenCalledTimes(2);
  });

  it("terminates late engine creation after cancellation and lets the next job create a fresh engine", async () => {
    let resolveCreate: ((engine: MediaEngine) => void) | undefined;
    const lateEngine = createEngine();
    const recoveredEngine = createEngine();
    const dependencies: MediaAdapterDependencies = {
      createEngine: vi.fn<() => Promise<MediaEngine>>()
        .mockImplementationOnce(() => new Promise((resolve) => { resolveCreate = resolve; }))
        .mockResolvedValueOnce(recoveredEngine),
      loadConfig,
    };
    const adapter = new MediaAdapter(dependencies);
    const pending = adapter.transcode(request("job-pending-create"));
    expect(adapter.cancel("job-pending-create")).toBe(true);
    await expect(pending).rejects.toThrow(/cancelled/i);

    await expect(adapter.transcode(request("job-immediate-recovery"))).resolves.toEqual(new Uint8Array([9, 8, 7]));
    resolveCreate?.(lateEngine);
    await vi.waitFor(() => expect(lateEngine.terminate).toHaveBeenCalledOnce());
    expect(lateEngine.load).not.toHaveBeenCalled();
    await expect(adapter.transcode(request("job-after-late-create"))).resolves.toEqual(new Uint8Array([9, 8, 7]));
    expect(dependencies.createEngine).toHaveBeenCalledTimes(2);
    expect(recoveredEngine.load).toHaveBeenCalledOnce();
  });

  it("cancels a transcode using a cached engine and replaces that engine", async () => {
    const nextEngine = createEngine();
    let rejectSecondExec: ((reason: Error) => void) | undefined;
    const cachedEngine = createEngine({
      exec: vi.fn()
        .mockResolvedValueOnce(0)
        .mockImplementationOnce(() => new Promise((_resolve, reject) => { rejectSecondExec = reject; })),
      terminate: vi.fn(() => rejectSecondExec?.(new Error("terminated"))),
    });
    const dependencies: MediaAdapterDependencies = {
      createEngine: vi.fn<() => Promise<MediaEngine>>()
        .mockResolvedValueOnce(cachedEngine)
        .mockResolvedValueOnce(nextEngine),
      loadConfig,
    };
    const adapter = new MediaAdapter(dependencies);
    await adapter.transcode(request("job-first-cache"));
    const pending = adapter.transcode(request("job-cached-cancel"));
    await vi.waitFor(() => expect(cachedEngine.exec).toHaveBeenCalledTimes(2));
    expect(adapter.cancel("job-cached-cancel")).toBe(true);
    await expect(pending).rejects.toThrow(/cancelled/i);
    await expect(adapter.transcode(request("job-fresh-cache"))).resolves.toEqual(new Uint8Array([9, 8, 7]));
    expect(cachedEngine.terminate).toHaveBeenCalledOnce();
    expect(nextEngine.load).toHaveBeenCalledOnce();
  });

  it("serializes media probes, settles a cancelled queued probe, and recovers", async () => {
    vi.resetModules();
    const instances: {
      load: ReturnType<typeof vi.fn>;
      writeFile: ReturnType<typeof vi.fn>;
      ffprobe: ReturnType<typeof vi.fn>;
      readFile: ReturnType<typeof vi.fn>;
      terminate: ReturnType<typeof vi.fn>;
    }[] = [];
    let finishFirstProbe: ((code: number) => void) | undefined;
    const report = JSON.stringify({ streams: [{ codec_type: "audio" }], format: { format_name: "matroska,webm" } });
    vi.doMock("@ffmpeg/ffmpeg", () => ({
      FFmpeg: class {
        readonly load = vi.fn(async () => true);
        readonly writeFile = vi.fn(async () => true);
        readonly ffprobe: ReturnType<typeof vi.fn>;
        readonly readFile = vi.fn(async () => new TextEncoder().encode(report));
        readonly terminate = vi.fn();
        constructor() {
          const isFirst = instances.length === 0;
          this.ffprobe = vi.fn(() => isFirst
            ? new Promise<number>((resolve) => { finishFirstProbe = resolve; })
            : Promise.resolve(0));
          instances.push(this);
        }
      },
    }));
    const { probeMedia } = await import("../../src/core/conversionRunner");
    const detected: DetectedFormat = { format: "mkv", mime: "video/x-matroska", domain: "video", evidence: "signature", needsProbe: true };
    const makeFile = (name: string) => new File([name], name, { type: detected.mime });
    const first = probeMedia(makeFile("first.mkv"), detected, new AbortController().signal);
    await vi.waitFor(() => expect(instances[0]?.ffprobe).toHaveBeenCalledOnce());

    const queuedController = new AbortController();
    const queued = probeMedia(makeFile("queued.mkv"), detected, queuedController.signal);
    await Promise.resolve();
    expect(instances).toHaveLength(1);
    queuedController.abort();
    await expect(queued).rejects.toThrow();
    expect(instances).toHaveLength(1);

    finishFirstProbe?.(0);
    await expect(first).resolves.toMatchObject({ detected: { format: "mkv" } });
    await expect(probeMedia(makeFile("recovery.mkv"), detected, new AbortController().signal)).resolves.toMatchObject({ detected: { format: "mkv" } });
    expect(instances).toHaveLength(2);
    expect(instances.every((instance) => instance.terminate.mock.calls.length === 1)).toBe(true);
  });

  it("settles a timed out media probe and allows a later probe to use a fresh engine", async () => {
    vi.resetModules();
    vi.useFakeTimers();
    const instances: { ffprobe: ReturnType<typeof vi.fn>; terminate: ReturnType<typeof vi.fn> }[] = [];
    const report = JSON.stringify({ streams: [{ codec_type: "audio" }], format: { format_name: "matroska" } });
    vi.doMock("@ffmpeg/ffmpeg", () => ({
      FFmpeg: class {
        readonly load = vi.fn(async () => true);
        readonly writeFile = vi.fn(async () => true);
        readonly ffprobe: ReturnType<typeof vi.fn>;
        readonly readFile = vi.fn(async () => new TextEncoder().encode(report));
        readonly terminate = vi.fn();
        constructor() {
          const hangs = instances.length === 0;
          this.ffprobe = vi.fn(() => hangs ? new Promise<number>(() => undefined) : Promise.resolve(0));
          instances.push(this);
        }
      },
    }));
    const { probeMedia } = await import("../../src/core/conversionRunner");
    const detected: DetectedFormat = { format: "mkv", mime: "video/x-matroska", domain: "video", evidence: "signature", needsProbe: true };
    const file = new File(["data"], "timeout.mkv", { type: detected.mime });
    const pending = probeMedia(file, detected, new AbortController().signal);
    const timeoutAssertion = expect(pending).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(0);
    expect(instances[0]?.ffprobe).toHaveBeenCalledOnce();
    await vi.advanceTimersByTimeAsync(300_001);
    await timeoutAssertion;
    expect(instances[0]?.terminate).toHaveBeenCalledOnce();

    await expect(probeMedia(file, detected, new AbortController().signal)).resolves.toMatchObject({ detected: { format: "mkv" } });
    expect(instances).toHaveLength(2);
    expect(instances[1]?.terminate).toHaveBeenCalledOnce();
    vi.useRealTimers();
  });

  it("terminates an engine whose load fails and allows a fresh engine", async () => {
    const failedEngine = createEngine({ load: vi.fn(async () => { throw new Error("load failed"); }) });
    const recoveredEngine = createEngine();
    const dependencies: MediaAdapterDependencies = {
      createEngine: vi.fn<() => Promise<MediaEngine>>()
        .mockResolvedValueOnce(failedEngine)
        .mockResolvedValueOnce(recoveredEngine),
      loadConfig,
    };
    const adapter = new MediaAdapter(dependencies);

    await expect(adapter.transcode(request("job-load-fails"))).rejects.toThrow("load failed");
    expect(failedEngine.terminate).toHaveBeenCalledOnce();
    await expect(adapter.transcode(request("job-retry"))).resolves.toEqual(new Uint8Array([9, 8, 7]));
    expect(recoveredEngine.load).toHaveBeenCalledOnce();
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
    await expect(pending).rejects.toThrow(/cancelled/i);

    await expect(adapter.transcode(request("job-next"))).resolves.toEqual(new Uint8Array([9, 8, 7]));
    expect(firstEngine.terminate).toHaveBeenCalledOnce();
    expect(dependencies.createEngine).toHaveBeenCalledTimes(2);
    expect(secondEngine.load).toHaveBeenCalledOnce();
  });
});


it("rejects backslash-normalized external engine URLs", () => {
  expect(() => new MediaAdapter({createEngine: async () => {throw new Error("unused");},loadConfig:{coreURL:"/\\\\evil.example/core.js",wasmURL:"/core.wasm",classWorkerURL:"/worker.js"}})).toThrow(/same-origin/);
});

it('terminates a cached engine cancelled before its next transcode resumes',async()=>{
 const engine=createEngine();const adapter=new MediaAdapter({createEngine:async()=>engine,loadConfig});
 await adapter.transcode(request('cached-first'));
 const pending=adapter.transcode(request('cached-cancel-immediately'));
 expect(adapter.cancel('cached-cancel-immediately')).toBe(true);
 await expect(pending).rejects.toThrow(/cancelled/i);
 expect(engine.terminate).toHaveBeenCalledOnce();
});
