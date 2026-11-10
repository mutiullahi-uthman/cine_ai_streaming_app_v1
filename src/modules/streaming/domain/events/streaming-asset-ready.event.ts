import { BaseDomainEvent } from '../../../../shared/events';

export class StreamingAssetReadyEvent extends BaseDomainEvent {
  readonly eventName = 'streaming.asset.ready';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    readonly filmId: string,
  ) {
    super(aggregateId, 'StreamingAsset', aggregateVersion);
  }
}
