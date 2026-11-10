import { BaseDomainEvent } from '../../../../shared/events';

export class FilmUploadingEvent
  extends BaseDomainEvent
{
  readonly eventName = 'film.uploading';

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