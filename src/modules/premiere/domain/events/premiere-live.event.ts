import { BaseDomainEvent } from '../../../../shared/events';

export class PremiereLiveEvent extends BaseDomainEvent {
  readonly eventName = 'premiere.live';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
    readonly filmId: string,
  ) {
    super(aggregateId, 'Premiere', aggregateVersion);
  }
}
