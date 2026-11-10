import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { FilmStatus } from '../../../film/domain/enums/film-status.enum';
import { FilmNotFoundException } from '../../../film/domain/exceptions/film-not-found.exception';
import { InvalidFilmStateException } from '../../../film/domain/exceptions/invalid-film-state.exception';
import { PremiereLiveEvent } from '../../domain/events/premiere-live.event';

@Injectable()
export class PremiereLiveEventHandler {
  constructor(private readonly filmRepository: FilmRepository) {}

  @OnEvent('premiere.live')
  async handle(event: PremiereLiveEvent): Promise<void> {
    const film = await this.filmRepository.findById(event.filmId);
    if (!film) {
      throw new FilmNotFoundException(event.filmId);
    }
    if (film.status === FilmStatus.PUBLISHED) {
      return;
    }
    if (film.status !== FilmStatus.READY) {
      throw new InvalidFilmStateException(
        `Film ${film.id} cannot be published from ${film.status} when its premiere goes live.`,
      );
    }

    film.publish();
    await this.filmRepository.save(film);
  }
}
