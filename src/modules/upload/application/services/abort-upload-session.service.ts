import {
  Inject,
  Injectable,
} from '@nestjs/common';

import { STORAGE_PROVIDER } from '../../../../infrastructure/storage';
import type { StorageProvider } from '../../../../infrastructure/storage';

import { UploadNotFoundException } from '../../domain/exceptions/upload-not-found.exception';
import { InvalidUploadStateException } from '../../domain/exceptions/invalid-upload-state.exception';
import { UploadSessionRepository } from '../../domain/repositories/upload-session.repository';
import { UploadStatus } from '../../domain/enums/upload-status.enum';

@Injectable()
export class AbortUploadSessionService {
  constructor(
    private readonly uploadRepository: UploadSessionRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async execute(uploadId: string): Promise<void> {
    const upload = await this.uploadRepository.findById(uploadId);

    if (!upload) {
      throw new UploadNotFoundException(uploadId);
    }

    if (
      upload.status === UploadStatus.FAILED ||
      upload.status === UploadStatus.EXPIRED
    ) {
      return;
    }

    if (upload.status !== UploadStatus.UPLOADING) {
      throw new InvalidUploadStateException(
        upload.id,
        upload.status,
        UploadStatus.FAILED,
      );
    }

    await this.storageProvider.abortMultipartUpload(
      upload.storageUploadId,
      upload.objectKey,
    );

    upload.fail();
    await this.uploadRepository.save(upload);
  }
}