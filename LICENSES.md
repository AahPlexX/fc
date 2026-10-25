# Dependency distribution notes

Verified on 2026-10-25 using primary registry/package/repository records. This file does not assign a license to the application's original code. `public/THIRD_PARTY_NOTICES.txt` contains attribution, immutable source pointers, the upstream wrapper MIT text and FFmpeg GPLv2 text, and is copied into the production build. It is not a complete transitive-notice or distribution certification.

## Pinned package integrity
`@ffmpeg/core@0.12.10` declares **GPL-2.0-or-later**; the separate `@ffmpeg/ffmpeg@0.12.15` wrapper declares MIT. Root independently hashed the [primary npm tarball](https://registry.npmjs.org/@ffmpeg/core/-/core-0.12.10.tgz): SHA-512 SRI equals both registry metadata and `pnpm-lock.yaml`:

```text
sha512-dzNplnn2Nxle2c2i2rrDhqcB19q9cglCkWnoMTDN9Q9l3PvdjZWd1HfSPjCNWc/p8Q3CT+Es9fWOR0UhAeYQZA==
```

The 20,634,719-byte archive contains ESM/UMD core JS/WASM plus package.json; it does not contain source, license texts or notices. Registry metadata supplies no gitHead or source provenance attestation. Package integrity verifies the package bytes, not their source-to-binary correspondence.

## Matching release-source evidence
The strongest candidate publish-source commit is [`71aa99d37c02a7b4c435275ca9ef50e612f6efa1`](https://github.com/ffmpegwasm/ffmpeg.wasm/commit/71aa99d37c02a7b4c435275ca9ef50e612f6efa1), dated 2025-01-07T10:12:48Z, titled “RELEASE: @ffmpeg/core and @ffmpeg/core-mt v0.12.10”. Its [core manifest](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/packages/core/package.json) matches the version/license and precedes npm publication by 26 seconds. This is strong release correspondence, not a cryptographic build attestation.

Do **not** substitute tag `v0.12.10`: that older repository tag has core version 0.12.6/MIT. The later [`80b6ae21…` license correction](https://github.com/ffmpegwasm/ffmpeg.wasm/commit/80b6ae21d760a4bab3f7a704d58aec369ff5b560) explicitly changes the core package license to match the built WASM files.

## Build and license evidence
At the matching release-source commit:
- [Dockerfile](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/Dockerfile): Emscripten image `3.1.40`, FFmpeg `n5.1.4`, GPL enabled with libx264/libx265 and other libraries.
- [Makefile](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/Makefile), [build guide](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/apps/website/docs/contribution/core.md), [configure script](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/build/ffmpeg.sh), and [linker script](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/build/ffmpeg-wasm.sh): upstream `make prd` single-thread SIMD build path.
- Primary [FFmpeg licensing document at n5.1.4](https://github.com/FFmpeg/FFmpeg/blob/n5.1.4/LICENSE.md) explains `--enable-gpl`; the [GPLv2 text](https://github.com/FFmpeg/FFmpeg/blob/n5.1.4/COPYING.GPLv2) and [wrapper MIT text](https://github.com/ffmpegwasm/ffmpeg.wasm/blob/71aa99d37c02a7b4c435275ca9ef50e612f6efa1/LICENSE) are included verbatim in the notice artifact.

The recipe identifies x264 `4-cores`, x265 `3.4`, libvpx `v1.13.1`, LAME `master`, Ogg `v1.3.4`, Theora `v1.1.1`, Opus `v1.3.1`, Vorbis `v1.3.3`, zlib `v1.2.11`, libwebp `v1.3.2`, freetype `VER-2-10-4`, fribidi `v1.0.9`, harfbuzz `5.2.0`, libass `0.15.0` and zimg `release-3.0.5`.

## Remaining release gate — UNVERIFIED
An exact rebuild of the published bytes has **not** been demonstrated: LAME uses a moving branch, the base image is a tag, apt dependencies are not fully pinned, and no package source attestation links the binary to this commit. Complete corresponding-source coverage and transitive codec notices remain unverified. Before a public binary distribution, establish and supply all applicable source/notice materials. No public deployment/release or legal certification is claimed.

ExifReader declares MPL-2.0, PDF.js Apache-2.0, pdf-lib/Papa Parse/React/piexifjs MIT, and JSZip MIT OR GPL-3.0-or-later. Exact direct-package versions/licenses are recorded in README; this top-level inventory does not replace transitive notices.
