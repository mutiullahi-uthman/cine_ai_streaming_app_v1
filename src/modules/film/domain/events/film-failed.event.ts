import { BaseDomainEvent } from '../../../../shared/events';

export class FilmFailedEvent
  extends BaseDomainEvent
{
  readonly eventName = 'film.failed';

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