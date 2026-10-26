import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DropzoneHeader } from "./components/DropzoneHeader";
import { JobCard } from "./components/JobCard";
import { MetadataDrawer } from "./components/MetadataDrawer";
import { PreviewModal } from "./components/PreviewModal";
import { getCompatibleTargets } from "./core/compatibilityMatrix";
import {
	detectFile,
	inspectJobMetadata,
	probeMedia,
	runConversion,
	workerRequest,
} from "./core/conversionRunner";
import {
	buildOutputFileName,
	triggerBlobDownload as downloadBlob,
} from "./core/exportManager";
import { createQueuedJob } from "./core/jobStore";
import type {
	ConversionJob,
	DetectedFormat,
	MetadataPolicy,
} from "./core/types";

const configurable = (job: ConversionJob) =>
	["QUEUED", "FAILED", "CANCELLED"].includes(job.status);
export const App = () => {
	const [avifEncode, setAvifEncode] = useState(false);
	useEffect(() => {
		if (typeof OffscreenCanvas === "undefined") return;
		void new OffscreenCanvas(1, 1)
			.convertToBlob({ type: "image/avif" })
			.then((blob) => setAvifEncode(blob.type === "image/avif"))
			.catch(() => undefined);
	}, []);
	const targetsFor = useCallback(
		(source: DetectedFormat) => getCompatibleTargets(source, { avifEncode }),
		[avifEncode],
	);
	const [jobs, setJobs] = useState<readonly ConversionJob[]>([]);
	const jobsRef = useRef(jobs);
	const [notice, setNotice] = useState("Ready. Files stay on this device.");
	const [busy, setBusy] = useState(false);
	const [batchState, setBatchState] = useState({ total: 0, finished: 0 });
	const busyRef = useRef(false);
	const active = useRef<AbortController | null>(null);
	const imports = useRef(new Set<AbortController>());
	const [metadataId, setMetadataId] = useState<string | null>(null);
	const [metadataLoading, setMetadataLoading] = useState(false);
	const [metadataError, setMetadataError] = useState<string | null>(null);
	const metadataController = useRef<AbortController | null>(null);
	const [archiveBlob, setArchiveBlob] = useState<Blob | null>(null);
	const [previewId, setPreviewId] = useState<string | null>(null);
	const [batchDomain, setBatchDomain] = useState("all");
	const [now, setNow] = useState(Date.now());
	const change = useCallback(
		(update: (jobs: readonly ConversionJob[]) => readonly ConversionJob[]) => {
			const next = update(jobsRef.current);
			jobsRef.current = next;
			setJobs(next);
		},
		[],
	);
	const patch = useCallback(
		(id: string, values: Partial<ConversionJob>) =>
			change((current) =>
				current.map((j) => (j.id === id ? { ...j, ...values } : j)),
			),
		[change],
	);
	useEffect(
		() => () => {
			active.current?.abort();
			for (const controller of imports.current) controller.abort();
		},
		[],
	);
	useEffect(() => {
		if (!busy) return;
		const timer = setInterval(() => setNow(Date.now()), 1000);
		return () => clearInterval(timer);
	}, [busy]);
	const addFiles = useCallback(
		(files: readonly File[]) => {
			const controller = new AbortController();
			imports.current.add(controller);
			void (async () => {
				setNotice("Inspecting local file signatures…");
				let added = 0;
				const pending = [...files];
				for (const file of pending) {
					if (controller.signal.aborted) break;
					try {
						if (file.size > 1_500_000_000)
							throw new Error("File exceeds the 1.5 GB browser safety limit");
						let detected = await detectFile(file, controller.signal);
						if (!detected)
							throw new Error("Unsupported or unrecognized file content");
						if (detected.domain === "archive") {
							if (file.size > 256 * 1024 * 1024)
								throw new Error("ZIP archive exceeds the 256 MiB input limit");
							const { entries: extracted } = await workerRequest<{
								entries: { filename: string; blob: Blob }[];
							}>(
								new Worker(new URL("./core/exportFiles.ts", import.meta.url), {
									type: "module",
								}),
								{
									type: "zip-import",
									jobId: "import-zip",
									file,
								},
								controller.signal,
							);
							pending.push(
								...extracted.map(
									(e) => new File([e.blob], e.filename, { type: e.blob.type }),
								),
							);
							continue;
						}
						let fields: ConversionJob["originalMetadata"] = [];
						if (detected.needsProbe) {
							setNotice(
								`Inspecting streams in ${file.name} — loading local media engine…`,
							);
							const result = await probeMedia(
								file,
								detected,
								controller.signal,
							);
							detected = result.detected;
							fields = result.fields;
						}
						const job = createQueuedJob(crypto.randomUUID(), file, detected);
						change((current) => [
							...current,
							{
								...job,
								originalMetadata: fields,
								targetFormat: targetsFor(detected)[0] ?? null,
							},
						]);
						added++;
					} catch (error) {
						if (!controller.signal.aborted)
							setNotice(
								`${file.name}: ${error instanceof Error ? error.message : "Import failed"}`,
							);
					}
				}
				if (added)
					setNotice(
						`Added ${added} file${added === 1 ? "" : "s"}. Nothing uploaded.`,
					);
			})().finally(() => imports.current.delete(controller));
		},
		[change, targetsFor],
	);
	const queue = jobs.filter(configurable);
	const batchJobs = queue.filter(
		(j) => batchDomain === "all" || j.detectedFormat.domain === batchDomain,
	);
	const batchTargets = useMemo(() => {
		const first = batchJobs[0];
		return first
			? targetsFor(first.detectedFormat).filter((t) =>
					batchJobs.every((j) => targetsFor(j.detectedFormat).includes(t)),
				)
			: [];
	}, [batchJobs, targetsFor]);
	const completed = jobs.filter(
		(j) => j.status === "COMPLETED" && j.outputBlob,
	);
	const converting = jobs.filter((j) =>
		["INITIALIZING_ENGINE", "CONVERTING", "WRITING_METADATA"].includes(
			j.status,
		),
	);
	const execute = async (requested: readonly ConversionJob[]) => {
		if (busyRef.current) return;
		busyRef.current = true;
		setBusy(true);
		const runnable = requested.filter(
			(job) => configurable(job) && job.targetFormat,
		);
		setBatchState({ total: runnable.length, finished: 0 });
		for (const [index, snapshot] of runnable.entries()) {
			const job = jobsRef.current.find((j) => j.id === snapshot.id);
			if (
				!job ||
				!configurable(job) ||
				!job.targetFormat ||
				(job.status === "CANCELLED" && snapshot.status !== "CANCELLED")
			)
				continue;
			const controller = new AbortController();
			active.current = controller;
			patch(job.id, {
				startedAtMs: Date.now(),
				completedAtMs: null,
				errorDetail: null,
				outputBlob: null,
				outputFileName: null,
			});
			try {
				const blob = await runConversion(job, controller.signal, (values) => {
					if (!controller.signal.aborted) patch(job.id, values);
				});
				controller.signal.throwIfAborted();
				const name = buildOutputFileName(job.sourceFile.name, job.targetFormat);
				patch(job.id, {
					status: "COMPLETED",
					statusMessage: "Complete",
					progressPercent: 100,
					outputBlob: blob,
					outputFileName: name,
					completedAtMs: Date.now(),
				});
				setNotice(`${job.sourceFile.name} converted successfully.`);
			} catch (error) {
				patch(job.id, {
					status: controller.signal.aborted ? "CANCELLED" : "FAILED",
					statusMessage: controller.signal.aborted
						? "Cancelled"
						: error instanceof Error
							? error.message
							: "Conversion failed",
					errorDetail: controller.signal.aborted ? null : String(error),
					completedAtMs: Date.now(),
					progressPercent: null,
				});
			} finally {
				setBatchState({ total: runnable.length, finished: index + 1 });
				active.current = null;
			}
		}
		busyRef.current = false;
		setBusy(false);
	};
	const cancel = (id: string) => {
		const job = jobsRef.current.find((j) => j.id === id);
		if (!job) return;
		if (
			["INITIALIZING_ENGINE", "CONVERTING", "WRITING_METADATA"].includes(
				job.status,
			)
		)
			active.current?.abort();
		patch(id, {
			status: "CANCELLED",
			statusMessage: "Cancelled",
			progressPercent: null,
		});
	};
	const openMetadata = async (job: ConversionJob) => {
		metadataController.current?.abort();
		setMetadataId(job.id);
		setMetadataError(null);
		setMetadataLoading(false);
		if (job.originalMetadata.length) return;
		const controller = new AbortController();
		metadataController.current = controller;
		setMetadataLoading(true);
		imports.current.add(controller);
		try {
			patch(job.id, {
				originalMetadata: await inspectJobMetadata(job, controller.signal),
			});
		} catch (error) {
			if (!controller.signal.aborted)
				setMetadataError(
					error instanceof Error ? error.message : "Metadata inspection failed",
				);
		} finally {
			imports.current.delete(controller);
			if (metadataController.current === controller) {
				metadataController.current = null;
				setMetadataLoading(false);
			}
		}
	};
	const closeMetadata = () => {
		metadataController.current?.abort();
		setMetadataId(null);
	};
	const applyMetadata = (policy: MetadataPolicy, matching: boolean) => {
		const source = jobsRef.current.find((j) => j.id === metadataId);
		change((current) =>
			current.map((j) =>
				configurable(j) &&
				(j.id === metadataId ||
					(matching &&
						j.detectedFormat.domain === source?.detectedFormat.domain))
					? { ...j, metadataPolicy: policy }
					: j,
			),
		);
		closeMetadata();
	};
	const download = (job: ConversionJob) => {
		if (job.outputBlob)
			downloadBlob(job.outputBlob, job.outputFileName ?? "converted");
	};
	const exportAll = async () => {
		if (busyRef.current || !completed.length) return;
		busyRef.current = true;
		setBusy(true);
		setBatchState({ total: 0, finished: 0 });
		setArchiveBlob(null);
		const controller = new AbortController();
		active.current = controller;
		try {
			setNotice("Packaging completed files locally…");
			const worker = new Worker(
				new URL("./core/exportFiles.ts", import.meta.url),
				{ type: "module" },
			);
			const { blob } = await workerRequest<{ blob: Blob }>(
				worker,
				{
					type: "zip-export",
					jobId: "zip",
					files: completed.map((j) => ({
						filename: j.outputFileName,
						blob: j.outputBlob,
					})),
				},
				controller.signal,
			);
			controller.signal.throwIfAborted();
			setArchiveBlob(blob);
			downloadBlob(blob, "omniconvert.zip");
			setNotice("ZIP ready. You can download it again using Download ZIP.");
		} catch (error) {
			setNotice(
				controller.signal.aborted ? "ZIP export cancelled." : String(error),
			);
		} finally {
			active.current = null;
			busyRef.current = false;
			setBusy(false);
		}
	};
	const mergeable = queue.filter(
		(j) =>
			j.detectedFormat.format === "pdf" || j.detectedFormat.domain === "image",
	);
	const merge = async () => {
		if (busyRef.current || mergeable.length < 2) return;
		busyRef.current = true;
		setBusy(true);
		setBatchState({ total: 0, finished: 0 });
		const controller = new AbortController();
		active.current = controller;
		try {
			setNotice("Compiling PDF locally…");
			const files = [];
			for (const job of mergeable) {
				const blob = await runConversion(
					{ ...job, targetFormat: "pdf" },
					controller.signal,
					() => undefined,
				);
				files.push({
					bytes: new Uint8Array(await blob.arrayBuffer()),
					format: "pdf",
				});
			}
			const { blob } = await workerRequest<{ blob: Blob }>(
				new Worker(new URL("./workers/document.worker.ts", import.meta.url), {
					type: "module",
				}),
				{
					type: "merge-pdfs",
					jobId: "merge",
					files,
					policy: { stripAllMetadata: true, overrides: {} },
				},
				controller.signal,
			);
			downloadBlob(blob, "omniconvert-merged.pdf");
			setNotice("Merged PDF ready.");
		} catch (error) {
			setNotice(String(error));
		} finally {
			active.current = null;
			busyRef.current = false;
			setBusy(false);
		}
	};
	return (
		<div className="app-shell">
			<a className="skip-link" href="#workspace">
				Skip to conversion workspace
			</a>
			<header className="workbench-header">
				<div className="brand-copy">
					<h1>OmniConvert</h1>
					<p>Different formats. Same privacy.</p>
				</div>
				<p className="privacy-badge">
					<span className="privacy-dot" aria-hidden="true" />
					100% local · Zero uploads
				</p>
			</header>
			<main className="workbench" id="workspace">
				<DropzoneHeader
					onFiles={addFiles}
					batchTargets={batchTargets}
					selectedBatchTarget={
						batchJobs.every(
							(j) => j.targetFormat === batchJobs[0]?.targetFormat,
						)
							? (batchJobs[0]?.targetFormat ?? null)
							: null
					}
					onBatchTargetChange={(target) =>
						change((current) =>
							current.map((j) =>
								batchJobs.some((b) => b.id === j.id)
									? { ...j, targetFormat: target }
									: j,
							),
						)
					}
					stripAllMetadata={
						batchJobs.length > 0 &&
						batchJobs.every((j) => j.metadataPolicy.stripAllMetadata)
					}
					onStripMetadataChange={(strip) =>
						change((current) =>
							current.map((j) =>
								batchJobs.some((b) => b.id === j.id)
									? {
											...j,
											metadataPolicy: {
												...j.metadataPolicy,
												stripAllMetadata: strip,
											},
										}
									: j,
							),
						)
					}
					activeCount={busy ? batchState.total : converting.length}
					aggregateProgress={
						batchState.total
							? (100 * batchState.finished) / batchState.total
							: null
					}
				/>
				<div className="workspace-toolbar">
					<label className="field-control">
						Apply batch settings to
						<select
							value={batchDomain}
							onChange={(event) => setBatchDomain(event.currentTarget.value)}
						>
							<option value="all">All queued domains</option>
							{["image", "audio", "video", "tabular", "document"].map((d) => (
								<option key={d} value={d}>
									{d}
								</option>
							))}
						</select>
					</label>
					<button
						className="primary-action"
						type="button"
						disabled={busy || queue.length === 0}
						onClick={() => void execute(jobsRef.current)}
					>
						Convert all ({queue.length})
					</button>
					<button
						type="button"
						disabled={busy || !completed.length}
						onClick={() => void exportAll()}
					>
						Export completed as ZIP
					</button>
					{archiveBlob && (
						<button
							type="button"
							onClick={() => downloadBlob(archiveBlob, "omniconvert.zip")}
						>
							Download ZIP
						</button>
					)}
					<button
						type="button"
						disabled={busy || mergeable.length < 2}
						onClick={() => void merge()}
					>
						Compile / merge PDF
					</button>
					<button
						type="button"
						disabled={!completed.length}
						onClick={() => {
							setArchiveBlob(null);
							change((current) =>
								current.filter((j) => j.status !== "COMPLETED"),
							);
						}}
					>
						Clear completed
					</button>
					{busy && (
						<button type="button" onClick={() => active.current?.abort()}>
							Cancel active operation
						</button>
					)}
				</div>
				<p className="import-notice" role="status">
					{notice}
				</p>
				<section className="queue-section" aria-labelledby="queue-heading">
					<div className="queue-heading-row">
						<div>
							<h2 id="queue-heading">Conversion queue</h2>
						</div>
						<span className="queue-count">{jobs.length}</span>
					</div>
					{!jobs.length ? (
						<div className="empty-queue">
							<h3>Your files, your device.</h3>
							<p>
								Images, audio, video, tables, and documents. Choose files above
								to find compatible formats. Heavy engines load only when needed.
							</p>
						</div>
					) : (
						<ul className="job-grid">
							{jobs.map((job) => (
								<li key={job.id}>
									<JobCard
										job={job}
										targets={targetsFor(job.detectedFormat)}
										onTargetChange={(id, target) => {
											if (configurable(job))
												patch(id, { targetFormat: target });
										}}
										onCancel={cancel}
										onConvert={() => void execute([job])}
										onMetadata={() => void openMetadata(job)}
										onPreview={() => setPreviewId(job.id)}
										onDownload={() => void download(job)}
										onRemove={() =>
											change((current) =>
												current.filter((j) => j.id !== job.id),
											)
										}
										onPagesChange={(pages) =>
											patch(job.id, { pageNumbers: pages })
										}
										onImageOptionsChange={(options) =>
											patch(job.id, { imageOptions: options })
										}
										busy={busy}
										now={now}
									/>
								</li>
							))}
						</ul>
					)}
				</section>
				<p className="workbench-footnote">
					No accounts. No cloud conversion. Some codecs and large files depend
					on your browser’s memory. Keep this tab open while converting.
					{import.meta.env.PROD && (
						<>
							{" "}
							<a href="/sources.html" target="_blank" rel="noopener noreferrer">
								Licenses and source code (opens in a new tab)
							</a>
						</>
					)}
				</p>
			</main>
			<MetadataDrawer
				job={jobs.find((j) => j.id === metadataId) ?? null}
				loading={metadataLoading}
				error={metadataError}
				onClose={closeMetadata}
				onApply={applyMetadata}
			/>
			<PreviewModal
				job={jobs.find((j) => j.id === previewId) ?? null}
				onClose={() => setPreviewId(null)}
			/>
		</div>
	);
};
