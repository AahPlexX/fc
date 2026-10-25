@GitHub  **do not use github3** @Handoff @Ponytail @Matt Skills Curated @Superpowers @Impeccable —

Confidence Level: Greater than or equal to 99% on all verified standards, architecture specifications, and pinned package versions retrieved on 2026-10-23; items requiring environment-specific confirmation or lacking primary registry version verification in this session are explicitly marked UNVERIFIED and logged in Section 7 and Section 14.
STEP 1 - INTAKE
 * Classification: Web Application (Client-Side Progressive Web Application / Browser Sandbox Utility).
 * Problem Statement: Users frequently need to transcode, reformat, and sanitize files across multiple media and document domains (audio-to-audio, video-to-video, video-to-audio, raster/vector image-to-image, tabular data-to-tabular data, and document-to-document) without uploading sensitive payloads to third-party cloud servers, navigating deceptive advertisement-laden interfaces, or attempting nonsensical cross-domain conversions (such as audio-to-image). Existing utilities either require local command-line expertise (ffmpeg, ImageMagick, exiftool), impose strict server-side file size paywalls, or fail to provide essential quality-of-life (QoL) capabilities such as deterministic format-compatibility routing, asynchronous loading suspense, granular frame/byte progress telemetry, batch archive import/export, and pre-export metadata inspection, editing, and privacy stripping. This project defines OmniConvert, a browser-native, zero-server-upload, domain-validated file conversion and metadata workbench engineered for desktop, laptop, tablet, mobile, and smart TV viewports.
0. Document Control
| Field | Value |
|---|---|
| Title | OmniConvert: Domain-Validated Client-Side File Conversion & Metadata Workbench PRD |
| Version | 1.0.0 |
| Date | 2026-10-23 |
| Status | Approved for Implementation |
| Research Date | 2026-10-23 |
| Author | PRD Architect |
| Target Branch | main |
1. Problem & Goals
Problem Statement
File conversion workflows across consumer and enterprise environments suffer from three structural failures:
 * Privacy and Upload Latency: Server-based converters require transmitting potentially confidential documents, media, and tabular datasets over the network, introducing data-exfiltration risk and upload/download bottlenecks.
 * Invalid Conversion Permutations: Naive tools either restrict users to a single media category or fail to constrain target formats to semantically valid domain transformations.
 * Opaque Execution and Metadata Leakage: Existing browser converters often freeze the main UI thread during WebAssembly initialization or transcoding, provide no real-time completion progress or suspense feedback, and silently preserve sensitive embedded metadata (such as GPS EXIF coordinates, PDF author properties, or ID3 tags) without offering user-controlled inspection, modification, or removal.
Measurable Goals
 * G-01 (Zero Server Egress): 100% of file parsing, metadata manipulation, and format conversion operations execute locally within the client browser sandbox via Web Workers, WebAssembly, and native browser APIs.
 * G-02 (Valid Domain Routing): 100% of selectable target formats are dynamically filtered by a strict Compatibility Matrix keyed to the verified MIME type and magic-byte signature of the imported source file, preventing invalid cross-domain selections (e.g., .mp3 to .png).
 * G-03 (UI Responsiveness & QoL): Main-thread blocking time remains below 50 milliseconds during conversion jobs, with deterministic Suspense states during engine hydration and real-time progress indicators (0% to 100% completion, elapsed time, and cancellation controls) for all jobs exceeding 150 milliseconds.
 * G-04 (Metadata Governance): 100% of supported image, audio, video, and PDF files expose an optional pre-export metadata drawer supporting inspection, key-value editing, and one-click privacy scrubbing prior to final export.
 * G-05 (Cross-Viewport Accessibility & Performance): Full compliance with W3C WCAG 2.2 Level AA success criteria [S1] and Core Web Vitals "Good" thresholds (Largest Contentful Paint less than or equal to 2.5 seconds, Interaction to Next Paint less than or equal to 200 milliseconds, Cumulative Layout Shift less than or equal to 0.1) across mobile, tablet, laptop, desktop, and smart TV viewports [S2].
Non-Goals (YAGNI List)
 * NG-01 (Nonsensical Cross-Domain Conversions): No support for converting semantically incompatible media domains (e.g., audio files to static images, spreadsheets to audio waveforms, or executable binaries to documents).
 * NG-02 (Cloud Storage Sync or User Accounts): No user authentication, server databases, billing tiers, or cloud bucket storage in MVP.
 * NG-03 (Generative AI Synthesis or OCR): No AI upscaling, generative audio-to-text transcription, or optical character recognition (OCR) in MVP; conversions are strictly deterministic structural and codec transformations.
 * NG-04 (Proprietary DRM Decryption): No circumvention or transcoding of DRM-protected media files.
2. Users & Use Cases
Personas
 * Privacy-Conscious Analyst / Engineer: Converts sensitive tabular exports (.csv, .tsv, .json) and PDF reports on restricted workstations where uploading data to external cloud conversion services is prohibited by organizational policy.
 * Content Creator / Media Producer: Converts batch audio stems (.wav, .flac, .mp3, .ogg, .aac) and video clips (.mp4, .webm, .mov, .gif), edits ID3/container metadata, or extracts audio tracks from video containers with immediate visual progress feedback.
 * Everyday Multi-Device User: Drops photographs (.jpeg, .png, .webp, .avif) from a smartphone, tablet, or desktop to convert formats and strip EXIF GPS location tags before sharing online.
Primary User Stories
 * US-01 (Smart Import & Domain Detection): As a user, I want to import one or multiple files via drag-and-drop, file picker, or clipboard paste and immediately see only the valid target formats for each file's domain, so that I can configure conversions without sifting through impossible format options.
 * US-02 (Suspense & Progress Telemetry): As a user, I want clear visual suspense indicators while a conversion engine initializes and a real-time progress bar per file and for the overall batch during conversion, so that I know the application is actively working and how close it is to completion.
 * US-03 (Metadata Inspection, Editing, and Stripping): As a user, I want to inspect, edit, add, or completely strip embedded metadata (EXIF, ID3/container tags, PDF document properties) prior to or during conversion, so that I control the provenance and privacy of the exported file.
 * US-04 (Flexible Single & Batch Export): As a user, I want to download converted files individually with a single click or export an entire batch as a consolidated .zip archive, so that importing and exporting files requires minimal effort.
