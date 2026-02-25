import {
  Controller,
  Post,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  Inject,
} from '@nestjs/common';
import { OTPService } from './otp.service';
import { UsersService } from '../users/users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import { ValidateResponse } from '../../common/decorators/validate-response.decorator';
import { AuthenticatedUserPublicInfo } from '../users/users.domain';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type {
  SendOTPRequest,
  SendOTPResponse,
  VerifyOTPRequest,
  VerifyOTPResponse,
} from './otp.api';
import { OTPType } from './otp.domain';
import {
  SendOTPResponseSchema,
  VerifyOTPResponseSchema,
} from './schemas/api.schemas';

@Controller('api/otp')
@UseGuards(JwtAuthGuard)
export class OTPController {
  constructor(
    @Inject(OTPService)
    private readonly otpService: OTPService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ValidateResponse(SendOTPResponseSchema)
  async send(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: SendOTPRequest,
  ): Promise<ApiResponse<SendOTPResponse>> {
    const { type } = body;

    if (!type || !Object.values(OTPType).includes(type)) {
      throw new BadRequestException('Valid OTP type is required');
    }

    const otp = await this.otpService.sendOTP(ctx, user.id, type);

    return {
      success: true,
      data: {
        message: 'OTP sent successfully',
        expiresAt: otp.expiresAt,
      },
    };
  }

  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ValidateResponse(VerifyOTPResponseSchema)
  async verify(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: VerifyOTPRequest,
  ): Promise<ApiResponse<VerifyOTPResponse>> {
    const { type, code } = body;

    if (!type || !Object.values(OTPType).includes(type)) {
      throw new BadRequestException('Valid OTP type is required');
    }

    if (!code || code.length !== 6) {
      throw new BadRequestException('Valid 6-digit code is required');
    }

    await this.otpService.verifyOTP(ctx, user.id, type, code);

    if (type === OTPType.EmailVerification) {
      await this.usersService.markEmailVerified(ctx, user.id);
    } else if (type === OTPType.PhoneVerification) {
      await this.usersService.markPhoneVerified(ctx, user.id);
    }

    return {
      success: true,
      data: {
        verified: true,
        message: 'Verification successful',
      },
    };
  }
}
