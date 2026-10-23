# Changelog

All notable OmniConvert changes follow Keep a Changelog semantics.

## [Unreleased]

### Added
- Corrected repository governance and <=3-new-files phase ledger for `AahPlexX/fc` on `main`.
- Exact-pinned browser conversion/test stack and pnpm 12.15.0 package manager policy.
- Pinned GitHub Actions registry-verification harness with immutable action SHAs.
- Explicit pnpm lifecycle policy denying ExifReader's unnecessary custom postinstall.
- Verified deterministic lockfile generation/frozen install on Node.js 22.13.0; runner now commits the verified output directly to `main` to avoid transcription risk.

### Fixed
- Corrected bootstrap pnpm argument typos from `--lockifile-only` / `--frozen-lockifile` to `--lockfile-only` / `--frozen-lockfile`; failed runs wrote no generated repository files.

### Changed
- Raised Node floor to >=22.13.0 to satisfy Vite 8 and `pdfjs-dist@6.4.299`.
- Corrected ExifReader to 4.51.0 and added PDF.js 6.4.299 for page rendering.
- Corrected FFmpeg architecture: wrapper already uses its own worker; progress is experimental and must degrade honestly.
- Corrected `@ffmpeg/core@0.12.10` license record to GPL-2.0-or-later; wrapper remains MIT.
- Clarified axe as regression assistance rather than proof of complete WCAG 2.2 AA conformance.
- Compacted tracker/changelog to eliminate duplicated stale-prone prose while preserving every phase, invariant, correction, blocker, and resume point.

## [1.0.0] - 2026-10-23

### Added
- Approved OmniConvert PRD baseline supplied for implementation.
