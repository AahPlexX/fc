import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ConversionJob } from "../core/types";

export interface PreviewModalProps {
	readonly job: ConversionJob | null;
	readonly onClose: () => void;
}

const TEXT_FORMATS = new Set(["csv", "tsv", "json", "md", "html", "txt"]);
const IMAGE_FORMATS = new Set([
	"png",
	"jpeg",
	"gif",
	"webp",
	"avif",
	"bmp",
	"ico",
	"svg",
]);
const AUDIO_FORMATS = new Set(["wav", "mp3", "flac", "ogg", "aac", "m4a"]);
const textPreview = async (blob: Blob | File): Promise<string> =>
	(await blob.slice(0, 256 * 1024).text())
		.split(/\r?\n/)
		.slice(0, 50)
		.join("\n");

const keepTabFocusInside = (event: KeyboardEvent<HTMLDialogElement>) => {
	if (event.key !== "Tab") return;
	const dialog = event.currentTarget;
	const candidates = Array.from(
		dialog.querySelectorAll<HTMLElement>(
			'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])',
		),
	).filter(
		(element) =>
			element.getClientRects().length > 0 &&
			getComputedStyle(element).visibility !== "hidden" &&
			!element.closest('[inert], [aria-hidden="true"]'),
	);
	if (candidates.length === 0) {
		event.preventDefault();
		dialog.focus();
		return;
	}
	const first = candidates[0];
	const last = candidates[candidates.length - 1];
	const active = document.activeElement;
	if (event.shiftKey && (active === first || active === dialog || !dialog.contains(active))) {
		event.preventDefault();
		last?.focus();
	} else if (
		!event.shiftKey &&
		(active === last || active === dialog || !dialog.contains(active))
	) {
		event.preventDefault();
		first?.focus();
	}
};

