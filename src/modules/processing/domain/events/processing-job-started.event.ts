import { BaseDomainEvent } from '../../../../shared/events';

export class ProcessingJobStartedEvent extends BaseDomainEvent {
  readonly eventName = 'processing.job.started';

  constructor(aggregateId: string, aggregateVersion: number) {
    super(aggregateId, 'ProcessingJob', aggregateVersion);
  }
}