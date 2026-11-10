import {
  BaseDomainEvent,
} from '../../../../shared/events';

export class UploadCompletedEvent
  extends BaseDomainEvent
{
  readonly eventName =
    'upload.completed';

  constructor(
    aggregateId: string,
    aggregateVersion: number,

    public readonly filmId: string,

    public readonly objectKey: string,

    public readonly storageUploadId: string,

    public readonly sizeBytes: bigint,

    public readonly contentType: string | null,

    public readonly etag: string,
  ) {
    super(
      aggregateId,
      'UploadSession',
      aggregateVersion,
    );
  }
}