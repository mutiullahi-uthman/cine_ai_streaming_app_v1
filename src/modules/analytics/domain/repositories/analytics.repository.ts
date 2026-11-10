import { ViewSession } from '../entities/view-session.entity';

export interface FilmAnalyticsSummary {
  views: number;
  uniqueViewers: number;
  totalWatchDurationSeconds: number;
  averageCompletionPercent: number;
  completionRate: number;
  topDevice: string | null;
  topRendition: string | null;
  renditionUsage: Array<{
    rendition: string;
    watchDurationSeconds: number;
  }>;
}

export abstract class AnalyticsRepository {
  abstract createSession(session: ViewSession): Promise<void>;

  abstract heartbeat(params: {
    id: string;
    viewerId: string;
    now: Date;
    playing: boolean;
    rendition: string;
  }): Promise<ViewSession | null>;

  abstract endSession(
    id: string,
    viewerId: string,
    endedAt: Date,
  ): Promise<ViewSession | null>;

  abstract getFilmSummary(filmId: string): Promise<FilmAnalyticsSummary>;
}
