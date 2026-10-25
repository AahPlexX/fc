# OmniConvert

OmniConvert is a privacy-first browser conversion workbench for domain-valid file transformations. User file payloads are processed locally in the browser; the MVP does not require accounts, cloud storage, or a conversion backend.

## Status

Phases 0–11 are CI-verified. Phase 12 conversion orchestration and export is fully wired and under CI validation. The authoritative implementation tracker is [`TODO.md`](./TODO.md). Repository target: `AahPlexX/fc`; development stays on `main`.

The complete original user-supplied product brief is preserved verbatim in [`PRD.md`](./PRD.md). That file is an immutable baseline: verified corrections, package/version updates, implementation deltas, and architecture refinements are documented in this README, `TODO.md`, `CHANGELOG.md`, and ADRs without rewriting the original PRD.

## Current workbench behavior

The UI accepts files through the native multi-file picker, a keyboard-operable drop target, or clipboard paste. Imported bytes are inspected locally before a job is added. Binary formats are signature-detected; CSV/TSV/JSON are identified from structured UTF-8 content. The UI now distinguishes the broad semantic compatibility matrix from the routes the current build can actually execute, so unimplemented PRD targets are not exposed as clickable conversions.

Per-file actions include target selection, Convert, Cancel, Metadata, Preview, Download, and Remove. Batch controls include shared target selection, metadata stripping, sequential Convert All, ZIP export for completed outputs, and Clear Completed. Running jobs expose `aria-busy`, live status text, progress telemetry, and real cancellation through the orchestrator rather than a state-only cancel.

Conversion dispatch uses a tested `ConversionOrchestrator` with an `AbortController` per active job. Image, tabular, and PDF work uses disposable module workers that are terminated on completion/error/abort. Media work lazily imports ffmpeg.wasm and the single-thread `@ffmpeg/core` JS/WASM assets from the application bundle, then reuses one `MediaAdapter` until cancellation invalidates it. No CDN fallback is used.

Image conversion uses `createImageBitmap()` plus `OffscreenCanvas`. Requested output MIME types are verified against the Blob returned by the browser so unsupported AVIF cannot silently succeed as PNG. Metadata inspection receives raw bytes rather than paths/URLs and currently exposes normalized file, EXIF, GPS, and composite values.

Tabular conversion uses a canonical row/column model. Papa Parse is dynamically imported only for CSV/TSV work; delimited exports enable formula escaping, while Markdown and HTML outputs escape cell content.

PDF operations split responsibilities: pdf-lib reads/updates document-info metadata and serializes bytes, while PDF.js renders pages. PDFs are loaded from in-memory bytes and the PDF.js worker is bundled same-origin.

Completed outputs can be downloaded individually using temporary Blob URLs or packaged with JSZip into a collision-safe DEFLATE archive. Temporary download URLs are explicitly revoked after dispatch.

## Verified foundation stack — 2026-10-23

- React 19.3.1 / React DOM 19.3.1
- TypeScript 7.0.2
- Vite 8.3.5 with `@vitejs/plugin-react` 6.1.2
- pnpm 12.15.0
- Vitest 5.0.5
- Playwright 1.64.1 and `@axe-core/playwright` 4.14.0
- FFmpeg.wasm: `@ffmpeg/ffmpeg` 0.12.15, `@ffmpeg/core` 0.12.10, `@ffmpeg/util` 0.12.2. The wrapper is MIT; the published core package declares GPL-2.0-or-later.
- Papa Parse 5.7.0
- ExifReader 4.51.0
- pdf-lib 1.17.1 and PDF.js (`pdfjs-dist`) 6.4.299
- JSZip 3.10.2
- piexifjs 1.0.6 with `@types/piexifjs` 1.0.0
- Biome 2.6.2

All package versions are exact pins. Heavy conversion libraries remain lazy-loaded so they do not enter the initial application path.

## Architectural corrections to PRD v1.0.0

1. `@ffmpeg/ffmpeg` already runs transcoding through its own worker; OmniConvert does not add a redundant parent media worker.
2. FFmpeg.wasm progress is experimental; determinate UI degrades to indeterminate/phase telemetry when reliability is unknown.
3. `pdf-lib` creates/edits PDF structure but is not a page renderer; PDF-to-image routes use PDF.js.
4. axe is an automated regression gate, not proof of complete WCAG 2.2 AA conformance.
5. `TODO.md` is the corrected implementation sequence while `PRD.md` remains verbatim.
6. PWA is not considered complete until manifest + service-worker/offline behavior are implemented and verified.

## Local development

Prerequisites: Node.js >=22.13.0 and pnpm 12.15.0.

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
pnpm build
```

## Privacy invariant

Conversion code must never transmit user-selected file contents. Network access is limited to same-origin application assets in production. Any future file egress requires a separately approved product change.

## Hosting note

Multi-threaded FFmpeg requires cross-origin isolation headers. The MVP currently uses the single-thread FFmpeg core so static hosts without COOP/COEP can function; multi-threading may be capability-gated later.
