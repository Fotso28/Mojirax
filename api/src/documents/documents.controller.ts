import {
  Controller,
  Get,
  Param,
  Res,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Response } from 'express';
import { DocumentStorageService } from './document-storage.service';
import * as path from 'path';

/**
 * Dev-only controller that serves documents from local storage.
 * In production, documents are served directly by MinIO.
 */
@Controller('documents')
export class DocumentsController {
  private readonly logger = new Logger(DocumentsController.name);
  private readonly isDev: boolean;

  constructor(
    private readonly storageService: DocumentStorageService,
    private readonly config: ConfigService,
  ) {
    this.isDev = this.config.get('NODE_ENV') !== 'production';
  }

  @Get(':projectId/:filename')
  async serveDocument(
    @Param('projectId') projectId: string,
    @Param('filename') filename: string,
    @Res() res: Response,
  ): Promise<void> {
    if (!this.isDev) {
      throw new NotFoundException();
    }

    const buffer = await this.storageService.getBuffer(projectId, filename);

    const ext = path.extname(filename).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.pdf': 'application/pdf',
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
    };

    const contentType = mimeMap[ext] || 'application/octet-stream';

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', buffer.length);
    res.send(buffer);
  }
}
