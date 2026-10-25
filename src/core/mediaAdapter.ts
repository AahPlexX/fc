import { normalizeMediaProgress, type MediaProgressState, type RawMediaProgress } from "./mediaProgress";

export interface MediaEngineLoadConfig {
  readonly coreURL: string;
  readonly wasmURL: string;
  readonly classWorkerURL: string;
}

export interface MediaEngine {
  readonly load: (config: MediaEngineLoadConfig) => Promise<boolean>;
  readonly writeFile: (path: string, data: Uint8Array) => Promise<boolean>;
  readonly exec: (args: readonly string[]) => Promise<number>;
  readonly readFile: (path: string) => Promise<Uint8Array | string>;
  readonly deleteFile: (path: string) => Promise<boolean>;
  readonly on: (event: "progress", callback: (event: RawMediaProgress) => void) => void;
  readonly off: (event: "progress", callback: (event: RawMediaProgress) => void) => void;
  readonly terminate: () => void;
}

export interface MediaTranscodeRequest {
  readonly jobId: string;
  readonly inputName: string;
  readonly outputName: string;
  readonly inputBytes: Uint8Array;
  readonly args: readonly string[];
  readonly progressReliable: boolean;
}

export interface MediaAdapterDependencies {
  readonly createEngine: () => Promise<MediaEngine>;
  readonly loadConfig: MediaEngineLoadConfig;
}

const isSameOriginAssetUrl = (value: string): boolean => {
  const base = typeof globalThis.location === "undefined" ? "https://omniconvert.invalid/" : globalThis.location.href;
  try {
    const url = new URL(value, base);
    return (url.protocol === "https:" || url.protocol === "http:") && url.origin === new URL(base).origin;
  } catch { return false; }
};

const assertSameOriginLoadConfig = (config: MediaEngineLoadConfig): void => {
  for (const [name, value] of Object.entries(config)) {
    if (!isSameOriginAssetUrl(value)) {
      throw new Error(`FFmpeg ${name} must resolve to a same-origin application asset`);
    }
  }
};

export class MediaAdapter {
  private enginePromise: Promise<MediaEngine> | null = null;
  private activeEngine: MediaEngine | null = null;
  private activeJobId: string | null = null;
  private readonly cancelledJobs = new Set<string>();
  private rejectActiveCancellation: ((error: Error) => void) | null = null;

  constructor(private readonly dependencies: MediaAdapterDependencies) {
    assertSameOriginLoadConfig(dependencies.loadConfig);
  }

  private getEngine(onCreated: (engine: MediaEngine) => void): Promise<MediaEngine> {
    if (this.enginePromise) {
      return this.enginePromise;
    }

    this.enginePromise = this.dependencies
      .createEngine()
      .then(async (engine) => {
        onCreated(engine);
        try {
          await engine.load(this.dependencies.loadConfig);
          return engine;
        } catch (error) {
          try {
            engine.terminate();
          } finally {
            this.invalidateEngine(engine);
          }
          throw error;
        }
      })
      .catch((error: unknown) => {
        this.enginePromise = null;
        throw error;
      });

    return this.enginePromise;
  }

  private throwIfCancelled(jobId: string): void {
    if (this.cancelledJobs.has(jobId)) {
      throw new Error(`Media job ${jobId} was cancelled`);
    }
  }

  private invalidateEngine(engine: MediaEngine): void {
    if (this.activeEngine === engine) {
      this.activeEngine = null;
    }
    this.enginePromise = null;
  }

  private static async deleteTempFile(engine: MediaEngine, path: string): Promise<void> {
    try {
      await engine.deleteFile(path);
    } catch {
      // A cancelled FFmpeg instance is already terminated and cannot service FS calls.
    }
  }

  async transcode(
    request: MediaTranscodeRequest,
    onProgress?: (progress: MediaProgressState) => void,
  ): Promise<Uint8Array> {
    if (this.activeJobId !== null) {
      throw new Error(`Media adapter is busy with job ${this.activeJobId}`);
    }

    this.activeJobId = request.jobId;
    let engine: MediaEngine | null = null;
    let progressCallback: ((event: RawMediaProgress) => void) | null = null;
    let rejectCancellation: ((error: Error) => void) | null = null;
    const cancellation = new Promise<never>((_resolve, reject) => {
      rejectCancellation = reject;
    });
    this.rejectActiveCancellation = rejectCancellation;

    try {
      engine = await Promise.race([
        this.getEngine((createdEngine) => {
          engine = createdEngine;
          this.activeEngine = createdEngine;
        }),
        cancellation,
      ]);

      if (this.cancelledJobs.has(request.jobId)) {
        engine.terminate();
        this.invalidateEngine(engine);
      }
      this.throwIfCancelled(request.jobId);

      progressCallback = (event) => {
        onProgress?.(normalizeMediaProgress(event, request.progressReliable));
      };
      engine.on("progress", progressCallback);

      await engine.writeFile(request.inputName, request.inputBytes);
      this.throwIfCancelled(request.jobId);

      const exitCode = await engine.exec(request.args);
      this.throwIfCancelled(request.jobId);
      if (exitCode !== 0) {
        throw new Error(`FFmpeg exited with code ${exitCode}`);
      }

      const output = await engine.readFile(request.outputName);
      this.throwIfCancelled(request.jobId);
      if (typeof output === "string") {
        throw new Error("FFmpeg returned text for a binary media output");
      }

      return output;
    } finally {
      if (engine && progressCallback) {
        try {
          engine.off("progress", progressCallback);
        } catch {
          // A terminated engine may no longer accept listener operations.
        }
      }

      if (engine) {
        if (!this.cancelledJobs.has(request.jobId)) {
          await Promise.all([
            MediaAdapter.deleteTempFile(engine, request.inputName),
            MediaAdapter.deleteTempFile(engine, request.outputName),
          ]);
        }
      }

      this.cancelledJobs.delete(request.jobId);
      if (this.rejectActiveCancellation === rejectCancellation) {
        this.rejectActiveCancellation = null;
      }
      if (this.activeJobId === request.jobId) {
        this.activeJobId = null;
      }
      if (this.activeEngine === engine) {
        this.activeEngine = null;
      }
    }
  }

  cancel(jobId: string): boolean {
    if (this.activeJobId !== jobId) {
      return false;
    }

    this.cancelledJobs.add(jobId);
    this.rejectActiveCancellation?.(new Error(`Media job ${jobId} was cancelled`));
    const engine = this.activeEngine;
    if (engine) {
      this.invalidateEngine(engine);
      engine.terminate();
    }
    return true;
  }
}
