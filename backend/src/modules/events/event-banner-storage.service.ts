import { Injectable, Inject } from '@nestjs/common';
import type { EventBannerType } from './events.domain';
import {
  PUBLIC_STORAGE_PROVIDER,
  type FileStorageProvider,
} from '../../common/storage/file-storage-provider.interface';

/**
 * Prefix for event banners in public storage
 */
const BANNERS_PREFIX = 'event-banners';

/**
 * Storage service for event banner images.
 * Files are stored in S3 (public bucket); URLs are signed URLs.
 */
@Injectable()
export class EventBannerStorageService {
  constructor(
    @Inject(PUBLIC_STORAGE_PROVIDER)
    private readonly storageProvider: FileStorageProvider,
  ) {}

  /**
   * Get the storage key for an event's banner
   */
  private getStorageKey(eventId: string, filename: string): string {
    return `${BANNERS_PREFIX}/${eventId}/${filename}`;
  }

  /**
   * Get extension from mime type
   */
  private getExtension(mimeType: string): string {
    switch (mimeType) {
      case 'image/png':
        return 'png';
      case 'image/jpeg':
        return 'jpg';
      case 'image/webp':
        return 'webp';
      default:
        return 'bin';
    }
  }

  /**
   * Store a banner file
   * @returns The filename that was stored (e.g., "square.png")
   */
  async store(
    eventId: string,
    type: EventBannerType,
    buffer: Buffer,
    mimeType: string,
  ): Promise<string> {
    const ext = this.getExtension(mimeType);
    const filename = `${type}.${ext}`;
    const key = this.getStorageKey(eventId, filename);

    await this.storageProvider.store(key, buffer, {
      contentType: mimeType,
      contentLength: buffer.length,
      originalFilename: filename,
    });

    return filename;
  }

  /**
   * Delete a banner file for an event
   * Tries all known extensions since we store with mime-based extension
   */
  async delete(eventId: string, type: EventBannerType): Promise<boolean> {
    const extensions = ['png', 'jpg', 'webp'];

    for (const ext of extensions) {
      const filename = `${type}.${ext}`;
      const key = this.getStorageKey(eventId, filename);

      const deleted = await this.storageProvider.delete(key);
      if (deleted) {
        return true;
      }
    }

    return false;
  }

  /**
   * Delete a specific banner file by exact filename
   */
  async deleteByFilename(eventId: string, filename: string): Promise<boolean> {
    const key = this.getStorageKey(eventId, filename);
    return this.storageProvider.delete(key);
  }

  /**
   * Check if a banner file exists for an event
   */
  async exists(eventId: string, type: EventBannerType): Promise<boolean> {
    const extensions = ['png', 'jpg', 'webp'];

    for (const ext of extensions) {
      const filename = `${type}.${ext}`;
      const key = this.getStorageKey(eventId, filename);

      const fileExists = await this.storageProvider.exists(key);
      if (fileExists) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get a public URL for a banner (static S3 URL or local fallback).
   */
  getPublicUrl(
    eventId: string,
    filename: string,
  ): string {
    const key = this.getStorageKey(eventId, filename);
    if (this.storageProvider.getPublicUrl) {
      return this.storageProvider.getPublicUrl(key);
    }
    return `/public/${BANNERS_PREFIX}/${eventId}/${filename}`;
  }

  /**
   * Read file content as buffer (for migration/analysis)
   */
  async readFile(eventId: string, filename: string): Promise<Buffer | null> {
    const key = this.getStorageKey(eventId, filename);
    return this.storageProvider.retrieve(key);
  }
}
