import { Injectable, Logger } from '@nestjs/common';

export interface CacheItem<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly cache = new Map<string, CacheItem<any>>();
  private readonly defaultTTL = 300000; // 5 minutes

  set<T>(key: string, data: T, ttl: number = this.defaultTTL): void {
    const item: CacheItem<T> = {
      data,
      timestamp: Date.now(),
      ttl,
    };

    this.cache.set(key, item);
    this.logger.debug(`Cache set: ${key} (TTL: ${ttl}ms)`);

    // Auto-cleanup after TTL
    setTimeout(() => {
      this.delete(key);
    }, ttl);
  }

  get<T>(key: string): T | null {
    const item = this.cache.get(key);

    if (!item) {
      this.logger.debug(`Cache miss: ${key}`);
      return null;
    }

    const now = Date.now();
    const age = now - item.timestamp;

    if (age > item.ttl) {
      this.logger.debug(
        `Cache expired: ${key} (age: ${age}ms, ttl: ${item.ttl}ms)`,
      );
      this.cache.delete(key);
      return null;
    }

    this.logger.debug(`Cache hit: ${key} (age: ${age}ms)`);
    return item.data;
  }

  delete(key: string): boolean {
    const deleted = this.cache.delete(key);
    if (deleted) {
      this.logger.debug(`Cache deleted: ${key}`);
    }
    return deleted;
  }

  clear(): void {
    const size = this.cache.size;
    this.cache.clear();
    this.logger.log(`Cache cleared: ${size} items removed`);
  }

  getStats(): {
    size: number;
    keys: string[];
    memoryUsage: number;
  } {
    return {
      size: this.cache.size,
      keys: Array.from(this.cache.keys()),
      memoryUsage: this.estimateMemoryUsage(),
    };
  }

  private estimateMemoryUsage(): number {
    // Rough estimation of cache memory usage
    let totalSize = 0;

    for (const [key, value] of this.cache.entries()) {
      totalSize += key.length * 2; // String characters are 2 bytes
      totalSize += JSON.stringify(value).length * 2;
    }

    return totalSize;
  }

  // Utility method for cache-aside pattern
  async getOrSet<T>(
    key: string,
    factory: () => Promise<T>,
    ttl: number = this.defaultTTL,
  ): Promise<T> {
    const cached = this.get<T>(key);

    if (cached !== null) {
      return cached;
    }

    const data = await factory();
    this.set(key, data, ttl);
    return data;
  }
}
