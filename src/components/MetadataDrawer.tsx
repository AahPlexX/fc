import { useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { ConversionJob, MetadataPolicy } from "../core/types";

export interface MetadataDrawerProps {
	readonly job: ConversionJob | null;
	readonly onClose: () => void;
	readonly onApply: (policy: MetadataPolicy, applyToMatching: boolean) => void;
}

const EDITABLE_KEYS: Readonly<Record<string, readonly string[]>> = {
	image: ["Artist", "Copyright", "ImageDescription", "Software"],
	audio: ["Artist", "Title", "Album", "Genre", "Year", "Comment"],
	video: ["Artist", "Title", "Album", "Genre", "Year", "Comment"],
	document: ["Title", "Author", "Subject", "Keywords", "Creator", "Producer"],
};

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

export const MetadataDrawer = ({
	job,
	onClose,
	onApply,
}: MetadataDrawerProps) => {
	const dialogRef = useRef<HTMLDialogElement>(null);
	const openerRef = useRef<HTMLElement | null>(null);
	const resetJobRef = useRef<string | null>(null);
	const [stripAllMetadata, setStripAllMetadata] = useState(false);
	const [overrides, setOverrides] = useState<Record<string, string>>({});
	const [applyToMatching, setApplyToMatching] = useState(false);
	const jobId = job?.id;
	const stripPolicy = job?.metadataPolicy.stripAllMetadata;
	const policyOverrides = job?.metadataPolicy.overrides;
	const isOpen = job !== null;

	useEffect(() => {
		if (!jobId) {
			resetJobRef.current = null;
			return;
		}
		if (resetJobRef.current === jobId) return;
		resetJobRef.current = jobId;
		setStripAllMetadata(stripPolicy ?? false);
		setOverrides({ ...(policyOverrides ?? {}) });
		setApplyToMatching(false);
	}, [jobId, stripPolicy, policyOverrides]);

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

	const supportedKeys = job
		? (EDITABLE_KEYS[job.detectedFormat.domain ?? ""] ?? [])
		: [];
	const fields = job?.originalMetadata ?? [];

	return (
		<dialog
			ref={dialogRef}
			tabIndex={-1}
			className="metadata-drawer"
			aria-labelledby="metadata-drawer-title"
			onKeyDown={keepTabFocusInside}
			onClose={onClose}
			onCancel={(event) => {
				event.preventDefault();
				dialogRef.current?.close();
			}}
		>
			{job && (
				<form method="dialog" onSubmit={(event) => event.preventDefault()}>
					<header>
						<div>
							<p>{job.sourceFile.name}</p>
							<h2 id="metadata-drawer-title">Metadata</h2>
						</div>
						<button
							type="button"
							aria-label="Close metadata"
							onClick={() => dialogRef.current?.close()}
						>
							Close
						</button>
					</header>
					<section aria-label="Original metadata">
						<h3>Original tags</h3>
						{fields.length === 0 ? (
							<p>No supported metadata was found.</p>
						) : (
							<dl>
								{fields.map((field) => (
									<div key={`${field.category}-${field.key}`}>
										<dt>{field.label}</dt>
										<dd>{field.value}</dd>
									</div>
								))}
							</dl>
						)}
					</section>
					{supportedKeys.length > 0 && (
						<fieldset>
							<legend>Edit supported tags</legend>
							{supportedKeys.map((key) => {
								const field = fields.find(
									(item) => item.key.toLowerCase() === key.toLowerCase(),
								);
								const value = overrides[key] ?? field?.value ?? "";
								const id = `metadata-${job.id}-${key}`;
								return (
									<label key={key} htmlFor={id}>
									<span>{key}</span>
										<input
											id={id}
											name={`metadata-${key}`}
											value={value}
											onChange={(event) => {
												const nextValue = event.currentTarget.value;
												setOverrides((current) => ({
													...current,
													[key]: nextValue,
												}));
											}}
										/>
									</label>
								);
							})}
						</fieldset>
					)}
					<label>
						<input
							type="checkbox"
							checked={stripAllMetadata}
							onChange={(event) =>
								setStripAllMetadata(event.currentTarget.checked)
							}
						/>
						<span>Strip all metadata</span>
					</label>
					{job.detectedFormat.domain === "image" && (
						<p>
							Image re-encoding strips source metadata. Only explicit JPEG
							fields above are written to JPEG output.
						</p>
					)}
					<label>
						<input
							type="checkbox"
							checked={applyToMatching}
							onChange={(event) =>
								setApplyToMatching(event.currentTarget.checked)
							}
						/>
						<span>Apply to matching files</span>
					</label>
					<footer>
						<button type="button" onClick={() => dialogRef.current?.close()}>
							Cancel
						</button>
						<button
							type="button"
							onClick={() =>
								onApply({ stripAllMetadata, overrides }, applyToMatching)
							}
						>
							Apply metadata
						</button>
					</footer>
				</form>
			)}
		</dialog>
	);
};
