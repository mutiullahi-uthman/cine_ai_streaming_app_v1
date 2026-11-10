import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { FilmStatus } from '../../../film/domain/enums/film-status.enum';
import { FilmNotFoundException } from '../../../film/domain/exceptions/film-not-found.exception';
import { InvalidFilmStateException } from '../../../film/domain/exceptions/invalid-film-state.exception';
import { UploadCompletedEvent } from '../../domain/events/upload-completed.event';

@Injectable()
export class UploadCompletedEventHandler {
  constructor(
    private readonly filmRepository: FilmRepository,
  ) {}

  @OnEvent('upload.completed')
  async handle(
    event: UploadCompletedEvent,
  ): Promise<void> {
    const film = await this.filmRepository.findById(event.filmId);

    if (!film) {
      throw new FilmNotFoundException(event.filmId);
    }

    if (
      film.status === FilmStatus.PROCESSING ||
      film.status === FilmStatus.READY ||
      film.status === FilmStatus.PUBLISHED
    ) {
      return;
    }

    if (film.status !== FilmStatus.UPLOADING) {
      throw new InvalidFilmStateException(
        `Film ${film.id} cannot process a completed upload from ${film.status}.`,
      );
    }

    film.markProcessing();
    await this.filmRepository.save(film);
  }
}