import { describe, expect, it } from "vitest";
import { detectBinaryFormat } from "../../src/core/magicBytes";

const ascii = (value: string): number[] => Array.from(value, (character) => character.charCodeAt(0));

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
