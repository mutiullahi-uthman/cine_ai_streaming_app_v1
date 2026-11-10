import { Injectable } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';

import { UploadCompletedEvent } from '../../../upload/domain/events/upload-completed.event';
import { MediaAsset } from '../../domain/entities/media-asset.entity';
import { MediaAssetRepository } from '../../domain/repositories/media-asset.repository';

@Injectable()
export class UploadCompletedEventHandler {
  constructor(
    private readonly mediaAssetRepository: MediaAssetRepository,
  ) {}

  @OnEvent('upload.completed')
  async handle(event: UploadCompletedEvent): Promise<void> {
    const existing = await this.mediaAssetRepository.findByObjectKey(
      event.objectKey,
    );
    if (existing) {
      return;
    }

    const asset = MediaAsset.create({
      filmId: event.filmId,
      objectKey: event.objectKey,
      etag: event.etag,
      sizeBytes: event.sizeBytes,
      contentType: event.contentType,
    });

    await this.mediaAssetRepository.save(asset);
  }
}