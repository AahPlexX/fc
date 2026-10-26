# Dependency distribution notes

Verified across2026-10-25/26 using primary registry/package/repository records. This file does not assign a license to the application's original code. `public/THIRD_PARTY_NOTICES.txt` contains the wrapper and core license texts, license texts for npm modules observed in the production Vite/Rolldown module IDs, and candidate notices for libraries named by the upstream FFmpeg build recipe. Vite copies this file into the production build. The codec source refs are candidate inputs, not proof of the exact refs used for the npm binary; this notice is not a source offer, complete corresponding-source package, or legal certification.

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

The recipe identifies x264 `4-cores`, x265 `3.4`, libvpx `v1.13.1`, LAME `master`, Ogg `v1.3.4`, Theora `v1.1.1`, Opus `v1.3.1`, Vorbis `v1.3.3`, zlib `v1.2.11`, libwebp `v1.3.2`, freetype `VER-2-10-4`, fribidi `v1.0.9`, harfbuzz `5.2.0`, libass `0.15.0` and zimg `release-3.0.5`. The expanded notice records source links and hashes for the npm package texts and candidate codec texts.

## Remaining release gate — UNVERIFIED
An exact rebuild of the published bytes has **not** been demonstrated: LAME uses a moving branch, x264 is a branch ref, the base image is a tag, apt dependencies are not fully pinned, and no package source attestation links the binary to this commit. The notice file now includes candidate codec license texts and all package license texts observed in current emitted module IDs, but exact historical codec inputs and complete corresponding-source coverage remain unverified. Before a public binary distribution, establish the exact build inputs and provide the applicable complete source and notice materials. No public deployment/release or legal certification is claimed.

ExifReader declares MPL-2.0, PDF.js Apache-2.0, pdf-lib/Papa Parse/React/piexifjs MIT, and JSZip MIT OR GPL-3.0-or-later. Exact direct-package versions/licenses are recorded in README; this top-level inventory does not replace transitive notices.

## Phase17 artifact snapshot — 2026-10-26
Root checked13 emitted npm package license texts byte-for-byte against installed files, including piexifjs/tslib CRLF; original core/wrapper notice prefix is unchanged. The shipped notice is245,631 bytes, SHA256 `63511cd975d8c85c7effd9e2f3555d0266294b9f703d678a421601eaef017c08`. Upstream trailing whitespace is intentional. Release checker byte-compares this artifact and all copied core/wrapper files to their pinned installed sources. Core/wrapper URLs are versioned; this verifies delivered package identity, not native source provenance.

Actual WASM strings identify FFmpeg5.1.4. Primary npm latest core remains0.12.10 on2026-10-26. A bounded review of FFmpeg/CVE records is recorded in docs/verification.md; npm audit does not cover static native codecs, and no exhaustive decoder security clearance is claimed.

## ExifReader source delivery — Phase18, 2026-10-26
Production builds emit `/sources.html` and `/sources/exifreader-4.51.0.zip`. The workspace's “Licenses and source code” link opens a new tab, preserving queued files. The static page links notices and the source download; neither source page nor archive is precached. Development mode omits this production-artifact link.

Root compared all **87 installed package files** (excluding installed `node_modules`) byte-for-byte with the [primary npm source package](https://registry.npmjs.org/exifreader/-/exifreader-4.51.0.tgz), whose SHA-512 integrity matches the registry and lockfile. The tarball is368,250 bytes, SHA-256 `f6455166f5d0e076da9049337f020c401cc27983698ce1c8aa9b8c37df9705ca`. Its87 published files total1,503,177 uncompressed bytes, including preferred source, distributed JS, LICENSE, build scripts/configuration, types and package metadata. Installed dependency directories are not part of that package archive.

The generated ZIP contains those unmodified87 files under `package/`, with fixed1980 timestamps and DEFLATE compression:406,854 bytes, SHA-256 `fcfcefb0c73eea98cea997a82930d901dfa775018806a8314426297b148a6b4e`. Independent Python ZIP decoding verified every byte; UTC/Auckland builds produced identical archives. Release verification compares the complete entry list and streamed contents against the installed package, and rejects missing/changed source, license, index/link and cache materials. This supplies the published ExifReader package source without asserting a signed upstream build attestation.

The upstream [v4.51.0 tag object](https://api.github.com/repos/mattiasw/ExifReader/git/tags/30914c9566ec01852df807f1ebfe5d241ad6988d) points to immutable commit [`59d50812546b9bd8884269fea23d59122b5fb9ff`](https://github.com/mattiasw/ExifReader/tree/59d50812546b9bd8884269fea23d59122b5fb9ff); the tag is unsigned. [MPL-2.0 §3.2(a)](https://www.mozilla.org/en-US/MPL/2.0/) describes source availability and telling executable recipients how to obtain it. This source delivery and its notices address that concrete access requirement; no universal legal-compliance certification is claimed.

The notice file preserves its complete Phase17 prefix and appends the same-origin source pointer. Current notice:246,386 bytes, SHA-256 `c637a9f9fc289ec4a4437d210ab408dd14168354a7235b99f1d6ae70e3c6a1ef`.

## Additional native provenance observations — 2026-10-26
Root executed the installed WASM's `-version` command: FFmpeg5.1.4, Emscripten3.1.40 commit `5c27e79dd0a9c4e27ef2326841698cdd4f6b5784`, libavcodec59.37.100 and libavformat59.27.100. WASM SHA-256 is `9f57947a5bd530d8f00c5b3f2cb2a3492faa7e5d823315342d6a8656d0a6b7b7`. Embedded libvpx records identify v1.13.1. These observations agree with the candidate recipe's versions; they do not recover historical codec commits or establish complete corresponding-source identity.

The [npm attestation endpoint](https://registry.npmjs.org/-/npm/v1/attestations/%40ffmpeg%2Fcore%400.12.10) returned404, and a [matching Actions-run query](https://api.github.com/repos/ffmpegwasm/ffmpeg.wasm/actions/runs?head_sha=71aa99d37c02a7b4c435275ca9ef50e612f6efa1) returned0 on2026-10-26. Absent retained records do not prove no build occurred; they supply no stronger provenance for this review. Registry signatures/integrity also do not bind native source to WASM. The FFmpeg release gate above remains **UNVERIFIED**. The next required evidence is retained publisher/build provenance resolving the historical native inputs, or a controlled rebuild with complete source materials and an explained comparison to the pinned binary. No maintainer was contacted and no source offer or public deployment was made.
