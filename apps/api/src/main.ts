import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Enable CORS
  app.enableCors({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
  });

  // Swagger/OpenAPI Configuration
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

  const port = process.env.API_PORT || process.env.PORT || 3001;
  await app.listen(port, '0.0.0.0');
  console.log(`🚀 API running on http://localhost:${port}`);
  console.log(`📚 Swagger UI: http://localhost:${port}/api/docs`);
}
bootstrap();
