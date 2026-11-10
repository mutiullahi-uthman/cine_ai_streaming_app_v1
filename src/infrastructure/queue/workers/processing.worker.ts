import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Job } from 'bullmq';

import { StructuredLogger } from '../../observability/structured-logger.service';
import { ProcessingJobRepository } from '../../../modules/processing/domain/repositories/processing-job.repository';
import { ProcessingStatus } from '../../../modules/processing/domain/enums/processing-status.enum';
import { ProcessMediaAssetService } from '../../../modules/processing/application/services/process-media-asset.service';
import { ProcessingRetryProcessor } from '../../../modules/processing/application/services/processing-retry.processor';
import { DeadLetterQueue } from '../queues/dead-letter.queue';
import {
  PROCESSING_QUEUE,
  PROCESS_MEDIA_ASSET_JOB,
  RECOVER_STUCK_JOBS_JOB,
  SCAN_PENDING_JOBS_JOB,
} from '../queues/queue.constants';
import { ProcessingQueue } from '../queues/processing.queue';

interface ProcessMediaAssetData {
  processingJobId: string;
  attempt: number;
}

@Injectable()
@Processor(PROCESSING_QUEUE, { concurrency: 1 })
export class ProcessingWorker extends WorkerHost implements OnModuleInit {
  constructor(
    private readonly processingJobs: ProcessingJobRepository,
    private readonly processMediaAsset: ProcessMediaAssetService,
    private readonly retryProcessor: ProcessingRetryProcessor,
    private readonly processingQueue: ProcessingQueue,
    private readonly deadLetterQueue: DeadLetterQueue,
    private readonly logger: StructuredLogger,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.processingQueue.scheduleMaintenance();
  }

  async process(job: Job): Promise<void> {
    if (job.name === SCAN_PENDING_JOBS_JOB) {
      await this.retryProcessor.retryPending();
      return;
    }
    if (job.name === RECOVER_STUCK_JOBS_JOB) {
      await this.retryProcessor.recoverStuckProcessingJobs();
      return;
    }
    if (job.name !== PROCESS_MEDIA_ASSET_JOB) {
      throw new Error(`Unsupported processing queue job: ${job.name}.`);
    }

    const data = this.readProcessData(job.data);
    await this.processMediaAsset.execute(data.processingJobId);

    const persistedJob = await this.processingJobs.findById(
      data.processingJobId,
    );
    if (persistedJob?.status === ProcessingStatus.PENDING) {
      const nextAttempt = persistedJob.attempts + 1;
      const delay = Math.min(
        5000 * 2 ** Math.max(0, persistedJob.attempts - 1),
        5 * 60_000,
      );
      await this.processingQueue.enqueue(
        persistedJob.id,
        nextAttempt,
        delay,
      );
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) {
      return;
    }

    try {
      await this.deadLetterQueue.recordFailure(PROCESSING_QUEUE, job, error);
      if (job.name === PROCESS_MEDIA_ASSET_JOB) {
        const data = this.readProcessData(job.data);
        const persistedJob = await this.processingJobs.findById(
          data.processingJobId,
        );
        if (persistedJob?.status === ProcessingStatus.PENDING) {
          await job.remove();
        }
      }
    } catch (deadLetterError) {
      this.logger.error(
        'Failed to record exhausted processing job in dead-letter queue.',
        deadLetterError,
        { processingQueueJobId: job.id, processingJobId: job.data?.processingJobId },
      );
    }
  }

  private readProcessData(data: unknown): ProcessMediaAssetData {
    if (
      typeof data !== 'object' ||
      data === null ||
      !('processingJobId' in data) ||
      typeof data.processingJobId !== 'string' ||
      !('attempt' in data) ||
      typeof data.attempt !== 'number'
    ) {
      throw new Error('Invalid processing queue job payload.');
    }

    return {
      processingJobId: data.processingJobId,
      attempt: data.attempt,
    };
  }
}
