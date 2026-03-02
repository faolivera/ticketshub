import { Module, Global } from '@nestjs/common';
import {
  PRIVATE_STORAGE_PROVIDER,
  PUBLIC_STORAGE_PROVIDER,
} from './file-storage-provider.interface';
import { S3FileStorageProvider } from './s3-file-storage-provider';
import { getStorageConfig } from './storage-config';

/**
 * Global storage module providing S3-backed file storage.
 * - PRIVATE_STORAGE_PROVIDER: authenticated-only files (identity docs, payment confirmations).
 * - PUBLIC_STORAGE_PROVIDER: public assets (event banners, avatars); access via signed URLs.
 *
 * Config via env: AWS_REGION, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
 * S3_PRIVATE_BUCKET, S3_PUBLIC_BUCKET; optional S3_ENDPOINT for LocalStack.
 */
@Global()
@Module({
  providers: [
    {
      provide: PRIVATE_STORAGE_PROVIDER,
      useFactory: (): S3FileStorageProvider => {
        const config = getStorageConfig();
        return new S3FileStorageProvider({
          bucket: config.privateBucket,
          config,
        });
      },
    },
    {
      provide: PUBLIC_STORAGE_PROVIDER,
      useFactory: (): S3FileStorageProvider => {
        const config = getStorageConfig();
        return new S3FileStorageProvider({
          bucket: config.publicBucket,
          config,
        });
      },
    },
  ],
  exports: [PRIVATE_STORAGE_PROVIDER, PUBLIC_STORAGE_PROVIDER],
})
export class StorageModule {}
