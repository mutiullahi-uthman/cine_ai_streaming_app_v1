import { BaseDomainEvent } from '../../../../shared/events';

export class ProcessingJobRetryScheduledEvent extends BaseDomainEvent {
  readonly eventName = 'processing.job.retry_scheduled';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly errorMessage: string,
    public readonly attempts: number,
  ) {
    super(aggregateId, 'ProcessingJob', aggregateVersion);
  }
}