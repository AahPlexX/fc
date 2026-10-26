# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Source delivery — 2026-10-26
- Added same-origin ExifReader4.51.0 source archive/index and workspace link, with full87-file byte verification, CRC/type checks and timezone-stable archives. Added release:test/CI with14 negative artifact cases and stale-evidence checks. Root check/build/82 unit/78 browser/14 negative artifact cases and two timezone checks pass; [Validate40348252463](https://github.com/AahPlexX/fc/actions/runs/40348252463) is green on5ea6d5a. FFmpeg corresponding-source verification remains separate and UNVERIFIED; no dependency pins or PRD bytes changed.

### Production readiness — 2026-10-26
- Fixed media-preview keyboard access: native audio/video hosts join focus navigation and a completed-media download link provides the final boundary. Extended WAV→MP3 cases traverse both players, verify preview download bytes and boundary wrapping across3 engines. Final source0c37b2d passes [Validate40261796547](https://github.com/AahPlexX/fc/actions/runs/40261796547).
- Bounded table input/canonical growth/output on every path; preserved special column names; moved ZIP reads off main and enforced pre-read limits; fixed target/empty previews and synchronous worker cleanup.
- Added waiting/isolated-cache service-worker behavior, versioned engines, strict security/cache headers and local-only media protocols. Initial control uses a message event that waits on worker-local activated state; page-wrapper state cannot stall control during overlapping navigation.
- Fixed native-close cleanup stealing keyboard focus. Deterministic delayed-close and held-claim regressions preserve navigation and separate activation from optional control.
- Added release:check, dependency/PR/artifact CI gates, exact runtime notices and a portable hosting/update/rollback runbook. Service-worker tests use owned persistent profiles/processes after captured automation-session errors; no fault assertions were weakened and retries remain0.
- Added delayed-activation regression after5/5 WebKit reproductions showed an outdated page wrapper;18 held-claim/update stress cases pass with native activation/control/cache assertions.
- Root passes check/build,82 unit tests,75 browser scenarios and artifact/negative checks;45 lifecycle and15 keyboard stress cases pass. Entry gzip85,843 bytes. Permanent Validate40261796547 is green on0c37b2d; Phase17 automated scope is complete. Native-source/manual/field/host limits remain explicit.

### Continuation — 2026-10-25
- Added keyboard chooser-to-download, narrow drawer focus, effective zoom/display preference and phase-attributed lab performance cases. Root local check/build, 75 unit tests and 54 browser scenarios pass; permanent Validate40214020264 passes on b43e2a1 (prior continuation40213099341 also green).
- Fixed multiline CSV/CRLF Markdown detection, pending/cached/queued media cancellation, single-engine access, misleading WebM inference, obscured focus, ZIP reentrancy/cancellation and metadata loading. Table input/Blob encoding now stays in the worker.
- Build-content SW cache fingerprints cover same-path engine assets. Added primary-source license traceability, bundled MIT/GPL notices and 14-day CI browser artifacts. Exact binary reproduction and full manual/field conformance remain explicitly unverified.
- Fixed root-reproduced long CSV header column loss and newline inference across chunk boundaries; regressions cover LF, CRLF, CR and split CRLF. Clarified input versus output memory limits.
- Closed PDF CreationDate/ModificationDate inspection and FR014 chunked CSV/TSV reads with byte/row progress. Fixed reproduced UTF-8 boundary corruption while preserving quoted multiline fields; retained File/Blob-only live conversion boundary.

### Added
- 2026-10-25: Integrated sequential conversion queue with cancellable workers, metadata editing, previews and downloads; same-origin FFmpeg core assets and production CSP.
- 2026-10-25: BMP/multi-size ICO and JPEG EXIF operations; Markdown tables, PDF page extraction/merging, image compilation and safe text/Markdown documents.
- 2026-10-25: Collision-safe ZIP export, bounded ZIP import, manifest/service worker and offline shell; browser gates subsequently passed (see continuation evidence).
- `PRD.md` preserving the complete original user-supplied OmniConvert brief verbatim as an immutable baseline; future verified corrections must be documented outside that file.
- Phase 10 media adapter implementation: lazy single-engine lifecycle, same-origin FFmpeg asset enforcement, virtual-FS write/exec/read/delete cleanup, reliable-only determinate progress normalization, active-job cancellation via termination, and engine recreation after cancellation; subsequently CI-verified.
- Phase 10 red-first media adapter contract for lazy FFmpeg loading, virtual-FS transcoding, reliable-only determinate progress, temp-file cleanup, cancellation via termination, and fresh-engine recovery after cancellation.
- Phase 9 PDF/document worker with byte-only pdf-lib metadata editing, validated PDF.js page rasterization, same-origin worker assets, and cleanup.
- Phase 8 tabular conversion; Phase 7 image/metadata workers; Phase 6 import/queue workbench; Phase 5 compatibility routing; Phase 4 signature detector; responsive React/TypeScript foundation and permanent validation workflow.

### Fixed
- 2026-10-25: Browser-discovered PDF override casing and PDF.js readiness-message handling; validated FFprobe reports despite the pinned core's -1 sentinel; SVG native fallback; native dialog focus restoration and Tab wrapping.
- 2026-10-25: Removed orphaned PDF Info/XMP objects and re-encoded images before PDF embedding; bounded actual ZIP decompression/CRC and output generation rather than trusting declared archive sizes.
- 2026-10-25: Media adapter rejects protocol-relative asset URLs, promptly settles cancellation during loading, and terminates engines after failed initialization (targeted tests pass).
- PDF.js cleanup destroys the `PDFDocumentLoadingTask`, matching current API ownership rather than calling a non-existent proxy method.
- Phase 6 batch controls use native `fieldset`/`legend` grouping.
- Validation-discovered CSS/toolchain bootstrap defects.

### Changed
- 2026-10-25: Closed the continuation with promoted source b43e2a1 and permanent Validate40214020264 green; refreshed TODO/README/AGENTS/ADRs/verification/HANDOFF with exact resume state and explicit remaining limits.
- 2026-10-25: Root merged gate passes check, 64 unit tests, production build and 36 browser scenarios across Chromium/Firefox/WebKit; permanent Validate run 40164171678 also passes pinned install and entry gzip budget.
- 2026-10-25: Integrated concurrent main commits through 057f619, retained core orchestration/export contracts, and delegated browser conversion/archive paths to the shared validated implementations. Native download handlers are synchronous to preserve WebKit user activation.
- Handoff/governance distinguishes immutable original requirements in `PRD.md` from verified current implementation corrections in README/TODO/ADRs.
- Phase 9 is CI-verified through install, check, unit tests, and production build (run 40029861086).
- FFmpeg determinate progress is gated by a route-level reliability flag because upstream documents progress as accurate only when input/output media lengths match.
- FFmpeg cancellation uses wrapper `terminate()`, which invalidates the instance; subsequent work creates/loads a fresh engine.
- Single-thread FFmpeg core remains the default and its assets must be bundled same-origin with no CDN fallback.
- Runtime floor is Node.js >=22.13.0.
- `@ffmpeg/core@0.12.10` license is GPL-2.0-or-later; wrapper MIT.
- axe remains regression assistance, not complete WCAG proof.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
