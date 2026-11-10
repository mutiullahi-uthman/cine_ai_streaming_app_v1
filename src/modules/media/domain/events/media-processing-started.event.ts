import { BaseDomainEvent } from '../../../../shared/events';

export class MediaProcessingStartedEvent extends BaseDomainEvent {
  readonly eventName = 'media.processing.started';

  constructor(aggregateId: string, aggregateVersion: number) {
    super(aggregateId, 'MediaAsset', aggregateVersion);
  }
}