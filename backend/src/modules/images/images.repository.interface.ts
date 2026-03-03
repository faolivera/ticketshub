import type { Ctx } from '../../common/types/context';
import type { Image } from './images.domain';

/**
 * Images repository interface
 */
export interface IImagesRepository {
  /**
   * Find image by ID
   */
  findById(ctx: Ctx, id: string): Promise<Image | undefined>;

  /**
   * Find multiple images by IDs
   */
  findByIds(ctx: Ctx, ids: string[]): Promise<Image[]>;

  /**
   * Save an image
   */
  set(ctx: Ctx, image: Image): Promise<void>;
}

/**
 * Injection token for IImagesRepository
 */
export const IMAGES_REPOSITORY = Symbol('IImagesRepository');
