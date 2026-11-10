import { OnWorkerEvent, Processor, WorkerHost } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Job } from 'bullmq';

import { SendWorkflowNotificationService } from '../../../modules/notification/application/services/send-workflow-notification.service';
import { StructuredLogger } from '../../observability/structured-logger.service';
import { DeadLetterQueue } from '../queues/dead-letter.queue';
import { NOTIFICATION_QUEUE, SEND_NOTIFICATION_JOB } from '../queues/queue.constants';

interface NotificationPayload {
  eventId: string;
  eventName: string;
  aggregateId: string;
}

@Injectable()
@Processor(NOTIFICATION_QUEUE, { concurrency: 5 })
export class NotificationWorker extends WorkerHost {
  constructor(
    private readonly notifications: SendWorkflowNotificationService,
    private readonly deadLetterQueue: DeadLetterQueue,
    private readonly logger: StructuredLogger,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    if (job.name !== SEND_NOTIFICATION_JOB) {
      throw new Error(`Unsupported notification queue job: ${job.name}.`);
    }

    const payload = this.readPayload(job.data);
    switch (payload.eventName) {
      case 'film.ready':
        await this.notifications.sendForFilm(payload.aggregateId, 'film-ready');
        return;
      case 'film.published':
        await this.notifications.sendForFilm(
          payload.aggregateId,
          'film-published',
        );
        return;
      case 'processing.job.failed':
        await this.notifications.sendProcessingFailure(payload.aggregateId);
        return;
      case 'upload.expired':
        await this.notifications.sendUploadExpired(payload.aggregateId);
        return;
      default:
        throw new Error(
          `Unsupported notification event: ${payload.eventName}.`,
        );
    }
  }

  @OnWorkerEvent('failed')
  async onFailed(job: Job | undefined, error: Error): Promise<void> {
    if (!job || job.attemptsMade < (job.opts.attempts ?? 1)) {
      return;
    }

    try {
      await this.deadLetterQueue.recordFailure(NOTIFICATION_QUEUE, job, error);
    } catch (deadLetterError) {
      this.logger.error(
        'Failed to record exhausted notification in dead-letter queue.',
        deadLetterError,
        { notificationQueueJobId: job.id },
      );
    }
  }

  private readPayload(data: unknown): NotificationPayload {
    if (
      typeof data !== 'object' ||
      data === null ||
      !('eventId' in data) ||
      typeof data.eventId !== 'string' ||
      !('eventName' in data) ||
      typeof data.eventName !== 'string' ||
      !('aggregateId' in data) ||
      typeof data.aggregateId !== 'string'
    ) {
      throw new Error('Invalid notification queue job payload.');
    }

    return {
      eventId: data.eventId,
      eventName: data.eventName,
      aggregateId: data.aggregateId,
    };
  }
}
