export class InvalidStreamingAssetStateException extends Error {
  constructor(assetId: string, reason: string) {
    super(`Streaming asset ${assetId} ${reason}`);
    this.name = InvalidStreamingAssetStateException.name;
  }
}
