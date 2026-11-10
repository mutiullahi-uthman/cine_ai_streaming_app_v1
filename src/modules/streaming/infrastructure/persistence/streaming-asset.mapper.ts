import {
  StreamingAsset as PrismaStreamingAsset,
  StreamingAssetStatus as PrismaStreamingAssetStatus,
} from '@prisma/client';

import { StreamingAsset } from '../../domain/entities/streaming-asset.entity';
import { StreamingAssetStatus } from '../../domain/enums/streaming-asset-status.enum';

export class StreamingAssetMapper {
  static toDomain(raw: PrismaStreamingAsset): StreamingAsset {
    return StreamingAsset.rehydrate({
      id: raw.id,
      filmId: raw.filmId,
      mediaAssetId: raw.mediaAssetId,
      masterPlaylistKey: raw.masterPlaylistKey,
      status: raw.status as StreamingAssetStatus,
      version: raw.version,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  static toPersistence(asset: StreamingAsset): PrismaStreamingAsset {
    return {
      id: asset.id,
      filmId: asset.filmId,
      mediaAssetId: asset.mediaAssetId,
      masterPlaylistKey: asset.masterPlaylistKey,
      status: asset.status as unknown as PrismaStreamingAssetStatus,
      version: asset.getVersion(),
      createdAt: asset.createdAt,
      updatedAt: asset.updatedAt,
    };
  }
}
