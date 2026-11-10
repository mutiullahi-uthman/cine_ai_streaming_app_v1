import {
  BaseDomainEvent,
} from '../../../../shared/events';

export class UploadExpiredEvent
  extends BaseDomainEvent
{
  readonly eventName =
    'upload.expired';

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