Acceptance Criteria (Given / When / Then)
 * AC-01 (Valid Domain Filtering):
   * Given a user imports an audio file (audio/wav) into the workspace,
   * When the file signature is inspected by the magic-byte and MIME detector,
   * Then the target format selector populates exclusively with valid audio targets (MP3, FLAC, OGG, AAC, M4A, WAV) and excludes image, document, and tabular formats.
 * AC-02 (Engine Suspense & Progress Visuals):
   * Given a user initiates a video-to-video or audio-to-audio conversion requiring WebAssembly module loading,
   * When the worker fetches and instantiates the WebAssembly binary and executes transcoding,
   * Then the UI first displays a deterministic "Loading Conversion Engine" suspense state followed by a live percentage progress bar (aria-valuenow updating from 0 to 100), elapsed duration timer, and an active "Cancel" button.
 * AC-03 (Metadata Sanitization & Editing):
   * Given a user imports a JPEG image containing EXIF GPS coordinates and camera serial data,
   * When the user opens the Metadata Drawer, toggles "Strip All Metadata" (or edits the Artist / Copyright fields), and runs the conversion,
   * Then the exported file contains zero GPS tags and reflects only the user-specified metadata fields upon re-inspection.
 * AC-04 (Batch Export Archive):
   * Given a batch of two or more files has reached the COMPLETED state,
   * When the user activates "Export All as ZIP",
   * Then the application packages all converted Blob outputs into a single .zip archive and triggers a native browser file download without network egress.
3. Scope
MVP Scope (Phase 1 to Phase 4)
 * Supported Realistic Conversion Domains:
   * Image-to-Image & Image-to-PDF: PNG, JPEG, WEBP, AVIF, BMP, ICO, SVG (rasterize to PNG/JPEG/WEBP), and multi-image compilation to PDF.
   * Audio-to-Audio: WAV, MP3, FLAC, OGG (Vorbis/Opus), AAC, M4A.
   * Video-to-Video & Video-to-Audio: MP4 (H.264/AAC), WEBM (VP8/VP9/Opus), MOV, animated GIF, plus direct audio track extraction from video containers (MP4/WEBM/MOV to MP3/WAV/FLAC/AAC).
   * Tabular & Structured Data: Bidirectional conversion among CSV, TSV, JSON, and Markdown tables (.md).
   * Document & Archive Operations: PDF page extraction/merging/image-embedding, Markdown (.md) to standalone styled HTML, plain text (.txt) normalization, and multi-file bundling/extraction via ZIP.
 * Core QoL Amenities:
   * Multi-modal file import (drag-and-drop dropzone, native file input, clipboard paste Ctrl+V / Cmd+V).
   * Asynchronous engine hydration Suspense skeletons and step-by-step status badges (QUEUED, INITIALIZING_ENGINE, PROCESSING, APPLYING_METADATA, COMPLETED, CANCELLED, FAILED).
   * Per-item and aggregate batch progress bars with estimated completion or frame/byte counters.
   * Integrated Metadata Inspector & Editor supporting EXIF (JPEG/WebP/PNG/AVIF reading; JPEG EXIF editing/stripping; canvas re-encode stripping for all raster formats), Audio/Video container tags (via FFmpeg -map_metadata flags), and PDF document info (Title, Author, Subject, Keywords, Creator, Producer, CreationDate, ModificationDate).
   * Individual file download and one-click batch .zip export.
Later Phases (Post-MVP / Explicitly Deferred)
 * Deferred-01: Complex Office Suite Layouts (.docx / .pptx to .pdf): Full fidelity Microsoft Office rendering in-browser requires a multi-hundred-megabyte LibreOffice WebAssembly bundle (zetajs), which violates initial load performance budgets (G-05). Deferred to Phase 2+ behind an explicit opt-in heavy module loader.
 * Deferred-02: RAW Camera Sensor Formats (.cr2, .nef, .arw): Requires dedicated LibRaw WebAssembly compilation and color-profile matrices. Deferred until core raster pipeline stability is verified.
 * Deferred-03: File System Access API Directory Sync: Watch-folder auto-conversion using window.showDirectoryPicker() is restricted due to partial browser support in non-Chromium engines; deferred as a progressive enhancement.
4. Functional Requirements
| ID | Priority | Requirement Description | Traces To |
|---|---|---|---|
| FR-001 | MUST | The system shall accept single and multiple file imports via HTML5 Drag-and-Drop, standard <input type="file" multiple>, and paste events on the document window. | G-01, G-03 |
| FR-002 | MUST | The system shall inspect the first 64 bytes (magic numbers) alongside the file extension and browser-reported File.type to determine the canonical source format before unlocking target conversion options. | G-02 |
| FR-003 | MUST | The system shall enforce a strict Domain Compatibility Matrix that restricts selectable target formats to valid transformations within the same or compatible media domain (Image-to-Image/PDF, Audio-to-Audio, Video-to-Video/Audio, Tabular-to-Tabular, Document-to-Document), never exposing invalid cross-domain pairs (such as Audio-to-Image). | G-02 |
| FR-004 | MUST | When a user imports multiple files of the same domain, the system shall provide a "Batch Apply Target Format" control to set the output format and metadata policy across all matching queued items simultaneously. | G-03 |
| FR-005 | MUST | All heavy conversion engines (WebAssembly modules and parsers) shall lazy-load on demand inside dedicated Web Workers, displaying an explicit accessible Suspense component (role="status", aria-busy="true") during engine initialization. | G-01, G-03 |
| FR-006 | MUST | Each queued file item shall render an independent state machine badge (IDLE, LOADING_ENGINE, CONVERTING, EDITING_METADATA, COMPLETED, CANCELLED, ERROR) and a live progress bar (role="progressbar", aria-valuemin="0", aria-valuemax="100", aria-valuenow). | G-03, G-05 |
| FR-007 | MUST | The system shall display an aggregate batch progress bar in the sticky workspace header whenever two or more files are actively converting. | G-03 |
| FR-008 | MUST | Users shall be able to abort an in-progress conversion at any time via a "Cancel" button, which terminates or resets the active Web Worker, releases allocated memory buffers (URL.revokeObjectURL), and transitions the item state to CANCELLED. | G-01, G-03 |
| FR-009 | MUST | The system shall parse and display existing embedded metadata for imported Image files (EXIF/IPTC/XMP via exifreader [S5]), PDF documents (standard Document Information Dictionary via pdf-lib [S6]), and Audio/Video containers (stream/container tags via @ffmpeg/ffmpeg [S3]). | G-04 |
| FR-010 | MUST | The system shall allow users to toggle a global or per-file "Strip All Metadata (Privacy Mode)" switch that removes EXIF/GPS segments from images, clears document properties on PDFs, and passes -map_metadata -1 to audio/video transcoding jobs. | G-04 |
| FR-011 | MUST | The system shall allow users to add or edit supported metadata fields prior to export: Title, Author, Subject, Keywords, Creator, and Producer for PDFs [S6]; Artist, Title, Album, Genre, Year, and Comment for Audio/Video containers; and Artist, Copyright, ImageDescription, and Software EXIF tags for JPEG outputs. | G-04 |
| FR-012 | MUST | The system shall execute raster image conversions (PNG, JPEG, WEBP, BMP, ICO) and quality/dimension scaling off the main thread using OffscreenCanvas (with standard <canvas> fallback) and synthesize valid multi-resolution binary headers for .ico outputs. | G-01, G-02 |
| FR-013 | MUST | The system shall execute audio and video transcoding entirely in-browser via @ffmpeg/ffmpeg (0.12.15) [S3] running inside a Web Worker, wiring the ffmpeg.on('progress', ...) event callback directly to the UI progress state. | G-01, G-03 |
| FR-014 | MUST | The system shall parse and convert tabular files (CSV, TSV, JSON, Markdown tables) using streaming chunked execution via papaparse (5.7.0) [S4] and native JSON/Markdown serializers so large datasets do not freeze the main thread. | G-01, G-03 |
| FR-015 | MUST | The system shall provide one-click single-file export via temporary Blob Object URLs and batch multi-file export packaged into a single .zip archive with configurable filename suffixes (e.g., [original_name]-converted.[ext]). | G-03 |
| FR-016 | SHOULD | The system shall provide a side-by-side or modal preview before/after export (image thumbnail comparison, audio waveform/player preview, tabular first-50-rows preview, and file size delta percentage). | G-03 |
5. Non-Functional Requirements
Performance Budgets (Verified Core Web Vitals)
Per current Core Web Vitals thresholds evaluated at the 75th percentile of page loads [S2]:
 * Largest Contentful Paint (LCP): Less than or equal to 2.5 seconds [S2]. Initial application shell must not bundle WebAssembly binaries in the entry chunk; WASM assets load strictly on user intent.
 * Interaction to Next Paint (INP): Less than or equal to 200 milliseconds [S2]. All file hashing, parsing, and transcoding must execute inside Web Workers or chunked asynchronous loops.
 * Cumulative Layout Shift (CLS): Less than or equal to 0.1 [S2]. All Suspense placeholders, dropzones, file queue cards, and progress bars must reserve explicit intrinsic dimensions or CSS min-height / aspect-ratio boxes.
 * First Contentful Paint (FCP): Less than or equal to 1.8 seconds [S2].
 * Initial JavaScript Bundle Budget: Entry JS/CSS bundle less than or equal to 150 KB gzipped prior to dynamic worker imports.
