import {
  Inject,
  Injectable,
  OnModuleDestroy,
} from '@nestjs/common';
import type Redis from 'ioredis';

import { StructuredLogger } from '../observability/structured-logger.service';
import { REDIS_CLIENT } from './redis.constants';
import { CacheProvider } from './cache-provider';

@Injectable()
export class RedisService extends CacheProvider implements OnModuleDestroy {
  constructor(
    @Inject(REDIS_CLIENT)
    private readonly client: Redis,
    private readonly logger: StructuredLogger,
  ) {
    super();
    this.client.on('error', (error: Error) => {
      this.logger.error('Redis connection error.', error);
    });
  }

  async get(key: string): Promise<string | null> {
    return this.client.get(key);
  }

  async set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void> {
    if (ttlSeconds !== undefined) {
      if (!Number.isInteger(ttlSeconds) || ttlSeconds <= 0) {
        throw new Error('Cache TTL must be a positive integer.');
      }
      await this.client.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.client.set(key, value);
  }

  async delete(key: string): Promise<void> {
    await this.client.del(key);
  }

  async ping(): Promise<void> {
    const result = await this.client.ping();
    if (result !== 'PONG') {
      throw new Error('Redis health check returned an unexpected response.');
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.client.quit();
  }
}
