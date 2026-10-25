# OmniConvert

OmniConvert is a privacy-first browser conversion workbench for domain-valid file transformations. User file payloads are processed locally in the browser; the MVP does not require accounts, cloud storage, or a conversion backend.

## Status

Core format detection/routing, import/queue behavior, image/metadata workers, tabular conversion, and PDF/document operations are CI-verified. Phase 10 media adapter/progress is implemented and under validation. The authoritative implementation tracker is [`TODO.md`](./TODO.md). Repository target: `AahPlexX/fc`; development stays on `main`.

The complete original user-supplied product brief is preserved verbatim in [`PRD.md`](./PRD.md). That file is an immutable baseline: verified corrections, package/version updates, implementation deltas, and architecture refinements are documented in this README, `TODO.md`, `CHANGELOG.md`, and ADRs without rewriting the original PRD.

The UI accepts files through the native multi-file picker, a keyboard-operable drop target, or clipboard paste. Imported bytes are inspected locally before a job is added. Binary formats are signature-detected; CSV/TSV/JSON are identified from structured UTF-8 content. Unsupported files are skipped rather than guessed from extensions or browser MIME values. Queue controls support per-file target selection/cancellation, batch target selection, batch metadata stripping policy, and aggregate progress for multiple active jobs.

Image conversion uses `createImageBitmap()` plus `OffscreenCanvas` inside a dedicated worker. Requested output MIME types are verified against the Blob returned by the browser so unsupported AVIF cannot silently succeed as PNG. Bitmaps are closed after every conversion attempt. Metadata inspection runs separately, receives raw bytes rather than paths/URLs, and initially exposes only normalized file, EXIF, GPS, and composite values.

Tabular conversion uses a canonical row/column model. Papa Parse is dynamically imported only for CSV/TSV parsing or serialization. CSV/TSV exports enable formula escaping, while Markdown and HTML outputs escape cell content before rendering.

PDF operations are split by responsibility: pdf-lib reads/updates document-info metadata and serializes bytes, while PDF.js renders pages. PDFs are always loaded from in-memory bytes. The PDF.js worker asset is bundled with the application and resolved same-origin; OmniConvert does not use a CDN fallback. Page numbers are validated as 1-based before rendering, rendered page dimensions are derived from PDF.js viewports, and page/document resources are cleaned up even when rendering fails.

Media transcoding is represented by one lazy `MediaAdapter` engine at a time. The adapter refuses non-same-origin FFmpeg core/WASM/class-worker URLs, writes inputs to FFmpeg's virtual filesystem, executes the requested command, reads binary output, and cleans temporary files. Progress is determinate only when a route explicitly marks FFmpeg progress as reliable; otherwise elapsed media time remains visible with indeterminate completion. Cancellation terminates the active FFmpeg worker, invalidates that engine, and forces a fresh engine/load before subsequent work.

## Verified foundation stack — 2026-10-23

- React 19.3.1 / React DOM 19.3.1
- TypeScript 7.0.2
- Vite 8.3.5 with `@vitejs/plugin-react` 6.1.2
- pnpm 12.15.0
- Vitest 5.0.5
- Playwright 1.64.1 and `@axe-core/playwright` 4.14.0
- FFmpeg.wasm: `@ffmpeg/ffmpeg` 0.12.15, `@ffmpeg/core` 0.12.10, `@ffmpeg/util` 0.12.2. The wrapper is MIT; the published core package declares GPL-2.0-or-later and must be handled accordingly when distributed.
- Papa Parse 5.7.0
- ExifReader 4.51.0
- pdf-lib 1.17.1 and PDF.js (`pdfjs-dist`) 6.4.299
- JSZip 3.10.2
- piexifjs 1.0.6 with `@types/piexifjs` 1.0.0
- Biome 2.6.2

All package versions are exact pins. Heavy conversion libraries remain lazy-loaded so they do not enter the initial application path.

## Architectural corrections to PRD v1.0.0

1. `@ffmpeg/ffmpeg` already runs transcoding through its own worker; no redundant parent media worker is added without measured need.
2. FFmpeg.wasm's `progress` event is experimental; determinate UI degrades to indeterminate/phase telemetry when reliability is unknown.
3. `pdf-lib` creates/edits PDF structure but is not a page renderer; PDF-to-image routes use PDF.js.
4. axe is an automated regression gate, not proof of complete WCAG 2.2 AA conformance.
5. `TODO.md` is the corrected <=3-new-files-per-phase implementation sequence.
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

Multi-threaded FFmpeg requires cross-origin isolation headers. The MVP defaults to the single-thread FFmpeg core so static hosts without COOP/COEP can still function; multi-threading may be capability-gated later.
