import { Module } from '@nestjs/common';

import { ObservabilityModule } from './infrastructure/observability/observability.module';
import { RedisModule } from './infrastructure/cache/redis.module';
import { BullMqModule } from './infrastructure/queue/bullmq.module';
import { QueueWorkersModule } from './infrastructure/queue/queue-workers.module';

@Module({
  imports: [
    ObservabilityModule,
    RedisModule,
    BullMqModule,
    QueueWorkersModule,
  ],
})
export class WorkerModule {}
