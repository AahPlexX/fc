# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Phase 4 red-first domain contracts and magic-byte test suite covering PNG, JPEG, GIF, WebP, AVIF, BMP, ICO, PDF, ZIP, WAV, FLAC, MP3/ID3, Ogg ambiguity, and truncated/unknown bytes.
- Responsive dark-slate workbench design foundation with fluid 320–3840px sizing, focus-visible treatment, reduced-motion handling, semantic status styling, and browser-surface theming.
- Durable `AGENTS.md` handoff contract and minimal Vite React configuration with ES-module worker output.
- Semantic React application shell with accessible skip navigation, local-processing status messaging, and a real Vite entry point.
- Permanent pinned GitHub Actions validation for frozen install, lint/typecheck, unit tests, and production build.
- Verified `pnpm-lock.yaml` committed by the registry-connected runner and strict TypeScript 7 configuration completing the toolchain phase.

### Fixed
- Added Vite client type declarations to the strict TypeScript program so CSS side-effect imports resolve explicitly.
- Replaced broad reduced-motion `!important` overrides with source-order, component-scoped rules.
- Corrected bootstrap pnpm argument typos before generated files were accepted.

### Changed
- Binary format detection is explicitly two-stage: authoritative signatures can establish unambiguous domains, while containers such as Ogg remain `needsProbe` instead of being assumed audio.
- Raised Node floor to >=22.13.0 to satisfy Vite 8 and `pdfjs-dist@6.4.299`.
- Corrected ExifReader to 4.51.0 and added PDF.js 6.4.299 for page rendering.
- Corrected FFmpeg architecture and license records; experimental progress must degrade honestly.
- Clarified axe as regression assistance rather than proof of complete WCAG 2.2 AA conformance.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
