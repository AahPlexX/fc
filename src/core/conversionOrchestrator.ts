import {
	getCompatibleTargets,
	type ConversionCapabilities,
} from "./compatibilityMatrix";
import { buildOutputFileName } from "./exportManager";
import { runConversion } from "./conversionRunner";
import type { MediaProgressState } from "./mediaProgress";
import type {
	ConversionJob,
	DetectedFormat,
	FormatId,
	JobStatus,
} from "./types";

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

export interface ConversionUpdate {
	readonly status: JobStatus;
	readonly progressPercent: number | null;
	readonly statusMessage: string;
}

export interface ConversionResult {
	readonly blob: Blob;
	readonly outputName: string;
}

export interface ConversionRuntime {
	readonly image: (
		job: ConversionJob,
		target: FormatId,
		signal: AbortSignal,
	) => Promise<Blob>;
	readonly tabular: (
		job: ConversionJob,
		target: FormatId,
		signal: AbortSignal,
	) => Promise<Blob>;
	readonly document: (
		job: ConversionJob,
		target: FormatId,
		signal: AbortSignal,
	) => Promise<Blob>;
	readonly media: (
		job: ConversionJob,
		target: FormatId,
		signal: AbortSignal,
		onProgress: (progress: MediaProgressState) => void,
	) => Promise<Blob>;
}

const IMPLEMENTED_IMAGE_TARGETS = new Set<FormatId>([
	"png",
	"jpeg",
	"webp",
	"avif",
]);
const IMPLEMENTED_TABULAR_TARGETS = new Set<FormatId>([
	"csv",
	"tsv",
	"json",
	"md",
	"html",
]);
const IMPLEMENTED_PDF_TARGETS = new Set<FormatId>(["png", "jpeg", "pdf"]);
const IMPLEMENTED_MEDIA_TARGETS = new Set<FormatId>([
	"wav",
	"mp3",
	"flac",
	"ogg",
	"aac",
	"m4a",
	"mp4",
	"webm",
	"mov",
	"gif",
]);

const isImplementedTarget = (
	source: DetectedFormat,
	target: FormatId,
): boolean => {
	switch (source.domain) {
		case "image":
			return IMPLEMENTED_IMAGE_TARGETS.has(target);
		case "tabular":
			return IMPLEMENTED_TABULAR_TARGETS.has(target);
		case "document":
			return source.format === "pdf" && IMPLEMENTED_PDF_TARGETS.has(target);
		case "audio":
		case "video":
			return IMPLEMENTED_MEDIA_TARGETS.has(target);
		default:
			return false;
	}
};

export const getExecutableTargets = (
	source: DetectedFormat,
	capabilities: ConversionCapabilities = { avifEncode: false },
): readonly FormatId[] =>
	getCompatibleTargets(source, capabilities).filter((target) =>
		isImplementedTarget(source, target),
	);

const isSemanticallyCompatible = (
	job: ConversionJob,
	target: FormatId,
): boolean =>
	getCompatibleTargets(job.detectedFormat, { avifEncode: true }).includes(
		target,
	);

export const planConversion = (job: ConversionJob): ConversionPlan => {
	const target = job.targetFormat;
	if (!target)
		throw new Error("A target format must be selected before conversion");
	if (!isSemanticallyCompatible(job, target)) {
		throw new Error(
			`${job.detectedFormat.format.toUpperCase()} to ${target.toUpperCase()} is not a compatible conversion`,
		);
	}
	if (!isImplementedTarget(job.detectedFormat, target)) {
		throw new Error(
			`${job.detectedFormat.format.toUpperCase()} to ${target.toUpperCase()} is not implemented yet`,
		);
	}

	let engine: ConversionEngineKind;
	switch (job.detectedFormat.domain) {
		case "image":
			engine = "image";
			break;
		case "tabular":
			engine = "tabular";
			break;
		case "document":
			engine = "document";
			break;
		case "audio":
		case "video":
			engine = "media";
			break;
		default:
			throw new Error(
				`${job.detectedFormat.format.toUpperCase()} does not have an implemented conversion engine`,
			);
	}

	return {
		engine,
		target,
		outputName: buildOutputFileName(job.sourceFile.name, target),
	};
};

const safeToken = (value: string): string => {
	const normalized = value
		.replaceAll(/[^a-zA-Z0-9_-]/g, "-")
		.replaceAll(/-+/g, "-");
	return normalized.replaceAll(/^-|-$/g, "") || "job";
};

const AUDIO_ARGS: Readonly<Partial<Record<FormatId, readonly string[]>>> = {
	wav: ["-vn", "-c:a", "pcm_s16le"],
	mp3: ["-vn", "-c:a", "libmp3lame"],
	flac: ["-vn", "-c:a", "flac"],
	ogg: ["-vn", "-c:a", "libvorbis"],
	aac: ["-vn", "-c:a", "aac", "-f", "adts"],
	m4a: ["-vn", "-c:a", "aac"],
};

