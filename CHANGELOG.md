# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Phase 9 PDF/document implementation: byte-only pdf-lib metadata reads/writes, metadata normalization, 1-based page validation, PDF.js raster rendering through locally bundled worker assets, PNG/JPEG output validation, and guaranteed page/document cleanup; full CI verification is pending.
- Phase 9 red-first PDF/document contract for metadata reads/writes, page-count preservation, page rasterization, dimensions, and cleanup.
- Phase 8 tabular conversion with structural UTF-8 detection, lazy Papa Parse, formula-safe CSV/TSV, JSON, escaped Markdown/HTML, and importer support.
- Phase 7 image/metadata workers with native canvas rasterization, AVIF fallback rejection, cancellation, bitmap cleanup, and safe byte-only metadata inspection.
- Phase 6 import/queue workbench; Phase 5 compatibility routing; Phase 4 signature detector; responsive React/TypeScript foundation and permanent validation workflow.

### Fixed
- Phase 6 batch controls use native `fieldset`/`legend` grouping instead of unsupported generic ARIA labeling.
- Validation-discovered CSS/toolchain bootstrap defects.

### Changed
- Phase 8 is CI-verified through install, check, unit tests, and production build (run 40028994454).
- PDF metadata inspection uses `updateMetadata:false`; pdf-lib keyword strings are normalized to arrays for the application contract.
- PDF.js worker code is bundled same-origin via Vite; no CDN worker fallback is allowed.
- Metadata inspection excludes raw XMP, ICC, thumbnails, and binary-valued groups from its initial surface.
- Import detection considers binary signatures first and structured UTF-8 tabular content second; it never trusts filename extensions or browser MIME alone.
- Runtime floor is Node.js >=22.13.0; FFmpeg wrapper owns its worker and experimental progress degrades honestly.
- `@ffmpeg/core@0.12.10` license is GPL-2.0-or-later; wrapper MIT.
- axe remains regression assistance, not complete WCAG proof.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