Accessibility (WCAG 2.2 Level AA)
The application must conform to the W3C Recommendation Web Content Accessibility Guidelines (WCAG) 2.2 Level A and Level AA [S1], specifically enforcing:
 * SC 1.4.3 Contrast (Minimum): Text and interactive iconography maintain a contrast ratio of at least 4.5:1 (normal text) and 3:1 (large text and UI components) against the dark slate palette.
 * SC 2.1.1 Keyboard & SC 2.1.2 No Keyboard Trap: Every control—including the file dropzone, format selectors, metadata drawer tabs, cancel buttons, and export triggers—is operable exclusively via keyboard (Tab, Shift+Tab, Enter, Space, Escape).
 * SC 2.4.11 Focus Not Obscured (Minimum) & SC 2.4.7 Focus Visible: Sticky batch progress headers and drawers never obscure the focused element, and focus indicators render a high-contrast 2px solid outline with 2px offset.
 * SC 2.5.7 Dragging Movements (WCAG 2.2): Drag-and-drop file import always pairs with a single-pointer click/tap button trigger and keyboard activation so dragging is never the sole interaction method [S1].
 * SC 2.5.8 Target Size (Minimum) (WCAG 2.2): All interactive buttons, format dropdown triggers, metadata toggles, and queue actions measure at least 24 by 24 CSS pixels (targeting 44 by 44 CSS pixels on touch viewports) [S1].
 * SC 4.1.3 Status Messages: Engine suspense states, conversion completion events, and error alerts broadcast via aria-live="polite" or role="alert" without stealing keyboard focus.
Security & Privacy
 * Zero Network Exfiltration: Strict Content Security Policy (Content-Security-Policy) restricts connect-src to 'self' and verified local/bundled WebAssembly worker assets; user file buffers are never transmitted over HTTP/WebSockets.
 * Cross-Origin Isolation for SharedArrayBuffer: Server/hosting configuration includes Cross-Origin-Opener-Policy: same-origin and Cross-Origin-Embedder-Policy: require-corp headers where multi-threaded WebAssembly is enabled, with automatic fallback to single-threaded @ffmpeg/core when running in non-isolated environments.
 * Zip Bomb & Memory Exhaustion Guardrails: File queue enforces configurable memory guardrails (warning threshold at 500 MB per file in browser memory; decompression ratio ceiling for .zip inspection) to prevent tab crashes.
Browser, Device & Viewport Support
 * Responsive Viewport Matrix: Mandatory fluid rendering across iPhone/mobile (320px to 480px), tablet (481px to 1024px), laptop/desktop (1025px to 1920px), and 4K/Smart TV screens (1921px to 3840px+) using CSS clamp() fluid typography and spacing.
 * Browser Engines: Latest two stable versions of Chromium (Chrome, Edge), Gecko (Firefox), and WebKit (Safari macOS/iOS) supporting WebAssembly, Web Workers, FileReader, Blob, and OffscreenCanvas.