const VIDEO_ARGS: Readonly<Partial<Record<FormatId, readonly string[]>>> = {
	mp4: [
		"-c:v",
		"libx264",
		"-pix_fmt",
		"yuv420p",
		"-c:a",
		"aac",
		"-movflags",
		"+faststart",
	],
	mov: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"],
	webm: ["-c:v", "libvpx-vp9", "-c:a", "libopus"],
	gif: ["-vf", "fps=12", "-an"],
};

const METADATA_KEYS: Readonly<Record<string, string>> = {
	artist: "artist",
	title: "title",
	album: "album",
	genre: "genre",
	year: "date",
	comment: "comment",
};

export const buildMediaCommand = (job: ConversionJob): MediaCommandPlan => {
	const target = job.targetFormat;
	if (
		!target ||
		(job.detectedFormat.domain !== "audio" &&
			job.detectedFormat.domain !== "video")
	) {
		throw new Error(
			"Media command requires an audio/video source and selected target",
		);
	}
	if (!isSemanticallyCompatible(job, target)) {
		throw new Error(
			`${job.detectedFormat.format.toUpperCase()} to ${target.toUpperCase()} is not compatible`,
		);
	}

	const codecArgs = AUDIO_ARGS[target] ?? VIDEO_ARGS[target];
	if (!codecArgs)
		throw new Error(
			`No FFmpeg recipe is implemented for ${target.toUpperCase()}`,
		);

	const token = safeToken(job.id);
	const inputName = `${token}-input.${job.detectedFormat.format}`;
	const outputName = `${token}-output.${target}`;
	const args: string[] = ["-i", inputName, ...codecArgs];

	if (job.metadataPolicy.stripAllMetadata) args.push("-map_metadata", "-1");
	for (const [rawKey, value] of Object.entries(job.metadataPolicy.overrides)) {
		const mappedKey = METADATA_KEYS[rawKey.toLowerCase()];
		if (mappedKey && value.trim())
			args.push("-metadata", `${mappedKey}=${value}`);
	}
	args.push(outputName);
	return { inputName, outputName, args, progressReliable: true };
};

const abortError = (): DOMException =>
	new DOMException("Conversion cancelled", "AbortError");

export class ConversionOrchestrator {
	private readonly activeControllers = new Map<string, AbortController>();

	constructor(private readonly runtime: ConversionRuntime) {}

	async convert(
		job: ConversionJob,
		onUpdate?: (update: ConversionUpdate) => void,
	): Promise<ConversionResult> {
		if (this.activeControllers.has(job.id))
			throw new Error(`Job ${job.id} is already converting`);

		const plan = planConversion(job);
		const controller = new AbortController();
		this.activeControllers.set(job.id, controller);
		const update = (next: ConversionUpdate): void => onUpdate?.(next);
		update({
			status: "INITIALIZING_ENGINE",
			progressPercent: null,
			statusMessage: "Loading conversion engine",
		});

		try {
			controller.signal.throwIfAborted();
			update({
				status: "CONVERTING",
				progressPercent: 0,
				statusMessage: `Converting to ${plan.target.toUpperCase()}`,
			});

			let blob: Blob;
			switch (plan.engine) {
				case "image":
					blob = await this.runtime.image(job, plan.target, controller.signal);
					break;
				case "tabular":
					blob = await this.runtime.tabular(
						job,
						plan.target,
						controller.signal,
					);
					break;
				case "document":
					blob = await this.runtime.document(
						job,
						plan.target,
						controller.signal,
					);
					break;
				case "media":
					blob = await this.runtime.media(
						job,
						plan.target,
						controller.signal,
						(progress) => {
							const processed =
								progress.timeSeconds === null
									? ""
									: ` · ${progress.timeSeconds.toFixed(1)}s processed`;
							const percent =
								progress.percent === null ? null : progress.percent;
							update({
								status: "CONVERTING",
								progressPercent: percent,
								statusMessage:
									percent === null
										? `Transcoding${processed}`
										: `Transcoding ${Math.round(percent)}%${processed}`,
							});
						},
					);
					break;
			}

			controller.signal.throwIfAborted();
			return { blob, outputName: plan.outputName };
		} finally {
			this.activeControllers.delete(job.id);
		}
	}

	cancel(jobId: string): boolean {
		const controller = this.activeControllers.get(jobId);
		if (!controller) return false;
		controller.abort(abortError());
		return true;
	}
}

// Preserve the upstream runtime contract while sharing the browser-verified execution boundary.
export const createBrowserConversionRuntime = (): ConversionRuntime => ({
	image: (job, target, signal) =>
		runConversion({ ...job, targetFormat: target }, signal, () => undefined),
	tabular: (job, target, signal) =>
		runConversion({ ...job, targetFormat: target }, signal, () => undefined),
	document: (job, target, signal) =>
		runConversion({ ...job, targetFormat: target }, signal, () => undefined),
	media: (job, target, signal, onProgress) =>
		runConversion({ ...job, targetFormat: target }, signal, (update) =>
			onProgress({
				mode:
					update.progressPercent === null ||
					update.progressPercent === undefined
						? "indeterminate"
						: "determinate",
				percent: update.progressPercent ?? null,
				timeSeconds: null,
			}),
		),
});
