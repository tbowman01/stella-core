import { Queue, QueueOptions, JobsOptions } from 'bullmq';
import { redis } from '@arcqubit/cache';

// Redis connection for BullMQ
const connection = redis.duplicate();

// Default job options
const DEFAULT_JOB_OPTIONS: JobsOptions = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 2000,
  },
  removeOnComplete: {
    count: 100, // Keep last 100 completed jobs
    age: 24 * 60 * 60, // or 24 hours
  },
  removeOnFail: {
    count: 500, // Keep last 500 failed jobs
  },
};

// Queue configuration
const QUEUE_CONFIG: QueueOptions = {
  connection,
  defaultJobOptions: DEFAULT_JOB_OPTIONS,
};

/**
 * Job queue definitions
 */

// Document processing queue
export const documentQueue = new Queue('document-processing', QUEUE_CONFIG);

// Embedding generation queue
export const embeddingQueue = new Queue('embedding-generation', QUEUE_CONFIG);

// PQC Scanner queue
export const pqcScannerQueue = new Queue('pqc-scanner', QUEUE_CONFIG);

// Compliance report queue
export const complianceQueue = new Queue('compliance-reports', QUEUE_CONFIG);

// Email notification queue
export const emailQueue = new Queue('email-notifications', QUEUE_CONFIG);

// Cleanup queue
export const cleanupQueue = new Queue('cleanup-tasks', QUEUE_CONFIG);

// Analytics queue
export const analyticsQueue = new Queue('analytics', QUEUE_CONFIG);

// Export all queues
export const queues = {
  document: documentQueue,
  embedding: embeddingQueue,
  pqcScanner: pqcScannerQueue,
  compliance: complianceQueue,
  email: emailQueue,
  cleanup: cleanupQueue,
  analytics: analyticsQueue,
};

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('Closing job queues...');
  await Promise.all(Object.values(queues).map((q) => q.close()));
  await connection.quit();
});
