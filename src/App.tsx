import { useCallback, useEffect, useMemo, useState } from "react";
import { DropzoneHeader } from "./components/DropzoneHeader";
import { JobCard } from "./components/JobCard";
import { MetadataDrawer } from "./components/MetadataDrawer";
import { PreviewModal } from "./components/PreviewModal";
import { getCompatibleTargets } from "./core/compatibilityMatrix";
import { createQueuedJob, updateJob } from "./core/jobStore";
import { detectBinaryFormat, detectTextFormat } from "./core/magicBytes";
import type { ConversionJob, FormatId, JobStatus, MetadataPolicy } from "./core/types";

const ACTIVE_STATUSES = new Set<JobStatus>([
  "QUEUED",
  "INITIALIZING_ENGINE",
  "INSPECTING_METADATA",
  "CONVERTING",
  "WRITING_METADATA",
]);
const TERMINAL_STATUSES = new Set<JobStatus>(["COMPLETED", "CANCELLED", "FAILED"]);

const createJobId = (): string =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const readDetectedFormat = async (file: File) => {
  const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  return detectBinaryFormat(bytes) ?? detectTextFormat(bytes);
};

export const App = () => {
  const [jobs, setJobs] = useState<readonly ConversionJob[]>([]);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [metadataJobId, setMetadataJobId] = useState<string | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);

  const handleFiles = useCallback((files: readonly File[]) => {
    void (async () => {
      const created: ConversionJob[] = [];
      let unsupportedCount = 0;

      for (const file of files) {
        try {
          const detected = await readDetectedFormat(file);
          if (!detected) {
            unsupportedCount += 1;
            continue;
          }

          const queued = createQueuedJob(createJobId(), file, detected);
          created.push(
            detected.needsProbe
              ? { ...queued, statusMessage: "Queued — deeper stream inspection required" }
              : queued,
          );
        } catch {
          unsupportedCount += 1;
        }
      }

      if (created.length > 0) setJobs((current) => [...current, ...created]);

      if (created.length === 0 && unsupportedCount > 0) {
        setImportNotice("No supported binary signature or structured text format was detected. Nothing was added to the queue.");
      } else if (unsupportedCount > 0) {
        setImportNotice(`Added ${created.length} file${created.length === 1 ? "" : "s"}; ${unsupportedCount} unsupported file${unsupportedCount === 1 ? "" : "s"} skipped.`);
      } else if (created.length > 0) {
        setImportNotice(`Added ${created.length} file${created.length === 1 ? "" : "s"} to the local queue.`);
      }
    })();
  }, []);

  const activeJobs = useMemo(() => jobs.filter((job) => ACTIVE_STATUSES.has(job.status)), [jobs]);
  const metadataJob = useMemo(() => jobs.find((job) => job.id === metadataJobId) ?? null, [jobs, metadataJobId]);
  const previewJob = useMemo(() => jobs.find((job) => job.id === previewJobId) ?? null, [jobs, previewJobId]);

  useEffect(() => {
    const blob = previewJob?.outputBlob;
    if (!blob) {
      setPreviewUrl(null);
      setPreviewText(null);
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    setPreviewUrl(objectUrl);
    setPreviewText(null);

    let ignoreText = false;
    if (previewJob.detectedFormat.domain === "tabular") {
      void blob.text().then((text) => {
        if (!ignoreText) setPreviewText(text.split(/\r?\n/).slice(0, 50).join("\n"));
      });
    }

    return () => {
      ignoreText = true;
      URL.revokeObjectURL(objectUrl);
    };
  }, [previewJob]);

  const batchTargets = useMemo<readonly FormatId[]>(() => {
    if (activeJobs.length === 0) return [];
    const [first, ...rest] = activeJobs.map((job) => getCompatibleTargets(job.detectedFormat));
    return first?.filter((target) => rest.every((targets) => targets.includes(target))) ?? [];
  }, [activeJobs]);

  const selectedBatchTarget = useMemo<FormatId | null>(() => {
    if (activeJobs.length === 0) return null;
    const first = activeJobs[0]?.targetFormat ?? null;
    return activeJobs.every((job) => job.targetFormat === first) ? first : null;
  }, [activeJobs]);

  const stripAllMetadata = activeJobs.length > 0 && activeJobs.every((job) => job.metadataPolicy.stripAllMetadata);

  const aggregateProgress = useMemo<number | null>(() => {
    if (activeJobs.length < 2 || activeJobs.some((job) => job.progressPercent === null)) return null;
    return activeJobs.reduce((total, job) => total + (job.progressPercent ?? 0), 0) / activeJobs.length;
  }, [activeJobs]);

  const handleTargetChange = useCallback((jobId: string, target: FormatId | null) => {
    setJobs((current) => {
      const job = current.find((item) => item.id === jobId);
      if (!job || TERMINAL_STATUSES.has(job.status)) return current;
      if (target !== null && !getCompatibleTargets(job.detectedFormat).includes(target)) return current;
      return updateJob(current, jobId, { targetFormat: target });
    });
  }, []);

  const handleCancel = useCallback((jobId: string) => {
    setJobs((current) => {
      const job = current.find((item) => item.id === jobId);
      if (!job || TERMINAL_STATUSES.has(job.status)) return current;
      return updateJob(current, jobId, { status: "CANCELLED", statusMessage: "Cancelled", progressPercent: null });
    });
  }, []);

  const handleBatchTargetChange = useCallback((target: FormatId | null) => {
    setJobs((current) => current.map((job) => {
      if (TERMINAL_STATUSES.has(job.status)) return job;
      if (target !== null && !getCompatibleTargets(job.detectedFormat).includes(target)) return job;
      return { ...job, targetFormat: target };
    }));
  }, []);

  const handleStripMetadataChange = useCallback((strip: boolean) => {
    setJobs((current) => current.map((job) =>
      TERMINAL_STATUSES.has(job.status)
        ? job
        : { ...job, metadataPolicy: { ...job.metadataPolicy, stripAllMetadata: strip } },
    ));
  }, []);

  const applyMetadataPolicy = useCallback((jobId: string, policy: MetadataPolicy) => {
    setJobs((current) => updateJob(current, jobId, { metadataPolicy: policy }));
    setMetadataJobId(null);
  }, []);

  const applyMetadataToMatching = useCallback((jobId: string, policy: MetadataPolicy) => {
    setJobs((current) => {
      const source = current.find((job) => job.id === jobId);
      if (!source) return current;
      return current.map((job) =>
        job.detectedFormat.format === source.detectedFormat.format && !TERMINAL_STATUSES.has(job.status)
          ? { ...job, metadataPolicy: policy }
          : job,
      );
    });
    setMetadataJobId(null);
  }, []);

  const removeJob = useCallback((jobId: string) => {
    setJobs((current) => current.filter((job) => job.id !== jobId));
    setMetadataJobId((current) => (current === jobId ? null : current));
    setPreviewJobId((current) => (current === jobId ? null : current));
  }, []);

  return (
    <div className="app-shell">
      <a className="skip-link" href="#workspace">Skip to conversion workspace</a>
      <header className="workbench-header">
        <div className="brand-copy">
          <h1>OmniConvert</h1>
          <p>Private, domain-valid file conversion in your browser.</p>
        </div>
        <p className="privacy-badge" role="status">
          <span className="privacy-dot" aria-hidden="true" />
          Local processing only — zero file uploads
        </p>
      </header>

      <main className="workbench" id="workspace">
        <DropzoneHeader
          onFiles={handleFiles}
          batchTargets={batchTargets}
          selectedBatchTarget={selectedBatchTarget}
          onBatchTargetChange={handleBatchTargetChange}
          stripAllMetadata={stripAllMetadata}
          onStripMetadataChange={handleStripMetadataChange}
          activeCount={activeJobs.length}
          aggregateProgress={aggregateProgress}
        />

        {importNotice ? <p className="import-notice" role="status">{importNotice}</p> : null}

        <section className="queue-section" aria-labelledby="queue-heading">
          <div className="queue-heading-row">
            <div>
              <p className="eyebrow">Local queue</p>
              <h2 id="queue-heading">Files</h2>
            </div>
            <span className="queue-count">{jobs.length}</span>
          </div>

          {jobs.length === 0 ? (
            <div className="empty-queue">
              <h3>No files queued</h3>
              <p>Add files above. OmniConvert inspects local signatures and structured text before offering conversion targets.</p>
            </div>
          ) : (
            <div className="job-grid">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  targets={getCompatibleTargets(job.detectedFormat)}
                  onTargetChange={handleTargetChange}
                  onCancel={handleCancel}
                  onMetadata={setMetadataJobId}
                  onPreview={setPreviewJobId}
                  onRemove={removeJob}
                />
              ))}
            </div>
          )}
        </section>
      </main>

      <MetadataDrawer
        job={metadataJob}
        open={metadataJob !== null}
        onClose={() => setMetadataJobId(null)}
        onApply={applyMetadataPolicy}
        onApplyToMatching={applyMetadataToMatching}
      />
      <PreviewModal
        job={previewJob}
        open={previewJob !== null}
        previewUrl={previewUrl}
        previewText={previewText}
        onClose={() => setPreviewJobId(null)}
      />
    </div>
  );
};
