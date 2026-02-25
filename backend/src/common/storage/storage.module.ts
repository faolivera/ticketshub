import { Module, Global } from '@nestjs/common';
import { LocalFileStorageProvider } from './local-file-storage-provider';
import { FILE_STORAGE_PROVIDER } from './file-storage-provider.interface';

/**
 * Global storage module providing FileStorageProvider.
 * Currently uses local filesystem; can be swapped to S3 via configuration.
 */
@Global()
@Module({
  providers: [
    {
      provide: FILE_STORAGE_PROVIDER,
      useClass: LocalFileStorageProvider,
    },
  ],
  exports: [FILE_STORAGE_PROVIDER],
})
export class StorageModule {}
