import { NestFactory } from '@nestjs/core';
import { Logger, ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { RedisIoAdapter } from './messaging/redis-io.adapter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const logger = new Logger('Bootstrap');

  // WebSocket: Redis-backed Socket.io adapter
  const redisIoAdapter = new RedisIoAdapter(app);
  await redisIoAdapter.connectToRedis();
  app.useWebSocketAdapter(redisIoAdapter);

  // Security: Helmet headers
  if (process.env.NODE_ENV === 'production') {
    app.use(helmet());
  }

  // Enable validation — strict mode
  app.useGlobalPipes(new ValidationPipe({
    whitelist: true,
    forbidNonWhitelisted: true,
    transform: true,
  }));

  // Enable CORS
  app.enableCors({
    origin: [
      process.env.FRONTEND_URL || 'http://localhost:3000',
      'http://127.0.0.1:3000',
      'http://localhost:3000',
      'http://localhost:5000',
      'http://127.0.0.1:5000',
      'http://localhost:5002',
      'http://127.0.0.1:5002'
    ],
    credentials: true,
  });

  // Swagger/OpenAPI — dev only
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Co-Founder API')
      .setDescription('API for Co-Founder matching platform')
      .setVersion('1.0')
      .addTag('health', 'Health check endpoints')
      .addTag('auth', 'Authentication endpoints')
      .addTag('candidates', 'Candidate profile endpoints')
      .addTag('projects', 'Project endpoints')
      .addBearerAuth()
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  const port = process.env.API_PORT || process.env.PORT || 5001;
  await app.listen(port, '0.0.0.0');
  logger.log(`API running on http://localhost:${port}`);
}
bootstrap();
