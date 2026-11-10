import { StreamingAsset } from '../entities/streaming-asset.entity';

export abstract class StreamingAssetRepository {
  abstract save(asset: StreamingAsset): Promise<void>;
  abstract findByMediaAssetId(
    mediaAssetId: string,
  ): Promise<StreamingAsset | null>;
  abstract findReadyByFilmId(
    filmId: string,
  ): Promise<StreamingAsset | null>;
}
