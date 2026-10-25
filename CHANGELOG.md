# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Phase 11 metadata/preview workbench implementation: native dialogs, per-file metadata policy editing, apply-to-matching behavior, scoped/revoked Blob preview URLs, image/audio/tabular preview surfaces, size delta reporting, and queue actions for Metadata, Preview, Remove, Cancel, and Convert readiness; full CI verification is pending.
- Phase 11 red-first workbench dialog/action contract for native metadata and preview dialogs, privacy metadata editing/apply actions, image preview size comparison, and keyboard-native queue actions for Convert, Metadata, Preview, and Remove.
- `PRD.md` preserving the complete original user-supplied OmniConvert brief verbatim as an immutable baseline; future verified corrections must be documented outside that file.
- Phase 10 media adapter implementation and prior verified worker/toolchain phases.

### Fixed
- Phase 11 queue actions now use native `fieldset`/`legend` grouping after Biome rejected both a generic labeled container and ARIA `group`; audio preview keeps a documented no-transcription exception rather than fabricating captions.
- Phase 10 test compilation uses supported Vitest matcher composition.
- PDF.js cleanup destroys its loading task.
- Validation-discovered CSS/toolchain bootstrap defects.

### Changed
- Phase 10 is CI-verified through install, check, unit tests, and production build (run 40162153846).
- Handoff/governance distinguishes immutable original requirements in `PRD.md` from verified current implementation corrections in README/TODO/ADRs.
- FFmpeg determinate progress is reliability-gated; cancellation invalidates the engine and forces a fresh load.
- Single-thread FFmpeg core remains same-origin; runtime floor is Node.js >=22.13.0.
- `@ffmpeg/core@0.12.10` is GPL-2.0-or-later; wrapper MIT.
- axe remains regression assistance, not complete WCAG proof.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
