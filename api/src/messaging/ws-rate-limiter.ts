import { Injectable, Inject, Logger } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.constants';

interface RateLimitConfig {
  maxRequests: number;
  windowSeconds: number;
}

const LIMITS: Record<string, RateLimitConfig> = {
  'message:send': { maxRequests: 30, windowSeconds: 60 },
  'typing:start': { maxRequests: 10, windowSeconds: 10 },
  'typing:stop': { maxRequests: 10, windowSeconds: 10 },
  'reaction:add': { maxRequests: 20, windowSeconds: 60 },
  'reaction:remove': { maxRequests: 20, windowSeconds: 60 },
};

@Injectable()
export class WsRateLimiter {
  private readonly logger = new Logger(WsRateLimiter.name);

  constructor(@Inject(REDIS_CLIENT) private readonly redis: Redis) {}

  async check(userId: string, event: string): Promise<boolean> {
    const config = LIMITS[event];
    if (!config) return true;

    const key = `ratelimit:${userId}:${event}`;

    // Atomic: INCR + conditional EXPIRE in a single pipeline
    const pipeline = this.redis.pipeline();
    pipeline.incr(key);
    pipeline.ttl(key);
    const results = await pipeline.exec();

    const current = results?.[0]?.[1] as number ?? 1;
    const ttl = results?.[1]?.[1] as number ?? -1;

    // If key has no TTL (new key or TTL lost), set it
    if (ttl < 0) {
      await this.redis.expire(key, config.windowSeconds);
    }

    if (current > config.maxRequests) {
      this.logger.warn(`Rate limit exceeded: user=${userId} event=${event} count=${current}`);
      return false;
    }

    return true;
  }
}
