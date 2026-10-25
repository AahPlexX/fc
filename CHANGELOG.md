# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- `PRD.md` preserving the complete original user-supplied OmniConvert brief verbatim as an immutable baseline; future verified corrections must be documented outside that file.
- Phase 10 media adapter implementation: lazy single-engine lifecycle, same-origin FFmpeg asset enforcement, virtual-FS write/exec/read/delete cleanup, reliable-only determinate progress normalization, active-job cancellation via termination, and engine recreation after cancellation; CI verification is pending.
- Phase 10 red-first media adapter contract for lazy FFmpeg loading, virtual-FS transcoding, reliable-only determinate progress, temp-file cleanup, cancellation via termination, and fresh-engine recovery after cancellation.
- Phase 9 PDF/document worker with byte-only pdf-lib metadata editing, validated PDF.js page rasterization, same-origin worker assets, and cleanup.
- Phase 8 tabular conversion; Phase 7 image/metadata workers; Phase 6 import/queue workbench; Phase 5 compatibility routing; Phase 4 signature detector; responsive React/TypeScript foundation and permanent validation workflow.

### Fixed
- 2026-10-25: Media adapter rejects protocol-relative asset URLs, promptly settles cancellation during loading, and terminates engines after failed initialization (targeted tests pass).
- PDF.js cleanup destroys the `PDFDocumentLoadingTask`, matching current API ownership rather than calling a non-existent proxy method.
- Phase 6 batch controls use native `fieldset`/`legend` grouping.
- Validation-discovered CSS/toolchain bootstrap defects.

### Changed
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
