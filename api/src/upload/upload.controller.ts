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
import { UploadService } from './upload.service';
import * as path from 'path';

/**
 * Dev-only controller that serves uploaded files from local storage.
 * In production, files are served directly by MinIO/S3.
 *
 * Matches URLs like: /uploads/messages/filename
 *                     /uploads/avatars/filename
 *                     /uploads/logos/filename
 */
@Controller('uploads')
export class UploadController {
    private readonly logger = new Logger(UploadController.name);
    private readonly isDev: boolean;

    constructor(
        private readonly uploadService: UploadService,
        private readonly config: ConfigService,
    ) {
        this.isDev = this.config.get('NODE_ENV') !== 'production';
    }

    @Get(':folder/:filename')
    async serveFile(
        @Param('folder') folder: string,
        @Param('filename') filename: string,
        @Res() res: Response,
    ): Promise<void> {
        if (!this.isDev) {
            throw new NotFoundException();
        }

        const relativePath = `${folder}/${filename}`;
        const buffer = await this.uploadService.getLocalFileBuffer(relativePath);

        if (!buffer) {
            throw new NotFoundException(`File not found: ${relativePath}`);
        }

        const ext = path.extname(filename).toLowerCase();
        const mimeMap: Record<string, string> = {
            '.pdf': 'application/pdf',
            '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
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
