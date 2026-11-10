import {
  BaseDomainEvent,
} from '../../../../shared/events';

export class UploadStartedEvent
  extends BaseDomainEvent
{
  readonly eventName =
    'upload.started';

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