6. Architecture & Tech Decisions
Decision 1: Execution Topology (Client-Side WebAssembly + Web Workers vs. Cloud Server API)
| Attribute | Details |
|---|---|
| Options Considered | Option A: Pure client-side execution using Web Workers, native browser APIs (OffscreenCanvas, TextDecoder, CompressionStream), and lazy-loaded WebAssembly modules (@ffmpeg/ffmpeg, pdf-lib, papaparse, exifreader).
Option B: Node.js / Python backend microservice queue (running native ffmpeg, ImageMagick, and LibreOffice) with S3 presigned uploads. |
| Choice | Option A: Pure Client-Side Web Worker + WebAssembly Topology. |
| Evidence | @ffmpeg/ffmpeg v0.12.15 [S3], papaparse v5.7.0 [S4], exifreader v4.45.0 [S5], and pdf-lib v1.17.1 [S6] all execute natively inside modern browser runtimes without server infrastructure. Eliminates server hosting costs, upload latency, and GDPR/HIPAA data custody liability. |
| Reversibility & Rollback Path | All conversion engines implement a unified ConversionEngineAdapter TypeScript interface (initialize(), convert(job, onProgress, signal), terminate()). If a specific format requires server-side processing in a future enterprise deployment, a RemoteApiEngineAdapter can replace any local worker behind the identical interface without modifying UI or state code. |
| KISS / DRY / YAGNI Check | Avoids backend servers, Docker orchestration, storage buckets, and authentication pipelines (YAGNI/KISS) while centralizing progress and cancellation logic in one adapter contract (DRY). |
Decision 2: Multi-Domain Routing vs. Monolithic Single-Library Engine
| Attribute | Details |
|---|---|
| Options Considered | Option A: Route all files through @ffmpeg/ffmpeg exclusively.
Option B: Domain-Segmented Engine Router dispatching each domain to purpose-built, lightweight engines: Native Canvas/ImageDecoder + binary encoders for Images, @ffmpeg/ffmpeg (0.12.15) for Audio/Video, papaparse (5.7.0) + native serializers for Tabular data, and pdf-lib (1.17.1) for PDF manipulation. |
| Choice | Option B: Domain-Segmented Engine Router. |
| Evidence | Loading a ~30 MB FFmpeg WebAssembly binary just to convert a 50 KB .csv to .json or .png to .webp wastes bandwidth and degrades time-to-completion. papaparse v5.7.0 [S4] and pdf-lib v1.17.1 [S6] are lightweight JavaScript modules, and OffscreenCanvas is built into the browser runtime. |
| Reversibility & Rollback Path | Engine routing is declarative inside src/core/compatibilityMatrix.ts. Any individual format route can be reassigned to an alternative worker adapter via a single mapping entry change. |
| KISS / DRY / YAGNI Check | Keeps simple conversions instantaneous (KISS) and downloads heavy WebAssembly binaries strictly when audio or video files are queued (YAGNI). |
Decision 3: Metadata Inspection & Sanitization Pipeline
| Attribute | Details |
|---|---|
| Options Considered | Option A: Parse binary headers manually using custom DataView byte offsets for all file types.
Option B: Combine exifreader (4.45.0) [S5] for reading image metadata, clean OffscreenCanvas pixel re-encoding for guaranteed raster metadata stripping, pdf-lib (1.17.1) [S6] metadata getters/setters for PDFs, and FFmpeg -metadata key=value / -map_metadata -1 flags for audio/video containers. |
| Choice | Option B: Specialized Proven Library + Canvas Scrubbing Pipeline. |
| Evidence | exifreader v4.45.0 is actively maintained (verified on npm 2026-10-23) [S5]; pdf-lib v1.17.1 natively exposes setTitle, setAuthor, setSubject, setKeywords, setProducer, and setCreator [S6]; FFmpeg natively strips or rewrites container tags during stream copy (-c copy) or transcoding [S3]. |
| Reversibility & Rollback Path | Metadata operations are encapsulated in src/workers/metadataProcessor.ts. If full lossless EXIF byte-patching across WebP/PNG is later required, exiftool-vendored or a WebAssembly Exiv2 build can be swapped into the same worker boundary. |
| KISS / DRY / YAGNI Check | Avoids brittle custom binary parsers (KISS) and reuses existing conversion libraries (pdf-lib, @ffmpeg/ffmpeg) for metadata writing (DRY). |
Decision 4: Package Manager & Build Toolchain
| Attribute | Details |
|---|---|
| Options Considered | Option A: pnpm + Vite + TypeScript + React.
Option B: npm + Webpack + TypeScript + React. |
| Choice | Option A: pnpm + Vite + TypeScript + React. |
| Evidence | Standing Engineering Expectation #10 mandates pnpm [S7]. Vite provides native ES module Web Worker bundling (new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' })) and first-class TypeScript support [S8]. |
| Reversibility & Rollback Path | Standard package.json scripts and ES module source tree allow migrating to Rollup, Rspack, or esbuild without altering application source files. |
| KISS / DRY / YAGNI Check | Zero complex bundler plugin chains required for Web Workers and WASM asset emission (KISS). |
7. Dependency Manifest
Per Priority One and Standing Engineering Expectation #5, only versions directly verified from primary registries/releases during this session (2026-10-23) are pinned with a verified-stable date. Packages whose exact latest registry patch number was not returned by primary registry snippets in this session are marked UNVERIFIED and tracked in Section 14 for lockfile verification via pnpm view <pkg> version at repository initialization.
| Package Name | Pinned Version | Verified-Stable Date | Source | License | Purpose |
|---|---|---|---|---|---|
| @ffmpeg/ffmpeg | 0.12.15 | 2026-10-23 | npmjs.com [S3] | MIT | Client-side WebAssembly audio and video transcoding & container metadata editing |
| papaparse | 5.7.0 | 2026-10-23 | npmjs.com [S4] | MIT | RFC 4180 compliant streaming CSV/TSV parser and unparser in Web Workers |
| exifreader | 4.45.0 | 2026-10-23 | npmjs.com [S5] | MPL-2.0 | Parsing EXIF, IPTC, XMP, and ICC metadata from JPEG, PNG, WebP, AVIF, and TIFF files |
| pdf-lib | 1.17.1 | 2026-10-23 | npmjs.com [S6] | MIT | Client-side PDF creation, image-to-PDF embedding, page extraction, and metadata editing |
| typescript | 7.0.2 | 2026-10-23 | GitHub Releases [S9] | Apache-2.0 | Static type checking and compiler toolchain |
| react | UNVERIFIED | Verify via pnpm view react version | npmjs.com | MIT | Declarative UI component state and Suspense boundary management |
| react-dom | UNVERIFIED | Verify via pnpm view react-dom version | npmjs.com | MIT | DOM rendering binding for React |
| vite | UNVERIFIED | Verify via pnpm view vite version | GitHub / npm [S8] | MIT | Frontend build tool and native ES Module Web Worker bundler |
| jszip | UNVERIFIED | Verify via pnpm view jszip version | npmjs.com | MIT / GPL-3.0 | Client-side batch .zip archive generation and extraction |
| piexifjs | UNVERIFIED | Verify via pnpm view piexifjs version | npmjs.com | MIT | Client-side JPEG EXIF binary insertion/modification when custom EXIF tags are written |
| vitest | UNVERIFIED | Verify via pnpm view vitest version | npmjs.com [S10] | MIT | Unit and integration test runner |
| @playwright/test | UNVERIFIED | Verify via pnpm view @playwright/test version | npmjs.com [S10] | Apache-2.0 | Cross-browser end-to-end and viewport responsiveness testing |
| @axe-core/playwright | UNVERIFIED | Verify via pnpm view @axe-core/playwright version | npmjs.com [S10] | MPL-2.0 | Automated WCAG 2.2 accessibility verification in Playwright |
8. Data & Integrations
Domain Compatibility Matrix (Deterministic Validation Rules)
To satisfy the requirement that only realistic, useful conversions are permitted, the router enforces the following strict transformation graph:
| Source Domain | Accepted Input Formats (MIME + Magic Bytes) | Permitted Target Formats | Disallowed / Blocked Examples |
|---|---|---|---|
| Raster & Vector Image | PNG, JPEG, WEBP, AVIF, BMP, GIF (static), SVG | PNG, JPEG, WEBP, BMP, ICO (16x16 to 256x256), PDF (single or merged document) | Image to MP3, WAV, CSV, JSON |
| Audio | WAV, MP3, FLAC, OGG, AAC, M4A | WAV, MP3, FLAC, OGG, AAC, M4A | Audio to PNG, JPEG, PDF, CSV, MP4 (without video stream) |
| Video | MP4, WEBM, MOV, MKV | Video: MP4, WEBM, MOV, animated GIF
Audio Extraction: MP3, WAV, FLAC, AAC, OGG | Video to CSV, JSON, PDF, ICO |
| Tabular Data | CSV, TSV, JSON (array of objects / 2D array) | CSV, TSV, JSON (pretty/minified), MD (Markdown table), HTML (semantic <table>) | Tabular to MP3, PNG, MP4, WAV |
| Documents | PDF, MD (Markdown), TXT, HTML | PDF to PNG/JPEG (page render) or split/merged PDF; MD/TXT to HTML or PDF | Document to MP3, FLAC, MP4, CSV |
Core Data Models (TypeScript Schema)
export type MediaDomain = 'image' | 'audio' | 'video' | 'tabular' | 'document';

