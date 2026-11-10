import { UploadSession } from '../entities/upload-session.entity';

export abstract class UploadSessionRepository {
  abstract save(
    upload: UploadSession,
  ): Promise<void>;

  abstract findById(
    id: string,
  ): Promise<UploadSession | null>;

  abstract findActiveByFilmId(
    filmId: string,
  ): Promise<UploadSession | null>;

  abstract findByFilmId(
    filmId: string,
  ): Promise<UploadSession[]>;

  abstract findExpired(
    now: Date,
    limit: number,
  ): Promise<UploadSession[]>;
}