import { Premiere } from '../entities/premiere.entity';

export abstract class PremiereRepository {
  abstract save(premiere: Premiere): Promise<void>;

  abstract findById(id: string): Promise<Premiere | null>;

  abstract findByFilmId(filmId: string): Promise<Premiere | null>;

  abstract findScheduledStartingBefore(
    startsBefore: Date,
    limit: number,
  ): Promise<Premiere[]>;
}
