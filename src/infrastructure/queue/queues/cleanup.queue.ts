import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { CLEANUP_QUEUE, EXPIRE_UPLOADS_JOB } from './queue.constants';

@Injectable()
export class CleanupQueue {
  constructor(
    @InjectQueue(CLEANUP_QUEUE)
    private readonly queue: Queue,
  ) {}

  async scheduleUploadExpiration(): Promise<void> {
    await this.queue.upsertJobScheduler(
      EXPIRE_UPLOADS_JOB,
      { every: 15 * 60_000 },
      {
        name: EXPIRE_UPLOADS_JOB,
        data: {},
        opts: {
          attempts: 4,
          backoff: { type: 'exponential', delay: 10_000 },
          removeOnComplete: { count: 1000 },
          removeOnFail: false,
        },
      },
    );
  }
}
