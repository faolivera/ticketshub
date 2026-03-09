import { Module, Global } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  PRIVATE_STORAGE_PROVIDER,
  PUBLIC_STORAGE_PROVIDER,
} from './file-storage-provider.interface';
import type { StorageConfig } from './storage-config';
import { S3FileStorageProvider } from './s3-file-storage-provider';

function getStorageConfigFrom(configService: ConfigService): StorageConfig {
  const region = configService.get<string>('storage.region');
  const accessKeyId = configService.get<string>('storage.accessKeyId');
  const secretAccessKey = configService.get<string>('storage.secretAccessKey');
  const privateBucket = configService.get<string>('storage.privateBucket');
  const publicBucket = configService.get<string>('storage.publicBucket');
  const endpoint = configService.get<string>('storage.endpoint');
  const signedUrlEndpoint = configService.get<string>(
    'storage.signedUrlEndpoint',
  );
  if (
    !region ||
    !accessKeyId ||
    !secretAccessKey ||
    !privateBucket ||
    !publicBucket
  ) {
    throw new Error(
      'Missing required storage config. Set AWS_* / S3_* env vars or configure in HOCON (config/prod.conf).',
    );
  }
  return {
    region,
    accessKeyId,
    secretAccessKey,
    endpoint: endpoint || undefined,
    signedUrlEndpoint: signedUrlEndpoint || undefined,
    privateBucket,
    publicBucket,
  };
}

/**
 * Global storage module providing S3-backed file storage.
 * - PRIVATE_STORAGE_PROVIDER: authenticated-only files (identity docs, payment confirmations).
 * - PUBLIC_STORAGE_PROVIDER: public assets (event banners, avatars); access via signed URLs.
 * Config is read from HOCON (config/*.conf); see storage.* keys.
 */
@Global()
@Module({
  providers: [
    {
      provide: PRIVATE_STORAGE_PROVIDER,
      useFactory: (configService: ConfigService): S3FileStorageProvider => {
        const config = getStorageConfigFrom(configService);
        return new S3FileStorageProvider({
          bucket: config.privateBucket,
          config,
        });
      },
      inject: [ConfigService],
    },
    {
      provide: PUBLIC_STORAGE_PROVIDER,
      useFactory: (configService: ConfigService): S3FileStorageProvider => {
        const config = getStorageConfigFrom(configService);
        return new S3FileStorageProvider({
          bucket: config.publicBucket,
          config,
        });
      },
      inject: [ConfigService],
    },
  ],
  exports: [PRIVATE_STORAGE_PROVIDER, PUBLIC_STORAGE_PROVIDER],
})
export class StorageModule {}
