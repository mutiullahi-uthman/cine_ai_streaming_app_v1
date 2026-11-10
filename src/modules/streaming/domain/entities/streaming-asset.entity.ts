import { randomUUID } from 'crypto';

import { AggregateRoot } from '../../../../shared/events';

import { StreamingAssetStatus } from '../enums/streaming-asset-status.enum';
import { InvalidStreamingAssetStateException } from '../exceptions/invalid-streaming-asset-state.exception';
import { StreamingAssetReadyEvent } from '../events';

interface RehydrateStreamingAssetProps {
  id: string;
  filmId: string;
  mediaAssetId: string;
  masterPlaylistKey: string;
  status: StreamingAssetStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class StreamingAsset extends AggregateRoot {
  private constructor(
    public readonly id: string,
    public readonly filmId: string,
    public readonly mediaAssetId: string,
    public readonly masterPlaylistKey: string,
    public status: StreamingAssetStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    super();
  }

  static create(params: {
    filmId: string;
    mediaAssetId: string;
    masterPlaylistKey: string;
  }): StreamingAsset {
    const now = new Date();
    return new StreamingAsset(
      randomUUID(),
      params.filmId,
      params.mediaAssetId,
      params.masterPlaylistKey,
      StreamingAssetStatus.GENERATING,
      now,
      now,
    );
  }

  static rehydrate(
    props: RehydrateStreamingAssetProps,
  ): StreamingAsset {
    const asset = new StreamingAsset(
      props.id,
      props.filmId,
      props.mediaAssetId,
      props.masterPlaylistKey,
      props.status,
      props.createdAt,
      props.updatedAt,
    );
    asset.restoreVersion(props.version);
    return asset;
  }

  markReady(): void {
    if (this.status !== StreamingAssetStatus.GENERATING) {
      throw new InvalidStreamingAssetStateException(
        this.id,
        `cannot become ready from ${this.status}.`,
      );
    }

    this.status = StreamingAssetStatus.READY;
    this.touch();
    this.record(
      (version) =>
        new StreamingAssetReadyEvent(
          this.id,
          version,
          this.filmId,
        ),
    );
  }

  markFailed(): void {
    if (this.status === StreamingAssetStatus.READY) {
      throw new InvalidStreamingAssetStateException(
        this.id,
        'cannot fail after becoming ready.',
      );
    }
    if (this.status === StreamingAssetStatus.FAILED) {
      return;
    }

    this.status = StreamingAssetStatus.FAILED;
    this.touch();
    this.advanceVersion();
  }

  retry(): void {
    if (this.status !== StreamingAssetStatus.FAILED) {
      throw new InvalidStreamingAssetStateException(
        this.id,
        `cannot retry from ${this.status}.`,
      );
    }

    this.status = StreamingAssetStatus.GENERATING;
    this.touch();
    this.advanceVersion();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
