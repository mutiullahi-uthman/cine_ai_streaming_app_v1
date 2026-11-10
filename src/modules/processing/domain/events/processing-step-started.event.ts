import { BaseDomainEvent } from '../../../../shared/events';
import { ProcessingStep } from '../enums/processing-step.enum';

export class ProcessingStepStartedEvent extends BaseDomainEvent {
  readonly eventName = 'processing.step.started';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    public readonly step: ProcessingStep,
  ) {
    super(aggregateId, 'ProcessingJob', aggregateVersion);
  }
}