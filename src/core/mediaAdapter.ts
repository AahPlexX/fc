import {
	type MediaProgressState,
	normalizeMediaProgress,
	type RawMediaProgress,
} from "./mediaProgress";

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
	readonly on: (
		event: "progress",
		callback: (event: RawMediaProgress) => void,
	) => void;
	readonly off: (
		event: "progress",
		callback: (event: RawMediaProgress) => void,
	) => void;
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
	const base =
		typeof globalThis.location === "undefined"
			? "https://omniconvert.invalid/"
			: globalThis.location.href;
	try {
		const url = new URL(value, base);
		return (
			(url.protocol === "https:" || url.protocol === "http:") &&
			url.origin === new URL(base).origin
		);
	} catch {
		return false;
	}
};

const assertSameOriginLoadConfig = (config: MediaEngineLoadConfig): void => {
	for (const [name, value] of Object.entries(config)) {
		if (!isSameOriginAssetUrl(value)) {
			throw new Error(
				`FFmpeg ${name} must resolve to a same-origin application asset`,
			);
		}
	}
};

export class MediaAdapter {
	private enginePromise: Promise<MediaEngine> | null = null;
	private activeEngine: MediaEngine | null = null;
	private activeJobId: string | null = null;
	private engineGeneration = 0;
	private readonly terminatedEngines = new WeakSet<object>();
	private rejectActiveCancellation: ((error: Error) => void) | null = null;

	constructor(private readonly dependencies: MediaAdapterDependencies) {
		assertSameOriginLoadConfig(dependencies.loadConfig);
	}

	private getEngine(generation: number): Promise<MediaEngine> {
		if (this.enginePromise) {
			return this.enginePromise;
		}

		const promise = this.dependencies
			.createEngine()
			.then(async (engine) => {
				if (generation !== this.engineGeneration) {
					this.terminateEngine(engine);
					throw new Error("Media engine creation cancelled");
				}
				this.activeEngine = engine;
				try {
					await engine.load(this.dependencies.loadConfig);
					if (generation !== this.engineGeneration) {
						this.terminateEngine(engine);
						throw new Error("Media engine load cancelled");
					}
					return engine;
				} catch (error) {
					this.terminateEngine(engine);
					this.invalidateEngine(engine, promise);
					throw error;
				}
			})
			.catch((error: unknown) => {
				if (this.enginePromise === promise) this.enginePromise = null;
				throw error;
			});
		this.enginePromise = promise;
		return promise;
	}

	private throwIfInvalidated(generation: number): void {
		if (generation !== this.engineGeneration) {
			throw new Error("Media job was cancelled");
		}
	}

	private terminateEngine(engine: MediaEngine): void {
		if (this.terminatedEngines.has(engine)) return;
		this.terminatedEngines.add(engine);
		engine.terminate();
	}

	private invalidateEngine(
		engine: MediaEngine,
		promise: Promise<MediaEngine>,
	): void {
		if (this.activeEngine === engine) {
			this.activeEngine = null;
		}
		if (this.enginePromise === promise) {
			this.enginePromise = null;
		}
	}

	private static async deleteTempFile(
		engine: MediaEngine,
		path: string,
	): Promise<void> {
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

		const generation = this.engineGeneration;
		this.activeJobId = request.jobId;
		let engine: MediaEngine | null = null;
		let progressCallback: ((event: RawMediaProgress) => void) | null = null;
		let rejectCancellation: ((error: Error) => void) | null = null;
		const currentEngine = (): MediaEngine | null => engine;
		const cancellation = new Promise<never>((_resolve, reject) => {
			rejectCancellation = reject;
		});
		this.rejectActiveCancellation = rejectCancellation;

		const operation = (async (): Promise<Uint8Array> => {
			engine = await this.getEngine(generation);
			if (generation !== this.engineGeneration) this.terminateEngine(engine);
			this.throwIfInvalidated(generation);
			this.activeEngine = engine;
			progressCallback = (event) => {
				onProgress?.(normalizeMediaProgress(event, request.progressReliable));
			};
			engine.on("progress", progressCallback);

			await engine.writeFile(request.inputName, request.inputBytes);
			this.throwIfInvalidated(generation);

			const exitCode = await engine.exec(request.args);
			this.throwIfInvalidated(generation);
			if (exitCode !== 0) {
				throw new Error(`FFmpeg exited with code ${exitCode}`);
			}

			const output = await engine.readFile(request.outputName);
			this.throwIfInvalidated(generation);
			if (typeof output === "string") {
				throw new Error("FFmpeg returned text for a binary media output");
			}
			return output;
		})();

		try {
			return await Promise.race([operation, cancellation]);
		} finally {
			const completedEngine = currentEngine();
			if (completedEngine && progressCallback) {
				try {
					completedEngine.off("progress", progressCallback);
				} catch {
					// A terminated engine may no longer accept listener operations.
				}
			}

			if (completedEngine && generation === this.engineGeneration) {
				await Promise.all([
					MediaAdapter.deleteTempFile(completedEngine, request.inputName),
					MediaAdapter.deleteTempFile(completedEngine, request.outputName),
				]);
			}

			if (this.rejectActiveCancellation === rejectCancellation) {
				this.rejectActiveCancellation = null;
			}
			if (this.activeJobId === request.jobId) {
				this.activeJobId = null;
			}
			if (this.activeEngine === completedEngine) {
				this.activeEngine = null;
			}
		}
	}

	cancel(jobId: string): boolean {
		if (this.activeJobId !== jobId) {
			return false;
		}

		this.engineGeneration += 1;
		this.enginePromise = null;
		const engine = this.activeEngine;
		this.activeEngine = null;
		this.rejectActiveCancellation?.(
			new Error(`Media job ${jobId} was cancelled`),
		);
		if (engine) this.terminateEngine(engine);
		return true;
	}
}
