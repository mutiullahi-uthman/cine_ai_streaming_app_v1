import {
  MediaAsset as PrismaMediaAsset,
  MediaStatus as PrismaMediaStatus,
} from '@prisma/client';

import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { MediaStatus } from '../../domain/enums/media-status.enum';

export class MediaAssetMapper {
  static toDomain(raw: PrismaMediaAsset): MediaAsset {
    return MediaAsset.rehydrate({
      id: raw.id,
      filmId: raw.filmId,
      objectKey: raw.objectKey,
      etag: raw.etag,
      sizeBytes: raw.sizeBytes,
      durationSeconds: raw.durationSeconds,
      contentType: raw.contentType,
      status: raw.status as MediaStatus,
      version: raw.version,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(asset: MediaAsset): PrismaMediaAsset {
    return {
      id: asset.id,
      filmId: asset.filmId,
      objectKey: asset.objectKey,
      etag: asset.etag,
      sizeBytes: asset.sizeBytes,
      durationSeconds: asset.durationSeconds,
      contentType: asset.contentType,
      status: asset.status as unknown as PrismaMediaStatus,
      version: asset.getVersion(),
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}