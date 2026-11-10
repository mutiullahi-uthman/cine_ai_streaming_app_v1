import { randomUUID } from 'crypto';

import { AggregateRoot } from '../../../../shared/events';

import { FilmStatus } from '../enums/film-status.enum';
import { InvalidFilmStateException } from '../exceptions/invalid-film-state.exception';

import {
  FilmCreatedEvent,
  FilmFailedEvent,
  FilmProcessingEvent,
  FilmPublishedEvent,
  FilmReadyEvent,
  FilmUploadingEvent,
} from '../events';

type RehydrateFilmProps = {
  id: string;
  creatorId: string;

  title: string;
  synopsis: string;

  premiereAt: Date | null;

  status: FilmStatus;

  version: number;

  createdAt: Date;
  updatedAt: Date;
};

export class Film extends AggregateRoot {
  private constructor(
    public readonly id: string,
    public readonly creatorId: string,

    public title: string,
    public synopsis: string,

    public premiereAt: Date | null,

    public status: FilmStatus,

    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    super();
  }

  /**
   * Factory for new Film creation.
   * Emits FilmCreatedEvent.
   */
  static create(params: {
    creatorId: string;
    title: string;
    synopsis: string;
    premiereAt?: Date | null;
  }): Film {
    const now = new Date();

    const film = new Film(
      randomUUID(),
      params.creatorId,

      params.title.trim(),
      params.synopsis.trim(),

      params.premiereAt ?? null,

      FilmStatus.DRAFT,

      now,
      now,
    );

    film.record(
      (version) =>
        new FilmCreatedEvent(
          film.id,
          version,
          film.creatorId,
          film.title,
        ),
    );

    return film;
  }

  /**
   * Rebuilds a Film from persistence.
   *
   * Important:
   * Does NOT raise domain events.
   */
  static rehydrate(
    props: RehydrateFilmProps,
  ): Film {
    const film = new Film(
      props.id,
      props.creatorId,

      props.title,
      props.synopsis,

      props.premiereAt,

      props.status,

      props.createdAt,
      props.updatedAt,
    );

    film.restoreVersion(props.version);

    return film;
  }

  /**
   * Draft -> Uploading
   */
  markUploading(): void {
    if (
      this.status !== FilmStatus.DRAFT &&
      this.status !== FilmStatus.FAILED
    ) {
      throw new InvalidFilmStateException(
        `Film ${this.id} cannot transition from ${this.status} to UPLOADING`,
      );
    }

    this.status = FilmStatus.UPLOADING;

    this.touch();

    this.record(
      (version) =>
        new FilmUploadingEvent(
          this.id,
          version,
        ),
    );
  }

  /**
   * Uploading -> Processing
   */
  markProcessing(): void {
    if (
      this.status !== FilmStatus.UPLOADING
    ) {
      throw new InvalidFilmStateException(
        `Film ${this.id} cannot transition from ${this.status} to PROCESSING`,
      );
    }

    this.status = FilmStatus.PROCESSING;

    this.touch();

    this.record(
      (version) =>
        new FilmProcessingEvent(
          this.id,
          version,
        ),
    );
  }

  /**
   * Processing -> Ready
   */
  markReady(): void {
    if (
      this.status !== FilmStatus.PROCESSING
    ) {
      throw new InvalidFilmStateException(
        `Film ${this.id} cannot transition from ${this.status} to READY`,
      );
    }

    this.status = FilmStatus.READY;

    this.touch();

    this.record(
      (version) =>
        new FilmReadyEvent(
          this.id,
          version,
        ),
    );
  }

  /**
   * Any active workflow -> Failed
   */
  fail(): void {
    if (
      this.status === FilmStatus.PUBLISHED
    ) {
      throw new InvalidFilmStateException(
        'Published films cannot be marked as failed.',
      );
    }

    this.status = FilmStatus.FAILED;

    this.touch();

    this.record(
      (version) =>
        new FilmFailedEvent(
          this.id,
          version,
        ),
    );
  }

  /**
   * Ready -> Published
   */
  publish(): void {
    if (
      this.status !== FilmStatus.READY
    ) {
      throw new InvalidFilmStateException(
        `Film ${this.id} must be READY before publication.`,
      );
    }

    this.status =
      FilmStatus.PUBLISHED;

    this.touch();

    this.record(
      (version) =>
        new FilmPublishedEvent(
          this.id,
          version,
        ),
    );
  }

  /**
   * Update film metadata.
   *
   * Publishing workflow state
   * remains unchanged.
   */
  updateDetails(params: {
    title?: string;
    synopsis?: string;
    premiereAt?: Date | null;
  }): void {
    if (params.title !== undefined) {
      this.title = params.title.trim();
    }

    if (params.synopsis !== undefined) {
      this.synopsis =
        params.synopsis.trim();
    }

    if (
      params.premiereAt !== undefined
    ) {
      this.premiereAt =
        params.premiereAt;
    }

    this.touch();
    this.advanceVersion();
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}