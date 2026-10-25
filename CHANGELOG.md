# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Phase 12 second red-first contract for real runtime dispatch and accessible loading/converting telemetry through a `ConversionOrchestrator` boundary.
- Phase 12 conversion/export core implementation: executable-domain planning with invalid/unimplemented route rejection, deterministic FFmpeg command recipes, privacy metadata stripping/override flags, stable converted filenames, collision-safe archive names, lazy JSZip DEFLATE generation, and explicit Blob URL download cleanup.
- Phase 11 metadata/preview workbench implementation with native dialogs, metadata policy editing, scoped Blob previews, size comparison, and keyboard-native queue actions.
- `PRD.md` preserving the complete original user-supplied OmniConvert brief verbatim as an immutable baseline.
- Prior verified image, metadata, tabular, PDF, media, queue, routing, and toolchain phases.

### Changed
- Phase 12 pure planner/media/export contract is CI-verified through install, check, unit tests, and production build (run 40163096278); runtime orchestration remains active.
- Phase 11 is CI-verified through run 40162718916.
- Handoff/governance distinguishes immutable original requirements in `PRD.md` from verified implementation corrections in README/TODO/ADRs.
- Remaining PRD coverage gaps are explicitly tracked rather than hidden by a broad compatibility matrix.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
