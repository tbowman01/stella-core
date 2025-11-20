import { Worker, Job } from 'bullmq';
import { redis } from '@arcqubit/cache';
import { extractText } from '@arcqubit/documents';
import { generateEmbedding, embedDocument } from '@arcqubit/ai';
import prisma from '@arcqubit/database';
import type {
  ProcessDocumentJob,
  GenerateEmbeddingJob,
  ScanRepositoryJob,
  GenerateComplianceReportJob,
  SendEmailJob,
  CleanupOldDataJob,
  AggregateAnalyticsJob,
} from './jobs';

const connection = redis.duplicate();

/**
 * Document processing worker
 */
export const documentWorker = new Worker(
  'document-processing',
  async (job: Job<ProcessDocumentJob>) => {
    console.log(`Processing document ${job.data.documentId}...`);

    try {
      // Get document
      const document = await prisma.document.findUnique({
        where: { id: job.data.documentId },
      });

      if (!document) {
        throw new Error('Document not found');
      }

      // Update progress
      await job.updateProgress(20);

      // Extract text if not already done
      if (!document.contentText) {
        // Download document from storage
        // const buffer = await downloadFromStorage(document.storagePath);
        // const { text } = await extractText(buffer, document.name);

        // await prisma.document.update({
        //   where: { id: document.id },
        //   data: { contentText: text },
        // });

        console.log('Text extraction completed');
      }

      await job.updateProgress(50);

      // Generate embedding (schedule separate job)
      if (document.contentText && !document.embedding) {
        const { scheduleEmbeddingGeneration } = await import('./jobs');
        await scheduleEmbeddingGeneration({
          documentId: document.id,
          text: document.contentText,
          tenantId: job.data.tenantId,
        });
      }

      await job.updateProgress(75);

      // Trigger plugins
      const { triggerDocumentUploadHook } = await import('@arcqubit/plugins');
      await triggerDocumentUploadHook(
        {
          documentId: document.id,
          name: document.name,
          fileType: document.fileType,
          fileSize: Number(document.fileSize),
          workspaceId: document.workspaceId,
          uploadedBy: job.data.userId,
        },
        job.data.tenantId,
        job.data.userId
      );

      await job.updateProgress(100);

      return { success: true, documentId: document.id };
    } catch (error) {
      console.error('Document processing failed:', error);
      throw error;
    }
  },
  { connection, concurrency: 5 }
);

/**
 * Embedding generation worker
 */
export const embeddingWorker = new Worker(
  'embedding-generation',
  async (job: Job<GenerateEmbeddingJob>) => {
    console.log(`Generating embedding for document ${job.data.documentId}...`);

    try {
      await embedDocument(job.data.documentId, job.data.text);
      return { success: true };
    } catch (error) {
      console.error('Embedding generation failed:', error);
      throw error;
    }
  },
  { connection, concurrency: 3 }
);

/**
 * PQC Scanner worker
 */
export const pqcScannerWorker = new Worker(
  'pqc-scanner',
  async (job: Job<ScanRepositoryJob>) => {
    console.log(`Scanning repository ${job.data.repositoryUrl}...`);

    try {
      // TODO: Implement repository cloning and scanning
      // This would involve:
      // 1. Clone repo to temp directory
      // 2. Scan all code files for crypto usage
      // 3. Generate QBOM entries
      // 4. Clean up temp directory

      return { success: true, qbomEntriesCreated: 0 };
    } catch (error) {
      console.error('Repository scan failed:', error);
      throw error;
    }
  },
  { connection, concurrency: 2 }
);

/**
 * Compliance report worker
 */
export const complianceWorker = new Worker(
  'compliance-reports',
  async (job: Job<GenerateComplianceReportJob>) => {
    console.log(`Generating compliance report for tenant ${job.data.tenantId}...`);

    try {
      const { generateReport } = await import('@arcqubit/compliance');
      const report = await generateReport(job.data.tenantId, job.data.framework);

      // Save report somewhere or email it
      // For now, just return it

      return { success: true, report };
    } catch (error) {
      console.error('Compliance report generation failed:', error);
      throw error;
    }
  },
  { connection, concurrency: 2 }
);

/**
 * Email worker
 */
export const emailWorker = new Worker(
  'email-notifications',
  async (job: Job<SendEmailJob>) => {
    console.log(`Sending email to ${job.data.to}...`);

    try {
      // TODO: Implement email sending (SendGrid, SES, etc.)
      console.log(`Would send email: ${job.data.subject}`);

      return { success: true };
    } catch (error) {
      console.error('Email send failed:', error);
      throw error;
    }
  },
  { connection, concurrency: 10 }
);

/**
 * Cleanup worker
 */
export const cleanupWorker = new Worker(
  'cleanup-tasks',
  async (job: Job<CleanupOldDataJob>) => {
    console.log(`Cleaning up old ${job.data.dataType}...`);

    try {
      let deleted = 0;

      switch (job.data.dataType) {
        case 'audit_logs':
          const result = await prisma.auditLog.deleteMany({
            where: {
              timestamp: {
                lt: job.data.olderThan,
              },
            },
          });
          deleted = result.count;
          break;

        case 'sessions':
          // Sessions are in Redis, handled by TTL
          break;

        case 'temp_files':
          // TODO: Implement temp file cleanup
          break;
      }

      return { success: true, deleted };
    } catch (error) {
      console.error('Cleanup failed:', error);
      throw error;
    }
  },
  { connection, concurrency: 1 }
);

/**
 * Analytics worker
 */
export const analyticsWorker = new Worker(
  'analytics',
  async (job: Job<AggregateAnalyticsJob>) => {
    console.log(`Aggregating analytics for ${job.data.date}...`);

    try {
      // TODO: Implement analytics aggregation
      // This would collect metrics and store in database or metrics system

      return { success: true };
    } catch (error) {
      console.error('Analytics aggregation failed:', error);
      throw error;
    }
  },
  { connection, concurrency: 2 }
);

// Export all workers
export const workers = {
  document: documentWorker,
  embedding: embeddingWorker,
  pqcScanner: pqcScannerWorker,
  compliance: complianceWorker,
  email: emailWorker,
  cleanup: cleanupWorker,
  analytics: analyticsWorker,
};

// Worker event handlers
Object.values(workers).forEach((worker) => {
  worker.on('completed', (job) => {
    console.log(`✅ Job ${job.id} completed`);
  });

  worker.on('failed', (job, error) => {
    console.error(`❌ Job ${job?.id} failed:`, error);
  });

  worker.on('error', (error) => {
    console.error('Worker error:', error);
  });
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing workers...');
  await Promise.all(Object.values(workers).map((w) => w.close()));
  await connection.quit();
});
