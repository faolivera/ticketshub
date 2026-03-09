import {
  Controller,
  Get,
  Patch,
  Body,
  Inject,
  UseGuards,
} from '@nestjs/common';
import { Context } from '../../common/decorators/ctx.decorator';
import { ValidateResponse } from '../../common/decorators/validate-response.decorator';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { Role } from '../users/users.domain';
import type { ApiResponse } from '../../common/types/api';
import type { Ctx } from '../../common/types/context';
import type {
  GetPlatformConfigResponse,
  UpdatePlatformConfigRequest,
  UpdatePlatformConfigResponse,
} from './config.api';
import {
  GetPlatformConfigResponseSchema,
  UpdatePlatformConfigResponseSchema,
} from './schemas/api.schemas';
import { PlatformConfigService } from './config.service';

/**
 * Admin-only controller for platform configuration.
 * Only users with Admin role can read and update platform settings.
 */
@Controller('api/admin/config')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.Admin)
export class ConfigController {
  constructor(
    @Inject(PlatformConfigService)
    private readonly platformConfigService: PlatformConfigService,
  ) {}

  @Get('platform')
  @ValidateResponse(GetPlatformConfigResponseSchema)
  async getPlatformConfig(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<GetPlatformConfigResponse>> {
    const data =
      await this.platformConfigService.getPlatformConfigForAdmin(ctx);
    return { success: true, data };
  }

  @Patch('platform')
  @ValidateResponse(UpdatePlatformConfigResponseSchema)
  async updatePlatformConfig(
    @Context() ctx: Ctx,
    @Body() body: UpdatePlatformConfigRequest,
  ): Promise<ApiResponse<UpdatePlatformConfigResponse>> {
    const data = await this.platformConfigService.updatePlatformConfig(
      ctx,
      body,
    );
    return { success: true, data };
  }
}
