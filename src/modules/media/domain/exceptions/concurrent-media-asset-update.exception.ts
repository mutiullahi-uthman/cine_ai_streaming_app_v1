import { ConflictException } from '@nestjs/common';

export class ConcurrentMediaAssetUpdateException extends ConflictException {
  constructor(mediaAssetId: string) {
    super(`Media asset ${mediaAssetId} was modified by another operation.`);
  }
}