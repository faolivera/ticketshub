import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import type {
  FileStorageProvider,
  FileMetadata,
  StoredFile,
} from './file-storage-provider.interface';

/**
 * Local filesystem storage provider.
 * Stores files in backend/data/uploaded/docs/
 */
@Injectable()
export class LocalFileStorageProvider implements FileStorageProvider {
  private readonly basePath: string;

  constructor() {
    this.basePath = path.join(process.cwd(), 'data', 'uploaded', 'docs');
  }

  async store(
    key: string,
    content: Buffer,
    metadata: FileMetadata,
  ): Promise<StoredFile> {
    await fs.mkdir(this.basePath, { recursive: true });
    const filePath = path.join(this.basePath, key);
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
}
