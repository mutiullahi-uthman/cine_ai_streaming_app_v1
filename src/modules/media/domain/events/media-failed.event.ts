import { BaseDomainEvent } from '../../../../shared/events';

export class MediaFailedEvent extends BaseDomainEvent {
  readonly eventName = 'media.failed';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly filmId: string,
  ) {
    super(aggregateId, 'MediaAsset', aggregateVersion);
  }
}