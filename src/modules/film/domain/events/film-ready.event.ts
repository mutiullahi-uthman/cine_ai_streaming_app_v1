import { BaseDomainEvent } from '../../../../shared/events';

export class FilmReadyEvent
  extends BaseDomainEvent
{
  readonly eventName = 'film.ready';

  constructor(
    aggregateId: string,
    aggregateVersion: number,
  ) {
    super(
      aggregateId,
      'Film',
      aggregateVersion,
    );
  }
}