import { getCompatibleTargets } from "./compatibilityMatrix";
import type {
	ConversionJob,
	DetectedFormat,
	FormatId,
	MetadataField,
} from "./types";

type Patch = (patch: Partial<ConversionJob>) => void;
export const engineConfig = {
	coreURL: "/engines/ffmpeg-core.js",
	wasmURL: "/engines/ffmpeg-core.wasm",
	classWorkerURL: "/engines/ffmpeg/worker.js",
};
export const workerRequest = <T>(
	worker: Worker,
	message: unknown,
	signal: AbortSignal,
): Promise<T> =>
	new Promise((resolve, reject) => {
		const finish = (error?: Error, result?: T) => {
			clearTimeout(timer);
			signal.removeEventListener("abort", abort);
			worker.terminate();
			if (error) reject(error);
			else resolve(result as T);
		};
		const abort = () => finish(new DOMException("Cancelled", "AbortError"));
		const timer = setTimeout(
			() => finish(new Error("Operation timed out. Try a smaller file.")),
			300_000,
		);
		if (signal.aborted) {
			abort();
			return;
		}
		signal.addEventListener("abort", abort, { once: true });
		const request = message as { jobId?: string; request?: { jobId?: string } };
		const expectedId = request.jobId ?? request.request?.jobId;
		worker.onmessage = (
			event: MessageEvent<
				T & { jobId?: string; type?: string; message?: string }
			>,
		) => {
			if (!event.data || event.data.jobId !== expectedId) return;
			event.data.type === "error"
				? finish(new Error(event.data.message ?? "Worker failed"))
				: finish(undefined, event.data);
		};
		worker.onerror = (event) =>
			finish(new Error(event.message || "Conversion worker could not load"));
		worker.postMessage(message);
	});
const metadataWorker = () =>
	new Worker(new URL("../workers/metadata.worker.ts", import.meta.url), {
		type: "module",
	});
export const detectFile = async (
	file: File,
	signal: AbortSignal,
): Promise<DetectedFormat | null> => {
	const result = await workerRequest<{ detected: DetectedFormat | null }>(
		metadataWorker(),
		{ type: "detect", jobId: "detect", file },
		signal,
	);
	return result.detected;
};
const withMedia = async <T>(
	signal: AbortSignal,
	work: (
		engine: InstanceType<typeof import("@ffmpeg/ffmpeg").FFmpeg>,
	) => Promise<T>,
): Promise<T> => {
	const { FFmpeg } = await import("@ffmpeg/ffmpeg");
	signal.throwIfAborted();
	const engine = new FFmpeg();
	const abort = () => engine.terminate();
	signal.addEventListener("abort", abort, { once: true });
	const timer = setTimeout(abort, 300_000);
	try {
		await engine.load(engineConfig);
		signal.throwIfAborted();
		return await work(engine);
	} finally {
		clearTimeout(timer);
		signal.removeEventListener("abort", abort);
		engine.terminate();
	}
};
export const probeMedia = async (
	file: File,
	detected: DetectedFormat,
	signal: AbortSignal,
): Promise<{ detected: DetectedFormat; fields: readonly MetadataField[] }> =>
	withMedia(signal, async (engine) => {
		await engine.writeFile("input", new Uint8Array(await file.arrayBuffer()));
		const code = await engine.ffprobe([
			"-v",
			"error",
			"-show_streams",
			"-show_format",
			"-of",
			"json",
			"input",
			"-o",
			"probe.json",
		]);
		// Pinned core 0.12.10 returns -1 for completed ffprobe runs with valid JSON.
		// Require a complete, parseable stream report below; positive exit errors still fail.
		if (code !== 0 && code !== -1)
			throw new Error("Media streams could not be inspected");
		const bytes = await engine.readFile("probe.json");
		const data = JSON.parse(
			typeof bytes === "string" ? bytes : new TextDecoder().decode(bytes),
		) as {
			streams?: {
				codec_type?: string;
				disposition?: { attached_pic?: number };
				tags?: Record<string, string>;
			}[];
			format?: { format_name?: string; tags?: Record<string, string> };
		};
		if (!Array.isArray(data.streams) || !data.format)
			throw new Error("Incomplete media stream report");
		const streams = data.streams;
		const domain = streams.some(
			(s) => s.codec_type === "video" && !s.disposition?.attached_pic,
		)
			? "video"
			: streams.some((s) => s.codec_type === "audio")
				? "audio"
				: null;
		if (!domain) throw new Error("No convertible audio or video stream found");
		const format =
			detected.format === "mkv" && data.format?.format_name?.includes("webm")
				? "webm"
				: detected.format;
		const tags = Object.assign(
			{},
			...streams.map((s) => s.tags ?? {}),
			data.format?.tags ?? {},
		) as Record<string, string>;
		return {
			detected: { ...detected, format, domain, needsProbe: false },
			fields: Object.entries(tags).map(([key, value]) => ({
				key,
				label: key,
				value: String(value),
				editable: true,
				category: "container" as const,
			})),
		};
	});
