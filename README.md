# OmniConvert

OmniConvert is a privacy-first browser conversion workbench for domain-valid file transformations. User file payloads are processed locally in the browser; the MVP does not require accounts, cloud storage, or a conversion backend.

## Status

Foundation implementation is in progress. The authoritative implementation tracker is [`TODO.md`](./TODO.md). Repository target: `AahPlexX/fc`. The repository was confirmed empty and writable on `main` on 2026-10-23. The local execution sandbox lacks outbound package-registry DNS, so the deterministic pnpm lockfile is intentionally not fabricated.

## Verified foundation stack — 2026-10-23

- React 19.3.1 / React DOM 19.3.1
- TypeScript 7.0.2
- Vite 8.3.5 with `@vitejs/plugin-react` 6.1.2
- pnpm 12.15.0
- Vitest 5.0.5
- Playwright 1.64.1 and `@axe-core/playwright` 4.14.0
- FFmpeg.wasm: `@ffmpeg/ffmpeg` 0.12.15, `@ffmpeg/core` 0.12.10, `@ffmpeg/util` 0.12.2. Note: the wrapper is MIT; the published core package declares GPL-2.0-or-later and must be handled accordingly when distributed.
- Papa Parse 5.7.0
- ExifReader 4.51.0
- pdf-lib 1.17.1 and PDF.js (`pdfjs-dist`) 6.4.299
- JSZip 3.10.2
- piexifjs 1.0.6 with `@types/piexifjs` 1.0.0
- Biome 2.6.2 for linting/format checks

All package versions are exact pins. Heavy conversion libraries must remain lazy-loaded so they do not enter the initial application path.

## Architectural corrections to PRD v1.0.0

1. `@ffmpeg/ffmpeg` already runs transcoding through its own worker. OmniConvert will not add a redundant parent media worker around the FFmpeg instance unless a measured browser-specific isolation need appears.
2. FFmpeg.wasm's `progress  event is experimental. User-facing determinate progress must degrade safely to indeterminate/phase telemetry when reliable duration-based progress cannot be derived.
3. `pdf-lib` creates and edits PDF structure but is not a PDF page renderer. PDF-to-image routes use PDF.js.
4. WCAG conformance requires automated **and** manual evaluation. axe is an automated regression gate, not proof of complete WCAG 2.2 AA conformance.
5. The original eight-phase file plan omitted required runtime/config/test files. `TODO.md` contains the corrected <=3-new-files-per-phase sequence.
6. The PWA label is not considered complete until a manifest and service-worker/offline strategy are implemented and verified.

## Local development

Prerequisites:

- Node.js >= 22.13.0
- pnpm 12.15.0

```bash
pnpm install --frozen-lockfile
pnpm dev
pnpm check
pnpm test
pnpm build
```

Browser E2E scripts are added once the Playwright surface exists.

## Privacy invariant

Conversion code must never transmit user-selected file contents. Network access is limited to same-origin application assets in production. Any future feature requiring file egress must be a separately approved product change, not an implicit fallback.

## Hosting note

Multi-threaded FFmpeg requires cross-origin isolation headers. The MVP defaults to the single-thread FFmpeg core so static hosts without COOP/COEP can still function. A multi-thread core may be introduced only as a capability-gated optimization.
