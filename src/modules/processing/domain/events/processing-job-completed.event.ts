import { BaseDomainEvent } from '../../../../shared/events';

export class ProcessingJobCompletedEvent extends BaseDomainEvent {
  readonly eventName = 'processing.job.completed';

  constructor(aggregateId: string, aggregateVersion: number) {
    super(aggregateId, 'ProcessingJob', aggregateVersion);
  }
}