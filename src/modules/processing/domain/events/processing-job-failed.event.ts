import { BaseDomainEvent } from '../../../../shared/events';

export class ProcessingJobFailedEvent extends BaseDomainEvent {
  readonly eventName = 'processing.job.failed';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly errorMessage: string,
    public readonly attempts: number,
  ) {
    super(aggregateId, 'ProcessingJob', aggregateVersion);
  }
}