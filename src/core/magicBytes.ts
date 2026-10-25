import type { DetectedFormat } from "./types";

const hasBytes = (
	bytes: Uint8Array,
	expected: readonly number[],
	offset = 0,
): boolean => expected.every((value, index) => bytes[offset + index] === value);

const ASCII = {
	BM: [0x42, 0x4d],
	FLAC: [0x66, 0x4c, 0x61, 0x43],
	GIF87A: [0x47, 0x49, 0x46, 0x38, 0x37, 0x61],
	GIF89A: [0x47, 0x49, 0x46, 0x38, 0x39, 0x61],
	ID3: [0x49, 0x44, 0x33],
	OGG: [0x4f, 0x67, 0x67, 0x53],
	PDF: [0x25, 0x50, 0x44, 0x46, 0x2d],
	RIFF: [0x52, 0x49, 0x46, 0x46],
	WAVE: [0x57, 0x41, 0x56, 0x45],
	WEBP: [0x57, 0x45, 0x42, 0x50],
	FTYP: [0x66, 0x74, 0x79, 0x70],
	AVIF: [0x61, 0x76, 0x69, 0x66],
	AVIS: [0x61, 0x76, 0x69, 0x73],
} as const;

const match = (
	format: DetectedFormat["format"],
	mime: string,
	domain: DetectedFormat["domain"],
	evidence: DetectedFormat["evidence"] = "signature",
	needsProbe = false,
): DetectedFormat => ({ format, mime, domain, evidence, needsProbe });

export const detectBinaryFormat = (
	bytes: Uint8Array,
): DetectedFormat | null => {
	if (hasBytes(bytes, [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
		return match("png", "image/png", "image");
	if (hasBytes(bytes, [0xff, 0xd8, 0xff]))
		return match("jpeg", "image/jpeg", "image");
	if (hasBytes(bytes, ASCII.GIF87A) || hasBytes(bytes, ASCII.GIF89A))
		return match("gif", "image/gif", "image");
	if (hasBytes(bytes, ASCII.RIFF) && hasBytes(bytes, ASCII.WEBP, 8))
		return match("webp", "image/webp", "image");
	if (hasBytes(bytes, ASCII.RIFF) && hasBytes(bytes, ASCII.WAVE, 8))
		return match("wav", "audio/wav", "audio");
	if (
		hasBytes(bytes, ASCII.FTYP, 4) &&
		(hasBytes(bytes, ASCII.AVIF, 8) || hasBytes(bytes, ASCII.AVIS, 8))
	) {
		return match("avif", "image/avif", "image", "container");
	}
	if (hasBytes(bytes, ASCII.FTYP, 4)) {
		const brand = new TextDecoder().decode(bytes.slice(8, 12));
		return match(
			brand === "qt  " ? "mov" : brand.startsWith("M4A") ? "m4a" : "mp4",
			"application/mp4",
			null,
			"container",
			true,
		);
	}
	if (hasBytes(bytes, [0x1a, 0x45, 0xdf, 0xa3]))
		return match("mkv", "video/x-matroska", null, "container", true);
	if (
		bytes.length >= 4 &&
		bytes[0] === 0xff &&
		((bytes[1] ?? 0) & 0xf6) === 0xf0
	)
		return match("aac", "audio/aac", "audio");
	if (
		bytes.length >= 4 &&
		bytes[0] === 0xff &&
		((bytes[1] ?? 0) & 0xe6) === 0xe2
	)
		return match("mp3", "audio/mpeg", "audio");
	if (hasBytes(bytes, ASCII.BM)) return match("bmp", "image/bmp", "image");
	if (hasBytes(bytes, [0x00, 0x00, 0x01, 0x00]))
		return match("ico", "image/x-icon", "image");
	if (hasBytes(bytes, ASCII.PDF))
		return match("pdf", "application/pdf", "document");
	if (
		hasBytes(bytes, [0x50, 0x4b, 0x03, 0x04]) ||
		hasBytes(bytes, [0x50, 0x4b, 0x05, 0x06]) ||
		hasBytes(bytes, [0x50, 0x4b, 0x07, 0x08])
	) {
		return match("zip", "application/zip", "archive");
	}
	if (hasBytes(bytes, ASCII.FLAC)) return match("flac", "audio/flac", "audio");
	if (hasBytes(bytes, ASCII.ID3)) return match("mp3", "audio/mpeg", "audio");
	if (hasBytes(bytes, ASCII.OGG))
		return match("ogg", "application/ogg", null, "container", true);
	return null;
};

const hasStableDelimitedShape = (text: string, delimiter: string): boolean => {
	const widths: number[] = [];
	let columns = 1;
	let inQuotes = false;
	let atFieldStart = true;
	let recordHasContent = false;
	const finishRecord = (): void => {
		if (recordHasContent && widths.length < 6) widths.push(columns);
		columns = 1;
		atFieldStart = true;
		recordHasContent = false;
	};

	for (let index = 0; index < text.length; index += 1) {
		const character = text[index] ?? "";
		if (inQuotes) {
			if (character === '"') {
				if (text[index + 1] === '"') index += 1;
				else inQuotes = false;
			}
			continue;
		}
		if (character === '"') {
			if (!atFieldStart) return false;
			inQuotes = true;
			recordHasContent = true;
			atFieldStart = false;
		} else if (character === delimiter) {
			columns += 1;
			recordHasContent = true;
			atFieldStart = true;
		} else if (character === "\n" || character === "\r") {
			if (character === "\r" && text[index + 1] === "\n") index += 1;
			finishRecord();
		} else {
			if (!atFieldStart && text[index - 1] === '"') return false;
			recordHasContent = true;
			atFieldStart = false;
		}
	}
	if (inQuotes) return false;
	finishRecord();
	return (
		widths.length >= 2 &&
		(widths[0] ?? 0) > 1 &&
		widths.every((width) => width === widths[0])
	);
};

export const detectTextFormat = (
	bytes: Uint8Array,
	filename = "",
	_reportedMime = "",
): DetectedFormat | null => {
	if (bytes.length === 0 || bytes.includes(0)) return null;

	let text: string;
	try {
		text = new TextDecoder("utf-8", { fatal: true })
			.decode(bytes)
			.replace(/^\uFEFF/, "")
			.trim();
	} catch {
		return null;
	}
	if (!text) return null;

	if (/^(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>]/i.test(text))
		return match("svg", "image/svg+xml", "image", "structural");
	const normalizedLines = text.replace(/\r\n?/g, "\n");
	if (/^\s*\|?.+\|.+\n\s*\|?\s*:?-{3,}/m.test(normalizedLines))
		return match("md", "text/markdown", "tabular", "structural");
	if (text.startsWith("[") || text.startsWith("{")) {
		try {
			const parsed: unknown = JSON.parse(text);
			if (parsed !== null && typeof parsed === "object") {
				return match("json", "application/json", "tabular", "structural");
			}
		} catch {
			// Continue to delimited structural checks.
		}
	}

	if (hasStableDelimitedShape(text, "\t")) {
		return match("tsv", "text/tab-separated-values", "tabular", "structural");
	}
	if (hasStableDelimitedShape(text, ",")) {
		return match("csv", "text/csv", "tabular", "structural");
	}
	if (/\.md$/i.test(filename))
		return match("md", "text/markdown", "document", "structural");
	if (/\.txt$/i.test(filename))
		return match("txt", "text/plain", "document", "structural");
	return null;
};
