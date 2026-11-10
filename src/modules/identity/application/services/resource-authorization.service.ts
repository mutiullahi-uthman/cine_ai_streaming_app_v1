import {
  ForbiddenException,
  Injectable,
} from '@nestjs/common';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { FilmStatus } from '../../../film/domain/enums/film-status.enum';
import { FilmNotFoundException } from '../../../film/domain/exceptions/film-not-found.exception';
import { MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { ProcessingJobNotFoundException } from '../../../processing/domain/exceptions/processing-job-not-found.exception';
import { ProcessingJobRepository } from '../../../processing/domain/repositories/processing-job.repository';
import { UploadNotFoundException } from '../../../upload/domain/exceptions/upload-not-found.exception';
import { UploadSessionRepository } from '../../../upload/domain/repositories/upload-session.repository';
import { AuthenticatedUser } from '../../api/decorators/current-user.decorator';
import { UserRole } from '../../domain/enums/user-role.enum';

@Injectable()
export class ResourceAuthorizationService {
  constructor(
    private readonly filmRepository: FilmRepository,
    private readonly uploadRepository: UploadSessionRepository,
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly processingJobRepository: ProcessingJobRepository,
  ) {}

  async assertCanViewFilm(
    filmId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const film = await this.filmRepository.findById(filmId);
    if (!film) {
      throw new FilmNotFoundException(filmId);
    }

    if (
      user.role === UserRole.ADMIN ||
      (
        user.role === UserRole.CREATOR &&
        film.creatorId === user.id
      ) ||
      film.status === FilmStatus.READY ||
      film.status === FilmStatus.PUBLISHED
    ) {
      return;
    }

    throw new ForbiddenException('You cannot view this film.');
  }

  async assertOwnFilm(
    filmId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const film = await this.filmRepository.findById(filmId);
    if (!film) {
      throw new FilmNotFoundException(filmId);
    }
    if (
      user.role !== UserRole.ADMIN &&
      (
        user.role !== UserRole.CREATOR ||
        film.creatorId !== user.id
      )
    ) {
      throw new ForbiddenException('You do not own this film.');
    }
  }

  async assertOwnUpload(
    uploadId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    const upload = await this.uploadRepository.findById(uploadId);
    if (!upload) {
      throw new UploadNotFoundException(uploadId);
    }
    await this.assertOwnFilm(upload.filmId, user);
  }

  async assertOwnProcessingJob(
    jobId: string,
    user: AuthenticatedUser,
  ): Promise<void> {
    if (user.role === UserRole.ADMIN) {
      return;
    }
    const job = await this.processingJobRepository.findById(jobId);
    if (!job) {
      throw new ProcessingJobNotFoundException(jobId);
    }
    const asset = await this.mediaAssetRepository.findById(job.mediaAssetId);
    if (!asset) {
      throw new ProcessingJobNotFoundException(jobId);
    }
    await this.assertOwnFilm(asset.filmId, user);
  }
}
