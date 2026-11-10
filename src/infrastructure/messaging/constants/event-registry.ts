import { DomainEvent } from '../../../shared/events';
import {
  FilmCreatedEvent,
  FilmFailedEvent,
  FilmProcessingEvent,
  FilmPublishedEvent,
  FilmReadyEvent,
  FilmUploadingEvent,
} from '../../../modules/film/domain/events';
import {
  UploadCompletedEvent,
  UploadExpiredEvent,
  UploadFailedEvent,
  UploadSessionCreatedEvent,
  UploadStartedEvent,
} from '../../../modules/upload/domain/events';

import { OutboxEventRecord } from '../outbox.repository';

type EventFactory = (
  record: OutboxEventRecord,
  payload: Record<string, unknown>,
) => DomainEvent;

function requiredString(
  payload: Record<string, unknown>,
  key: string,
): string {
  const value = payload[key];

  if (typeof value !== 'string') {
    throw new Error(`Invalid outbox payload field: ${key}`);
  }

  return value;
}
import {
  MediaAssetCreatedEvent,
  MediaFailedEvent,
  MediaProcessingStartedEvent,
  MediaReadyEvent,
} from '../../../modules/media/domain/events';
import {
  ProcessingJobCompletedEvent,
  ProcessingJobCreatedEvent,
  ProcessingJobFailedEvent,
  ProcessingJobRetryScheduledEvent,
  ProcessingJobStartedEvent,
  ProcessingStepStartedEvent,
} from '../../../modules/processing/domain/events';
import { StreamingAssetReadyEvent } from '../../../modules/streaming/domain/events';
import { ProcessingStep } from '../../../modules/processing/domain/enums/processing-step.enum';

function requiredBigInt(
  payload: Record<string, unknown>,
  key: string,
): bigint {
  const value = payload[key];

  if (
    typeof value !== 'number' &&
    typeof value !== 'string'
  ) {
    throw new Error(`Invalid outbox payload field: ${key}`);
  }

  if (
    typeof value === 'number' &&
    !Number.isSafeInteger(value)
  ) {
    throw new Error(`Invalid outbox payload field: ${key}`);
  }

  try {
    return BigInt(value);
  } catch {
    throw new Error(`Invalid outbox payload field: ${key}`);
  }
}
  function requiredNumber(
    payload: Record<string, unknown>,
    key: string,
  ): number {
    const value = payload[key];
    if (typeof value !== 'number' || !Number.isSafeInteger(value)) {
      throw new Error(`Invalid outbox payload field: ${key}`);
    }
    return value;
  }

export const EVENT_REGISTRY: Readonly<
  Record<string, EventFactory>
> = {
  'film.created': (record, payload) =>
    new FilmCreatedEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'creatorId'),
      requiredString(payload, 'title'),
    ),
  'film.uploading': (record) =>
    new FilmUploadingEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'film.processing': (record) =>
    new FilmProcessingEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'film.ready': (record) =>
    new FilmReadyEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'film.failed': (record) =>
    new FilmFailedEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'film.published': (record) =>
    new FilmPublishedEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'upload.completed': (record, payload) =>
    new UploadCompletedEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'filmId'),
      requiredString(payload, 'objectKey'),
      requiredString(payload, 'storageUploadId'),
      requiredBigInt(payload, 'sizeBytes'),
      payload.contentType === null
        ? null
        : requiredString(payload, 'contentType'),
      requiredString(payload, 'etag'),
    ),
  'upload.session.created': (record, payload) =>
    new UploadSessionCreatedEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'filmId'),
      requiredString(payload, 'objectKey'),
    ),
  'upload.started': (record) =>
    new UploadStartedEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'upload.failed': (record) =>
    new UploadFailedEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'upload.expired': (record) =>
    new UploadExpiredEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'media.asset.created': (record, payload) =>
    new MediaAssetCreatedEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'filmId'),
      requiredString(payload, 'objectKey'),
      requiredString(payload, 'etag'),
      requiredBigInt(payload, 'sizeBytes'),
      payload.contentType === null
        ? null
        : requiredString(payload, 'contentType'),
    ),
  'media.processing.started': (record) =>
    new MediaProcessingStartedEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'media.ready': (record, payload) =>
    new MediaReadyEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'filmId'),
    ),
  'media.failed': (record, payload) =>
    new MediaFailedEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'filmId'),
    ),
  'processing.job.created': (record, payload) =>
    new ProcessingJobCreatedEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'mediaAssetId'),
    ),
  'processing.job.started': (record) =>
    new ProcessingJobStartedEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'processing.step.started': (record, payload) =>
    new ProcessingStepStartedEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'step') as ProcessingStep,
    ),
  'processing.job.retry_scheduled': (record, payload) =>
    new ProcessingJobRetryScheduledEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'errorMessage'),
      requiredNumber(payload, 'attempts'),
    ),
  'processing.job.failed': (record, payload) =>
    new ProcessingJobFailedEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'errorMessage'),
      requiredNumber(payload, 'attempts'),
    ),
  'processing.job.completed': (record) =>
    new ProcessingJobCompletedEvent(
      record.aggregateId,
      record.aggregateVersion,
    ),
  'streaming.asset.ready': (record, payload) =>
    new StreamingAssetReadyEvent(
      record.aggregateId,
      record.aggregateVersion,
      requiredString(payload, 'filmId'),
    ),
};