import { describe, expect, it } from "vitest";
import {
	detectBinaryFormat,
	detectTextFormat,
} from "../../src/core/magicBytes";

const ascii = (value: string): number[] =>
	Array.from(value, (character) => character.charCodeAt(0));

const expectMatch = (
	bytes: number[],
	expected: ReturnType<typeof detectBinaryFormat>,
): void => {
	expect(detectBinaryFormat(Uint8Array.from(bytes))).toEqual(expected);
};

describe("detectBinaryFormat", () => {
	it("recognizes unambiguous image signatures", () => {
		expectMatch([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a], {
			format: "png",
			mime: "image/png",
			domain: "image",
			evidence: "signature",
			needsProbe: false,
		});
		expectMatch([0xff, 0xd8, 0xff, 0xe0], {
			format: "jpeg",
			mime: "image/jpeg",
			domain: "image",
			evidence: "signature",
			needsProbe: false,
		});
		expectMatch(ascii("GIF87a"), {
			format: "gif",
			mime: "image/gif",
			domain: "image",
			evidence: "signature",
			needsProbe: false,
		});
		expectMatch([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WEBP")], {
			format: "webp",
			mime: "image/webp",
			domain: "image",
			evidence: "signature",
			needsProbe: false,
		});
		expectMatch([...ascii("BM"), 0, 0], {
			format: "bmp",
			mime: "image/bmp",
			domain: "image",
			evidence: "signature",
			needsProbe: false,
		});
		expectMatch([0, 0, 1, 0, 1, 0], {
			format: "ico",
			mime: "image/x-icon",
			domain: "image",
			evidence: "signature",
			needsProbe: false,
		});
		expectMatch([0, 0, 0, 24, ...ascii("ftypavif")], {
			format: "avif",
			mime: "image/avif",
			domain: "image",
			evidence: "container",
			needsProbe: false,
		});
	});

	it("recognizes document and archive signatures", () => {
		expectMatch(ascii("%PDF-2.0"), {
			format: "pdf",
			mime: "application/pdf",
			domain: "document",
			evidence: "signature",
			needsProbe: false,
		});
		expectMatch([0x50, 0x4b, 0x03, 0x04], {
			format: "zip",
			mime: "application/zip",
			domain: "archive",
			evidence: "signature",
			needsProbe: false,
		});
	});

	it("recognizes unambiguous audio signatures", () => {
		expectMatch([...ascii("RIFF"), 0, 0, 0, 0, ...ascii("WAVE")], {
			format: "wav",
			mime: "audio/wav",
			domain: "audio",
			evidence: "signature",
			needsProbe: false,
		});
		expectMatch(ascii("fLaC"), {
			format: "flac",
			mime: "audio/flac",
			domain: "audio",
			evidence: "signature",
			needsProbe: false,
		});
		expectMatch(ascii("ID3\u0004\u0000\u0000"), {
			format: "mp3",
			mime: "audio/mpeg",
			domain: "audio",
			evidence: "signature",
			needsProbe: false,
		});
	});

	it("marks Ogg as requiring a stream probe instead of assuming audio", () => {
		expectMatch([...ascii("OggS"), 0], {
			format: "ogg",
			mime: "application/ogg",
			domain: null,
			evidence: "container",
			needsProbe: true,
		});
	});

	it("returns null for unknown or truncated bytes", () => {
		expect(detectBinaryFormat(Uint8Array.from([]))).toBeNull();
		expect(detectBinaryFormat(Uint8Array.from([0x89, 0x50]))).toBeNull();
		expect(detectBinaryFormat(Uint8Array.from(ascii("plain text")))).toBeNull();
	});
});

it("detects media containers without guessing streams and validates text hints", () => {
	expect(
		detectBinaryFormat(
			new Uint8Array([0, 0, 0, 24, 102, 116, 121, 112, 105, 115, 111, 109]),
		)?.needsProbe,
	).toBe(true);
	expect(
		detectBinaryFormat(new Uint8Array([0x1a, 0x45, 0xdf, 0xa3]))?.needsProbe,
	).toBe(true);
	expect(
		detectBinaryFormat(new Uint8Array([0xff, 0xf1, 0x50, 0x80]))?.format,
	).toBe("aac");
	expect(
		detectTextFormat(
			new TextEncoder().encode(
				'<svg xmlns="http://www.w3.org/2000/svg"></svg>',
			),
			"wrong.mp3",
		)?.format,
	).toBe("svg");
	expect(
		detectTextFormat(
			new TextEncoder().encode("| a | b |\n| --- | --- |\n| x | y |"),
			"data.md",
		)?.domain,
	).toBe("tabular");
	expect(
		detectTextFormat(new TextEncoder().encode("# Heading\n\nBody"), "readme.md")
			?.domain,
	).toBe("document");
	expect(
		detectTextFormat(new TextEncoder().encode("Hello"), "notes.txt")?.format,
	).toBe("txt");
	expect(
		detectTextFormat(new TextEncoder().encode("Hello"), "notes.exe"),
	).toBeNull();
});

it("detects logical RFC 4180 CSV records with quoted multiline fields", () => {
	const csv =
		'name,note\r\nAlice,"first line\r\nsecond line"\r\nBob,third line';
	expect(detectTextFormat(new TextEncoder().encode(csv))?.format).toBe("csv");
});

it("detects Markdown table separators with CRLF line endings", () => {
	const markdown = "| name | note |\r\n| --- | :---: |\r\n| Alice | hello |";
	expect(detectTextFormat(new TextEncoder().encode(markdown))?.format).toBe(
		"md",
	);
});

it("does not use a filename to promote non-text bytes into a text format", () => {
	expect(
		detectTextFormat(Uint8Array.from([0x50, 0x4b, 0x03, 0x04]), "table.csv"),
	).toBeNull();
});
