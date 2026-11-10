import {
  ConflictException,
  Injectable,
} from '@nestjs/common';
import { randomUUID } from 'node:crypto';

import { PrismaService } from '../../../../infrastructure/database/prisma.service';
import { AnalyticsRepository, FilmAnalyticsSummary } from '../../domain/repositories/analytics.repository';
import { ViewSession } from '../../domain/entities/view-session.entity';

@Injectable()
export class PrismaAnalyticsRepository extends AnalyticsRepository {
  constructor(private readonly prisma: PrismaService) {
    super();
  }

  async createSession(session: ViewSession): Promise<void> {
    await this.prisma.viewSession.create({
      data: {
        id: session.id,
        filmId: session.filmId,
        mediaAssetId: session.mediaAssetId,
        viewerId: session.viewerId,
        device: session.device,
        durationSeconds: session.durationSeconds,
        startedAt: session.startedAt,
        lastHeartbeatAt: session.lastHeartbeatAt,
        endedAt: session.endedAt,
        watchDurationSeconds: session.watchDurationSeconds,
        completionPercent: session.completionPercent,
      },
    });
  }

  async heartbeat(params: {
    id: string;
    viewerId: string;
    now: Date;
    playing: boolean;
    rendition: string;
  }): Promise<ViewSession | null> {
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.viewSession.findFirst({
        where: {
          id: params.id,
          viewerId: params.viewerId,
          endedAt: null,
        },
      });
      if (!current) {
        return null;
      }

      const session = ViewSession.rehydrate(current);
      const previousHeartbeatAt = session.lastHeartbeatAt;
      const watchedSeconds = session.recordHeartbeat({
        now: params.now,
        playing: params.playing,
      });
      const update = await tx.viewSession.updateMany({
        where: {
          id: session.id,
          viewerId: params.viewerId,
          endedAt: null,
          lastHeartbeatAt: previousHeartbeatAt,
        },
        data: {
          lastHeartbeatAt: session.lastHeartbeatAt,
          watchDurationSeconds: session.watchDurationSeconds,
          completionPercent: session.completionPercent,
        },
      });
      if (update.count !== 1) {
        throw new ConflictException(
          'The view session changed; retry the heartbeat.',
        );
      }

      if (watchedSeconds > 0) {
        await tx.viewRenditionUsage.upsert({
          where: {
            viewSessionId_rendition: {
              viewSessionId: session.id,
              rendition: params.rendition,
            },
          },
          create: {
            id: randomUUID(),
            viewSessionId: session.id,
            rendition: params.rendition,
            watchDurationSeconds: watchedSeconds,
          },
          update: {
            watchDurationSeconds: { increment: watchedSeconds },
          },
        });
      }

      return session;
    });
  }

  async endSession(
    id: string,
    viewerId: string,
    endedAt: Date,
  ): Promise<ViewSession | null> {
    const update = await this.prisma.viewSession.updateMany({
      where: { id, viewerId, endedAt: null },
      data: { endedAt },
    });
    if (update.count !== 1) {
      return null;
    }
    const record = await this.prisma.viewSession.findUnique({ where: { id } });
    return record ? ViewSession.rehydrate(record) : null;
  }

  async getFilmSummary(filmId: string): Promise<FilmAnalyticsSummary> {
    const where = { filmId };
    const [
      aggregate,
      views,
      completedViews,
      uniqueViewerCountRows,
      topDeviceRows,
      renditionRows,
    ] = await Promise.all([
      this.prisma.viewSession.aggregate({
        where,
        _sum: { watchDurationSeconds: true },
        _avg: { completionPercent: true },
      }),
      this.prisma.viewSession.count({ where }),
      this.prisma.viewSession.count({
        where: { ...where, completionPercent: { gte: 90 } },
      }),
      this.prisma.$queryRaw<Array<{ count: bigint }>>`
        SELECT COUNT(DISTINCT "viewerId") AS count
        FROM "view_sessions"
        WHERE "filmId" = ${filmId}
      `,
      this.prisma.viewSession.groupBy({
        by: ['device'],
        where: { ...where, device: { not: null } },
        _count: { _all: true },
        orderBy: { _count: { device: 'desc' } },
        take: 1,
      }),
      this.prisma.viewRenditionUsage.groupBy({
        by: ['rendition'],
        where: { viewSession: { filmId } },
        _sum: { watchDurationSeconds: true },
        orderBy: { _sum: { watchDurationSeconds: 'desc' } },
      }),
    ]);

    const renditionUsage = renditionRows.map((row) => ({
      rendition: row.rendition,
      watchDurationSeconds: row._sum.watchDurationSeconds ?? 0,
    }));

    return {
      views,
      uniqueViewers: Number(uniqueViewerCountRows[0]?.count ?? 0n),
      totalWatchDurationSeconds:
        aggregate._sum.watchDurationSeconds ?? 0,
      averageCompletionPercent: Math.round(
        aggregate._avg.completionPercent ?? 0,
      ),
      completionRate: views === 0
        ? 0
        : Math.round((completedViews / views) * 100),
      topDevice: topDeviceRows[0]?.device ?? null,
      topRendition: renditionUsage[0]?.rendition ?? null,
      renditionUsage,
    };
  }
}
