# Dependency distribution notes

Last checked: 2026-10-25. Direct exact-version registry licenses appear in README.md. This file does not assign a license to the application's original code.

The build includes `@ffmpeg/core@0.12.10`, declared GPL-2.0-or-later by its primary npm package, and the separately MIT-licensed `@ffmpeg/ffmpeg@0.12.15` wrapper. The core is a compiled FFmpeg/codec distribution; it is not covered by the wrapper's MIT license. Upstream source/build information: https://github.com/ffmpegwasm/ffmpeg.wasm and https://github.com/ffmpegwasm/ffmpeg.wasm/tree/main/build. Official GPL v2 text: https://www.gnu.org/licenses/old-licenses/gpl-2.0.html . ExifReader declares MPL-2.0, PDF.js Apache-2.0, pdf-lib/Papa Parse/React/piexifjs MIT, and JSZip MIT OR GPL-3.0-or-later (see the exact registry table).

UNVERIFIED release item: exact corresponding source/build configuration and complete transitive codec notices for the published core binary have not been reconstructed in this session. The repository has not been deployed or released as a public binary distribution. Before distributing generated WASM artifacts, establish the applicable source/notice obligations and ship the required materials. Keep this explicit; do not infer distribution compliance from a successful browser test or a top-level package license.
