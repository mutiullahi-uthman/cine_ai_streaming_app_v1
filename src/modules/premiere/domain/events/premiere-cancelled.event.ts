import { BaseDomainEvent } from '../../../../shared/events';

export class PremiereCancelledEvent extends BaseDomainEvent {
  readonly eventName = 'premiere.cancelled';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    readonly filmId: string,
  ) {
    super(aggregateId, 'Premiere', aggregateVersion);
  }
}
