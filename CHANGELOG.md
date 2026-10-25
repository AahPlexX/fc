# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Phase 12 red-first conversion/export contract covering engine routing, invalid-route rejection, metadata-aware FFmpeg command construction, deterministic converted filenames, collision-safe naming, and real JSZip archive round-trips.
- Phase 11 metadata/preview workbench implementation with native dialogs, metadata policy editing, scoped Blob previews, size comparison, and keyboard-native queue actions.
- `PRD.md` preserving the complete original user-supplied OmniConvert brief verbatim as an immutable baseline.
- Prior verified image, metadata, tabular, PDF, media, queue, routing, and toolchain phases.

### Fixed
- Phase 11 queue actions use native `fieldset`/`legend`; audio preview documents the intentional no-transcription exception rather than fabricating captions.
- Phase 10 Vitest matcher compatibility and PDF.js loading-task cleanup.
- Validation-discovered CSS/toolchain bootstrap defects.

### Changed
- Phase 11 is CI-verified through install, check, unit tests, and production build (run 40162718916).
- Handoff/governance distinguishes immutable original requirements in `PRD.md` from verified implementation corrections in README/TODO/ADRs.
- Export design follows explicit Blob URL lifecycle cleanup and JSZip asynchronous archive generation.
- Remaining PRD coverage gaps are now explicitly tracked in TODO rather than being hidden by the existing compatibility matrix.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
