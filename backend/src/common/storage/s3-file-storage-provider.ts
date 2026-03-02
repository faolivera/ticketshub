import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { Injectable } from '@nestjs/common';
import type {
  FileStorageProvider,
  FileMetadata,
  StoredFile,
} from './file-storage-provider.interface';
import type { StorageConfig } from './storage-config';

export interface S3FileStorageProviderOptions {
  bucket: string;
  config: StorageConfig;
}

/**
 * S3 implementation of FileStorageProvider.
 * When config.endpoint is set (LocalStack), ensures the bucket exists on first use.
 */
@Injectable()
export class S3FileStorageProvider implements FileStorageProvider {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly config: StorageConfig;
  private bucketEnsured = false;

  constructor(options: S3FileStorageProviderOptions) {
    this.bucket = options.bucket;
    this.config = options.config;

    this.client = new S3Client({
      region: options.config.region,
      endpoint: options.config.endpoint,
      credentials: {
        accessKeyId: options.config.accessKeyId,
        secretAccessKey: options.config.secretAccessKey,
      },
      forcePathStyle: !!options.config.endpoint,
    });
  }

  private async ensureBucket(): Promise<void> {
    if (this.bucketEnsured) return;
    if (!this.config.endpoint) {
      this.bucketEnsured = true;
      return;
    }
    try {
      await this.client.send(
        new CreateBucketCommand({ Bucket: this.bucket }),
      );
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'name' in err ? (err as { name: string }).name : '';
      if (code === 'BucketAlreadyExists' || code === 'BucketAlreadyOwnedByYou') {
        // Bucket exists; continue
      } else {
        throw err;
      }
    }
    this.bucketEnsured = true;
  }

  async store(
    key: string,
    content: Buffer,
    metadata: FileMetadata,
  ): Promise<StoredFile> {
    await this.ensureBucket();

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: content,
        ContentType: metadata.contentType,
        ContentLength: metadata.contentLength,
      }),
    );

    const location = this.config.endpoint
      ? `${this.config.endpoint}/${this.bucket}/${key}`
      : `s3://${this.bucket}/${key}`;

    return {
      key,
      metadata,
      location,
    };
  }

  async retrieve(key: string): Promise<Buffer | null> {
    try {
      const response = await this.client.send(
        new GetObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      if (!response.Body) return null;
      const chunks: Uint8Array[] = [];
      for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
        chunks.push(chunk);
      }
      return Buffer.concat(chunks);
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'name' in err ? (err as { name: string }).name : '';
      if (code === 'NoSuchKey' || code === 'NotFound') return null;
      throw err;
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new DeleteObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch {
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client.send(
        new HeadObjectCommand({
          Bucket: this.bucket,
          Key: key,
        }),
      );
      return true;
    } catch (err: unknown) {
      const code = err && typeof err === 'object' && 'name' in err ? (err as { name: string }).name : '';
      if (code === 'NotFound' || code === 'NoSuchKey') return false;
      throw err;
    }
  }

  async getSignedUrl(key: string, expiresInSeconds: number): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}
