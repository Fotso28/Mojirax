import { Module, Global, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { REDIS_CLIENT } from './redis.constants';

@Global()
@Module({
  providers: [
    {
      provide: REDIS_CLIENT,
      useFactory: (config: ConfigService) => {
        const logger = new Logger('RedisModule');

        const client = new Redis({
          host: config.get('REDIS_HOST') ?? 'localhost',
          port: parseInt(config.get('REDIS_PORT') ?? '6379', 10),
          password: config.get('REDIS_PASSWORD') || undefined,
          maxRetriesPerRequest: null,
          retryStrategy(): null {
            return null;
          },
        });

        client.on('error', (err: Error) => {
          logger.error(`Redis connection failed: ${err.message}`);
          logger.error('Redis is required. Shutting down.');
          process.exit(1);
        });

        client.on('connect', () => {
          logger.log('Redis connected');
        });

        return client;
      },
      inject: [ConfigService],
    },
  ],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
