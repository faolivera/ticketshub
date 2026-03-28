import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UseGuards,
  Inject,
  Req,
  Res,
  NotFoundException,
} from '@nestjs/common';
import { ThrottleAuthenticated } from '../../common/throttler';
import { Response, Request } from 'express';
import { TermsService } from './terms.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type { AuthenticatedUserPublicInfo } from '../users/users.domain';
import { TermsUserType } from './terms.domain';
import type {
  GetCurrentTermsResponse,
  AcceptTermsRequest,
  AcceptTermsResponse,
  GetTermsStatusResponse,
} from './terms.api';

@Controller('api/terms')
export class TermsController {
  constructor(
    @Inject(TermsService)
    private readonly termsService: TermsService,
  ) {}

  @Get('current/:userType')
  async getCurrentTerms(
    @Context() ctx: Ctx,
    @Param('userType') userType: string,
  ): Promise<ApiResponse<GetCurrentTermsResponse>> {
    if (!Object.values(TermsUserType).includes(userType as TermsUserType)) {
      throw new NotFoundException(`Invalid user type: ${userType}`);
    }

    const terms = await this.termsService.getCurrentTerms(
      ctx,
      userType as TermsUserType,
    );

    return {
      success: true,
      data: terms,
    };
  }

  @Get(':versionId/content')
  async getTermsContent(
    @Context() ctx: Ctx,
    @Param('versionId') versionId: string,
    @Res() res: Response,
  ): Promise<void> {
    const html = await this.termsService.getTermsContent(ctx, versionId);
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(html);
  }

  @Post(':versionId/accept')
  @ThrottleAuthenticated()
  @UseGuards(JwtAuthGuard)
  async acceptTerms(
    @Context() ctx: Ctx,
    @Param('versionId') versionId: string,
    @Body() body: AcceptTermsRequest,
    @User() user: AuthenticatedUserPublicInfo,
    @Req() req: Request,
  ): Promise<ApiResponse<AcceptTermsResponse>> {
    const ipAddress =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0] ||
      req.socket.remoteAddress ||
      undefined;
    const userAgent = req.headers['user-agent'];

    const acceptance = await this.termsService.acceptTerms(
      ctx,
      user.id,
      versionId,
      body.method,
      ipAddress,
      userAgent,
    );

    return {
      success: true,
      data: {
        acceptanceId: acceptance.id,
        termsVersionId: acceptance.termsVersionId,
        acceptedAt: acceptance.respondedAt as Date,
      },
    };
  }

  @Get('status')
  @ThrottleAuthenticated()
  @UseGuards(JwtAuthGuard)
  async getTermsStatus(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<GetTermsStatusResponse>> {
    const status = await this.termsService.getUserTermsStatus(ctx, user.id);

    return {
      success: true,
      data: status,
    };
  }

}
