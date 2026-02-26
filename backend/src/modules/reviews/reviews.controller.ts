import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Inject,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { OptionalJwtAuthGuard } from '../../common/guards/optional-jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type {
  CreateReviewRequest,
  CreateReviewResponse,
  GetUserReviewMetricsResponse,
  GetTransactionReviewsResponse,
} from './reviews.api';

@Controller('api/reviews')
export class ReviewsController {
  constructor(
    @Inject(ReviewsService)
    private readonly reviewsService: ReviewsService,
  ) {}

  /**
   * Create a review for a transaction
   */
  @Post()
  @UseGuards(JwtAuthGuard)
  async createReview(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: CreateReviewRequest,
  ): Promise<ApiResponse<CreateReviewResponse>> {
    const review = await this.reviewsService.createReview(ctx, user.id, body);
    return { success: true, data: review };
  }

  /**
   * Get seller review metrics
   */
  @Get('seller/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  async getSellerMetrics(
    @Context() ctx: Ctx,
    @Param('userId') userId: string,
  ): Promise<ApiResponse<GetUserReviewMetricsResponse>> {
    const metrics = await this.reviewsService.getSellerMetrics(ctx, userId);
    return { success: true, data: metrics };
  }

  /**
   * Get buyer review metrics
   */
  @Get('buyer/:userId')
  @UseGuards(OptionalJwtAuthGuard)
  async getBuyerMetrics(
    @Context() ctx: Ctx,
    @Param('userId') userId: string,
  ): Promise<ApiResponse<GetUserReviewMetricsResponse>> {
    const metrics = await this.reviewsService.getBuyerMetrics(ctx, userId);
    return { success: true, data: metrics };
  }

  /**
   * Get reviews for a transaction
   */
  @Get('transaction/:transactionId')
  @UseGuards(JwtAuthGuard)
  async getTransactionReviews(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Param('transactionId') transactionId: string,
  ): Promise<ApiResponse<GetTransactionReviewsResponse>> {
    const reviews = await this.reviewsService.getTransactionReviews(
      ctx,
      transactionId,
      user.id,
    );
    return { success: true, data: reviews };
  }
}
