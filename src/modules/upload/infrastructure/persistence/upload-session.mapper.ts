import {
  UploadSession as PrismaUploadSession,
  UploadStatus as PrismaUploadStatus,
} from '@prisma/client';

import { UploadSession } from '../../domain/entities/upload-session.entity';
import { UploadStatus } from '../../domain/enums/upload-status.enum';

export class UploadSessionMapper {
  static toDomain(
    raw: PrismaUploadSession,
  ): UploadSession {
    return UploadSession.rehydrate({
      id: raw.id,
      filmId: raw.filmId,
      objectKey: raw.objectKey,
      storageUploadId: raw.storageUploadId,
      expectedSize: raw.expectedSize,
      status: raw.status as UploadStatus,
      expiresAt: raw.expiresAt,
      version: raw.version,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(
    upload: UploadSession,
  ): PrismaUploadSession {
    return {
      id: upload.id,
      filmId: upload.filmId,
      objectKey: upload.objectKey,
      storageUploadId: upload.storageUploadId,
      expectedSize: upload.expectedSize,
      status: upload.status as unknown as PrismaUploadStatus,
      expiresAt: upload.expiresAt,
      version: upload.getVersion(),
      createdAt: upload.createdAt,
      updatedAt: upload.updatedAt,
    };
  }
}