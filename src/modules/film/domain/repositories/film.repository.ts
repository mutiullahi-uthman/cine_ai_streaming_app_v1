import { Film } from '../entities/film.entity';

export abstract class FilmRepository {
  abstract save(
    film: Film,
  ): Promise<void>;

  abstract findById(
    id: string,
  ): Promise<Film | null>;

  abstract findAll(): Promise<Film[]>;
}