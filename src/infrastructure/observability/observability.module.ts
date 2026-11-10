import {
  Global,
  MiddlewareConsumer,
  Module,
  NestModule,
} from '@nestjs/common';

import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { RequestContextService } from './request-context.service';
import { RequestIdMiddleware } from './request-id.middleware';
import { StructuredLogger } from './structured-logger.service';

@Global()
@Module({
  controllers: [MetricsController],
  providers: [
    MetricsService,
    RequestContextService,
    RequestIdMiddleware,
    StructuredLogger,
  ],
  exports: [MetricsService, RequestContextService, StructuredLogger],
})
export class ObservabilityModule implements NestModule {
  configure(consumer: MiddlewareConsumer): void {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}
