import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  Inject,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import { ThrottleAuthenticated } from '../../common/throttler';
import { PromotionCodesService } from './promotion-codes.service';
import { Context } from '../../common/decorators/ctx.decorator';
import { User } from '../../common/decorators/user.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type { ApiResponse } from '../../common/types/api';
import type { Ctx } from '../../common/types/context';
import type {
  ClaimPromotionCodeRequest,
  ClaimPromotionCodeResponse,
  CheckSellerPromotionCodeResponse,
} from './promotions.api';
import { ClaimPromotionCodeRequestSchema } from './schemas/api.schemas';

@ThrottleAuthenticated()
@Controller('api/promotions')
@UseGuards(JwtAuthGuard)
export class PromotionsClaimController {
  constructor(
    @Inject(PromotionCodesService)
    private readonly promotionCodesService: PromotionCodesService,
  ) {}

  @Get('seller/check')
  async checkSellerCode(
    @Context() ctx: Ctx,
    @Query('code') code: string | undefined,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<CheckSellerPromotionCodeResponse | null>> {
    if (!code || typeof code !== 'string' || !code.trim()) {
      return { success: true, data: null };
    }
    const data = await this.promotionCodesService.checkSellerPromotionCode(
      ctx,
      code.trim(),
      user.id,
    );
    return { success: true, data };
  }

  @Post('claim')
  async claim(
    @Context() ctx: Ctx,
    @Body() body: unknown,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<ClaimPromotionCodeResponse>> {
    const parsed = ClaimPromotionCodeRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new BadRequestException(parsed.error.flatten().fieldErrors);
    }
    const { code, role } = parsed.data as ClaimPromotionCodeRequest;
    const promotion = await this.promotionCodesService.claimPromotionCode(
      ctx,
      role,
      code.trim(),
      user.id,
    );
    return { success: true, data: promotion };
  }
}
