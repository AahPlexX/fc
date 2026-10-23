# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Phase 8 tabular implementation: content-structural UTF-8 CSV/TSV/JSON detection, canonical table parsing, lazy Papa Parse for delimited formats, spreadsheet-formula escaping, JSON serialization, escaped Markdown/HTML rendering, and importer support for tabular text; CI verification pending.
- Phase 8 red-first tabular contract for detection, parsing, formula safety, round trips, and markup escaping.
- Phase 7 image/metadata workers with exact raster MIME validation, worker-side canvas encoding, AVIF fallback rejection, cancellation, bitmap cleanup, and safe byte-only metadata inspection.
- Phase 6 import/queue workbench; Phase 5 compatibility routing; Phase 4 signature detector; responsive React/TypeScript foundation and permanent validation workflow.

### Fixed
- Phase 6 batch controls use native `fieldset`/`legend` grouping instead of unsupported generic ARIA labeling.
- Validation-discovered CSS/toolchain bootstrap defects.

### Changed
- Phase 7 is CI-verified through install, check, unit tests, and production build (run 40028414995).
- Metadata inspection excludes raw XMP, ICC, thumbnails, and binary-valued groups from its initial surface.
- Import detection now considers binary signatures first and structured UTF-8 tabular content second; it never trusts filename extensions or browser MIME alone.
- Runtime floor is Node.js >=22.13.0; PDF.js renders, pdf-lib edits; FFmpeg wrapper owns its worker and experimental progress degrades honestly.
- `@ffmpeg/core@0.12.10` license is GPL-2.0-or-later; wrapper MIT.
- axe remains regression assistance, not complete WCAG proof.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
