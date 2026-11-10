import { Inject, Injectable } from '@nestjs/common';

import {
  OBJECT_KEY_FACTORY,
  STORAGE_PROVIDER,
} from '../../../../infrastructure/storage/storage.constants';
import type { StorageProvider } from '../../../../infrastructure/storage/contracts/storage-provider.interface';
import type { ObjectKeyFactory } from '../../../../infrastructure/storage/contracts/object-key-factory.interface';
import { MediaAssetRepository } from '../../../media/domain/repositories/media-asset.repository';
import { MediaStatus } from '../../../media/domain/enums/media-status.enum';
import { ProcessingJobNotFoundException } from '../../../processing/domain/exceptions/processing-job-not-found.exception';
import { ProcessingJobRepository } from '../../../processing/domain/repositories/processing-job.repository';
import { StreamingAsset } from '../../domain/entities/streaming-asset.entity';
import { StreamingAssetStatus } from '../../domain/enums/streaming-asset-status.enum';
import { StreamingAssetRepository } from '../../domain/repositories/streaming-asset.repository';

@Injectable()
export class RegisterStreamingAssetService {
  constructor(
    private readonly jobRepository: ProcessingJobRepository,
    private readonly mediaAssetRepository: MediaAssetRepository,
    private readonly streamingAssetRepository: StreamingAssetRepository,
    @Inject(STORAGE_PROVIDER)
    private readonly storage: StorageProvider,
    @Inject(OBJECT_KEY_FACTORY)
    private readonly objectKeys: ObjectKeyFactory,
  ) {}

  async execute(processingJobId: string): Promise<void> {
    const job = await this.jobRepository.findById(processingJobId);
    if (!job) {
      throw new ProcessingJobNotFoundException(processingJobId);
    }

    const mediaAsset = await this.mediaAssetRepository.findById(
      job.mediaAssetId,
    );
    if (!mediaAsset) {
      throw new Error(
        `Media asset ${job.mediaAssetId} for processing job ${job.id} was not found.`,
      );
    }
    if (mediaAsset.status !== MediaStatus.READY) {
      throw new Error(
        `Media asset ${mediaAsset.id} must be READY before streaming can be registered.`,
      );
    }

    let streamingAsset =
      await this.streamingAssetRepository.findByMediaAssetId(mediaAsset.id);
    if (streamingAsset?.status === StreamingAssetStatus.READY) {
      return;
    }

    if (!streamingAsset) {
      streamingAsset = StreamingAsset.create({
        filmId: mediaAsset.filmId,
        mediaAssetId: mediaAsset.id,
        masterPlaylistKey: this.objectKeys.createMasterPlaylistKey(
          mediaAsset.filmId,
        ),
      });
      await this.streamingAssetRepository.save(streamingAsset);
    } else if (streamingAsset.status === StreamingAssetStatus.FAILED) {
      streamingAsset.retry();
      await this.streamingAssetRepository.save(streamingAsset);
    }

    try {
      await this.verifyHlsAssets(streamingAsset.masterPlaylistKey);
    } catch (error) {
      streamingAsset.markFailed();
      await this.streamingAssetRepository.save(streamingAsset);
      throw error;
    }

    streamingAsset.markReady();
    await this.streamingAssetRepository.save(streamingAsset);
  }

  private async verifyHlsAssets(masterPlaylistKey: string): Promise<void> {
    if (!(await this.storage.objectExists(masterPlaylistKey))) {
      throw new Error(`HLS master playlist ${masterPlaylistKey} is missing.`);
    }

    const masterPlaylist = await this.storage.getObjectText(masterPlaylistKey);
    const variantKeys = this.getPlaylistReferences(
      masterPlaylist,
      masterPlaylistKey,
      '.m3u8',
    );
    if (variantKeys.length === 0) {
      throw new Error(`HLS master playlist ${masterPlaylistKey} has no renditions.`);
    }

    const segmentKeys: string[] = [];
    for (const variantKey of variantKeys) {
      if (!(await this.storage.objectExists(variantKey))) {
        throw new Error(`HLS rendition playlist ${variantKey} is missing.`);
      }

      const variantPlaylist = await this.storage.getObjectText(variantKey);
      if (!variantPlaylist.includes('#EXT-X-ENDLIST')) {
        throw new Error(`HLS rendition playlist ${variantKey} is incomplete.`);
      }

      const renditionSegments = this.getPlaylistReferences(
        variantPlaylist,
        variantKey,
        '.ts',
      );
      if (renditionSegments.length === 0) {
        throw new Error(`HLS rendition playlist ${variantKey} has no segments.`);
      }
      segmentKeys.push(...renditionSegments);
    }

    if (segmentKeys.length === 0) {
      throw new Error(`HLS master playlist ${masterPlaylistKey} has no segments.`);
    }

    for (let index = 0; index < segmentKeys.length; index += 32) {
      const batch = segmentKeys.slice(index, index + 32);
      const exists = await Promise.all(
        batch.map((key) => this.storage.objectExists(key)),
      );
      const missingIndex = exists.findIndex((isPresent) => !isPresent);
      if (missingIndex !== -1) {
        throw new Error(
          `HLS segment ${batch[missingIndex]} referenced by ${masterPlaylistKey} is missing.`,
        );
      }
    }
  }

  private getPlaylistReferences(
    playlist: string,
    playlistKey: string,
    extension: '.m3u8' | '.ts',
  ): string[] {
    const lines = playlist
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line.length > 0);

    if (!lines.includes('#EXTM3U')) {
      throw new Error(`HLS playlist ${playlistKey} is invalid.`);
    }

    const referenceLines = lines.filter((line) => !line.startsWith('#'));
    const references = referenceLines
      .map((reference) => {
        const parts = reference.split('/');
        if (
          reference.startsWith('/') ||
          reference.includes('\\') ||
          reference.includes('?') ||
          reference.includes('#') ||
          parts.some(
            (part) =>
              part.length === 0 ||
              part === '.' ||
              part === '..' ||
              part.includes(':'),
          ) ||
          !reference.endsWith(extension)
        ) {
          throw new Error(
            `HLS playlist ${playlistKey} contains an invalid reference.`,
          );
        }

        return [
          playlistKey.slice(0, playlistKey.lastIndexOf('/') + 1),
          reference,
        ].join('');
      });

    const requiredTags = extension === '.m3u8'
      ? lines.filter((line) => line.startsWith('#EXT-X-STREAM-INF:'))
      : lines.filter((line) => line.startsWith('#EXTINF:'));
    if (requiredTags.length !== referenceLines.length) {
      throw new Error(`HLS playlist ${playlistKey} is incomplete.`);
    }

    return references;
  }
}
