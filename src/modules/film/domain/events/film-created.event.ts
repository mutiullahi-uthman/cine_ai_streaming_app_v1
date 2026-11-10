import {
  BaseDomainEvent,
} from '../../../../shared/events';

export class FilmCreatedEvent
  extends BaseDomainEvent
{
  readonly eventName =
    'film.created';

  constructor(
    aggregateId: string,
    aggregateVersion: number,

    public readonly creatorId: string,
    public readonly title: string,
  ) {
    super(
      aggregateId,
      'Film',
      aggregateVersion,
    );
  }
}