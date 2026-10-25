# Verification continuation — 2026-10-25

Base checkpoint: `e2a8a33`. Promoted source: `b43e2a1`; [Validate40214020264](https://github.com/AahPlexX/fc/actions/runs/40214020264) passed all gates, including artifact retention, on 2026-10-25. This document belongs to the continuation commit containing it. Root independently reviewed and ran the integrated candidate; individual builder reports were not release approval.

## Automated gate
- `pnpm check`: lint and strict TypeScript pass (38 checked source/test/config files).
- `pnpm test`:75 tests pass across10 files.
- `pnpm build`: succeeds; entry JS/CSS 85,396 bytes gzipped versus 150,000-byte budget; bundled notice text byte-matches its public source.
- `pnpm test:e2e`:54 scenarios pass across Chromium, Firefox and WebKit, retries 0. Includes the original domain/privacy/archive/offline cases plus keyboard chooser-to-download, effective200%/400% CSS reflow, display preferences, unobscured drawer focus, cancelable ZIP, metadata loading/cancellation and the worker Blob-return boundary.
- A controlled public-asset content change changed the generated SW cache fingerprint from `f4e20e524a49d1e0` to `8eb8182c1fcdd8b1`; the source asset was restored byte-for-byte. The build fingerprint includes stable-path FFmpeg JS/WASM bytes, preventing those assets from remaining stale across updates.

## Lab performance sample
Headless Linux cloud execution with Playwright desktop profiles at 1280×720 (profile user-agent strings may describe another OS). One recorded sample per engine from the final local CSV-boundary gate, no retries/cherry-picking. Input: 3,145,787 bytes of generated CSV; output:76,726 JSON rows, re-inspected for count/content. All request audits contained only same-origin GETs and no request bodies.

| Engine | LCP sample | CLS signal | Conversion interval | 10ms heartbeat ticks | Conversion long tasks |
|---|---:|---|---:|---:|---|
| chromium 156.0.8078.4 | 96ms | 0 | 375.8ms | 38 | 0 observed |
| firefox 157.0 | 97ms | Unsupported | 538ms | 49 | Unsupported |
| webkit 27.2 | 137ms | Unsupported | 853ms | 60 | Unsupported |

The conversion interval includes Playwright action overhead and a100ms observer-flush allowance. The test separates shell, fixture injection, actual conversion and download using the browser clock. A roughly275ms Chromium long task belonged to Playwright's base64 fixture injection, not the conversion interval. File reading, table parsing/serialization and UTF-8 Blob creation now happen inside the tabular worker; a direct real-worker protocol check verifies a Blob reply with no large text field.

These samples do not establish field p75 LCP/CLS, field INP, every-input <50ms task time, or mobile memory behavior. WebKit observed up to256ms for pointer-over/out event timing in this sample; those events are not an INP calculation and this report makes no <=200ms INP claim. Long-task/CLS measurements unsupported by an engine remain unknown. The forced-colors media query and reduced motion were exercised in all engines; WebKit does not expose `forced-color-adjust` CSS support here, so that property check is explicitly annotated unsupported. Effective CSS reflow is not a physical-device or assistive-technology certification.

Raw `lab-performance.json` files are written to each test output directory and attached to Playwright results. CI retains `browser-verification` artifacts for 14 days using pinned `actions/upload-artifact@v7.0.2`; the source-controlled report is durable. Fixtures are generated test data, never real user-selected files.

## Defects reproduced and fixed
- A CSV header longer than a read chunk lost column names and could misidentify CRLF. Header capture now waits for real fields and a quote-aware incremental separator sniff supplies the correct newline; six boundary variants pass.
- Physical-line CSV detection rejected quoted multiline RFC4180 records; CRLF Markdown headers were not recognized. Logical-record parsing/normalization now pass regression tests.
- At320px, a focused Producer field extended beneath the drawer's sticky footer. Scroll padding/margins now keep it visible at 320px and768px.
- Engine cancellation during creation/loading, on reuse, and immediately before cached resumption could leak or interfere with a subsequent job. Generation ownership, prompt cancellation and a shared media slot now serialize probes/transcodes and prevent late work from owning the next engine. Timeout/queue recovery is tested.
- Matroska's generic `matroska,webm` demuxer name was incorrectly treated as proof of WebM. Probing now preserves the detected container rather than inventing one.
- ZIP export allowed multiple packing workers and had no abort control. It now claims the active operation, supports cancellation, preserves completed outputs and offers an explicit repeat download for browsers that restrict asynchronous automatic downloads.
- Metadata drawers incorrectly said no tags were found while parsing was still in progress. Loading/errors are explicit, and closing cancels inspection without canceling a later conversion.
- Fixed SW cache identity could keep old same-path WASM after an update. A content-derived cache name and prior-cache cleanup now cover engine bytes.

## Source/license traceability
Root independently confirmed core tarball SRI against registry and lock, verified the matching candidate release manifest/commit and inspected the pinned Docker recipe. `LICENSES.md` records primary immutable links and exact residual uncertainty. The build now includes upstream MIT/GPL text and source pointers in `THIRD_PARTY_NOTICES.txt`; complete transitive corresponding-source and reproducible binary correspondence remain unverified. No deployment, public application release or legal certification was performed.

## Reproduction
Use pinned pnpm 12.15.0 (`pnpm dlx pnpm@12.15.0 <command>` if the shell selects 11.x), install browsers/dependencies, then run check, unit tests, build and `test:e2e`. Build before browser checks. Use unique `--output` paths for parallel development runs to prevent artifact-cleanup collisions. The local browser-library workaround is documented in HANDOFF; normal CI installs browser dependencies without it. The final CI URL/status is maintained in TODO.

## Final PRD details closed
PDF inspection includes deterministic ISO CreationDate/ModificationDate values, marked read-only. CSV/TSV input is decoded incrementally across1MiB byte slices with a persistent UTF-8 decoder and the pinned Papa5.7.0 ParserHandle record/header state; progress reports actual input bytes and rows. Regressions deliberately split a4-byte Unicode character across a chunk boundary, including a quoted multiline cell. Independent FileReader text decoding per slice reproduced character corruption and is no longer used. The input cap is64MiB. The canonical table and full serialized output still accumulate in worker memory; output expansion has no separate byte cap. Large-file/mobile memory behavior remains unverified. Existing pure string conversion APIs remain available; the live UI passes files and receives Blob results. Progress messages are forwarded rather than mistaken for final output.
