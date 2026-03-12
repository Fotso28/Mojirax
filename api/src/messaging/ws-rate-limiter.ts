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
    const current = await this.redis.incr(key);

    if (current === 1) {
      await this.redis.expire(key, config.windowSeconds);
    }

    if (current > config.maxRequests) {
      this.logger.warn(`Rate limit exceeded: user=${userId} event=${event} count=${current}`);
      return false;
    }

    return true;
  }
}
