import { Module } from '@nestjs/common';

import { MessagingModule } from './infrastructure/messaging';
import { FilmModule } from './modules/film/film.module';
import { UploadModule } from './modules/upload/upload.module';
import { MediaModule } from './modules/media/media.module';
import { ProcessingModule } from './modules/processing/processing.module';
import { StreamingModule } from './modules/streaming/streaming.module';
import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { IdentityModule } from './modules/identity/identity.module';
import { PremiereModule } from './modules/premiere/premiere.module';
import { CreatorModule } from './modules/creator/creator.module';
import { NotificationModule } from './modules/notification/notification.module';
import { AnalyticsModule } from './modules/analytics/analytics.module';
import { HealthController } from './health.controller';
import { RedisModule } from './infrastructure/cache/redis.module';
import { BullMqModule } from './infrastructure/queue/bullmq.module';

@Module({
  controllers: [HealthController],
  imports: [
    ObservabilityModule,
    RedisModule,
    BullMqModule,
    IdentityModule,
    MessagingModule,
    FilmModule,
    UploadModule,
    MediaModule,
    ProcessingModule,
    PremiereModule,
    CreatorModule,
    NotificationModule,
    AnalyticsModule,
    StreamingModule,
  ],
})
export class AppModule {}