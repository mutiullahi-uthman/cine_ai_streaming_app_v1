import {
  Film as PrismaFilm,
  FilmStatus as PrismaFilmStatus,
} from '@prisma/client';

import { Film } from '../../domain/entities/film.entity';
import { FilmStatus } from '../../domain/enums/film-status.enum';

export class FilmMapper {
  static toPersistence(
    film: Film,
  ): PrismaFilm {
    return {
      id: film.id,
      creatorId: film.creatorId,

      title: film.title,
      synopsis: film.synopsis,

      premiereAt: film.premiereAt,

      status:
        film.status as unknown as PrismaFilmStatus,

      version: film.getVersion(),

      createdAt: film.createdAt,
      updatedAt: film.updatedAt,
    };
  }

  static toDomain(
    raw: PrismaFilm,
  ): Film {
    return Film.rehydrate({
      id: raw.id,
      creatorId: raw.creatorId,

      title: raw.title,
      synopsis: raw.synopsis,

      premiereAt: raw.premiereAt,

      status: raw.status as FilmStatus,

      version: raw.version,

      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }
}