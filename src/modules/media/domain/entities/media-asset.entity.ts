import { randomUUID } from 'crypto';

import { AggregateRoot } from '../../../../shared/events';
import { InvalidMediaStateException } from '../exceptions/invalid-media-state.exception';
import { MediaStatus } from '../enums/media-status.enum';
import {
  MediaAssetCreatedEvent,
  MediaFailedEvent,
  MediaProcessingStartedEvent,
  MediaReadyEvent,
} from '../events';

interface RehydrateMediaAssetProps {
  id: string;
  filmId: string;
  objectKey: string;
  etag: string;
  sizeBytes: bigint;
  durationSeconds: number | null;
  contentType: string | null;
  status: MediaStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class MediaAsset extends AggregateRoot {
  private constructor(
    public readonly id: string,
    public readonly filmId: string,
    public readonly objectKey: string,
    public readonly etag: string,
    public readonly sizeBytes: bigint,
    public durationSeconds: number | null,
    public readonly contentType: string | null,
    public status: MediaStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    super();
  }

  static create(params: {
    filmId: string;
    objectKey: string;
    etag: string;
    sizeBytes: bigint;
    contentType: string | null;
  }): MediaAsset {
    const now = new Date();
    const asset = new MediaAsset(
      randomUUID(),
      params.filmId,
      params.objectKey,
      params.etag,
      params.sizeBytes,
      null,
      params.contentType,
      MediaStatus.UPLOADED,
      now,
      now,
    );

    asset.record(
      (version) =>
        new MediaAssetCreatedEvent(
          asset.id,
          version,
          asset.filmId,
          asset.objectKey,
          asset.etag,
          asset.sizeBytes,
          asset.contentType,
        ),
    );

    return asset;
  }

  static rehydrate(props: RehydrateMediaAssetProps): MediaAsset {
    const asset = new MediaAsset(
      props.id,
      props.filmId,
      props.objectKey,
      props.etag,
      props.sizeBytes,
      props.durationSeconds,
      props.contentType,
      props.status,
      props.createdAt,
      props.updatedAt,
    );

    asset.restoreVersion(props.version);
    return asset;
  }

  markProcessing(): void {
    if (this.status === MediaStatus.PROCESSING) {
      return;
    }
    if (this.status !== MediaStatus.UPLOADED) {
      throw new InvalidMediaStateException(
        this.id,
        `cannot process from ${this.status}.`,
      );
    }

    this.status = MediaStatus.PROCESSING;
    this.touch();
    this.record(
      (version) =>
        new MediaProcessingStartedEvent(this.id, version),
    );
  }

  markReady(): void {
    if (this.status !== MediaStatus.PROCESSING) {
      throw new InvalidMediaStateException(
        this.id,
        `cannot become ready from ${this.status}.`,
      );
    }

    this.status = MediaStatus.READY;
    this.touch();
    this.record(
      (version) => new MediaReadyEvent(this.id, version, this.filmId),
    );
  }

  fail(): void {
    if (this.status === MediaStatus.FAILED) {
      return;
    }
    if (this.status === MediaStatus.READY) {
      throw new InvalidMediaStateException(
        this.id,
        'a ready asset cannot fail.',
      );
    }

    this.status = MediaStatus.FAILED;
    this.touch();
    this.record(
      (version) => new MediaFailedEvent(this.id, version, this.filmId),
    );
  }

  setDurationSeconds(durationSeconds: number): void {
    if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
      throw new InvalidMediaStateException(
        this.id,
        'duration must be a positive finite number.',
      );
    }
    this.durationSeconds = durationSeconds;
    this.touch();
    this.advanceVersion();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}