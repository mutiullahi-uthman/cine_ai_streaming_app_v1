import { BaseDomainEvent } from '../../../../shared/events';

export class PremiereScheduledEvent extends BaseDomainEvent {
  readonly eventName = 'premiere.scheduled';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    readonly filmId: string,
    readonly startsAt: Date,
  ) {
    super(aggregateId, 'Premiere', aggregateVersion);
  }
}
