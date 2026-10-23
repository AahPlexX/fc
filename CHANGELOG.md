# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Phase 6 red-first import/queue UI contract now covers native file input parity, drop/paste guidance, batch target selection, strip-metadata policy, aggregate progress for multi-file activity, per-file target selection, progress semantics, and cancellation; component stubs intentionally remain red before implementation.
- Phase 5 red-first compatibility-routing tests for image, audio, video/audio-extraction, tabular, source-specific document routes, AVIF capability gating, unresolved-container blocking, and immutable job-store updates.
- Signature-first binary detector with tested support for PNG, JPEG, GIF, WebP, AVIF, BMP, ICO, PDF, ZIP, WAV, FLAC, MP3/ID3, Ogg ambiguity, and unknown/truncated bytes.
- Responsive workbench foundation, durable `AGENTS.md`, semantic React shell, permanent validation workflow, verified lockfile, and strict TypeScript 7 toolchain.

### Fixed
- Phase 6 red-first stub no longer attaches drag handlers to a static section; this preserves the accessibility lint gate so the intended behavior assertions reach the unit-test stage.
- Vite CSS declarations/reduced-motion cascade issues found by CI.
- Bootstrap pnpm flag typos before generated files were accepted.

### Changed
- Phase 5 compatibility routing is CI-verified for canonical domain/source routes, capability-gated AVIF export, unresolved-container blocking, and immutable job-store updates.
- Binary detection is two-stage; ambiguous containers require structural/stream probing.
- Runtime floor is Node.js >=22.13.0; PDF.js renders, pdf-lib edits; FFmpeg wrapper owns its worker and experimental progress degrades honestly.
- `@ffmpeg/core@0.12.10` license is GPL-2.0-or-later; wrapper MIT.
- axe remains regression assistance, not complete WCAG proof.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
