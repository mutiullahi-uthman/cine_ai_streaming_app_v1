import { BaseDomainEvent } from '../../../../shared/events';

export class FilmProcessingEvent
  extends BaseDomainEvent
{
  readonly eventName = 'film.processing';

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