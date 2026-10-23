# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Phase 7 image/metadata worker implementation: exact raster MIME routing, native worker-side bitmap decode/OffscreenCanvas encode, AVIF capability/fallback validation, cooperative cancellation at async boundaries, guaranteed bitmap disposal, byte-only ExifReader inspection, and safe metadata normalization limited to file/EXIF/GPS/composite groups; full CI verification is pending.
- Phase 7 red-first image/metadata worker contract for exact raster MIME mapping, AVIF encoder-fallback rejection, cancellation before expensive work, bitmap disposal, and safe metadata normalization.
- Phase 6 import/queue implementation: native multi-file chooser, pointer/keyboard drop target, clipboard paste intake, signature-first local queue creation, per-file target/progress/cancel controls, batch target and strip-metadata policy, responsive queue cards, and sticky aggregate progress for 2+ active files.
- Phase 5 compatibility routing and red-first contracts for canonical image/audio/video/tabular/document routes, AVIF gating, unresolved-container blocking, and immutable job updates.
- Signature-first binary detector with tested support for PNG, JPEG, GIF, WebP, AVIF, BMP, ICO, PDF, ZIP, WAV, FLAC, MP3/ID3, Ogg ambiguity, and unknown/truncated bytes.
- Responsive workbench foundation, durable `AGENTS.md`, semantic React shell, permanent validation workflow, verified lockfile, and strict TypeScript 7 toolchain.

### Fixed
- Phase 6 batch controls use native `fieldset`/`legend` grouping instead of unsupported generic ARIA labeling.
- Phase 6 red-first stub no longer attaches drag handlers to a static section.
- Vite CSS declarations/reduced-motion cascade issues found by CI.
- Bootstrap pnpm flag typos before generated files were accepted.

### Changed
- Phase 6 is CI-verified through install, lint/typecheck, unit tests, and production build (run 40027877824).
- Metadata inspection intentionally excludes raw XMP, ICC, thumbnails, and binary-valued groups from the initial normalized surface.
- Binary detection is two-stage; ambiguous containers require structural/stream probing.
- Runtime floor is Node.js >=22.13.0; PDF.js renders, pdf-lib edits; FFmpeg wrapper owns its worker and experimental progress degrades honestly.
- `@ffmpeg/core@0.12.10` license is GPL-2.0-or-later; wrapper MIT.
- axe remains regression assistance, not complete WCAG proof.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
