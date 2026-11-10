import {
  BaseDomainEvent,
} from '../../../../shared/events';

export class UploadSessionCreatedEvent
  extends BaseDomainEvent
{
  readonly eventName =
    'upload.session.created';

  constructor(
    aggregateId: string,
    aggregateVersion: number,

    public readonly filmId: string,
    public readonly objectKey: string,
  ) {
    super(
      aggregateId,
      'UploadSession',
      aggregateVersion,
    );
  }
}