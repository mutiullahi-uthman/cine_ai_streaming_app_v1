import { Injectable } from '@nestjs/common';

import { FilmNotFoundException } from '../../domain/exceptions/film-not-found.exception';
import { FilmRepository } from '../../domain/repositories/film.repository';

@Injectable()
export class FailFilmService {
  constructor(
    private readonly filmRepository: FilmRepository,
  ) {}

  async execute(filmId: string): Promise<void> {
    const film = await this.filmRepository.findById(filmId);

    if (!film) {
      throw new FilmNotFoundException(filmId);
    }

    film.fail();
    await this.filmRepository.save(film);
  }
}