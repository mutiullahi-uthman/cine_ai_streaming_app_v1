import { Injectable } from '@nestjs/common';

import { Film } from '../../domain/entities/film.entity';
import { FilmNotFoundException } from '../../domain/exceptions/film-not-found.exception';
import { FilmRepository } from '../../domain/repositories/film.repository';

@Injectable()
export class GetFilmService {
  constructor(
    private readonly filmRepository: FilmRepository,
  ) {}

  async execute(filmId: string): Promise<Film> {
    const film = await this.filmRepository.findById(filmId);

    if (!film) {
      throw new FilmNotFoundException(filmId);
    }

    return film;
  }
}