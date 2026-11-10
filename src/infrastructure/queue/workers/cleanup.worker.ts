import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable, OnModuleInit } from '@nestjs/common';
import type { Job } from 'bullmq';

import { UploadExpirationProcessor } from '../../../modules/upload/application/services/upload-expiration.processor';
import { StructuredLogger } from '../../observability/structured-logger.service';
import { CleanupQueue } from '../queues/cleanup.queue';
import { DeadLetterQueue } from '../queues/dead-letter.queue';
import { CLEANUP_QUEUE, EXPIRE_UPLOADS_JOB } from '../queues/queue.constants';

@Injectable()
@Processor(CLEANUP_QUEUE, { concurrency: 1 })
export class CleanupWorker extends WorkerHost implements OnModuleInit {
  constructor(
    private readonly cleanupQueue: CleanupQueue,
    private readonly uploadExpiration: UploadExpirationProcessor,
    private readonly deadLetterQueue: DeadLetterQueue,
    private readonly logger: StructuredLogger,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.cleanupQueue.scheduleUploadExpiration();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== EXPIRE_UPLOADS_JOB) {
      throw new Error(`Unsupported cleanup queue job: ${job.name}.`);
    }
    await this.uploadExpiration.expirePendingUploads();
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) {
      return;
    }

    try {
      await this.deadLetterQueue.recordFailure(CLEANUP_QUEUE, job, error);
    } catch (deadLetterError) {
      this.logger.error(
        'Failed to record exhausted cleanup job in dead-letter queue.',
        deadLetterError,
        { cleanupQueueJobId: job.id },
      );
    }
  }
}
