import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { FilmStatus } from '../../../film/domain/enums/film-status.enum';
import { FilmNotFoundException } from '../../../film/domain/exceptions/film-not-found.exception';
import { InvalidFilmStateException } from '../../../film/domain/exceptions/invalid-film-state.exception';
import { MediaFailedEvent } from '../../domain/events/media-failed.event';

@Injectable()
export class MediaFailedEventHandler {
  constructor(private readonly filmRepository: FilmRepository) {}

  @OnEvent('media.failed')
  async handle(event: MediaFailedEvent): Promise<void> {
    const film = await this.filmRepository.findById(event.filmId);
    if (!film) {
      throw new FilmNotFoundException(event.filmId);
    }
    if (film.status === FilmStatus.FAILED) {
      return;
    }
    if (film.status === FilmStatus.PUBLISHED) {
      throw new InvalidFilmStateException(
        `Published film ${film.id} cannot fail processing.`,
      );
    }

    film.fail();
    await this.filmRepository.save(film);
  }
}