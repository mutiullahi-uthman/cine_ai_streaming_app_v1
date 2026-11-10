import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job, Queue } from 'bullmq';

import { DEAD_LETTER_QUEUE } from './queue.constants';

@Injectable()
export class DeadLetterQueue {
  constructor(
    @InjectQueue(DEAD_LETTER_QUEUE)
    private readonly queue: Queue,
  ) {}

  async recordFailure(
    sourceQueue: string,
    job: Job,
    error: Error,
  ): Promise<void> {
    const safeId = `${sourceQueue}-${job.id}-${job.attemptsMade}`
      .replace(/[^A-Za-z0-9_-]/g, '-')
      .slice(0, 200);
    await this.queue.add(
      'failed-job',
      {
        sourceQueue,
        sourceJobId: job.id,
        jobName: job.name,
        data: job.data,
        attemptsMade: job.attemptsMade,
        failedAt: new Date().toISOString(),
        reason: error.message.slice(0, 1000),
      },
      {
        jobId: `dead-${safeId}`,
        removeOnComplete: false,
        removeOnFail: false,
      },
    );
  }
}
