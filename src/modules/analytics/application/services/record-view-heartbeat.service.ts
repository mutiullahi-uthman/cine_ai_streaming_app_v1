import {
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { AnalyticsRepository } from '../../domain/repositories/analytics.repository';

@Injectable()
export class RecordViewHeartbeatService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async execute(params: {
    sessionId: string;
    viewerId: string;
    playing: boolean;
    rendition: string;
  }) {
    const session = await this.analyticsRepository.heartbeat({
      id: params.sessionId,
      viewerId: params.viewerId,
      now: new Date(),
      playing: params.playing,
      rendition: params.rendition,
    });
    if (!session) {
      throw new ConflictException(
        'View session does not exist, has ended, or is not owned by this viewer.',
      );
    }

    return {
      sessionId: session.id,
      watchDurationSeconds: session.watchDurationSeconds,
      completionPercent: Math.round(session.completionPercent),
      lastHeartbeatAt: session.lastHeartbeatAt,
    };
  }
}
