import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { AppModule } from './app.module';
import * as fs from 'fs';
import * as path from 'path';

async function generateSwagger() {
    const app = await NestFactory.create(AppModule, { logger: false });

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

    // Export to apps/web/openapi.json
    const outputPath = path.join(__dirname, '../../web/openapi.json');
    fs.writeFileSync(outputPath, JSON.stringify(document, null, 2));

    console.log(`✅ OpenAPI spec exported to: ${outputPath}`);

    await app.close();
    process.exit(0);
}

generateSwagger();
