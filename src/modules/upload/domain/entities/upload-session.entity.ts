import { randomUUID } from 'crypto';

import {
  AggregateRoot,
} from '../../../../shared/events';

import { UploadStatus } from '../enums/upload-status.enum';

import {
  UploadCompletedEvent,
  UploadExpiredEvent,
  UploadFailedEvent,
  UploadSessionCreatedEvent,
  UploadStartedEvent,
} from '../events';

import { InvalidUploadStateException } from '../exceptions/invalid-upload-state.exception';

type RehydrateProps = {
  id: string;
  filmId: string;

  objectKey: string;

  storageUploadId: string;

  expectedSize: bigint;

  status: UploadStatus;

  expiresAt: Date;

  version: number;

  createdAt: Date;
  updatedAt: Date;
};

export class UploadSession extends AggregateRoot {
  private constructor(
    public readonly id: string,

    public readonly filmId: string,

    public readonly objectKey: string,

    public readonly storageUploadId: string,

    public readonly expectedSize: bigint,

    public status: UploadStatus,

    public readonly expiresAt: Date,

    public readonly createdAt: Date,

    public updatedAt: Date,
  ) {
    super();
  }

  static create(params: {
    filmId: string;
    objectKey: string;
    storageUploadId: string;
    expectedSize: bigint;
    expiresAt: Date;
  }): UploadSession {
    const now = new Date();

    const upload =
      new UploadSession(
        randomUUID(),

        params.filmId,

        params.objectKey,

        params.storageUploadId,

        params.expectedSize,

        UploadStatus.CREATED,

        params.expiresAt,

        now,
        now,
      );

    upload.record(
      (version) =>
        new UploadSessionCreatedEvent(
          upload.id,
          version,
          upload.filmId,
          upload.objectKey,
        ),
    );

    return upload;
  }

  static rehydrate(
    props: RehydrateProps,
  ): UploadSession {
    const upload =
      new UploadSession(
        props.id,
        props.filmId,

        props.objectKey,

        props.storageUploadId,

        props.expectedSize,

        props.status,

        props.expiresAt,

        props.createdAt,
        props.updatedAt,
      );

    upload.restoreVersion(
      props.version,
    );

    return upload;
  }

  start(): void {
    if (
      this.status !==
      UploadStatus.CREATED
    ) {
      throw new InvalidUploadStateException(
        this.id,
        this.status,
        UploadStatus.UPLOADING,
      );
    }

    this.status =
      UploadStatus.UPLOADING;

    this.updatedAt =
      new Date();

    this.record(
      (version) =>
        new UploadStartedEvent(
          this.id,
          version,
        ),
    );
  }

  complete(params: {
    sizeBytes: bigint;
    etag: string;
    contentType: string | null;
  }): void {
    if (
      this.status !==
      UploadStatus.UPLOADING
    ) {
      throw new InvalidUploadStateException(
        this.id,
        this.status,
        UploadStatus.COMPLETED,
      );
    }

    this.status =
      UploadStatus.COMPLETED;

    this.updatedAt =
      new Date();

    this.record(
      (version) =>
        new UploadCompletedEvent(
          this.id,
          version,
          this.filmId,
          this.objectKey,
          this.storageUploadId,
          params.sizeBytes,
          params.contentType,
          params.etag,
        ),
    );
  }
  fail(): void {
    if (
      this.status !== UploadStatus.UPLOADING
    ) {
      throw new InvalidUploadStateException(
        this.id,
        this.status,
        UploadStatus.FAILED,
      );
    }

    this.status =
      UploadStatus.FAILED;

    this.updatedAt =
      new Date();

    this.record(
      (version) =>
        new UploadFailedEvent(
          this.id,
          version,
        ),
    );
  }

  expire(): void {
    if (
      this.status !== UploadStatus.CREATED &&
      this.status !== UploadStatus.UPLOADING
    ) {
      throw new InvalidUploadStateException(
        this.id,
        this.status,
        UploadStatus.EXPIRED,
      );
    }

    this.status =
      UploadStatus.EXPIRED;

    this.updatedAt =
      new Date();

    this.record(
      (version) =>
        new UploadExpiredEvent(
          this.id,
          version,
        ),
    );
  }
}