export const PreviewModal = ({ job, onClose }: PreviewModalProps) => {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const openerRef = useRef<HTMLElement | null>(null);
	const [urls, setUrls] = useState<{
		source: string;
		output: string | null;
	} | null>(null);
	const [sourceText, setSourceText] = useState<string | null>(null);
	const [outputText, setOutputText] = useState<string | null>(null);
	const isOpen = job !== null;
	const sourceFile = job?.sourceFile;
	const outputBlob = job?.outputBlob;
	const sourceFormat = job?.detectedFormat.format;
	const targetFormat = job?.targetFormat;

	useEffect(() => {
		const dialog = dialogRef.current;
		if (!dialog) return;
		if (isOpen && !dialog.open) {
			openerRef.current =
				document.activeElement instanceof HTMLElement
					? document.activeElement
					: null;
			dialog.showModal();
		}
		if (!isOpen && dialog.open) dialog.close();
		return () => {
			if (dialog.open) dialog.close();
			const opener = openerRef.current;
			if (opener?.isConnected) opener.focus();
		};
	}, [isOpen]);

	useEffect(() => {
		setSourceText(null);
		setOutputText(null);
		if (!sourceFile) {
			setUrls(null);
			return;
		}
		const source = URL.createObjectURL(sourceFile);
		const output = outputBlob ? URL.createObjectURL(outputBlob) : null;
		setUrls({ source, output });
		let active = true;
		if (sourceFormat && TEXT_FORMATS.has(sourceFormat)) {
			void textPreview(sourceFile)
				.then((text) => {
					if (active) setSourceText(text);
				})
				.catch(() => {
					if (active) setSourceText("Text preview could not be read.");
				});
		}
		if (outputBlob && TEXT_FORMATS.has(targetFormat ?? "")) {
			void textPreview(outputBlob)
				.then((text) => {
					if (active) setOutputText(text);
				})
				.catch(() => {
					if (active) setOutputText("Text preview could not be read.");
				});
		}
		return () => {
			active = false;
			URL.revokeObjectURL(source);
			if (output) URL.revokeObjectURL(output);
		};
	}, [sourceFile, outputBlob, targetFormat, sourceFormat]);

	const domain = job?.detectedFormat.domain;
	const isText = !!job && TEXT_FORMATS.has(job.detectedFormat.format);
	const isPdf = job?.detectedFormat.format === "pdf";
	const media = domain === "audio" || domain === "video";
	const outputFormat = job?.targetFormat ?? "";
	const outputIsImage = IMAGE_FORMATS.has(outputFormat);
	const outputIsAudio = AUDIO_FORMATS.has(outputFormat);
	const outputIsVideo = ["mp4", "webm", "mov", "mkv"].includes(outputFormat);
	const outputIsText = TEXT_FORMATS.has(outputFormat);
	const outputIsPdf = outputFormat === "pdf";

	return (
		<dialog
			ref={dialogRef}
			tabIndex={-1}
			className="preview-modal"
			aria-labelledby="preview-modal-title"
			onKeyDown={keepTabFocusInside}
			onClose={onClose}
			onCancel={(event) => {
				event.preventDefault();
				dialogRef.current?.close();
			}}
		>
			{job && (
				<>
					<header>
						<div>
							<p>{job.sourceFile.name}</p>
							<h2 id="preview-modal-title">Preview</h2>
						</div>
						<button
							type="button"
							aria-label="Close preview"
							onClick={() => dialogRef.current?.close()}
						>
							Close
						</button>
					</header>
					{domain === "image" && (
						<section className="preview-images" aria-label="Image comparison">
							<figure>
								<figcaption>Source</figcaption>
								{urls && (
									<img
										src={urls.source}
										alt={`Source: ${job.sourceFile.name}`}
									/>
								)}
							</figure>
							<figure>
								<figcaption>Output</figcaption>
								{urls?.output && outputIsImage ? (
									<img
										src={urls.output}
										alt={`Output: ${job.outputFileName ?? job.sourceFile.name}`}
									/>
								) : urls?.output ? (
									<p>Output format: {outputFormat.toUpperCase()}</p>
								) : (
									<p>Output is not ready yet.</p>
								)}
							</figure>
						</section>
					)}
					{outputIsImage && domain !== "image" && (
						<section className="preview-images" aria-label="Output image preview">
							<figure>
								<figcaption>Output</figcaption>
								{urls?.output ? (
									<img
										src={urls.output}
										alt={`Output: ${job.outputFileName ?? job.sourceFile.name}`}
									/>
								) : (
									<p>Output is not ready yet.</p>
								)}
							</figure>
						</section>
					)}
					{media && (
						<section aria-label={`${domain} preview`}>
							<h3>Source</h3>
							{urls &&
								(domain === "audio" ? (
									// biome-ignore lint/a11y/useMediaCaption: Source files do not provide caption tracks; synthetic captions would misrepresent their content.
									<audio controls preload="metadata" src={urls.source}>
										Audio preview unavailable.
									</audio>
								) : (
									// biome-ignore lint/a11y/useMediaCaption: Source files do not provide caption tracks; synthetic captions would misrepresent their content.
									<video controls preload="metadata" src={urls.source}>
										Video preview unavailable.
									</video>
								))}
							<h3>Output</h3>
							{urls?.output && (outputIsAudio || outputIsVideo) ? (
								outputIsAudio ? (
									// biome-ignore lint/a11y/useMediaCaption: Converted files do not provide caption tracks; synthetic captions would misrepresent their content.
									<audio controls preload="metadata" src={urls.output}>
										Audio preview unavailable.
									</audio>
								) : (
									// biome-ignore lint/a11y/useMediaCaption: Converted files do not provide caption tracks; synthetic captions would misrepresent their content.
									<video controls preload="metadata" src={urls.output}>
										Video preview unavailable.
									</video>
								)
							) : urls?.output ? (
								<p>Output format: {outputFormat.toUpperCase()}</p>
							) : (
								<p>Output is not ready yet.</p>
							)}
						</section>
					)}
					{isText && (
						<section aria-label="Text comparison">
							<p>Plain text preview (first 50 lines)</p>
							<div className="preview-text-columns">
								<section>
									<h3>Source</h3>
									<pre>
										{sourceText === null
											? "Loading preview…"
											: sourceText || "No text content."}
									</pre>
								</section>
								<section>
									<h3>Output</h3>
									<pre>
										{!job.outputBlob
											? "Output is not ready yet."
											: outputIsPdf
												? "Output is a PDF. Download it below."
												: outputIsText
													? outputText === null
														? "Loading preview…"
														: outputText || "No text content."
													: `Output format: ${outputFormat.toUpperCase()}`}
									</pre>
								</section>
							</div>
							{job.detectedFormat.format === "html" && (
								<p>HTML is shown as text and is never run in the preview.</p>
							)}
						</section>
					)}
					{!isText && outputIsText && job.outputBlob && (
						<section aria-label="Output text preview">
							<p>Plain text preview (first 50 lines)</p>
							<pre>
								{outputText === null
									? "Loading preview…"
									: outputText || "No text content."}
							</pre>
							{outputFormat === "html" && (
								<p>HTML is shown as text and is never run in the preview.</p>
							)}
						</section>
					)}
					{(isPdf || outputIsPdf) && (
						<section>
							<p>For safety, download the PDF to view it.</p>
							{isPdf && urls && (
								<a href={urls.source} download={job.sourceFile.name}>
									Download source PDF
								</a>
							)}
							{outputIsPdf && urls?.output && (
								<a
									href={urls.output}
									download={job.outputFileName ?? "converted.pdf"}
								>
									Download output PDF
								</a>
							)}
						</section>
					)}
					{!isText && !isPdf && domain !== "image" && !media && (
						<p>No preview is available for this file type.</p>
					)}
					{job.outputBlob && (
						<p className="preview-size-delta">
							Original size: {job.sourceFile.size.toLocaleString()} B → Converted size:{" "}
							{job.outputBlob.size.toLocaleString()} B (
							{job.outputBlob.size - job.sourceFile.size >= 0 ? "+" : ""}
							{(job.outputBlob.size - job.sourceFile.size).toLocaleString()} B)
						</p>
					)}
				</>
			)}
		</dialog>
	);
};
