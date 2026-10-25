import { useCallback, useEffect, useMemo, useState } from "react";
import { DropzoneHeader } from "./components/DropzoneHeader";
import { JobCard } from "./components/JobCard";
import { MetadataDrawer } from "./components/MetadataDrawer";
import { PreviewModal } from "./components/PreviewModal";
import {
  ConversionOrchestrator,
  createBrowserConversionRuntime,
  getExecutableTargets,
} from "./core/conversionOrchestrator";
import { createBatchArchive, triggerBlobDownload } from "./core/exportManager";
import { createQueuedJob, updateJob } from "./core/jobStore";
import { detectBinaryFormat, detectTextFormat } from "./core/magicBytes";
import type { ConversionJob, FormatId, JobStatus, MetadataPolicy } from "./core/types";

const RUNNING_STATUSES = new Set<JobStatus>([
  "INITIALIZING_ENGINE",
  "INSPECTING_METADATA",
  "CONVERTING",
  "WRITING_METADATA",
]);
const CONFIGURABLE_STATUSES = new Set<JobStatus>(["QUEUED", "CANCELLED", "FAILED"]);
const TERMINAL_STATUSES = new Set<JobStatus>(["COMPLETED", "CANCELLED", "FAILED"]);

const createJobId = (): string =>
  typeof globalThis.crypto?.randomUUID === "function"
    ? globalThis.crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;

const readDetectedFormat = async (file: File) => {
  const bytes = new Uint8Array(await file.slice(0, 4096).arrayBuffer());
  return detectBinaryFormat(bytes) ?? detectTextFormat(bytes);
};

const isAbortError = (error: unknown): boolean =>
  (error instanceof DOMException && error.name === "AbortError") ||
  (error instanceof Error && /cancel/i.test(error.message));

