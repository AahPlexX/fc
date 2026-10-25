# OmniConvert implementation tracker

Last updated: 2026-10-25. Repository: `AahPlexX/fc`. Branch: `main`.

## Current checkpoint
**Implemented and automated gates green.** Feature/merge commit: `90173cc`.
Permanent [Validate run 40164171678](https://github.com/AahPlexX/fc/actions/runs/40164171678) passed: pinned pnpm 12.15.0 frozen install, lint/type checks,64 unit tests, production build,36 browser scenarios across Chromium/Firefox/WebKit, and entry gzip budget. Root independently ran the same gates locally. Entry JS/CSS:84,744 bytes gzipped (budget 150,000). This is automated evidence, not full standards/performance certification.

Current active file: none. Next file to edit if continuing verification: `tests/e2e/accessibility.spec.ts` for additional manual/assistive-tech evidence, with results in this file and README. For binary/public release, read `LICENSES.md` first. No deployment or release was performed. Source handoff: `docs/HANDOFF.md`.

## Invariants
- `PRD.md` is the immutable original brief. Verified corrections live in README/TODO/ADRs; do not rewrite the original.
- pnpm only, exact dependency pins, main branch; <=3 new files per checkpoint.
- Executable/config changes co-commit TODO + CHANGELOG; update README for public behavior, architecture, commands or support changes.
- User file bytes remain on-device. Engines lazy-load same-origin; no CDN/API conversion fallbacks.
- Never mark untested behavior or field/manual compliance verified. Read AGENTS and relevant source/tests before resuming.

## Phase ledger
| Phase | Scope | Status | Evidence |
|---|---|---|---|
| 0–3 | Governance, registry/toolchain, React shell, responsive foundation | COMPLETE | Original history and permanent Validate workflows; PRD preserved. |
| 4–5 | Types, signatures, compatibility routing, immutable job state | COMPLETE | Unit signature/domain tests, including misleading MIME/extensions and unresolved containers. |
| 6 | Import and queue UI | COMPLETE | Picker/drop/paste, batch settings/actions, real browser queue tests. |
| 7 | Image/metadata workers | COMPLETE | Unit tests plus downloaded JPEG EXIF/GPS reinspection, BMP/ICO/SVG and resize tests. |
| 8 | Tables | COMPLETE | CSV/TSV/JSON/Markdown round trips, escaped Markdown/HTML serializers and real worker downloads. |
| 9 | PDF/document worker | COMPLETE | PDF metadata/pages/images/merge, PDF.js rendering and output reinspection; orphan metadata regression. |
| 10 | Media lifecycle/progress | COMPLETE | Unit cancellation/load/URL checks; real WAV->MP3 and probed video->audio, initialization cancellation. |
| 11 | Dialogs and integrated queue | COMPLETE | Native modal, Tab/Escape/focus, supported metadata edits, source/output previews, sequential runtime. |
| 12 | Export/archive/runtime | COMPLETE | Collision-safe downloads; streamed ZIP size/ratio/CRC enforcement; extraction and corrupt-input isolation. |
| 13 | PWA/offline/assets | COMPLETE (automated scope) | Manifest/SW, same-origin bundled core/CSP, warmed-table offline conversion with no user data in cache. |
| 14 | Browser/a11y/viewport/budget gates | COMPLETE (automated scope) |36/36 Playwright scenarios in CI; axe/focus and320–3840px viewport checks;85KB gzip entry. |
| 15 | Three ADRs | COMPLETE | Current topology, routing and privacy/archive decisions with rollback paths. |
| Handoff/tooling | Ignore outputs, distribution notes, durable handoff | COMPLETE | `.gitignore`, `LICENSES.md`, `docs/HANDOFF.md`; tracker/README/AGENTS/CHANGELOG current. |

## File-creation checkpoint record
This session: Phase 11 `MetadataDrawer.tsx`, `PreviewModal.tsx`, `conversionRunner.ts` (3); Phase 12 `exportFiles.ts`, archive unit tests (2); Phase 13 manifest/SW/icon (3); Phase 14 Playwright config + conversion/accessibility E2E (3); Phase 15 three ADRs (3); handoff/tooling `.gitignore`, LICENSES, HANDOFF (3). Concurrent upstream history has its own bounded checkpoints. No PRD edits.

## Integrated runtime and substantive corrections
- Root used five gpt-6-luna builders with bounded file ownership; root alone integrated/validated. No github3 calls.
- Signatures and complete structural text are inspected in a worker. Ambiguous media containers require stream probing before any targets unlock. AVIF output is MIME-probed at runtime.
- Sequential jobs, worker termination/cancellation/timeouts and immutable settings snapshots prevent stale output. Aggregate progress measures finished files; media time telemetry stays indeterminate where FFmpeg progress is unreliable.
- FFmpeg owns its worker. Fresh single-thread engines load pinned local core/wrapper assets, then terminate to release memory. `mediaAdapter.ts` is a separately tested reusable lifecycle contract.
- Native SVG image/canvas fallback is limited to 16 megapixels because worker ImageBitmap SVG decoding failed an actual browser check. Other raster work runs in the image worker; dimensions/quality are configurable.
- JPEG privacy scrubs inherited tags before explicit overrides. PDF privacy deletes Info/XMP objects as well as references. Images are re-encoded before PDF embedding so embedded JPEG EXIF cannot bypass privacy.
- PDF override keys are normalized. Worker replies are jobId-filtered because PDF.js also posts readiness messages. Pinned FFprobe core returns -1 with valid reports: only 0/-1 plus complete parsed stream/format evidence are accepted.
- ZIP64/encrypted/symlink/nested/unsafe/non-UTF-8 archives fail explicitly. Header checks precede decompression; actual streamed size/ratio/CRC checks precede Blob allocation. Eager `checkCRC32:true` must not return.
- Native downloads run synchronously from user clicks to preserve WebKit activation; JSZip remains lazy. Previews display text rather than executing HTML and revoke temporary URLs. Dialog edits survive metadata arrival, wrap Tab and restore opener focus.

## Concurrent upstream merge
Main advanced from a90ea54 through 057f619 while this workspace ran. Root preserved those commits and merged through 90173cc without force pushing. Upstream `ConversionOrchestrator` planning/contracts remain; its browser runtime delegates to the common runner. App reuses upstream export-manager naming/native download functions; ZIP creation delegates to bounded archive code. Static dialog contracts now match the consolidated effect-driven native UI; real browser coverage verifies focus/URLs/downloads.64 unit tests include the preserved upstream flow/dialog suites.

## Explicitly UNVERIFIED / release follow-up
- Field LCP/INP/CLS at the 75th percentile, universal <50ms main-thread work, realistic large-file/mobile-RAM limits, and current/previous stable browser certification. Playwright binaries are an automated engine sample.
- Full manual WCAG 2.2 AA, screen readers, touch/physical smart-TV remote/real hardware. Axe/focus/viewports do not establish universal conformance.
- Cold, never-loaded engines cannot operate air-gapped. Only shell and previously loaded engines are cached; warmed-table offline behavior is verified. A deployed host must enforce the emitted CSP; no deployment was tested.
- Exact corresponding source/build recipe and complete transitive codec notices for GPL WASM redistribution: see LICENSES. No binary/public release claim.
- Standard-font document PDFs reject unsupported glyphs explicitly. Full CommonMark/Office/RAW/OCR/DRM remain outside the implemented narrow document path/approved non-goals. Metadata stripping does not redact content, annotations or attachments; media encoders may generate technical tags.

## Environment and reproducibility
Cloud workspace registry access works. All 22 direct runtime/dev package pins plus pnpm (23 records) were verified for exact version and declared license on 2026-10-25; latest-version status is not claimed. Pinned pnpm 12.15.0 install passed; initial shell fallback was 11.25.0.

Local WebKit needed supplemental Debian libraries downloaded into user-local Playwright sys/lib directories because root installation was unavailable. Actual browser launches/conversions passed with `PLAYWRIGHT_SKIP_VALIDATE_HOST_REQUIREMENTS=1`; ldconfig cannot see those local libraries. CI installed dependencies normally with `playwright install --with-deps` and passed without that flag. Scratch/caches are machine-local and ephemeral. Use `pnpm check`, `pnpm test`, `pnpm build`, then `pnpm test:e2e` to reproduce.
