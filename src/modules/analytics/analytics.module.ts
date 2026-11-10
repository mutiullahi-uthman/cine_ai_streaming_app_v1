import { Module } from '@nestjs/common';

import { PrismaModule } from '../../infrastructure/database/prisma.module';
import { FilmModule } from '../film/film.module';
import { IdentityModule } from '../identity/identity.module';
import { MediaModule } from '../media/media.module';
import { PremiereModule } from '../premiere/premiere.module';
import { StreamingModule } from '../streaming/streaming.module';
import { AnalyticsController } from './api/analytics.controller';
import { EndViewSessionService } from './application/services/end-view-session.service';
import { GetFilmAnalyticsService } from './application/services/get-film-analytics.service';
import { RecordViewHeartbeatService } from './application/services/record-view-heartbeat.service';
import { StartViewSessionService } from './application/services/start-view-session.service';
import { AnalyticsRepository } from './domain/repositories/analytics.repository';
import { PrismaAnalyticsRepository } from './infrastructure/persistence/prisma-analytics.repository';

@Module({
  imports: [
    FilmModule,
    IdentityModule,
    MediaModule,
    PremiereModule,
    PrismaModule,
    StreamingModule,
  ],
  controllers: [AnalyticsController],
  providers: [
    EndViewSessionService,
    GetFilmAnalyticsService,
    RecordViewHeartbeatService,
    StartViewSessionService,
    {
      provide: AnalyticsRepository,
      useClass: PrismaAnalyticsRepository,
    },
  ],
})
export class AnalyticsModule {}
