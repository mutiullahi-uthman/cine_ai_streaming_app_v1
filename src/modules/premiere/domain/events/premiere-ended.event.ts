import { BaseDomainEvent } from '../../../../shared/events';

export class PremiereEndedEvent extends BaseDomainEvent {
  readonly eventName = 'premiere.ended';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    readonly filmId: string,
  ) {
    super(aggregateId, 'Premiere', aggregateVersion);
  }
}
