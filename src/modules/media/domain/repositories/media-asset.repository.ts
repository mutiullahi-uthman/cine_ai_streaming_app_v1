import { MediaAsset } from '../entities/media-asset.entity';

export abstract class MediaAssetRepository {
  abstract save(asset: MediaAsset): Promise<void>;
  abstract findById(id: string): Promise<MediaAsset | null>;
  abstract findByObjectKey(objectKey: string): Promise<MediaAsset | null>;
  abstract findLatestByFilmId(filmId: string): Promise<MediaAsset | null>;
}