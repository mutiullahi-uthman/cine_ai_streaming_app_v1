import {
  Injectable,
} from '@nestjs/common';
import { Inject } from '@nestjs/common';

import { STORAGE_PROVIDER } from '../../../../infrastructure/storage';
import type { StorageProvider } from '../../../../infrastructure/storage';

import { UploadSessionRepository } from '../../domain/repositories/upload-session.repository';
import { StructuredLogger } from '../../../../infrastructure/observability/structured-logger.service';

@Injectable()
export class UploadExpirationProcessor {
  private isRunning = false;

  constructor(
    private readonly uploadRepository: UploadSessionRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
    private readonly logger: StructuredLogger,
  ) {}

  async expirePendingUploads(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;

    try {
      const expiredUploads =
        await this.uploadRepository.findExpired(
          new Date(),
          100,
        );

      let failures = 0;
      for (const upload of expiredUploads) {
        try {
          await this.storageProvider.abortMultipartUpload(
            upload.storageUploadId,
            upload.objectKey,
          );

          upload.expire();
          await this.uploadRepository.save(upload);
          this.logger.info('Expired abandoned upload session.', {
            uploadSessionId: upload.id,
            filmId: upload.filmId,
          });
        } catch (error) {
          failures += 1;
          this.logger.error('Failed to expire upload session.', error, {
            uploadSessionId: upload.id,
            filmId: upload.filmId,
          });
        }
      }
      if (failures > 0) {
        throw new Error(`Failed to expire ${failures} upload sessions.`);
      }
    } catch (error) {
      this.logger.error('Upload expiration task failed.', error);
      throw error;
    } finally {
      this.isRunning = false;
    }
  }
}