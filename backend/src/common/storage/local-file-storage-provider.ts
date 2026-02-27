import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  FileStorageProvider,
  FileMetadata,
  StoredFile,
} from './file-storage-provider.interface';

/**
 * Base class for local filesystem storage providers.
 */
abstract class BaseLocalStorageProvider implements FileStorageProvider {
  protected abstract readonly basePath: string;

  async store(
    key: string,
    content: Buffer,
    metadata: FileMetadata,
  ): Promise<StoredFile> {
    const filePath = path.join(this.basePath, key);
    const fileDir = path.dirname(filePath);
    await fs.mkdir(fileDir, { recursive: true });
    await fs.writeFile(filePath, content);

    return {
      key,
      metadata,
      location: filePath,
    };
  }

  async retrieve(key: string): Promise<Buffer | null> {
    const filePath = path.join(this.basePath, key);
    try {
      return await fs.readFile(filePath);
    } catch {
      return null;
    }
  }

  async delete(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key);
    try {
      await fs.unlink(filePath);
      return true;
    } catch {
      return false;
    }
  }

  async exists(key: string): Promise<boolean> {
    const filePath = path.join(this.basePath, key);
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  getFilePath(key: string): string {
    return path.join(this.basePath, key);
  }
}

/**
 * Private file storage provider for authenticated-only files.
 * Stores files in data/private/
 * Use for: payment confirmations, identity documents, etc.
 */
@Injectable()
export class PrivateFileStorageProvider extends BaseLocalStorageProvider {
  protected readonly basePath = path.join(process.cwd(), 'data', 'private');
}

/**
 * Public file storage provider for statically-served files.
 * Stores files in data/public/
 * Use for: event banners, public images, etc.
 */
@Injectable()
export class PublicFileStorageProvider extends BaseLocalStorageProvider {
  protected readonly basePath = path.join(process.cwd(), 'data', 'public');
}

