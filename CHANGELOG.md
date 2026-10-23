# Changelog

All notable changes to OmniConvert are documented here using the Keep a Changelog structure.

## [Unreleased]

### Added
- Exact-pinned dependency manifest synchronized to `AahPlexX/fc` on `main`.
- Repository target corrected to `AahPlexX/fc` after direct GitHub verification.
- Exact-pinned `package.json` dependency manifest verified against primary registry/release sources on 2026-10-23.
- Repository bootstrap documentation and corrected implementation sequencing.
- Primary-source package/version baseline dated 2026-10-23.

### Changed
- Corrected the FFmpeg core license record: `@ffmpeg/core@0.12.10` declares GPL-2.0-or-later; the JavaScript wrapper `@ffmpeg/ffmpeg` is MIT.
- Aligned the Node.js floor with Vite 8 official support at Node.js 22.12+.
- Preserved phase ordering by deferring lockfile and TypeScript configuration until a pnpm registry-connected runtime is available.
- Corrected ExifReader target from 4.45.0 to 4.51.0.
- Added PDF.js as the required PDF page-rendering dependency.
- Clarified that FFmpeg.wasm already owns its transcoding worker and that its progress event is experimental.
- Reframed automated accessibility checks as regression assistance rather than complete WCAG conformance proof.

## [1.0.0] - 2026-10-23

### Added
- Repository target corrected to `AahPlexX/fc` after direct GitHub verification.
- Initial approved OmniConvert product requirements supplied for implementation.
