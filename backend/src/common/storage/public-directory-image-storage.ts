import { Injectable } from '@nestjs/common';
import * as fs from 'fs/promises';
import * as path from 'path';
import type { ImageStorage } from './image-storage.interface';
import type { Image } from '../../modules/images/images.domain';

/**
 * Image storage implementation that stores images in the public directory
 */
@Injectable()
export class PublicDirectoryImageStorage implements ImageStorage {
  private readonly uploadDir: string;
  private readonly publicDir: string;

  constructor() {
    // Path to backend/public/images/upload
    // Use process.cwd() so it works with CommonJS builds (and when running `node dist/main`)
    this.publicDir = path.join(process.cwd(), 'public');
    this.uploadDir = path.join(this.publicDir, 'images', 'upload');
  }

  /**
   * Detect file extension from buffer content (magic bytes)
   */
  private detectFileExtension(buffer: Buffer): string {
    // Check magic bytes for common image formats
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
      return '.jpg';
    }
    if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
      return '.png';
    }
    if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
      return '.gif';
    }
    if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46) {
      // Could be WebP or other RIFF format, check further
      if (buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
        return '.webp';
      }
    }
    // Default to .jpg if unknown
    return '.jpg';
  }

  /**
   * Write image content to storage
   */
  async write(id: string, content: Buffer): Promise<Image> {
    // Ensure upload directory exists
    await fs.mkdir(this.uploadDir, { recursive: true });

    // Detect file extension from buffer
    const fileExtension = this.detectFileExtension(content);
    const filename = `${id}${fileExtension}`;
    const filePath = path.join(this.uploadDir, filename);

    // Write file to disk
    await fs.writeFile(filePath, content);

    // Create image object
    const src = `/images/upload/${filename}`;
    const image: Image = {
      id,
      src,
    };

    return image;
  }

  /**
   * Delete image from storage
   */
  async delete(id: string): Promise<boolean> {
    // We need to find the file by id, but we don't know the extension
    // Try common extensions
    const extensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    
    for (const ext of extensions) {
      const filename = `${id}${ext}`;
      const filePath = path.join(this.uploadDir, filename);
      
      try {
        await fs.unlink(filePath);
        return true;
      } catch (error) {
        // File might not exist with this extension, try next
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
          // Some other error occurred
          console.warn(`Failed to delete file ${filePath}:`, error);
        }
      }
    }
    
    return false;
  }
}

