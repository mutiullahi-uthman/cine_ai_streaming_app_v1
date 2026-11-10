import { BaseDomainEvent } from '../../../../shared/events';

export class FilmPublishedEvent
  extends BaseDomainEvent
{
  readonly eventName = 'film.published';

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