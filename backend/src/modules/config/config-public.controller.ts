import { Controller, Get, Inject, UseGuards } from '@nestjs/common';
import { Context } from '../../common/decorators/ctx.decorator';
import { ValidateResponse } from '../../common/decorators/validate-response.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import type { ApiResponse } from '../../common/types/api';
import type { Ctx } from '../../common/types/context';
import type { GetSellerPricingResponse } from './config.api';
import { GetSellerPricingResponseSchema } from './schemas/api.schemas';
import { PlatformConfigService } from './config.service';

/**
 * Controller for config values needed by authenticated (non-admin) flows,
 * e.g. seller platform fee % for the sell-ticket pricing summary.
 */
@Controller('api/config')
@UseGuards(JwtAuthGuard)
export class ConfigPublicController {
  constructor(
    @Inject(PlatformConfigService)
    private readonly platformConfigService: PlatformConfigService,
  ) {}

  @Get('seller-pricing')
  @ValidateResponse(GetSellerPricingResponseSchema)
  async getSellerPricing(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<GetSellerPricingResponse>> {
    const config = await this.platformConfigService.getPlatformConfig(ctx);
    const data: GetSellerPricingResponse = {
      sellerPlatformFeePercentage: config.sellerPlatformFeePercentage,
    };
    return { success: true, data };
  }
}
