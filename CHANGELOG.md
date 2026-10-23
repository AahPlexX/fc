# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Signature-first binary detector for unambiguous PNG, JPEG, GIF, WebP, AVIF, BMP, ICO, PDF, ZIP, WAV, FLAC, and ID3-tagged MP3 inputs, with Ogg explicitly flagged for deeper stream probing.
- Phase 4 red-first domain contracts and magic-byte test suite covering supported signatures plus truncated/unknown bytes.
- Responsive dark-slate workbench foundation, durable `AGENTS.md`, semantic React shell, permanent pinned validation workflow, verified lockfile, and strict TypeScript 7 toolchain.

### Fixed
- Added Vite client type declarations for CSS side-effect imports and replaced broad reduced-motion `!important` overrides with scoped cascade-safe rules.
- Corrected bootstrap pnpm argument typos before generated files were accepted.

### Changed
- Binary format detection is two-stage: authoritative signatures establish unambiguous domains; ambiguous containers remain `needsProbe` until structural/stream inspection.
- Runtime floor is Node.js >=22.13.0; PDF.js renders pages, pdf-lib edits structure; FFmpeg wrapper owns its worker and experimental progress degrades honestly.
- `@ffmpeg/core@0.12.10` license record is GPL-2.0-or-later; wrapper remains MIT.
- axe remains regression assistance, not proof of complete WCAG 2.2 AA conformance.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
