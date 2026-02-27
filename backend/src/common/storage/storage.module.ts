import { Module, Global } from '@nestjs/common';
import {
  PrivateFileStorageProvider,
  PublicFileStorageProvider,
} from './local-file-storage-provider';
import {
  PRIVATE_STORAGE_PROVIDER,
  PUBLIC_STORAGE_PROVIDER,
} from './file-storage-provider.interface';

/**
 * Global storage module providing file storage providers.
 * Currently uses local filesystem; can be swapped to S3 via configuration.
 *
 * Two storage providers are available:
 * - PRIVATE_STORAGE_PROVIDER: For authenticated-only files (data/private/)
 * - PUBLIC_STORAGE_PROVIDER: For statically-served files (data/public/)
 */
@Global()
@Module({
  providers: [
    {
      provide: PRIVATE_STORAGE_PROVIDER,
      useClass: PrivateFileStorageProvider,
    },
    {
      provide: PUBLIC_STORAGE_PROVIDER,
      useClass: PublicFileStorageProvider,
    },
  ],
  exports: [PRIVATE_STORAGE_PROVIDER, PUBLIC_STORAGE_PROVIDER],
})
export class StorageModule {}
