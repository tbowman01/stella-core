import { queues } from './queue';
import type { JobsOptions } from 'bullmq';

/**
 * Job data interfaces
 */

export interface ProcessDocumentJob {
  documentId: string;
  tenantId: string;
  userId: string;
}

export interface GenerateEmbeddingJob {
  documentId: string;
  text: string;
  tenantId: string;
}

export interface ScanRepositoryJob {
  repositoryUrl: string;
  branch?: string;
  tenantId: string;
  userId: string;
}

export interface GenerateComplianceReportJob {
  framework?: string;
  tenantId: string;
  userId: string;
  format?: 'json' | 'markdown' | 'pdf';
}

export interface SendEmailJob {
  to: string;
  subject: string;
  body: string;
  tenantId: string;
}

export interface CleanupOldDataJob {
  dataType: 'audit_logs' | 'sessions' | 'temp_files';
  olderThan: Date;
}

export interface AggregateAnalyticsJob {
  tenantId: string;
  date: string; // YYYY-MM-DD
  metrics: string[];
}

/**
 * Job scheduling functions
 */

export async function scheduleDocumentProcessing(
  data: ProcessDocumentJob,
  options?: JobsOptions
): Promise<string> {
  const job = await queues.document.add('process-document', data, {
    priority: 1,
    ...options,
  });
  return job.id!;
}

export async function scheduleEmbeddingGeneration(
  data: GenerateEmbeddingJob,
  options?: JobsOptions
): Promise<string> {
  const job = await queues.embedding.add('generate-embedding', data, {
    priority: 2,
    ...options,
  });
  return job.id!;
}

export async function scheduleRepositoryScan(
  data: ScanRepositoryJob,
  options?: JobsOptions
): Promise<string> {
  const job = await queues.pqcScanner.add('scan-repository', data, {
    priority: 3,
    ...options,
  });
  return job.id!;
}

export async function scheduleComplianceReport(
  data: GenerateComplianceReportJob,
  options?: JobsOptions
): Promise<string> {
  const job = await queues.compliance.add('generate-report', data, {
    priority: 2,
    ...options,
  });
  return job.id!;
}

export async function scheduleEmail(
  data: SendEmailJob,
  options?: JobsOptions
): Promise<string> {
  const job = await queues.email.add('send-email', data, {
    priority: 1,
    ...options,
  });
  return job.id!;
}

export async function scheduleCleanup(
  data: CleanupOldDataJob,
  options?: JobsOptions
): Promise<string> {
  const job = await queues.cleanup.add('cleanup', data, {
    priority: 5, // Low priority
    ...options,
  });
  return job.id!;
}

export async function scheduleAnalyticsAggregation(
  data: AggregateAnalyticsJob,
  options?: JobsOptions
): Promise<string> {
  const job = await queues.analytics.add('aggregate', data, {
    priority: 4,
    ...options,
  });
  return job.id!;
}

/**
 * Recurring jobs (scheduled)
 */

export async function setupRecurringJobs(): Promise<void> {
  // Daily cleanup (3 AM)
  await queues.cleanup.add(
    'daily-cleanup',
    {
      dataType: 'audit_logs',
      olderThan: new Date(Date.now() - 7 * 365 * 24 * 60 * 60 * 1000), // 7 years
    } as CleanupOldDataJob,
    {
      repeat: {
        pattern: '0 3 * * *', // Cron: 3 AM daily
      },
    }
  );

  // Session cleanup (hourly)
  await queues.cleanup.add(
    'session-cleanup',
    {
      dataType: 'sessions',
      olderThan: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days
    } as CleanupOldDataJob,
    {
      repeat: {
        pattern: '0 * * * *', // Cron: Every hour
      },
    }
  );

  // Daily analytics aggregation (2 AM)
  await queues.analytics.add(
    'daily-analytics',
    {
      tenantId: '*', // All tenants
      date: new Date().toISOString().split('T')[0],
      metrics: ['search', 'ai', 'documents'],
    } as AggregateAnalyticsJob,
    {
      repeat: {
        pattern: '0 2 * * *', // Cron: 2 AM daily
      },
    }
  );

  console.log('✅ Recurring jobs scheduled');
}

/**
 * Get job status
 */
export async function getJobStatus(queueName: string, jobId: string) {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    return null;
  }

  const state = await job.getState();
  const progress = job.progress;

  return {
    id: job.id,
    name: job.name,
    data: job.data,
    state,
    progress,
    attemptsMade: job.attemptsMade,
    failedReason: job.failedReason,
    finishedOn: job.finishedOn,
    processedOn: job.processedOn,
  };
}

/**
 * Retry failed job
 */
export async function retryJob(queueName: string, jobId: string): Promise<void> {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await job.retry();
}

/**
 * Remove job
 */
export async function removeJob(queueName: string, jobId: string): Promise<void> {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  const job = await queue.getJob(jobId);
  if (!job) {
    throw new Error(`Job ${jobId} not found`);
  }

  await job.remove();
}

/**
 * Get queue stats
 */
export async function getQueueStats(queueName: string) {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  const [waiting, active, completed, failed, delayed] = await Promise.all([
    queue.getWaitingCount(),
    queue.getActiveCount(),
    queue.getCompletedCount(),
    queue.getFailedCount(),
    queue.getDelayedCount(),
  ]);

  return {
    queue: queueName,
    waiting,
    active,
    completed,
    failed,
    delayed,
    total: waiting + active + completed + failed + delayed,
  };
}

/**
 * Pause queue
 */
export async function pauseQueue(queueName: string): Promise<void> {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  await queue.pause();
}

/**
 * Resume queue
 */
export async function resumeQueue(queueName: string): Promise<void> {
  const queue = queues[queueName as keyof typeof queues];
  if (!queue) {
    throw new Error(`Unknown queue: ${queueName}`);
  }

  await queue.resume();
}
