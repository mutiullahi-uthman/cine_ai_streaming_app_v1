import { randomUUID } from 'node:crypto';

export interface RehydrateViewSessionParams {
  id: string;
  filmId: string;
  mediaAssetId: string;
  viewerId: string;
  device: string | null;
  durationSeconds: number;
  startedAt: Date;
  lastHeartbeatAt: Date;
  endedAt: Date | null;
  watchDurationSeconds: number;
  completionPercent: number;
}

export class ViewSession {
  private constructor(
    public readonly id: string,
    public readonly filmId: string,
    public readonly mediaAssetId: string,
    public readonly viewerId: string,
    public readonly device: string | null,
    public readonly durationSeconds: number,
    public readonly startedAt: Date,
    public lastHeartbeatAt: Date,
    public endedAt: Date | null,
    public watchDurationSeconds: number,
    public completionPercent: number,
  ) {}

  static start(params: {
    filmId: string;
    mediaAssetId: string;
    viewerId: string;
    device: string | null;
    durationSeconds: number;
    now?: Date;
  }): ViewSession {
    const now = params.now ?? new Date();
    return new ViewSession(
      randomUUID(),
      params.filmId,
      params.mediaAssetId,
      params.viewerId,
      params.device,
      params.durationSeconds,
      now,
      now,
      null,
      0,
      0,
    );
  }

  static rehydrate(params: RehydrateViewSessionParams): ViewSession {
    return new ViewSession(
      params.id,
      params.filmId,
      params.mediaAssetId,
      params.viewerId,
      params.device,
      params.durationSeconds,
      params.startedAt,
      params.lastHeartbeatAt,
      params.endedAt,
      params.watchDurationSeconds,
      params.completionPercent,
    );
  }

  recordHeartbeat(params: {
    now: Date;
    playing: boolean;
  }): number {
    if (this.endedAt) {
      throw new Error('An ended view session cannot receive heartbeats.');
    }

    const elapsedMilliseconds = Math.max(
      0,
      params.now.getTime() - this.lastHeartbeatAt.getTime(),
    );
    const seconds = params.playing
      ? Math.min(60, Math.floor(elapsedMilliseconds / 1000))
      : 0;
    this.watchDurationSeconds += seconds;
    this.completionPercent = Math.min(
      100,
      (this.watchDurationSeconds / this.durationSeconds) * 100,
    );
    this.lastHeartbeatAt = params.now;
    return seconds;
  }

  end(now = new Date()): void {
    if (this.endedAt) {
      return;
    }
    this.endedAt = now;
  }
}
