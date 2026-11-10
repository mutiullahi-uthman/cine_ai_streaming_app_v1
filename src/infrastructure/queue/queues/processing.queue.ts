import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import {
  PROCESSING_QUEUE,
  PROCESS_MEDIA_ASSET_JOB,
  RECOVER_STUCK_JOBS_JOB,
  SCAN_PENDING_JOBS_JOB,
} from './queue.constants';

@Injectable()
export class ProcessingQueue {
  constructor(
    @InjectQueue(PROCESSING_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueue(
    processingJobId: string,
    attempt: number,
    delay = 0,
  ): Promise<void> {
    await this.queue.add(
      PROCESS_MEDIA_ASSET_JOB,
      { processingJobId, attempt },
      {
        jobId: `process-${processingJobId}-attempt-${attempt}`,
        delay,
        attempts: 3,
        backoff: { type: 'exponential', delay: 5000 },
        removeOnComplete: { count: 1000 },
        removeOnFail: false,
      },
    );
  }

  async scheduleMaintenance(): Promise<void> {
    await this.queue.upsertJobScheduler(
      SCAN_PENDING_JOBS_JOB,
      { every: 30_000 },
      {
        name: SCAN_PENDING_JOBS_JOB,
        data: {},
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: false,
        },
      },
    );
    await this.queue.upsertJobScheduler(
      RECOVER_STUCK_JOBS_JOB,
      { every: 5 * 60_000 },
      {
        name: RECOVER_STUCK_JOBS_JOB,
        data: {},
        opts: {
          attempts: 3,
          backoff: { type: 'exponential', delay: 5000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: false,
        },
      },
    );
  }
}
