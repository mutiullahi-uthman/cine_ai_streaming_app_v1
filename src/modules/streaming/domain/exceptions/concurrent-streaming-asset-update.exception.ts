export class ConcurrentStreamingAssetUpdateException extends Error {
  constructor(assetId: string) {
    super(`Streaming asset ${assetId} was updated concurrently.`);
    this.name = ConcurrentStreamingAssetUpdateException.name;
  }
}
