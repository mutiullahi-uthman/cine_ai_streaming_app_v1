import { Injectable } from '@nestjs/common';

import { Film } from '../../domain/entities/film.entity';

import { FilmRepository } from '../../domain/repositories/film.repository';

@Injectable()
export class CreateFilmService {
  constructor(
    private readonly filmRepository: FilmRepository,
  ) {}

  async execute(params: {
    creatorId: string;
    title: string;
    synopsis: string;
    premiereAt?: Date | null;
  }): Promise<Film> {
    const film = Film.create({
      creatorId: params.creatorId,
      title: params.title,
      synopsis: params.synopsis,
      premiereAt: params.premiereAt,
    });

    await this.filmRepository.save(film);

    return film;
  }
}
