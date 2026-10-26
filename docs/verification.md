# Verification evidence — 2026-10-26

Phase18 verified source5ea6d5a: root check (40 linted files),82 unit tests/10 files, build and release checks pass. All78 browser scenarios and14 negative artifact cases pass, with positive timestamp checks in two timezones. [Permanent Validate40348252463](https://github.com/AahPlexX/fc/actions/runs/40348252463) is green. Entry gzip85,926 bytes/150,000; artifact36 files. Prior Phase17 source0c37b2d/Validate40261796547 passed82/75 and is historical evidence below.

## Runtime and lifecycle corrections

Table limits cover Blob/string/legacy paths, with checks before JSON rectangular allocation and UTF-8 output retention. Tests preserve quoted/split-Unicode records, duplicate and prototype-like headers, safe serializers and explicit growth-limit failures. ZIP File input rejects over256MiB before reading; actual expansion/CRC/nested-content guards remain. MD→PDF/PDF→image previews re-inspect valid downloaded outputs; empty text differs from loading. Synchronous worker clone errors release workers/timers/listeners.

Initial source da35a79 passed Validate40251947076 (82/72). A docs-only repeat40252342180 failed keyboard download (71/72). Root reproduced1 natural failure/15 runs and a deterministic delayed-close failure: native close restored focus, then later effect cleanup stole the next Tab and reopened Preview. Both dialogs now restore manually only if cleanup itself closes an open dialog. The strengthened flow passed15 forced-order cases across3 engines.

Corrective run40253738993 passed keyboard behavior but observed WebKit activating after old-cache deletion. Twenty natural repeats passed, so no browser-internal root cause is asserted. Holding the client-claim API promise proved the old activation dependency could stall. Activation remains independent:main posts a fixed control message after registration.ready; the message handler waits on worker-local activated state before claiming. The regression requires activation before releasing the injected promise and actual native page control afterward.

A subsequent quota run captured WebKit automation-session/NetworkProcess internal errors, including fallback-to-default-session diagnostics during teardown. Service-worker scenarios now use fresh persistent profiles/processes; temporary data is removed and all assertions remain. Quota probes begin a controlled normal navigation.45 repeated quota/pending-claim/update cases pass across3 engines, including observed write rejection, network success, no cached probe, waiting/activation and old-cache cleanup. No missing interception is counted as a pass, and no retry was added.

## Artifact and dependency evidence

Release checker accepts the real artifact and rejects seven damaged copies:missing core JS, WASM corruption retaining its magic, escaping index path, unsubstituted SW token, wildcard connect-src, notice drift and symlink. Rechecks invalidate stale manifests on failure. Copied FFmpeg files and notice text are byte-compared with installed/pinned sources; all dist files are hashed. The manifest is unsigned, not upstream build attestation.

Root verified13 npm license texts byte-for-byte, preserving CRLF and upstream whitespace, plus the unchanged original notice prefix. Notice245,631 bytes; SHA256 `63511cd975d8c85c7effd9e2f3555d0266294b9f703d678a421601eaef017c08`. Candidate native notice/source scope remains distinguished in LICENSES.

Primary npm audits returned0 reported advisories for the pinned graph; CI repeats the audit and retains JSON. This does not audit statically linked native codec code. Actual WASM strings identify FFmpeg5.1.4; primary npm latest core is0.12.10 on2026-10-26. Reviewed [FFmpeg security records](https://ffmpeg.org/security.html) and [CVE-2023-6605](https://www.cve.org/CVERecord?id=CVE-2023-6605), [6602](https://www.cve.org/CVERecord?id=CVE-2023-6602), [6604](https://www.cve.org/CVERecord?id=CVE-2023-6604). Required playlist/XBIN inputs are outside ordinary detector routes, and live media permits only file,pipe. Codec paths in accepted containers were not exhaustively audited. No native security clearance or exact binary-source correspondence is claimed.

## Lab measurement scope

Synthetic3,145,787-byte/76,726-row CSV was converted and downloaded/re-inspected. The earlier production sample at1280×720 recorded Chromium LCP100ms/conversion437.2ms/43 heartbeat ticks, Firefox100ms/521ms/48 ticks, WebKit125ms/1481ms/101 ticks. Chromium observed no conversion long task; a266ms task belonged to fixture injection. Firefox/WebKit long-task/CLS signals were unsupported. No invalid network request was observed in the audits.

Intervals include action/observer overhead. These samples establish neither field p75 CWV nor universal50ms work limits, INP or mobile memory safety. WebKit pointer events exceeded200ms in some samples; event durations are not an INP calculation. Unsupported signals remain unknown. Raw current lab/quota JSON is physically written and attached to CI artifacts, retained14days.

## Reproduction and remaining scope

Use pinned pnpm12.15.0:check, test, build, release:check, then test:e2e after installing browsers/dependencies. Build before browser checks. Local WebKit's library workaround is in HANDOFF; normal CI installs --with-deps. Unique parallel output paths avoid cleanup collisions.

The release checker/runbook cover prepared static hosting, not a deployed host. Actual HTTPS/header/MIME/cache/rollback behavior, complete manual accessibility/physical devices, stable-browser certification, field metrics and device memory remain unverified. Native corresponding-source/material coverage remains open in LICENSES. PRD and package pins are unchanged. Do not infer99% assurance or full standards certification from these counts.

Media keyboard correction: after lifecycle source a387e13 passed Validate40258988170, a targeted WAV→MP3 preview test failed on the old focus list (Tab stayed on Close). Native media hosts now participate and a download link follows them, so internal UA controls are not the last boundary. Three real conversion cases pass with both player hosts reached, preview export byte-equal and forward/backward boundary wrapping preserved. The combined82-unit/75-browser gate and permanent Validate40261796547 pass on0c37b2d.

A later full gate passed74/75 and again exposed the update boundary. Root injected500ms of activation work: all5 WebKit diagnostic runs observed worker-side activated while the replacement page remained activating for10s. The strengthened native-claim regression failed the previous main-side wait. The worker now owns readiness;18 repeated held-claim/update cases pass across3 engines. The update test requires activated state at every native claim, actual page control, waiting-client protection and both cache outcomes. This moves the state observation to the executing worker; no missing activation or control is accepted. No general WebKit implementation root cause is claimed.

## Phase18 source delivery
Root verified all87 installed ExifReader files against the primary npm tarball and every generated ZIP member with independent Python decoding. Source ZIP406,854 bytes, SHA-256 `fcfcefb0c73eea98cea997a82930d901dfa775018806a8314426297b148a6b4e`; UTC/Auckland builds match. Sources stay outside the entry and precache. The browser flow opens a keyboard-accessible new tab, scans the source page with axe, checks320/768/3840px reflow and headers/MIME, downloads identical ZIP bytes and preserves the original queue.

The original UI lacked the source link and failed the new flow. Root's initial source checker integration exposed legacy JSZip stream iteration and local-time timestamp bugs; a native Readable wrapper and UTC epoch comparison fix them. A malformed source CRC also passed before root added expected CRC verification. The14-case release:test now checks missing source/index/license, changed bytes, CRC/symlink metadata, extra entries, wrong links/cache rules, core corruption, SW tokens, CSP and notice drift, plus positive timestamp checks under two timezones. Each negative case must fail for its expected reason without stale manifest files; the actual dist's positive manifest is restored afterward. CI retains the JSON report.

LICENSES records independently confirmed FFmpeg/Emscripten version output, primary ExifReader source refs and the absent discovered npm attestation/matching Actions record. These facts do not prove exact FFmpeg source inputs or replace host/manual/field evaluation. No host is configured in the checked repository metadata and none was deployed.
