import { Global, Module } from '@nestjs/common';
import Redis from 'ioredis';

import { ObservabilityModule } from '../observability/observability.module';
import { REDIS_CLIENT } from './redis.constants';
import { getRedisOptions } from './redis-connection';
import { CacheProvider } from './cache-provider';
import { RedisService } from './redis.service';

@Global()
@Module({
  imports: [ObservabilityModule],
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: () => new Redis(getRedisOptions()),
    },
    RedisService,
    {
      provide: CacheProvider,
      useExisting: RedisService,
    },
  ],
  exports: [CacheProvider, RedisService],
})
export class RedisModule {}
