import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
    S3Client,
    PutObjectCommand,
    DeleteObjectCommand,
    CreateBucketCommand,
    HeadBucketCommand,
    PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import sharp from 'sharp';

export interface ImageUploadOptions {
    width: number;
    height: number;
    quality?: number;
}

@Injectable()
export class UploadService implements OnModuleInit {
    private readonly logger = new Logger(UploadService.name);
    private s3: S3Client;
    private bucket: string;
    private endpoint: string;
    private publicUrl: string;
    private available = false;

    constructor(private config: ConfigService) {
        this.endpoint = this.config.get('MINIO_ENDPOINT', 'http://localhost:9000');
        this.publicUrl = this.config.get('MINIO_PUBLIC_URL', 'http://localhost:9000');
        this.bucket = this.config.get('MINIO_BUCKET', 'co-founder-avatars');

        this.s3 = new S3Client({
            endpoint: this.endpoint,
            region: 'us-east-1',
            credentials: {
                accessKeyId: this.config.getOrThrow<string>('MINIO_ACCESS_KEY'),
                secretAccessKey: this.config.getOrThrow<string>('MINIO_SECRET_KEY'),
            },
            forcePathStyle: true,
        });
    }

    isAvailable(): boolean {
        return this.available;
    }

    async onModuleInit() {
        try {
            try {
                await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
                this.logger.log(`Bucket "${this.bucket}" exists`);
            } catch {
                this.logger.log(`Creating bucket "${this.bucket}"...`);
                await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
                this.logger.log(`Bucket "${this.bucket}" created`);
            }

            // Set public-read policy so images are accessible from the browser
            const policy = JSON.stringify({
                Version: '2012-10-17',
                Statement: [{
                    Effect: 'Allow',
                    Principal: '*',
                    Action: ['s3:GetObject'],
                    Resource: [`arn:aws:s3:::${this.bucket}/*`],
                }],
            });

            try {
                await this.s3.send(new PutBucketPolicyCommand({
                    Bucket: this.bucket,
                    Policy: policy,
                }));
                this.logger.log(`Public-read policy set on "${this.bucket}"`);
            } catch (error) {
                this.logger.warn(`Failed to set bucket policy:`, error);
            }
            this.available = true;
        } catch (error) {
            this.available = false;
            this.logger.warn(`MinIO unavailable at startup — uploads will fail until MinIO is reachable: ${error.message}`);
        }
    }

    /**
     * Upload générique d'image avec traitement Sharp (filet de sécurité serveur)
     */
    async uploadImage(
        folder: string,
        identifier: string,
        buffer: Buffer,
        options: ImageUploadOptions,
    ): Promise<string> {
        const { width, height, quality = 80 } = options;

        const processed = await sharp(buffer)
            .resize(width, height, { fit: 'cover' })
            .webp({ quality })
            .toBuffer();

        const key = `${folder}/${identifier}-${Date.now()}.webp`;

        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: key,
                Body: processed,
                ContentType: 'image/webp',
                ACL: 'public-read',
            }),
        );

        return `${this.publicUrl}/${this.bucket}/${key}`;
    }

    /**
     * Upload avatar (raccourci avec dimensions prédéfinies)
     */
    async uploadAvatar(userId: string, buffer: Buffer): Promise<string> {
        return this.uploadImage('avatars', userId, buffer, {
            width: 512,
            height: 640,
        });
    }

    /**
     * Upload logo projet (raccourci 1:1)
     */
    async uploadProjectLogo(projectId: string, buffer: Buffer): Promise<string> {
        return this.uploadImage('logos', projectId, buffer, {
            width: 400,
            height: 400,
        });
    }

    /**
     * Upload image pub avec dimensions selon le placement
     */
    async uploadAdImage(adId: string, buffer: Buffer, placement: string): Promise<string> {
        const dimensions: Record<string, { width: number; height: number }> = {
            FEED: { width: 1200, height: 628 },
            SIDEBAR: { width: 600, height: 600 },
            SEARCH: { width: 1200, height: 628 },
        };
        const dim = dimensions[placement] || dimensions.FEED;
        return this.uploadImage('ads', adId, buffer, dim);
    }

    /**
     * Upload générique de fichier brut (PDF, DOCX, etc.) sans traitement Sharp
     */
    async uploadFile(
        folder: string,
        key: string,
        buffer: Buffer,
        contentType: string,
    ): Promise<string> {
        const fullKey = `${folder}/${key}-${Date.now()}`;

        await this.s3.send(
            new PutObjectCommand({
                Bucket: this.bucket,
                Key: fullKey,
                Body: buffer,
                ContentType: contentType,
                ACL: 'public-read',
            }),
        );

        return `${this.publicUrl}/${this.bucket}/${fullKey}`;
    }

    async deleteFile(key: string): Promise<void> {
        try {
            await this.s3.send(
                new DeleteObjectCommand({
                    Bucket: this.bucket,
                    Key: key,
                }),
            );
        } catch (error) {
            this.logger.warn(`Failed to delete file ${key}:`, error);
        }
    }
}
