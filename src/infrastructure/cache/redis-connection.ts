import type { RedisOptions } from 'ioredis';
import type { ConnectionOptions } from 'bullmq';

interface RedisUrlOptions {
  host: string;
  port: number;
  username?: string;
  password?: string;
  db: number;
  tls?: Record<string, never>;
}

function parseRedisUrl(): RedisUrlOptions {
  const configuredUrl = process.env.REDIS_URL ?? 'redis://localhost:6379/0';
  const url = new URL(configuredUrl);
  if (url.protocol !== 'redis:' && url.protocol !== 'rediss:') {
    throw new Error('REDIS_URL must use redis:// or rediss://.');
  }

  const database = url.pathname.slice(1);
  if (database && !/^\d+$/.test(database)) {
    throw new Error('REDIS_URL database path must be a non-negative integer.');
  }

  const port = url.port ? Number(url.port) : 6379;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('REDIS_URL port must be between 1 and 65535.');
  }

  return {
    host: url.hostname,
    port,
    username: url.username ? decodeURIComponent(url.username) : undefined,
    password: url.password ? decodeURIComponent(url.password) : undefined,
    db: database ? Number(database) : 0,
    tls: url.protocol === 'rediss:' ? {} : undefined,
  };
}

export function getRedisOptions(): RedisOptions {
  return {
    ...parseRedisUrl(),
    maxRetriesPerRequest: 1,
  };
}

export function getBullRedisOptions(): ConnectionOptions {
  return {
    ...parseRedisUrl(),
    maxRetriesPerRequest: null,
  };
}