export const App = () => {
  const [jobs, setJobs] = useState<readonly ConversionJob[]>([]);
  const [importNotice, setImportNotice] = useState<string | null>(null);
  const [metadataJobId, setMetadataJobId] = useState<string | null>(null);
  const [previewJobId, setPreviewJobId] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewText, setPreviewText] = useState<string | null>(null);
  const [batchBusy, setBatchBusy] = useState(false);
  const [exportBusy, setExportBusy] = useState(false);
  const orchestrator = useMemo(
    () => new ConversionOrchestrator(createBrowserConversionRuntime()),
    [],
  );

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

  const runningJobs = useMemo(() => jobs.filter((job) => RUNNING_STATUSES.has(job.status)), [jobs]);
  const configurableJobs = useMemo(() => jobs.filter((job) => CONFIGURABLE_STATUSES.has(job.status)), [jobs]);
  const completedJobs = useMemo(
    () => jobs.filter((job) => job.status === "COMPLETED" && job.outputBlob && job.outputFileName),
    [jobs],
  );
  const convertibleJobs = useMemo(
    () => configurableJobs.filter((job) => job.targetFormat && getExecutableTargets(job.detectedFormat).includes(job.targetFormat)),
    [configurableJobs],
  );
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
    if (configurableJobs.length === 0) return [];
    const [first, ...rest] = configurableJobs.map((job) => getExecutableTargets(job.detectedFormat));
    return first?.filter((target) => rest.every((targets) => targets.includes(target))) ?? [];
  }, [configurableJobs]);

  const selectedBatchTarget = useMemo<FormatId | null>(() => {
    if (configurableJobs.length === 0) return null;
    const first = configurableJobs[0]?.targetFormat ?? null;
    return configurableJobs.every((job) => job.targetFormat === first) ? first : null;
  }, [configurableJobs]);

  const stripAllMetadata =
    configurableJobs.length > 0 && configurableJobs.every((job) => job.metadataPolicy.stripAllMetadata);

  const aggregateProgress = useMemo<number | null>(() => {
    if (runningJobs.length < 2 || runningJobs.some((job) => job.progressPercent === null)) return null;
    return runningJobs.reduce((total, job) => total + (job.progressPercent ?? 0), 0) / runningJobs.length;
  }, [runningJobs]);

  const handleTargetChange = useCallback((jobId: string, target: FormatId | null) => {
    setJobs((current) => {
      const job = current.find((item) => item.id === jobId);
      if (!job || RUNNING_STATUSES.has(job.status) || job.status === "COMPLETED") return current;
      if (target !== null && !getExecutableTargets(job.detectedFormat).includes(target)) return current;
      return updateJob(current, jobId, { targetFormat: target });
    });
  }, []);

  const executeJob = useCallback(
    async (job: ConversionJob): Promise<void> => {
      if (!job.targetFormat) return;
      const startedAtMs = Date.now();
      setJobs((current) =>
        updateJob(current, job.id, {
          status: "INITIALIZING_ENGINE",
          statusMessage: "Loading conversion engine",
          progressPercent: null,
          startedAtMs,
          completedAtMs: null,
          errorDetail: null,
          outputBlob: null,
          outputFileName: null,
        }),
      );

      try {
        const result = await orchestrator.convert(job, (update) => {
          setJobs((current) => updateJob(current, job.id, update));
        });
        setJobs((current) =>
          updateJob(current, job.id, {
            status: "COMPLETED",
            progressPercent: 100,
            statusMessage: "Complete",
            outputBlob: result.blob,
            outputFileName: result.outputName,
            completedAtMs: Date.now(),
            errorDetail: null,
          }),
        );
      } catch (error: unknown) {
        if (isAbortError(error)) {
          setJobs((current) =>
            updateJob(current, job.id, {
              status: "CANCELLED",
              progressPercent: null,
              statusMessage: "Cancelled",
              completedAtMs: Date.now(),
            }),
          );
          return;
        }

        const message = error instanceof Error ? error.message : "Conversion failed";
        setJobs((current) =>
          updateJob(current, job.id, {
            status: "FAILED",
            progressPercent: null,
            statusMessage: "Conversion failed",
            completedAtMs: Date.now(),
            errorDetail: message,
          }),
        );
      }
    },
    [orchestrator],
  );

  const handleConvert = useCallback(
    (jobId: string) => {
      const job = jobs.find((item) => item.id === jobId);
      if (job) void executeJob(job);
    },
    [executeJob, jobs],
  );

  const handleCancel = useCallback(
    (jobId: string) => {
      orchestrator.cancel(jobId);
      setJobs((current) => {
        const job = current.find((item) => item.id === jobId);
        if (!job || TERMINAL_STATUSES.has(job.status)) return current;
        return updateJob(current, jobId, {
          status: "CANCELLED",
          statusMessage: "Cancelled",
          progressPercent: null,
          completedAtMs: Date.now(),
        });
      });
    },
    [orchestrator],
  );

  const handleBatchTargetChange = useCallback((target: FormatId | null) => {
    setJobs((current) =>
      current.map((job) => {
        if (!CONFIGURABLE_STATUSES.has(job.status)) return job;
        if (target !== null && !getExecutableTargets(job.detectedFormat).includes(target)) return job;
        return { ...job, targetFormat: target };
      }),
    );
  }, []);

  const handleStripMetadataChange = useCallback((strip: boolean) => {
    setJobs((current) =>
      current.map((job) =>
        CONFIGURABLE_STATUSES.has(job.status)
          ? { ...job, metadataPolicy: { ...job.metadataPolicy, stripAllMetadata: strip } }
          : job,
      ),
    );
  }, []);

  const handleConvertAll = useCallback(() => {
    if (batchBusy || convertibleJobs.length === 0) return;
    setBatchBusy(true);
    void (async () => {
      try {
        for (const job of convertibleJobs) await executeJob(job);
      } finally {
        setBatchBusy(false);
      }
    })();
  }, [batchBusy, convertibleJobs, executeJob]);

  const handleDownload = useCallback(
    (jobId: string) => {
      const job = jobs.find((item) => item.id === jobId);
      if (job?.outputBlob && job.outputFileName) triggerBlobDownload(job.outputBlob, job.outputFileName);
    },
    [jobs],
  );

  const handleExportZip = useCallback(() => {
    if (exportBusy || completedJobs.length === 0) return;
    setExportBusy(true);
    void createBatchArchive(
      completedJobs.map((job) => ({ name: job.outputFileName ?? "converted-file", blob: job.outputBlob as Blob })),
    )
      .then((archive) => {
        triggerBlobDownload(archive, "omniconvert-converted-files.zip");
        setImportNotice(`Exported ${completedJobs.length} completed file${completedJobs.length === 1 ? "" : "s"} as a ZIP archive.`);
      })
      .catch((error: unknown) => {
        setImportNotice(error instanceof Error ? error.message : "ZIP export failed");
      })
      .finally(() => setExportBusy(false));
  }, [completedJobs, exportBusy]);

  const clearCompleted = useCallback(() => {
    const completedIds = new Set(completedJobs.map((job) => job.id));
    setJobs((current) => current.filter((job) => !completedIds.has(job.id)));
    setPreviewJobId((current) => (current && completedIds.has(current) ? null : current));
    setMetadataJobId((current) => (current && completedIds.has(current) ? null : current));
  }, [completedJobs]);

  const applyMetadataPolicy = useCallback((jobId: string, policy: MetadataPolicy) => {
    setJobs((current) => updateJob(current, jobId, { metadataPolicy: policy }));
    setMetadataJobId(null);
  }, []);

  const applyMetadataToMatching = useCallback((jobId: string, policy: MetadataPolicy) => {
    setJobs((current) => {
      const source = current.find((job) => job.id === jobId);
      if (!source) return current;
      return current.map((job) =>
        job.detectedFormat.format === source.detectedFormat.format && CONFIGURABLE_STATUSES.has(job.status)
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
          queueCount={configurableJobs.length}
          activeCount={runningJobs.length}
          aggregateProgress={aggregateProgress}
          convertibleCount={convertibleJobs.length}
          completedCount={completedJobs.length}
          onConvertAll={batchBusy ? undefined : handleConvertAll}
          onExportZip={exportBusy ? undefined : handleExportZip}
          onClearCompleted={clearCompleted}
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
              <p>Add files above. OmniConvert inspects local signatures and structured text before offering executable conversion targets.</p>
            </div>
          ) : (
            <div className="job-grid">
              {jobs.map((job) => (
                <JobCard
                  key={job.id}
                  job={job}
                  targets={getExecutableTargets(job.detectedFormat)}
                  onTargetChange={handleTargetChange}
                  onConvert={handleConvert}
                  onCancel={handleCancel}
                  onMetadata={setMetadataJobId}
                  onPreview={setPreviewJobId}
                  onDownload={handleDownload}
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