export const inspectJobMetadata = async (
	job: ConversionJob,
	signal: AbortSignal,
): Promise<readonly MetadataField[]> => {
	if (
		job.detectedFormat.domain === "audio" ||
		job.detectedFormat.domain === "video"
	)
		return (await probeMedia(job.sourceFile, job.detectedFormat, signal))
			.fields;
	if (
		job.detectedFormat.domain !== "image" &&
		job.detectedFormat.format !== "pdf"
	)
		return [];
	const bytes = await job.sourceFile.arrayBuffer();
	const { entries } = await workerRequest<{
		entries: { group: string; name: string; value: unknown }[];
	}>(
		metadataWorker(),
		{
			type: "inspect",
			jobId: job.id,
			bytes,
			format: job.detectedFormat.format === "pdf" ? "pdf" : "image",
		},
		signal,
	);
	return entries.map((entry) => ({
		key: entry.name,
		label: entry.name,
		value: String(entry.value),
		editable: entry.group !== "gps",
		category:
			entry.group === "gps" ? "gps" : entry.group === "pdf" ? "pdf" : "exif",
	}));
};
// Native SVG image decoding is unavailable in several worker ImageBitmap implementations.
// This platform fallback uses an inert image context; SVG scripts/foreign resources do not execute.
const rasterizeSvg = async (
	source: Blob,
	signal: AbortSignal,
): Promise<Blob> => {
	const url = URL.createObjectURL(
		new Blob([source], { type: "image/svg+xml" }),
	);
	const image = new Image();
	const abort = () => {
		image.src = "";
	};
	signal.addEventListener("abort", abort, { once: true });
	try {
		const loaded = new Promise<void>((resolve, reject) => {
			image.onload = () => resolve();
			image.onerror = () =>
				reject(new Error("SVG could not be decoded safely"));
		});
		image.src = url;
		await loaded;
		signal.throwIfAborted();
		const width = image.naturalWidth,
			height = image.naturalHeight;
		if (width < 1 || height < 1 || width * height > 16_777_216)
			throw new Error("SVG rasterization is limited to 16 megapixels");
		const canvas = document.createElement("canvas");
		canvas.width = width;
		canvas.height = height;
		const context = canvas.getContext("2d");
		if (!context) throw new Error("Canvas unavailable");
		context.drawImage(image, 0, 0);
		const blob = await new Promise<Blob>((resolve, reject) =>
			canvas.toBlob(
				(value) =>
					value
						? resolve(value)
						: reject(new Error("SVG rasterization failed")),
				"image/png",
			),
		);
		signal.throwIfAborted();
		return blob;
	} finally {
		signal.removeEventListener("abort", abort);
		image.src = "";
		URL.revokeObjectURL(url);
	}
};
const OUTPUT_MIME: Partial<Record<FormatId, string>> = {
	mp3: "audio/mpeg",
	wav: "audio/wav",
	flac: "audio/flac",
	ogg: "audio/ogg",
	aac: "audio/aac",
	m4a: "audio/mp4",
	mp4: "video/mp4",
	webm: "video/webm",
	mov: "video/quicktime",
	gif: "image/gif",
};
export const runConversion = async (
	job: ConversionJob,
	signal: AbortSignal,
	patch: Patch,
): Promise<Blob> => {
	const target = job.targetFormat;
	if (
		!target ||
		!getCompatibleTargets(job.detectedFormat, {
			avifEncode: target === "avif",
		}).includes(target)
	)
		throw new Error("Invalid conversion target for this source");
	signal.throwIfAborted();
	patch({
		status: "INITIALIZING_ENGINE",
		statusMessage: "Loading Conversion Engine",
		progressPercent: null,
	});
	const source = job.detectedFormat.format;
	const domain = job.detectedFormat.domain;
	if (domain === "audio" || domain === "video")
		return withMedia(signal, async (engine) => {
			patch({
				status: "CONVERTING",
				statusMessage: "Transcoding media",
				progressPercent: null,
			});
			engine.on("progress", (event) =>
				patch({
					statusMessage: `Transcoding · ${Math.max(0, event.time / 1_000_000).toFixed(1)}s processed`,
					progressPercent: null,
				}),
			);
			await engine.writeFile(
				"input",
				new Uint8Array(await job.sourceFile.arrayBuffer()),
			);
			const args = ["-i", "input"];
			const audio = ["mp3", "wav", "flac", "ogg", "aac", "m4a"].includes(
				target,
			);
			args.push("-map", audio ? "0:a:0" : "0:v:0");
			if (!audio && target !== "gif") args.push("-map", "0:a?");
			if (job.metadataPolicy.stripAllMetadata)
				args.push(
					"-map_metadata",
					"-1",
					"-map_metadata:s",
					"-1",
					"-map_chapters",
					"-1",
				);
			for (const [key, value] of Object.entries(job.metadataPolicy.overrides))
				args.push(
					"-metadata",
					`${key.toLowerCase() === "year" ? "date" : key.toLowerCase()}=${value}`,
				);
			const codecs: Partial<Record<FormatId, string[]>> = {
				mp3: ["-c:a", "libmp3lame"],
				wav: ["-c:a", "pcm_s16le"],
				flac: ["-c:a", "flac"],
				ogg: ["-c:a", "libvorbis"],
				aac: ["-c:a", "aac"],
				m4a: ["-c:a", "aac"],
				mp4: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"],
				mov: ["-c:v", "libx264", "-pix_fmt", "yuv420p", "-c:a", "aac"],
				webm: ["-c:v", "libvpx", "-c:a", "libopus"],
				gif: ["-vf", "fps=12,scale=640:-1:flags=lanczos"],
			};
			args.push(...(codecs[target] ?? []), `output.${target}`);
			if ((await engine.exec(args)) !== 0)
				throw new Error(
					"Media conversion failed. Check whether the selected stream and codec are supported.",
				);
			const bytes = await engine.readFile(`output.${target}`);
			if (typeof bytes === "string") throw new Error("Invalid media output");
			return new Blob([new Uint8Array(bytes)], {
				type: OUTPUT_MIME[target] ?? "application/octet-stream",
			});
		});
	if (domain === "tabular") {
		const worker = new Worker(
			new URL("../workers/tabular.worker.ts", import.meta.url),
			{ type: "module" },
		);
		const text = await job.sourceFile.text();
		patch({ status: "CONVERTING", statusMessage: "Converting table" });
		const result = await workerRequest<{ text: string; mime: string }>(
			worker,
			{ type: "convert", jobId: job.id, text, source, target },
			signal,
		);
		return new Blob([result.text], { type: result.mime });
	}
	const rasterSource =
		domain === "image"
			? source === "svg"
				? await rasterizeSvg(job.sourceFile, signal)
				: new Blob([job.sourceFile], { type: job.detectedFormat.mime })
			: job.sourceFile;
	if (domain === "image" && target !== "pdf") {
		patch({ status: "CONVERTING", statusMessage: "Re-encoding image" });
		const result = await workerRequest<{ blob: Blob }>(
			new Worker(new URL("../workers/image.worker.ts", import.meta.url), {
				type: "module",
			}),
			{
				type: "convert",
				request: {
					jobId: job.id,
					source: rasterSource,
					target,
					metadataPolicy: job.metadataPolicy,
					quality: job.imageOptions?.quality,
					...(job.imageOptions?.maxWidth
						? { maxWidth: job.imageOptions.maxWidth }
						: {}),
				},
			},
			signal,
		);
		return result.blob;
	}
	const worker = new Worker(
		new URL("../workers/document.worker.ts", import.meta.url),
		{ type: "module" },
	);
	let bytes = new Uint8Array(await rasterSource.arrayBuffer());
	let documentSource = source;
	// Re-encode every image before PDF embedding: JPEG embedding otherwise retains private EXIF bytes.
	if (domain === "image") {
		const image = await workerRequest<{ blob: Blob }>(
			new Worker(new URL("../workers/image.worker.ts", import.meta.url), {
				type: "module",
			}),
			{
				type: "convert",
				request: { jobId: job.id, source: rasterSource, target: "png" },
			},
			signal,
		);
		bytes = new Uint8Array(await image.blob.arrayBuffer());
		documentSource = "png";
	}
	patch({ status: "CONVERTING", statusMessage: "Processing document" });
	if (source === "pdf" && (target === "png" || target === "jpeg")) {
		const result = await workerRequest<{ result: { blob: Blob } }>(
			worker,
			{
				type: "render-page",
				jobId: job.id,
				bytes,
				pageNumber: job.pageNumbers?.[0] ?? 1,
				scale: 1.5,
				target,
			},
			signal,
		);
		return result.result.blob;
	}
	const result = await workerRequest<{ blob: Blob }>(
		worker,
		{
			type: "convert-document",
			jobId: job.id,
			bytes,
			source: documentSource,
			target,
			policy: job.metadataPolicy,
			...(job.pageNumbers?.length ? { pageNumbers: job.pageNumbers } : {}),
		},
		signal,
	);
	return result.blob;
};
