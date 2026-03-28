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
import { isValidInternationalPhone } from '../../common/utils/phone-validator';
import { InvalidPhoneNumberException } from '../../common/exceptions/invalid-phone-number.exception';
import { ThrottleSensitivePublic } from '../../common/throttler';

@Controller('api/otp')
@UseGuards(JwtAuthGuard)
export class OTPController {
  constructor(
    @Inject(OTPService)
    private readonly otpService: OTPService,
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  @ThrottleSensitivePublic()
  @Post('send')
  @HttpCode(HttpStatus.OK)
  @ValidateResponse(SendOTPResponseSchema)
  async send(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: SendOTPRequest,
  ): Promise<ApiResponse<SendOTPResponse>> {
    const { type, phoneNumber: bodyPhone } = body;

    if (!type || !Object.values(OTPType).includes(type)) {
      throw new BadRequestException('Valid OTP type is required');
    }

    if (type === OTPType.PhoneVerification) {
      const phone = bodyPhone ?? user.phone;
      if (!phone?.trim()) {
        throw new BadRequestException(
          'Phone number is required for phone verification',
        );
      }
      if (!isValidInternationalPhone(phone)) {
        throw new InvalidPhoneNumberException(
          'Invalid phone number. Use international format: +[country code][number]',
        );
      }
      if (bodyPhone?.trim()) {
        await this.usersService.setPhone(ctx, user.id, bodyPhone.trim());
      }
    }

    const email =
      type === OTPType.EmailVerification ? user.email : undefined;
    const phone =
      type === OTPType.PhoneVerification
        ? (bodyPhone ?? user.phone)?.trim()
        : undefined;
    const otp = await this.otpService.sendOTP(ctx, user.id, type, {
      email,
      phone,
    });

    return {
      success: true,
      data: {
        message: 'OTP sent successfully',
        expiresAt: otp.expiresAt,
      },
    };
  }

  @ThrottleSensitivePublic()
  @Post('verify')
  @HttpCode(HttpStatus.OK)
  @ValidateResponse(VerifyOTPResponseSchema)
  async verify(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: VerifyOTPRequest,
  ): Promise<ApiResponse<VerifyOTPResponse>> {
    const { type, code, phoneNumber } = body;

    if (!type || !Object.values(OTPType).includes(type)) {
      throw new BadRequestException('Valid OTP type is required');
    }

    if (!code || code.length !== 6) {
      throw new BadRequestException('Valid 6-digit code is required');
    }

    if (type === OTPType.PhoneVerification && !phoneNumber) {
      throw new BadRequestException(
        'Phone number is required for phone verification',
      );
    }

    const phoneForVerify =
      type === OTPType.PhoneVerification ? phoneNumber : undefined;
    await this.otpService.verifyOTP(ctx, user.id, type, code, phoneForVerify);

    if (type === OTPType.EmailVerification) {
      await this.usersService.markEmailVerified(ctx, user.id);
    } else if (type === OTPType.PhoneVerification) {
      await this.usersService.markPhoneVerified(ctx, user.id, phoneNumber!);
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
