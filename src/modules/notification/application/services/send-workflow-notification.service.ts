import { Injectable } from '@nestjs/common';
import { Inject } from '@nestjs/common';

import { FilmRepository } from '../../../film/domain/repositories/film.repository';
import { UserRepository } from '../../../identity/domain/repositories/user.repository';
import { MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { ProcessingJobRepository } from '../../../processing/domain/repositories/processing-job.repository';
import { UploadSessionRepository } from '../../../upload/domain/repositories/upload-session.repository';
import { StructuredLogger } from '../../../../infrastructure/observability/structured-logger.service';
import {
  EmailProvider,
  EMAIL_PROVIDER,
} from '../../email/email-provider.interface';
import {
  createWorkflowNotification,
  WorkflowNotificationType,
} from '../../email/templates/workflow-notification.template';

@Injectable()
export class SendWorkflowNotificationService {
  constructor(
    private readonly filmRepository: FilmRepository,
    private readonly uploadRepository: UploadSessionRepository,
    private readonly processingJobRepository: ProcessingJobRepository,
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly userRepository: UserRepository,
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
    private readonly logger: StructuredLogger,
  ) {}

  async sendForFilm(
    filmId: string,
    type: WorkflowNotificationType,
  ): Promise<void> {
    const film = await this.filmRepository.findById(filmId);
    if (!film) {
      this.logger.warn('Skipped creator email for a missing film.', {
        filmId,
        notificationType: type,
      });
      return;
    }

    const creator = await this.userRepository.findById(film.creatorId);
    if (!creator) {
      this.logger.warn('Skipped creator email because the creator account was not found.', {
        filmId,
        creatorId: film.creatorId,
        notificationType: type,
      });
      return;
    }

    const message = createWorkflowNotification({
      type,
      filmTitle: film.title,
    });
    await this.emailProvider.send({
      to: creator.email,
      ...message,
    });
    this.logger.info('Sent creator workflow notification.', {
      filmId,
      creatorId: creator.id,
      notificationType: type,
    });
  }

  async sendProcessingFailure(jobId: string): Promise<void> {
    const job = await this.processingJobRepository.findById(jobId);
    if (!job) {
      this.logger.warn('Skipped processing failure email for a missing job.', {
        processingJobId: jobId,
      });
      return;
    }
    const asset = await this.mediaAssetRepository.findById(job.mediaAssetId);
    if (!asset) {
      this.logger.warn('Skipped processing failure email for a missing media asset.', {
        processingJobId: jobId,
        mediaAssetId: job.mediaAssetId,
      });
      return;
    }
    await this.sendForFilm(asset.filmId, 'processing-failed');
  }

  async sendUploadExpired(uploadId: string): Promise<void> {
    const upload = await this.uploadRepository.findById(uploadId);
    if (!upload) {
      this.logger.warn('Skipped upload expiration email for a missing upload.', {
        uploadSessionId: uploadId,
      });
      return;
    }
    await this.sendForFilm(upload.filmId, 'upload-expired');
  }
}