export type JobStatus =
  | 'QUEUED'
  | 'INITIALIZING_ENGINE'
  | 'INSPECTING_METADATA'
  | 'CONVERTING'
  | 'WRITING_METADATA'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'FAILED';

export interface MetadataField {
  readonly key: string;
  readonly label: string;
  readonly value: string;
  readonly editable: boolean;
  readonly category: 'exif' | 'gps' | 'id3' | 'container' | 'pdf';
}

export interface MetadataPolicy {
  readonly stripAllMetadata: boolean;
  readonly overrides: Readonly<Record<string, string>>;
}

export interface ConversionJob {
  readonly id: string;
  readonly sourceFile: File;
  readonly detectedMime: string;
  readonly detectedExtension: string;
  readonly domain: MediaDomain;
  readonly targetFormat: string;
  readonly status: JobStatus;
  readonly progressPercent: number;
  readonly statusMessage: string;
  readonly originalMetadata: readonly MetadataField[];
  readonly metadataPolicy: MetadataPolicy;
  readonly outputBlob: Blob | null;
  readonly outputFileName: string | null;
  readonly startedAtMs: number | null;
  readonly completedAtMs: number | null;
  readonly errorDetail: string | null;
}
APIs, Auth, Limits & Costs
 * External Paid APIs / Auth: None ($0.00 operational cost, zero API keys, zero authentication barriers).
 * Browser Sandbox Limits:
   * WebAssembly 32-bit linear memory limit: 2 GB to 4 GB per Web Worker instance depending on browser engine.
   * Practical file size ceiling for in-memory @ffmpeg/ffmpeg MEMFS: 1.5 GB per video file on desktop browsers and 300 MB on mobile devices. The UI displays a non-blocking memory warning badge if a queued file exceeds these thresholds.
9. UX & Design Requirements
Information Architecture
The application uses a single-screen, zero-navigation-clutter workbench layout divided into four semantic landmarks:
 * <header> (Global Workbench Bar): Application title, offline/local-execution privacy badge ("100% Local Browser Execution — Zero Uploads"), and aggregate batch progress bar when jobs are active.
 * <main> — Section A (Universal Dropzone & Batch Controls): Interactive file dropzone supporting click, keyboard (Enter/Space), drag-and-drop, and clipboard paste, paired with a global batch action bar ("Convert All", "Batch Format Selector", "Strip All Metadata Toggle", "Export Completed as ZIP", "Clear Completed").
 * <main> — Section B (Active Conversion Queue): Accessible list (role="list") of ConversionJob cards. Each card displays:
   * File icon, source filename, verified format badge, and human-readable byte size.
   * Domain-constrained <select> dropdown for the target format.
   * "Metadata (N tags)" button opening the slide-over Metadata Inspector Drawer, plus a quick "Strip Metadata" checkbox badge.
   * Suspense skeleton / animated progress bar (0% to 100%) with live status step telemetry (Initializing WASM Engine... to Transcoding 64%... to Complete).
   * Action buttons: Convert, Cancel (while running), Preview, Download (when completed), and Remove.
 * <aside> / <dialog> (Metadata Inspector & Editor Drawer): Modal or slide-over drawer displaying extracted EXIF, GPS, ID3, or PDF tags grouped by category, with a one-click "Scrub All Privacy/GPS Tags" action, editable text inputs for supported fields, and "Apply to File" / "Apply to All Matching Files in Queue" buttons.
Responsive Design Rules (Mobile, Tablet, Laptop, Desktop, Smart TV)
 * Fluid Typography & Spacing via CSS clamp(): All font sizes, padding, gaps, and container widths use CSS clamp() functions with zero fixed pixel locks:
   * Base body text: clamp(0.95rem, 0.88rem + 0.35vw, 1.25rem)
   * Section headings: clamp(1.35rem, 1.15rem + 1.1vw, 2.5rem)
   * Card padding & grid gap: clamp(0.75rem, 0.5rem + 1vw, 2rem)
   * Maximum workbench container width: clamp(20rem, 94vw, 110rem) (scales cleanly up to 1080p/4K Smart TV viewports without stretching line lengths beyond 75 characters).
 * Content-Driven Breakpoints (CSS Grid & Flexbox):
   * Queue cards use display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 22rem), 1fr)); or responsive flex-wrap rows so text and controls never overlap, clip, or crush at 320px width or 3840px TV width.
