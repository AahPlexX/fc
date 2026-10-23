import type { MediaProgressState, RawMediaProgress } from "./mediaProgress";

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

export class MediaAdapter {
  constructor(private readonly _dependencies: MediaAdapterDependencies) {}

  async transcode(
    _request: MediaTranscodeRequest,
    _onProgress?: (progress: MediaProgressState) => void,
  ): Promise<Uint8Array> {
    return new Uint8Array();
  }

  cancel(_jobId: string): boolean {
    return false;
  }
}
