import {
  Controller,
  Get,
  Param,
  Query,
  Inject,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { BffService } from './bff.service';
import { Context } from '../../common/decorators/ctx.decorator';
import { User } from '../../common/decorators/user.decorator';
import { ValidateResponse } from '../../common/decorators/validate-response.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { ApiResponse } from '../../common/types/api';
import type { Ctx } from '../../common/types/context';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type {
  GetSellerProfileResponse,
  GetEventListingsResponse,
  GetMyTicketsResponse,
} from './bff.api';
import {
  GetSellerProfileResponseSchema,
  GetEventListingsResponseSchema,
  GetMyTicketsResponseSchema,
} from './schemas/api.schemas';

@Controller('api')
export class BffController {
  constructor(
    @Inject(BffService)
    private readonly bffService: BffService,
  ) {}

  /**
   * Get seller profile (BFF aggregation)
   */
  @Get('sellers/:id')
  @ValidateResponse(GetSellerProfileResponseSchema)
  async getSellerProfile(
    @Context() ctx: Ctx,
    @Param('id') sellerId: string,
  ): Promise<ApiResponse<GetSellerProfileResponse>> {
    const profile = await this.bffService.getSellerProfile(ctx, sellerId);
    return { success: true, data: profile };
  }

  /**
   * Get current user's tickets: bought, sold, and listed (authenticated)
   */
  @Get('my-tickets')
  @UseGuards(JwtAuthGuard)
  @ValidateResponse(GetMyTicketsResponseSchema)
  async getMyTickets(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<GetMyTicketsResponse>> {
    const data = await this.bffService.getMyTickets(ctx, user.id);
    return { success: true, data };
  }

  /**
   * Get event listings enriched with seller info (BFF aggregation)
   */
  @Get('listings')
  @ValidateResponse(GetEventListingsResponseSchema)
  async getEventListings(
    @Context() ctx: Ctx,
    @Query('eventId') eventId: string,
  ): Promise<ApiResponse<GetEventListingsResponse>> {
    if (!eventId) {
      throw new BadRequestException('eventId query parameter is required');
    }
    const listings = await this.bffService.getEventListings(ctx, eventId);
    return { success: true, data: listings };
  }
}
