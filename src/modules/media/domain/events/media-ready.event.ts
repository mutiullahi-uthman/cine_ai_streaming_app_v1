import { BaseDomainEvent } from '../../../../shared/events';

export class MediaReadyEvent extends BaseDomainEvent {
  readonly eventName = 'media.ready';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly filmId: string,
  ) {
    super(aggregateId, 'MediaAsset', aggregateVersion);
  }
}