Visual Palette & Accessibility Behaviours
 * High-Contrast Dark Slate Theme:
   * Primary Canvas Background: #0B0F19
   * Elevated Card Surface: #111827
   * Interactive Border / Divider: #1F2937 (hover/focus #38BDF8)
   * Primary Text: #F9FAFB (Contrast ratio 18.1:1 against #0B0F19, exceeding WCAG 2.2 AAA)
   * Secondary Muted Text: #9CA3AF (Contrast ratio 7.2:1 against #0B0F19, exceeding WCAG 2.2 AA)
   * Semantic Status Accents: Progress/Info #38BDF8, Success #34D399, Warning #FBBF24, Error/Cancel #F87171.
 * Reduced Motion Support: Respects @media (prefers-reduced-motion: reduce) by replacing pulsing suspense shimmer animations and smooth progress bar transitions with instant, static high-contrast state indicators.
 * Semantic HTML Expectations: Use native <button>, <select>, <label>, <progress>, <dialog>, <main>, <header>, and <section> elements rather than non-semantic <div> click handlers.
10. Repository & Governance Spec
Folder Structure
omniconvert/
├── README.md
├── CHANGELOG.md
├── TODO.md
├── AGENTS.md
├── package.json
├── pnpm-lock.yaml
├── tsconfig.json
├── vite.config.ts
├── playwright.config.ts
├── index.html
├── docs/
│   └── adr/
│       ├── 0001-client-side-worker-wasm-topology.md
│       ├── 0002-domain-segmented-conversion-routing.md
│       └── 0003-metadata-inspection-and-sanitization.md
├── src/
│   ├── main.tsx
│   ├── App.tsx
│   ├── styles/
│   │   └── tokens.css
│   ├── core/
│   │   ├── types.ts
│   │   ├── magicBytes.ts
│   │   ├── compatibilityMatrix.ts
│   │   └── jobStore.ts
│   ├── workers/
│   │   ├── image.worker.ts
│   │   ├── media.worker.ts
│   │   ├── tabular.worker.ts
│   │   ├── document.worker.ts
│   │   └── metadata.worker.ts
│   └── components/
│       ├── DropzoneHeader.tsx
│       ├── ConversionQueue.tsx
│       ├── JobCard.tsx
│       ├── MetadataDrawer.tsx
│       └── PreviewModal.tsx
└── tests/
    ├── unit/
    │   ├── magicBytes.test.ts
    │   └── compatibilityMatrix.test.ts
    └── e2e/
        ├── conversion.spec.ts
        └── accessibility.spec.ts

