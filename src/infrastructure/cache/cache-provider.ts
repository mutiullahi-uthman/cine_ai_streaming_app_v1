export abstract class CacheProvider {
  abstract get(key: string): Promise<string | null>;

  abstract set(
    key: string,
    value: string,
    ttlSeconds?: number,
  ): Promise<void>;

  abstract delete(key: string): Promise<void>;
}
