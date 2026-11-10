import {
  BaseDomainEvent,
} from '../../../../shared/events';

export class UploadFailedEvent
  extends BaseDomainEvent
{
  readonly eventName =
    'upload.failed';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
  ) {
    super(
      aggregateId,
      'UploadSession',
      aggregateVersion,
    );
  }
}