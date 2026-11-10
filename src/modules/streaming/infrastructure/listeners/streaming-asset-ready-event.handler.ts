import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { FilmStatus } from '../../../film/domain/enums/film-status.enum';
import { FilmNotFoundException } from '../../../film/domain/exceptions/film-not-found.exception';
import { InvalidFilmStateException } from '../../../film/domain/exceptions/invalid-film-state.exception';
import { StreamingAssetReadyEvent } from '../../domain/events/streaming-asset-ready.event';

@Injectable()
export class StreamingAssetReadyEventHandler {
  constructor(private readonly filmRepository: FilmRepository) {}

  @OnEvent('streaming.asset.ready')
  async handle(event: StreamingAssetReadyEvent): Promise<void> {
    const film = await this.filmRepository.findById(event.filmId);
    if (!film) {
      throw new FilmNotFoundException(event.filmId);
    }

    if (
      film.status === FilmStatus.READY ||
      film.status === FilmStatus.PUBLISHED
    ) {
      return;
    }
    if (film.status !== FilmStatus.PROCESSING) {
      throw new InvalidFilmStateException(
        `Film ${film.id} cannot become ready from ${film.status}.`,
      );
    }

    film.markReady();
    await this.filmRepository.save(film);
  }
}
