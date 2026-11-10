import { BaseDomainEvent } from '../../../../shared/events';

export class ProcessingJobCreatedEvent extends BaseDomainEvent {
  readonly eventName = 'processing.job.created';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly mediaAssetId: string,
  ) {
    super(aggregateId, 'ProcessingJob', aggregateVersion);
  }
}