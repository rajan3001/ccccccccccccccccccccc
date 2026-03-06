import { db, pool } from "./db";
import { pyqIngestionJobs } from "@shared/schema";
import { eq, asc, sql, and, lt } from "drizzle-orm";
import { pyqIngestCore } from "./pyq-routes";

let isProcessing = false;
let workerInterval: ReturnType<typeof setInterval> | null = null;

async function updateJob(jobId: number, updates: Partial<{
  status: string; progress: string; totalExtracted: number;
  validated: number; inserted: number; skipped: number;
  rejected: number; errorDetails: string | null;
}>) {
  await db.update(pyqIngestionJobs)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(pyqIngestionJobs.id, jobId));
}

async function claimNextJob() {
  const result = await pool.query(
    `UPDATE pyq_ingestion_jobs
     SET status = 'processing', progress = 'Starting...', updated_at = NOW()
     WHERE id = (
       SELECT id FROM pyq_ingestion_jobs
       WHERE status = 'queued'
       ORDER BY created_at ASC
       LIMIT 1
       FOR UPDATE SKIP LOCKED
     )
     RETURNING *`
  );
  return result.rows[0] || null;
}

async function processNextJob() {
  if (isProcessing) return;

  const job = await claimNextJob();
  if (!job) return;

  isProcessing = true;
  const jobName = job.original_name;
  const jobFileName = job.file_name;
  const jobExamType = job.exam_type;
  const jobExamStage = job.exam_stage;
  const jobYear = job.year;
  const jobPaperType = job.paper_type;
  console.log(`[PYQ Worker] Processing job #${job.id}: ${jobName}`);

  try {
    const result = await pyqIngestCore({
      fileObjectPath: `/objects/uploads/${jobFileName}`,
      examType: jobExamType,
      examStage: jobExamStage,
      year: String(jobYear),
      paperType: jobPaperType,
      onProgress: async (msg: string) => {
        updateJob(job.id, { progress: msg }).catch(() => {});
      },
    });

    await updateJob(job.id, {
      status: "completed",
      progress: "Done!",
      totalExtracted: result.totalExtracted || 0,
      validated: result.validated || 0,
      inserted: result.inserted || 0,
      skipped: result.skipped || 0,
      rejected: result.rejected || 0,
      errorDetails: result.errors?.length ? JSON.stringify(result.errors) : null,
    });

    console.log(`[PYQ Worker] Job #${job.id} completed: ${result.inserted} inserted, ${result.skipped} skipped`);
  } catch (err: any) {
    console.error(`[PYQ Worker] Job #${job.id} failed:`, err.message);
    await updateJob(job.id, {
      status: "failed",
      progress: "Failed: " + (err.message || "Unknown error"),
      errorDetails: err.message || "Unknown error",
    });
  } finally {
    isProcessing = false;
  }
}

async function recoverStaleJobs() {
  const fiveMinAgo = new Date(Date.now() - 5 * 60 * 1000);
  await db.update(pyqIngestionJobs)
    .set({ status: "queued", progress: "Re-queued after restart", updatedAt: new Date() })
    .where(and(eq(pyqIngestionJobs.status, "processing"), lt(pyqIngestionJobs.updatedAt, fiveMinAgo)));
}

export async function startPyqWorker() {
  await recoverStaleJobs();
  if (workerInterval) clearInterval(workerInterval);
  workerInterval = setInterval(() => {
    processNextJob().catch(err => {
      console.error("[PYQ Worker] Error:", err);
      isProcessing = false;
    });
  }, 3000);
  console.log("[PYQ Worker] Started - polling every 3s");
}
