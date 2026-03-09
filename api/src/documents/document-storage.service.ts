import {
  Injectable,
  Logger,
  OnModuleInit,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
  PutBucketPolicyCommand,
} from '@aws-sdk/client-s3';
import * as fs from 'fs/promises';
import * as path from 'path';
import { randomUUID } from 'crypto';
import { Readable } from 'stream';

@Injectable()
export class DocumentStorageService implements OnModuleInit {
  private readonly logger = new Logger(DocumentStorageService.name);
  private readonly isDev: boolean;

  // Dev mode
  private readonly uploadsDir = path.join(
    __dirname,
    '..',
    '..',
    'uploads',
    'documents',
  );

  // Prod mode (MinIO / S3)
  private s3: S3Client;
  private readonly bucket = 'co-founder-documents';
  private publicUrl: string;
  private s3Available = false;

  constructor(private readonly config: ConfigService) {
    this.isDev = this.config.get('NODE_ENV') !== 'production';

    if (!this.isDev) {
      const endpoint = this.config.get('MINIO_ENDPOINT', 'http://localhost:9000');
      this.publicUrl = this.config.get('MINIO_PUBLIC_URL', 'http://localhost:9000');

      this.s3 = new S3Client({
        endpoint,
        region: 'us-east-1',
        credentials: {
          accessKeyId: this.config.get('MINIO_ACCESS_KEY', 'minioadmin'),
          secretAccessKey: this.config.get('MINIO_SECRET_KEY', 'minioadmin'),
        },
        forcePathStyle: true,
      });
    }
  }

  async onModuleInit(): Promise<void> {
    if (this.isDev) {
      await fs.mkdir(this.uploadsDir, { recursive: true });
      this.logger.log(
        `Dev mode — documents stored locally in ${this.uploadsDir}`,
      );
      return;
    }

    // Prod: ensure bucket exists
    try {
      try {
        await this.s3.send(new HeadBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" exists`);
      } catch {
        this.logger.log(`Creating bucket "${this.bucket}"...`);
        await this.s3.send(new CreateBucketCommand({ Bucket: this.bucket }));
        this.logger.log(`Bucket "${this.bucket}" created`);
      }

      const policy = JSON.stringify({
        Version: '2012-10-17',
        Statement: [
          {
            Effect: 'Allow',
            Principal: '*',
            Action: ['s3:GetObject'],
            Resource: [`arn:aws:s3:::${this.bucket}/*`],
          },
        ],
      });

      try {
        await this.s3.send(
          new PutBucketPolicyCommand({
            Bucket: this.bucket,
            Policy: policy,
          }),
        );
        this.logger.log(`Public-read policy set on "${this.bucket}"`);
      } catch (error) {
        this.logger.warn('Failed to set bucket policy', error);
      }

      this.s3Available = true;
    } catch (error) {
      this.s3Available = false;
      this.logger.warn(
        `MinIO unavailable at startup — document storage will fail until MinIO is reachable: ${error.message}`,
      );
    }
  }

  /**
   * Store a document and return its public URL.
   *
   * Dev:  /documents/{projectId}/{filename}
   * Prod: {MINIO_PUBLIC_URL}/co-founder-documents/documents/{projectId}/{filename}
   */
  async store(
    projectId: string,
    buffer: Buffer,
    originalName: string,
    mimeType: string,
  ): Promise<string> {
    const ext = path.extname(originalName) || '.bin';
    const filename = `${randomUUID()}${ext}`;
    const key = `documents/${projectId}/${filename}`;

    if (this.isDev) {
      const dir = path.join(this.uploadsDir, projectId);
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, filename), buffer);
      this.logger.log(`Document stored locally: ${key}`);
      return `/documents/${projectId}/${filename}`;
    }

    // Prod — MinIO / S3
    await this.s3.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: buffer,
        ContentType: mimeType,
        ACL: 'public-read',
      }),
    );

    const url = `${this.publicUrl}/${this.bucket}/${key}`;
    this.logger.log(`Document stored in MinIO: ${key}`);
    return url;
  }

  /**
   * Read a document into a Buffer.
   */
  async getBuffer(projectId: string, filename: string): Promise<Buffer> {
    if (this.isDev) {
      const filePath = path.join(this.uploadsDir, projectId, filename);
      try {
        return await fs.readFile(filePath);
      } catch {
        throw new NotFoundException(
          `Document not found: ${projectId}/${filename}`,
        );
      }
    }

    // Prod — MinIO / S3
    const key = `documents/${projectId}/${filename}`;
    try {
      const response = await this.s3.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );

      return Buffer.from(await this.streamToBuffer(response.Body as Readable));
    } catch {
      throw new NotFoundException(
        `Document not found: ${projectId}/${filename}`,
      );
    }
  }

  /**
   * Delete a document.
   */
  async delete(projectId: string, filename: string): Promise<void> {
    if (this.isDev) {
      const filePath = path.join(this.uploadsDir, projectId, filename);
      try {
        await fs.unlink(filePath);
        this.logger.log(`Document deleted locally: ${projectId}/${filename}`);
      } catch {
        this.logger.warn(
          `Failed to delete local document: ${projectId}/${filename}`,
        );
      }
      return;
    }

    // Prod — MinIO / S3
    const key = `documents/${projectId}/${filename}`;
    try {
      await this.s3.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      this.logger.log(`Document deleted from MinIO: ${key}`);
    } catch (error) {
      this.logger.warn(`Failed to delete document ${key}`, error);
    }
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    return Buffer.concat(chunks);
  }
}
