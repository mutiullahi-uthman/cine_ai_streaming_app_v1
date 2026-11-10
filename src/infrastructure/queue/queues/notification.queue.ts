import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

import { NOTIFICATION_QUEUE, SEND_NOTIFICATION_JOB } from './queue.constants';

export interface NotificationQueuePayload {
  eventId: string;
  eventName: string;
  aggregateId: string;
}

@Injectable()
export class NotificationQueue {
  constructor(
    @InjectQueue(NOTIFICATION_QUEUE)
    private readonly queue: Queue,
  ) {}

  async enqueue(payload: NotificationQueuePayload): Promise<void> {
    await this.queue.add(SEND_NOTIFICATION_JOB, payload, {
      jobId: `notify-${payload.eventId}`,
      attempts: 5,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: { count: 1000 },
      removeOnFail: false,
    });
  }
}