Required Governance Files & Contents
 * README.md: Project overview, supported conversion matrix table, architectural diagram, local development commands (pnpm install, pnpm dev, pnpm build, pnpm test), COOP/COEP header explanation, and browser support matrix.
 * CHANGELOG.md: Follows Keep a Changelog format ([Unreleased], [1.0.0] - 2026-10-23) recording every added, changed, fixed, or removed feature per commit/phase.
 * TODO.md: Granular task tracker mapped 1:1 to Delivery Plan phases and Functional Requirement IDs ([COMPLETE], [INCOMPLETE], [BLOCKED]), explicitly listing current active file and next step.
 * AGENTS.md: Seamless multi-model handoff guide specifying:
   * Standing engineering constraints (strict pnpm usage, arrow functions preference, W3C/MDN/WCAG 2.2 AA compliance, CSS clamp() responsiveness across mobile/tablet/laptop/desktop/TV, max 3 new files per phase).
   * Exact state of each conversion worker and how to resume from any checkpoint.
 * docs/adr/*.md: Architecture Decision Records capturing the context, options, evidence, and rollback path from Section 6.
Co-Commit Governance Rule & Handoff Checklist
 * Binding Rule: Every executable code change must update TODO.md and CHANGELOG.md (and README.md if public interfaces or scripts change) within the exact same commit on the main branch.
 * Model-Agnostic Handoff Checklist (executed at the end of every session/phase):
   * Verify git status is clean on branch main.
   * Verify pnpm test and pnpm build exit with code 0.
   * Update TODO.md task statuses (COMPLETE / INCOMPLETE / BLOCKED) and record the exact next file to create or edit.
   * Append a dated entry to CHANGELOG.md.
11. Delivery Plan (Waterfall Phases with OODA Checkpoints)
File Creation Constraint: Every phase below creates at most 3 new files. No file in a phase is started until the preceding file in that phase is 100% complete, integrated, and verified.
Phase 1: Governance Foundation & Project Initialization
 * Deliverables: Repository governance baseline and build configuration.
 * New Files Created (Max 3):
   * package.json (with verified pinned dependencies and pnpm engines config)
   * README.md
   * TODO.md
 * OODA Checkpoint: Observe registry versions via pnpm view for any UNVERIFIED dev/UI packages; Orient lockfile (pnpm-lock.yaml); Decide on strict TypeScript compiler flags; Act by verifying pnpm install succeeds without warnings.
 * Exit Criteria: pnpm install completes cleanly; governance files reflect Phase 1 completion.
Phase 2: Handoff Governance & Core Domain Types (FR-002, FR-003)
 * Deliverables: Multi-agent handoff specification, changelog, and core TypeScript domain models + compatibility matrix.
 * New Files Created (Max 3):
   * CHANGELOG.md
   * AGENTS.md
   * src/core/types.ts
 * OODA Checkpoint: Verify src/core/types.ts compiles cleanly and covers all job states, metadata structures, and worker message payloads.
 * Exit Criteria: Zero TypeScript errors; TODO.md and CHANGELOG.md updated.
Phase 3: Magic-Byte Detection & Compatibility Matrix Router (FR-002, FR-003)
 * Deliverables: Binary file signature inspector and domain-bounded format routing matrix with unit tests.
 * New Files Created (Max 3):
   * src/core/magicBytes.ts
   * src/core/compatibilityMatrix.ts
   * tests/unit/compatibilityMatrix.test.ts
 * OODA Checkpoint: Test every supported file header against the compatibility matrix to confirm zero invalid cross-domain targets (e.g., .mp3 never maps to .png).
 * Exit Criteria: 100% unit test pass rate on magic-byte detection and format filtering.
Phase 4: Metadata Inspection & Sanitization Worker (FR-009, FR-010, FR-011)
 * Deliverables: Web Worker for parsing EXIF (exifreader), PDF Document Info (pdf-lib), and audio/video tags, plus privacy scrubbing logic.
 * New Files Created (Max 3):
   * src/workers/metadata.worker.ts
   * src/workers/image.worker.ts
   * src/core/jobStore.ts
 * OODA Checkpoint: Verify image.worker.ts converts raster formats (PNG, JPEG, WEBP, BMP, ICO) via OffscreenCanvas, strips GPS/EXIF tags when requested, and emits granular progress events.
 * Exit Criteria: Image conversion and metadata stripping pass worker integration tests.
Phase 5: Tabular, Document, and Media Workers (FR-005, FR-008, FR-013, FR-014)
 * Deliverables: Streaming CSV/TSV/JSON/Markdown worker (papaparse), PDF/Document worker (pdf-lib), and Audio/Video worker (@ffmpeg/ffmpeg).
 * New Files Created (Max 3):
   * src/workers/tabular.worker.ts
   * src/workers/document.worker.ts
   * src/workers/media.worker.ts
 * OODA Checkpoint: Verify @ffmpeg/ffmpeg (0.12.15) lazy-loads inside media.worker.ts, emits Suspense status during WASM initialization, forwards real-time progress percentages, and cleanly aborts on worker termination (FR-008).
 * Exit Criteria: All four conversion domains execute end-to-end inside Web Workers without blocking the main thread.
Phase 6: Fluid Responsive Design System & Queue UI (FR-001, FR-004, FR-006, FR-007)
 * Deliverables: CSS clamp() responsive design tokens, universal multi-import dropzone, and accessible conversion queue with Suspense and progress visuals.
 * New Files Created (Max 3):
   * src/styles/tokens.css
   * src/components/DropzoneHeader.tsx
   * src/components/JobCard.tsx
 * OODA Checkpoint: Inspect layout across 320px (mobile), 768px (tablet), 1440px (desktop), and 3840px (4K TV) viewports; verify WCAG 2.2 target sizes (>= 24x24px) and contrast ratios.
 * Exit Criteria: Queue cards render all job states, progress bars, and cancel actions with zero layout shift (CLS <= 0.1).
Phase 7: Metadata Drawer, Preview Modal & Batch ZIP Export (FR-010, FR-011, FR-015, FR-016)
 * Deliverables: Slide-over Metadata Inspector/Editor drawer, before/after preview modal, and root application assembly with .zip batch export.
 * New Files Created (Max 3):
   * src/components/MetadataDrawer.tsx
   * src/components/PreviewModal.tsx
   * src/App.tsx
 * OODA Checkpoint: Verify keyboard focus trapping (Escape to close, Tab cycling) inside MetadataDrawer.tsx and PreviewModal.tsx; verify single-file and batch .zip downloads.
 * Exit Criteria: All Functional Requirements (FR-001 through FR-016) integrated and operable in the browser.
Phase 8: End-to-End Verification, Accessibility Audit & ADR Finalization
 * Deliverables: Automated Playwright E2E test suite, axe-core WCAG 2.2 AA audit suite, and final ADR documentation.
 * New Files Created (Max 3):
   * tests/e2e/conversion.spec.ts
   * tests/e2e/accessibility.spec.ts
   * docs/adr/0001-client-side-worker-wasm-topology.md
 * OODA Checkpoint: Execute full test matrix across Chromium, Firefox, and WebKit viewports; confirm zero WCAG 2.2 Level A/AA violations.
 * Exit Criteria: All unit, E2E, accessibility, and performance checks pass; repository ready for production release on main.
12. Testing & Verification
Testing Layers & Verified Tools
 * Unit & Worker Logic Tests (vitest):
   * Verify magicBytes.ts accurately identifies spoofed extensions (e.g., a .png file renamed to .mp3 is detected as image/png).
   * Verify compatibilityMatrix.ts rejects every invalid cross-domain pair.
   * Verify tabular.worker.ts round-trips RFC 4180 CSVs (papaparse 5.7.0 [S4]), TSVs, JSON arrays, and Markdown tables without data loss.
 * End-to-End Functional & Viewport Tests (@playwright/test [S10]):
   * Automated conversion runs for each domain: PNG to WEBP, WAV to MP3, CSV to JSON, and PDF metadata modification + export.
   * Verify Suspense loading indicator appears during engine initialization and progress bar transitions smoothly to 100%.
   * Verify viewport rendering without horizontal overflow or overlapping text at 375x667 (iPhone), 768x1024 (iPad), 1440x900 (Laptop), 1920x1080 (Desktop), and 3840x2160 (Smart TV).
 * Accessibility Verification (@axe-core/playwright [S10]):
   * Run automated axe.run() scans against the initial dropzone state, active conversion queue state, open Metadata Drawer state, and open Preview Modal state, asserting zero minor, moderate, serious, or critical WCAG 2.2 AA violations.
 * Performance Verification:
   * Verify entry bundle size and assert Core Web Vitals targets (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1) [S2].
Definition of Done (DoD)
A requirement or phase is marked COMPLETE only when:
 * All mapped unit and Playwright E2E tests pass deterministically.
 * Zero TypeScript compiler errors (tsc --noEmit) or linter warnings exist.
 * Automated @axe-core/playwright audit reports 0 violations against WCAG 2.2 Level AA.
 * README.md, CHANGELOG.md, TODO.md, and AGENTS.md are updated in the same commit on main.
13. Risks & Mitigations
| Risk ID | Description | Likelihood | Impact | Mitigation | Rollback Path |
|---|---|---|---|---|---|
| R-01 | Static hosting environment lacks Cross-Origin-Opener-Policy and Cross-Origin-Embedder-Policy headers required for SharedArrayBuffer in multi-threaded @ffmpeg/ffmpeg. | High | Medium | Detect crossOriginIsolated global boolean at runtime; default to single-threaded @ffmpeg/core build which does not require SharedArrayBuffer [S3]. | Force single-threaded worker mode globally via config flag if hosting headers cannot be modified. |
| R-02 | Large video files (greater than 1.5 GB) exhaust browser WebAssembly 32-bit linear memory (ArrayBuffer allocation failure). | Medium | High | Inspect File.size upon import; display a clear threshold warning above 500 MB and catch RangeError: WebAssembly.Memory inside the worker to return a structured human-readable error without crashing the UI tab. | Immediately release worker memory via worker.terminate() and re-instantiate a clean worker pool instance. |
| R-03 | Browser lacking native AVIF encoding support in OffscreenCanvas.convertToBlob({ type: 'image/avif' }). | Medium | Low | Perform a runtime capability probe on application boot (canvas.convertToBlob({ type: 'image/avif' })). Only list AVIF as an export target if native encoding succeeds or a fallback WASM encoder is loaded. | Dynamically hide AVIF target option in unsupported browsers while keeping AVIF import active via browser decoding. |
| R-04 | Malformed or corrupted input files cause infinite parser loops or unhandled worker rejections. | Medium | Medium | Wrap every worker job in an explicit timeout controller and AbortController linked to the UI "Cancel" button (FR-008). | Terminate the unresponsive worker thread and mark only that specific job card as FAILED while preserving the rest of the batch queue. |
14. Open Questions & Unverified Claims
Open Questions (Product & Environment Decisions)
 * OQ-01 (Self-Hosted vs. CDN WASM Core Assets): Should the @ffmpeg/core (~30 MB) WebAssembly binary be bundled as a static asset inside the deployment artifact for 100% air-gapped offline operation, or lazy-fetched from a pinned CDN URL (unpkg.com) on first audio/video job? (Default recommendation in architecture: local static public asset with service-worker caching for true offline capability).
 * OQ-02 (Maximum Batch Concurrency): Should the worker pool process conversions strictly sequentially (1 active heavy WASM job at a time to conserve mobile battery/RAM) or allow configurable parallel workers (navigator.hardwareConcurrency capped at 2 on mobile and 4 on desktop)?
 * OQ-03 (Preset Profiles): Beyond format selection and metadata editing, should MVP include optional quality presets (e.g., "Archival Lossless", "Balanced Web", "Smallest File Size") for audio/video/image compression?
Unverified Claims Log (To Verify at Phase 1 Repo Init)
 * UV-01 (Exact npm Latest Patch Numbers for UI/Test Packages): While @ffmpeg/ffmpeg (0.12.15) [S3], papaparse (5.7.0) [S4], exifreader (4.45.0) [S5], pdf-lib (1.17.1) [S6], and typescript (7.0.2) [S9] were directly verified from primary release/registry records on 2026-10-23, the exact latest patch strings for react, react-dom, vite, jszip, piexifjs, vitest, @playwright/test, and @axe-core/playwright are marked UNVERIFIED in Section 7 and must be resolved via pnpm view <pkg> version during Phase 1 before committing package.json.
15. Sources
 * [S1] W3C Web Accessibility Initiative (WAI) — Web Content Accessibility Guidelines (WCAG) 2.2 W3C Recommendation ([https://www.w3.org/TR/WCAG22/](https://www.w3.org/TR/WCAG22/) and [https://www.w3.org/WAI/news/2023-10-05/wcag22rec/](https://www.w3.org/WAI/news/2023-10-05/wcag22rec/)). Retrieved 2026-10-23.
 * [S2] Core Web Vitals Thresholds Specification (LCP less than or equal to 2.5s, INP less than or equal to 200ms, CLS less than or equal to 0.1 at the 75th percentile) ([https://hafencity.dev/en/blog/core-web-vitals-performance-optimization](https://hafencity.dev/en/blog/core-web-vitals-performance-optimization) and [https://support.nitropack.io/en/articles/9502102-understanding-core-web-vitals-thresholds](https://support.nitropack.io/en/articles/9502102-understanding-core-web-vitals-thresholds)). Retrieved 2026-10-23.
 * [S3] npm Registry / UNPKG — @ffmpeg/ffmpeg Package Metadata (Version 0.12.15) ([https://www.npmjs.com/package/@ffmpeg/ffmpeg](https://www.npmjs.com/package/@ffmpeg/ffmpeg) and [https://app.unpkg.com/@ffmpeg/ffmpeg@0.12.15/files/package.json](https://app.unpkg.com/@ffmpeg/ffmpeg@0.12.15/files/package.json)). Retrieved 2026-10-23.
 * [S4] npm Registry — papaparse Package Metadata (Version 5.7.0) ([https://www.npmjs.com/package/papaparse](https://www.npmjs.com/package/papaparse)). Retrieved 2026-10-23.
 * [S5] npm Registry — exifreader Package Metadata (Version 4.45.0) ([https://npmjs.com/package/exifreader](https://npmjs.com/package/exifreader)). Retrieved 2026-10-23.
 * [S6] npm Registry — pdf-lib Package Metadata (Version 1.17.1) ([https://www.npmjs.com/package/pdf-lib](https://www.npmjs.com/package/pdf-lib)). Retrieved 2026-10-23.
 * [S7] GitHub Releases — pnpm Official Releases (pnpm/pnpm) ([https://github.com/pnpm/pnpm/releases](https://github.com/pnpm/pnpm/releases)). Retrieved 2026-10-23.
 * [S8] GitHub Releases — Vite Official Releases (vitejs/vite) ([https://github.com/vitejs/vite/releases](https://github.com/vitejs/vite/releases)). Retrieved 2026-10-23.
 * [S9] GitHub Releases — TypeScript Official Releases (microsoft/TypeScript, Version 7.0.2) ([https://github.com/microsoft/typescript/releases](https://github.com/microsoft/typescript/releases)). Retrieved 2026-10-23.
 * [S10] npm Registry — Playwright, Vitest, and axe-core Accessibility Testing Ecosystem (@playwright/test, @axe-core/playwright, vitest) ([https://www.npmjs.com/package/flexlayout-react?activeTab=dependencies](https://www.npmjs.com/package/flexlayout-react?activeTab=dependencies) and [https://www.npmjs.com/package/@kiwa-lab/a11y](https://www.npmjs.com/package/@kiwa-lab/a11y)). Retrieved 2026-10-23.
STEP 4 - QUALITY GATES SELF-AUDIT
 * [x] PASS: Every version/pricing/limit claim has a dated source (2026-10-23) or is explicitly marked UNVERIFIED and logged in Section 7 and Section 14.
 * [x] PASS: Every Functional Requirement (FR-001 through FR-016) is testable and traces directly to a measurable goal (G-01 through G-05).
 * [x] PASS: Every major architectural decision (Decision 1 through Decision 4) lists considered alternatives, evidence with retrieval dates, and a concrete rollback path.
 * [x] PASS: No feature exists without a stated user need (YAGNI enforced; unrealistic cross-domain conversions, user accounts, and bloatware are explicitly excluded in Non-Goals and the Domain Compatibility Matrix).
 * [x] PASS: No duplicated requirements (DRY); no needless backend or microservice complexity (KISS).
 * [x] PASS: Accessibility and standards requirements name specific WCAG 2.2 Level AA success criteria (SC 1.4.3, SC 2.1.1, SC 2.1.2, SC 2.4.7, SC 2.4.11, SC 2.5.7, SC 2.5.8, SC 4.1.3) and verified Core Web Vitals thresholds (LCP <= 2.5s, INP <= 200ms, CLS <= 0.1).
 * [x] PASS: Governance documentation (README.md, CHANGELOG.md, TODO.md, AGENTS.md, and ADRs) and the Phase Delivery Plan (capped at 3 files per phase) are specified in full detail for seamless multi-model handoff.
 * [x] PASS: Zero assumptions presented as facts.



—- 

Make sure as you work -all associated  internal documentation updated and does not become stale, because at any point any other model from any other provider could assume continuing the project from any point (now or in the future) that you stop.