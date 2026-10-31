# Production artifact and operations

Updated2026-10-31. This is a portable static-hosting procedure. No production deployment has been performed. Source `b803b24` passed [Validate41149485515](https://github.com/AahPlexX/fc/actions/runs/41149485515); TODO records remaining release criteria and docs/verification.md records measured scope. Artifact checks do not establish legal compliance, full accessibility conformance or field performance.

## Build and inspect

Use Node.js 22.13.0 or the documented supported newer runtime, and pnpm 12.15.0. From a clean checkout of the intended commit:

```sh
pnpm install --frozen-lockfile
pnpm audit --audit-level=high
pnpm check
pnpm test
pnpm build
pnpm release:check
pnpm release:test
pnpm exec playwright install --with-deps chromium firefox webkit
pnpm test:e2e
```

Serve only `dist/`, at the origin root `/`, over HTTPS. Vite preview is a local verification server. Deployment under a subpath is unsupported. There is no backend, authentication or secret configuration.

`release:check` checks exact direct pins/installed versions/lock entries, entry gzip budget, entry/precache/manifest references, substituted service-worker tokens, security/cache header rules, FFmpeg bytes against the installed pinned packages, PDF worker presence and copied runtime notices. It rejects symlinks and references escaping the artifact. It writes `release-results/artifact-manifest.json` and `SHA256SUMS` only after success, invalidating older evidence on a failed recheck. Hashes cover all dist files, package.json, the lockfile and immutable PRD. Git revision and tracked-dirty state are recorded. This is an unsigned asset inventory, not signed build provenance or an attestation of the upstream WASM source.

CI runs the same source gates on main pushes and pull requests, audits the pinned dependency graph, and retains browser results plus release manifests/audit JSON for 14 days. It does not publish binaries or deploy a site. The14-case negative artifact check runs sequentially on an isolated copy, requires specific failures without stale manifests, and restores the real positive manifest; its JSON report is retained too. Preserve the verified artifact and manifest together in your release storage before that retention expires. Rebuilding after validation creates a new candidate requiring fresh artifact checks.

## Hosting contract

`dist/_headers` contains Cloudflare Pages/Netlify-style rules. Other hosts must implement equivalent response headers; merely uploading this file does not enforce them. Confirm actual responses rather than assuming the host consumes the file.

- Enforce the emitted CSP on documents, worker scripts and assets. It permits same-origin application assets, local Blob previews and WASM compilation; connections remain same-origin. Forms, plugin objects, base URL changes and embedding are denied.
- Return `X-Content-Type-Options: nosniff`, `Referrer-Policy: no-referrer` and the emitted disabled camera/microphone/geolocation permissions.
- Serve WASM as `application/wasm`, JavaScript/module workers with a JavaScript MIME type, and the manifest as `application/manifest+json`. Return real 404 responses for missing assets; do not rewrite missing JS/WASM to HTML.
- Revalidate `/`, `/index.html`, `/sw.js`, `/sources.html`, `/THIRD_PARTY_NOTICES.txt`, the manifest/icon and `/engines/*` using `Cache-Control: no-cache`. Hashed `/assets/*` and versioned `/sources/*` downloads may use the emitted one-year immutable policy. Serve source ZIPs as application/zip and retain them with their corresponding artifact.
- Keep the exact same-origin `/engines/core/<version>/` and `/engines/wrapper/<version>/` paths. Versioned URLs prevent an old controller from supplying different engine versions to a new app. Core and wrapper files must come from the same verified artifact as the entry files.

### Verify a selected origin

Run `pnpm release:check` after the intended clean production build, then run `pnpm release:verify-host -- https://your-origin.example`. The verifier requires `curl` with HTTPS support and retains its inherited proxy and CA configuration; it never disables certificate verification. It checks the local manifest against the complete artifact directory, then GETs `/` and each distributable file except host configuration `_headers`, streams bytes against the local SHA-256 and length, checks the configured CSP/security headers, MIME type and required caching, and requires real404s for six random nonexistent root, asset, engine, wrapper and source paths. Requests contain no user file payloads. Redirects, unknown artifact MIME types, unsafe paths, and origins with credentials, paths, query strings or fragments fail closed. Asset requests have a15-second connection and60-second total timeout. A missing-asset response can stop after64KiB once its status is known.

Successful output is a JSON report containing the origin, timestamp, source revision, tracked-dirty status, artifact count and loopback flag. Store the report with the exact artifact manifest only after the command succeeds. The local manifest is unsigned; its revision/dirty values are recorded facts, not upstream source attestation. CSP directives must match the built policy, with only the additional `upgrade-insecure-requests` or `block-all-mixed-content` directives allowed; a host with a different but restrictive policy needs separate review. The `--allow-http-localhost` option permits explicit loopback fixtures only and cannot establish a deployed HTTPS result. Vite preview returns non-cacheable404s for missing static assets so it can exercise the local contract.

A successful host check does not verify staged old-client updates, rollback, warm offline behavior, real-device accessibility, field metrics, FFmpeg corresponding source, or a deployed hostname's operational authorization. Complete the manual checks below for the selected host. No actual host was tested in this checkpoint.

The default single-thread core does not require COOP/COEP or SharedArrayBuffer. Never add a CDN or conversion API fallback to recover a missing engine. HTTPS configuration and any HSTS policy belong to the selected host; they have not been validated here.

## Deploy, update and roll back

Stage the complete artifact and verify the hosting contract before switching the live entry point. Preserve prior hashed assets and versioned engine directories while old clients can remain open. Retain the associated notices/source materials for every retained version. An old app can request a lazy worker it has never cached; a waiting service worker cannot recreate a file the host deleted.

The worker now follows the normal waiting lifecycle. It does not force a reload or claim the next version while old controlled clients are active. Once those clients close, the next worker removes obsolete OmniConvert caches and activates. The page sends the fixed OMNICONVERT_CLAIM_CLIENTS message after registration.ready. The message handler waits on worker-local activated state before claiming; its lifetime promise cannot hold activation open. This avoids a page-side state wrapper remaining outdated when navigation overlaps activation. If initial claiming fails, later navigation obtains normal service-worker control. Runtime cache-open/read/write failures allow successful network reads to continue. Failed installation leaves the previous working registration available. Offline conversion requires previously loaded engine assets; never-loaded engines require a connection, and browser-specific cache behavior is not universally certified.

Before a public switch, verify both a fresh session and an old tab kept open across the staged update: import a synthetic file, use a previously unused conversion domain, cancel/retry, download and re-inspect output, then close the old tab and verify the new controller activates. Verify offline behavior after warming the specific domains being advertised. Inspect response headers and confirm file payloads are absent from network requests and CacheStorage.

Rollback restores the complete prior artifact and its headers/notice materials atomically, retaining newer assets while their clients remain open. Deploy the prior `sw.js` with revalidation enabled; normal lifecycle rules still apply. Avoid deleting all origin storage or forcing reloads during conversion: that can discard queued files and completed outputs. Test the prior shell and a local conversion after rollback. This procedure is prepared but has not been exercised against a real hosting target.

## Resource and failure behavior

Text input and table output are limited to 64 MiB each. Tables additionally allow 250,000 data rows, 2,000 columns and 2,000,000 canonical cells. CSV/TSV processing enforces growth limits incrementally; JSON uses native parsing before shape checks, then validates before rectangular expansion. Output is counted in UTF-8 bytes before bounded parts are retained. A single row and native JSON parsing can still require transient allocations; this is not a universal mobile-memory guarantee.

ZIP input is rejected above 256 MiB before bytes are read; File/Blob input is read inside the archive worker. Archive entry/count/expanded-size/ratio/CRC safeguards remain in place. Other files retain the documented 1.5 GB input ceiling and 500 MB warning; actual safe media size depends on the device. Jobs use cancellation/timeouts and terminate their workers. Synchronous worker-message failures also release workers, timers and listeners. Live media probing/transcoding permits only the local `file,pipe` protocols.

Expected failures appear on the affected job or import notice. There is no remote error-reporting SDK or file telemetry. For support, use synthetic reproductions and manually supplied browser/version/status details. Do not request confidential payloads or automatically upload filenames, metadata or bytes.

## Distribution and verification limits

The built source page links the87-file ExifReader package archive and notices; the application opens it in a new tab to preserve queued files. Source bytes are verified against the pinned installed package and are excluded from SW precache. This does not resolve the separate FFmpeg source gate. The notice artifact includes exact installed license texts for the observed emitted npm modules and separately identified candidate native-library notices. Its upstream whitespace is intentionally preserved. `LICENSES.md` distinguishes verified package integrity from unresolved native corresponding-source coverage. Do not represent candidate recipe revisions as proven inputs to the published WASM binary; establish the applicable complete source/notice materials before public binary distribution.

The bundled native engine reports FFmpeg 5.1.4; npm still reports core 0.12.10 as its latest official release on 2026-10-26. The bounded advisory review found no established direct route for the reviewed DASH/HLS/XBIN advisories through the accepted inputs. Local-protocol restrictions provide an additional boundary. This does not certify other decoder paths or replace a maintained native-engine security strategy. npm audit does not audit statically linked native codec code.

Manual assistive-technology/physical-device evaluation, current/previous stable-browser certification, field p75 CWV, large-file/mobile memory characterization and actual host/rollback checks remain explicitly unverified. Report their results separately from automated test counts. The next environment-specific work starts with this runbook; the next source-distribution investigation starts with `LICENSES.md`.
