import { Injectable } from '@nestjs/common';

import { AnalyticsRepository } from '../../domain/repositories/analytics.repository';

@Injectable()
export class GetFilmAnalyticsService {
  constructor(private readonly analyticsRepository: AnalyticsRepository) {}

  execute(filmId: string) {
    return this.analyticsRepository.getFilmSummary(filmId);
  }
}
