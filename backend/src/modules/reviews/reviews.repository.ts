import { Injectable, OnModuleInit } from '@nestjs/common';
import { KeyValueFileStorage } from '../../common/storage/key-value-file-storage';
import type { Ctx } from '../../common/types/context';
import type { Review } from './reviews.domain';

@Injectable()
export class ReviewsRepository implements OnModuleInit {
  private readonly storage: KeyValueFileStorage<Review>;

  constructor() {
    this.storage = new KeyValueFileStorage<Review>('reviews');
  }

  /**
   * Load data from file storage when module initializes
   */
  async onModuleInit(): Promise<void> {
    await this.storage.onModuleInit();
  }

  /**
   * Create a new review
   */
  async create(ctx: Ctx, review: Review): Promise<Review> {
    await this.storage.set(ctx, review.id, review);
    return review;
  }

  /**
   * Find review by ID
   */
  async findById(ctx: Ctx, id: string): Promise<Review | undefined> {
    return await this.storage.get(ctx, id);
  }

  /**
   * Get all reviews
   */
  async getAll(ctx: Ctx): Promise<Review[]> {
    return await this.storage.getAll(ctx);
  }

  /**
   * Find review by transaction and reviewer
   */
  async findByTransactionAndReviewer(
    ctx: Ctx,
    transactionId: string,
    reviewerId: string,
  ): Promise<Review | undefined> {
    const all = await this.storage.getAll(ctx);
    return all.find(
      (r) => r.transactionId === transactionId && r.reviewerId === reviewerId,
    );
  }

  /**
   * Get reviews by transaction ID
   */
  async getByTransactionId(ctx: Ctx, transactionId: string): Promise<Review[]> {
    const all = await this.storage.getAll(ctx);
    return all.filter((r) => r.transactionId === transactionId);
  }

  /**
   * Get reviews where user is the reviewee with a specific role
   */
  async getByRevieweeIdAndRole(
    ctx: Ctx,
    revieweeId: string,
    revieweeRole: 'buyer' | 'seller',
  ): Promise<Review[]> {
    const all = await this.storage.getAll(ctx);
    return all
      .filter((r) => r.revieweeId === revieweeId && r.revieweeRole === revieweeRole)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }

  /**
   * Get reviews by reviewer ID
   */
  async getByReviewerId(ctx: Ctx, reviewerId: string): Promise<Review[]> {
    const all = await this.storage.getAll(ctx);
    return all
      .filter((r) => r.reviewerId === reviewerId)
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }
}
