import { randomUUID } from 'node:crypto';

import { AggregateRoot } from '../../../../shared/events';
import { InvalidPremiereStateException } from '../exceptions/invalid-premiere-state.exception';
import { PremiereStatus } from '../enums/premiere-status.enum';
import {
  PremiereCancelledEvent,
  PremiereEndedEvent,
  PremiereLiveEvent,
  PremiereScheduledEvent,
} from '../events';

interface RehydratePremiereProps {
  id: string;
  filmId: string;
  startsAt: Date;
  status: PremiereStatus;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

function assertFutureStart(startsAt: Date, now: Date): void {
  if (!Number.isFinite(startsAt.getTime()) || startsAt <= now) {
    throw new InvalidPremiereStateException(
      'A premiere must be scheduled for a future date and time.',
    );
  }
}

export class Premiere extends AggregateRoot {
  private constructor(
    public readonly id: string,
    public readonly filmId: string,
    public startsAt: Date,
    public status: PremiereStatus,
    public readonly createdAt: Date,
    public updatedAt: Date,
  ) {
    super();
  }

  static schedule(params: {
    filmId: string;
    startsAt: Date;
    now?: Date;
  }): Premiere {
    const now = params.now ?? new Date();
    assertFutureStart(params.startsAt, now);
    const premiere = new Premiere(
      randomUUID(),
      params.filmId,
      params.startsAt,
      PremiereStatus.SCHEDULED,
      now,
      now,
    );
    premiere.record(
      (version) =>
        new PremiereScheduledEvent(
          premiere.id,
          version,
          premiere.filmId,
          premiere.startsAt,
        ),
    );
    return premiere;
  }

  static rehydrate(props: RehydratePremiereProps): Premiere {
    const premiere = new Premiere(
      props.id,
      props.filmId,
      props.startsAt,
      props.status,
      props.createdAt,
      props.updatedAt,
    );
    premiere.restoreVersion(props.version);
    return premiere;
  }

  reschedule(startsAt: Date, now = new Date()): void {
    if (this.status !== PremiereStatus.CANCELLED) {
      throw new InvalidPremiereStateException(
        'Only a cancelled premiere can be rescheduled.',
      );
    }
    assertFutureStart(startsAt, now);
    this.startsAt = startsAt;
    this.status = PremiereStatus.SCHEDULED;
    this.touch();
    this.record(
      (version) =>
        new PremiereScheduledEvent(
          this.id,
          version,
          this.filmId,
          this.startsAt,
        ),
    );
  }

  goLive(now = new Date()): void {
    if (this.status !== PremiereStatus.SCHEDULED) {
      throw new InvalidPremiereStateException(
        `Premiere ${this.id} cannot go live from ${this.status}.`,
      );
    }
    if (this.startsAt > now) {
      throw new InvalidPremiereStateException(
        `Premiere ${this.id} cannot go live before its scheduled start.`,
      );
    }
    this.status = PremiereStatus.LIVE;
    this.touch();
    this.record(
      (version) =>
        new PremiereLiveEvent(this.id, version, this.filmId),
    );
  }

  end(): void {
    if (this.status !== PremiereStatus.LIVE) {
      throw new InvalidPremiereStateException(
        `Premiere ${this.id} cannot end from ${this.status}.`,
      );
    }
    this.status = PremiereStatus.ENDED;
    this.touch();
    this.record(
      (version) =>
        new PremiereEndedEvent(this.id, version, this.filmId),
    );
  }

  cancel(): void {
    if (this.status !== PremiereStatus.SCHEDULED) {
      throw new InvalidPremiereStateException(
        `Premiere ${this.id} cannot be cancelled from ${this.status}.`,
      );
    }
    this.status = PremiereStatus.CANCELLED;
    this.touch();
    this.record(
      (version) =>
        new PremiereCancelledEvent(this.id, version, this.filmId),
    );
  }

  private touch(): void {
    this.updatedAt = new Date();
  }
}
