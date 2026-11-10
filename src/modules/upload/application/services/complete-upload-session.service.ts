import {
  Inject,
  Injectable,
} from '@nestjs/common';

import {
  STORAGE_PROVIDER,
} from '../../../../infrastructure/storage';

import type {
  StorageProvider,
} from '../../../../infrastructure/storage';

import { UploadSessionRepository } from '../../domain/repositories/upload-session.repository';

import { UploadNotFoundException } from '../../domain/exceptions/upload-not-found.exception';

import { UploadExpiredException } from '../../domain/exceptions/upload-expired.exception';

import { UploadIntegrityCheckFailedException } from '../../domain/exceptions/upload-integrity-check-failed.exception';

import { CompleteUploadSessionCommand } from '../commands/complete-upload-session.command';

import { CompleteUploadSessionResult } from '../contracts/complete-upload-session-result';

@Injectable()
export class CompleteUploadSessionService {
  constructor(
    private readonly uploadRepository: UploadSessionRepository,

    @Inject(STORAGE_PROVIDER)
    private readonly storageProvider: StorageProvider,
  ) {}

  async execute(
    command: CompleteUploadSessionCommand,
  ): Promise<CompleteUploadSessionResult> {
    const uploadSession =
      await this.uploadRepository.findById(
        command.uploadSessionId,
      );

    if (!uploadSession) {
      throw new UploadNotFoundException(
        command.uploadSessionId,
      );
    }

    const now = new Date();

    if (
      uploadSession.expiresAt.getTime() <
      now.getTime()
    ) {
      uploadSession.expire();

      await this.uploadRepository.save(
        uploadSession,
      );

      throw new UploadExpiredException(
        uploadSession.id,
      );
    }

    await this.storageProvider.completeMultipartUpload(
      uploadSession.storageUploadId,
      uploadSession.objectKey,
      command.completedParts,
    );

    const objectExists =
      await this.storageProvider.objectExists(
        uploadSession.objectKey,
      );

    if (!objectExists) {
      throw new UploadIntegrityCheckFailedException(
        uploadSession.id,
      );
    }

    const metadata =
      await this.storageProvider.getObjectMetadata(
        uploadSession.objectKey,
      );

    if (!metadata) {
      throw new UploadIntegrityCheckFailedException(
        uploadSession.id,
      );
    }

    const actualSize =
      BigInt(metadata.size);

    if (
      actualSize !==
      uploadSession.expectedSize
    ) {
      throw new UploadIntegrityCheckFailedException(
        uploadSession.id,
      );
    }

    uploadSession.complete({
      sizeBytes: actualSize,
      etag: metadata.etag,
      contentType: metadata.contentType ?? null,
    });

    await this.uploadRepository.save(
      uploadSession,
    );

    return {
      uploadSessionId:
        uploadSession.id,

      filmId:
        uploadSession.filmId,

      objectKey:
        uploadSession.objectKey,

      size:
        metadata.size,

      etag:
        metadata.etag,
    };
  }
}