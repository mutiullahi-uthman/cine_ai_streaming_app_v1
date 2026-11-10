import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { FilmPublishedEvent } from '../../../film/domain/events/film-published.event';
import { FilmReadyEvent } from '../../../film/domain/events/film-ready.event';
import { ProcessingJobFailedEvent } from '../../../processing/domain/events/processing-job-failed.event';
import { UploadExpiredEvent } from '../../../upload/domain/events/upload-expired.event';
import { NotificationQueue } from '../../../../infrastructure/queue/queues/notification.queue';

@Injectable()
export class WorkflowNotificationListener {
  constructor(
    private readonly notificationQueue: NotificationQueue,
  ) {}

  @OnEvent('film.ready')
  onFilmReady(event: FilmReadyEvent): Promise<void> {
    return this.enqueue(event);
  }

  @OnEvent('film.published')
  onFilmPublished(event: FilmPublishedEvent): Promise<void> {
    return this.enqueue(event);
  }

  @OnEvent('processing.job.failed')
  onProcessingFailed(event: ProcessingJobFailedEvent): Promise<void> {
    return this.enqueue(event);
  }

  @OnEvent('upload.expired')
  onUploadExpired(event: UploadExpiredEvent): Promise<void> {
    return this.enqueue(event);
  }

  private enqueue(
    event:
      | FilmReadyEvent
      | FilmPublishedEvent
      | ProcessingJobFailedEvent
      | UploadExpiredEvent,
  ): Promise<void> {
    return this.notificationQueue.enqueue({
      eventId: event.eventId,
      eventName: event.eventName,
      aggregateId: event.aggregateId,
    });
  }
}
