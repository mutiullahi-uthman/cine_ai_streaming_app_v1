import {
  ConflictException,
  Injectable,
} from '@nestjs/common';

import { AnalyticsRepository } from '../../domain/repositories/analytics.repository';

@Injectable()
export class EndViewSessionService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  async execute(sessionId: string, viewerId: string) {
    const session = await this.analyticsRepository.endSession(
      sessionId,
      viewerId,
      new Date(),
    );
    if (!session) {
      throw new ConflictException(
        'View session does not exist, has ended, or is not owned by this viewer.',
      );
    }
    return {
      sessionId: session.id,
      endedAt: session.endedAt,
      watchDurationSeconds: session.watchDurationSeconds,
      completionPercent: Math.round(session.completionPercent),
    };
  }
}
