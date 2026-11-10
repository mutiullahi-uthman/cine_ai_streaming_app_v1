import { UploadSession } from '../../domain/entities/upload-session.entity';
import { UploadStatus } from '../../domain/enums/upload-status.enum';

export interface UploadSessionView {
  id: string;
  filmId: string;
  objectKey: string;
  expectedSize: string;
  status: UploadStatus;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export function toUploadSessionView(
  upload: UploadSession,
): UploadSessionView {
  return {
    id: upload.id,
    filmId: upload.filmId,
    objectKey: upload.objectKey,
    expectedSize: upload.expectedSize.toString(),
    status: upload.status,
    expiresAt: upload.expiresAt,
    createdAt: upload.createdAt,
    updatedAt: upload.updatedAt,
  };
}