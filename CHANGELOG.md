# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Phase 8 red-first tabular contract for content-based CSV/TSV/JSON detection, quoted CSV parsing, spreadsheet-formula escaping, object-JSON round trips, and Markdown/HTML escaping.
- Phase 7 image/metadata workers: exact raster MIME routing, worker-side bitmap decode/OffscreenCanvas encode, AVIF fallback validation, cancellation, bitmap disposal, byte-only limited-group metadata inspection, and safe normalization.
- Phase 6 import/queue workbench with file/drop/paste intake, signature-first queueing, per-file and batch controls, cancellation, and aggregate progress.
- Phase 5 compatibility routing; Phase 4 signature detector; responsive React/TypeScript foundation and permanent Validate workflow.

### Fixed
- Phase 6 batch controls use native `fieldset`/`legend` grouping instead of unsupported generic ARIA labeling.
- Validation-discovered CSS/toolchain bootstrap defects.

### Changed
- Phase 7 is CI-verified through install, check, unit tests, and production build (run 40028414995).
- Metadata inspection excludes raw XMP, ICC, thumbnails, and binary-valued groups from its initial surface.
- Binary detection is two-stage; ambiguous containers require structural/stream probing.
- Runtime floor is Node.js >=22.13.0; PDF.js renders, pdf-lib edits; FFmpeg wrapper owns its worker and experimental progress degrades honestly.
- `@ffmpeg/core@0.12.10` license is GPL-2.0-or-later; wrapper MIT.
- axe remains regression assistance, not complete WCAG proof.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
