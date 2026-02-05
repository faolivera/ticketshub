import type { Image } from '../../modules/images/images.domain';

/**
 * Interface for image storage implementations
 */
export interface ImageStorage {
  /**
   * Write image content to storage
   * @param id Unique identifier for the image
   * @param content Image content as Buffer
   * @returns The created Image object with id and src
   */
  write(id: string, content: Buffer): Promise<Image>;

  /**
   * Delete image from storage
   * @param id Unique identifier for the image
   * @returns true if deletion was successful, false otherwise
   */
  delete(id: string): Promise<boolean>;
}

