import { BaseDomainEvent } from '../../../../shared/events';

export class MediaAssetCreatedEvent extends BaseDomainEvent {
  readonly eventName = 'media.asset.created';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly filmId: string,
    public readonly objectKey: string,
    public readonly etag: string,
    public readonly sizeBytes: bigint,
    public readonly contentType: string | null,
  ) {
    super(aggregateId, 'MediaAsset', aggregateVersion);
  }
}