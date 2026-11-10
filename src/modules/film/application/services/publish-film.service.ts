import { Injectable } from '@nestjs/common';

import { FilmNotFoundException } from '../../domain/exceptions/film-not-found.exception';
import { FilmRepository } from '../../domain/repositories/film.repository';

@Injectable()
export class PublishFilmService {
  constructor(
    private readonly filmRepository: FilmRepository,
  ) {}

  async execute(filmId: string): Promise<void> {
    const film = await this.filmRepository.findById(filmId);

    if (!film) {
      throw new FilmNotFoundException(filmId);
    }

    film.publish();
    await this.filmRepository.save(film);
  }
}