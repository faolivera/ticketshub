import {
  Controller,
  Post,
  Get,
  Put,
  Patch,
  Body,
  Param,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import type { Multer } from 'multer';
import { UsersService } from './users.service';
import { IdentityVerificationService } from '../identity-verification/identity-verification.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import { ValidateResponse } from '../../common/decorators/validate-response.decorator';
import { AuthenticatedUserPublicInfo, Role } from './users.domain';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpgradeToSellerResponse,
  UploadAvatarResponse,
  UpdateBankAccountRequest,
  UpdateBankAccountResponse,
  GetBankAccountResponse,
  UpdateBankAccountStatusRequest,
  UpdateBankAccountStatusResponse,
  ListAdminBankAccountsResponse,
  PublicMeUser,
} from './users.api';
import {
  LoginResponseSchema,
  GetMeResponseSchema,
} from './schemas/api.schemas';

const ALLOWED_AVATAR_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];
const MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024;

@Controller('api/users')
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
    @Inject(forwardRef(() => IdentityVerificationService))
    private readonly identityVerificationService: IdentityVerificationService,
  ) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ValidateResponse(LoginResponseSchema)
  async login(
    @Context() ctx: Ctx,
    @Body() body: LoginRequest,
  ): Promise<ApiResponse<LoginResponse>> {
    const { email, password } = body;

    if (!email || !password) {
      throw new BadRequestException('Email and password are required');
    }

    const result = await this.usersService.login(ctx, email, password);
    if (!result) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const fullUser = await this.usersService.getAuthenticatedUserInfo(
      ctx,
      result.user.id,
    );
    if (fullUser) {
      const identityVerificationStatus =
        await this.identityVerificationService.getVerificationStatusForUser(
          ctx,
          result.user.id,
        );
      const bankAccountStatus = fullUser.bankAccount
        ? fullUser.bankAccount.verified
          ? 'approved'
          : 'pending'
        : 'none';
      return {
        success: true,
        data: {
          ...result,
          user: this.usersService.toPublicMeResponse(
            fullUser,
            identityVerificationStatus,
            bankAccountStatus,
          ),
        },
      };
    }

    return {
      success: true,
      data: result,
    };
  }

  @Post('register')
  @HttpCode(HttpStatus.CREATED)
  @ValidateResponse(LoginResponseSchema)
  async register(
    @Context() ctx: Ctx,
    @Body() body: RegisterRequest,
  ): Promise<ApiResponse<RegisterResponse>> {
    const { email, password, firstName, lastName, termsAcceptance, phone } = body;
    const country = body.country ?? 'Argentina';

    if (!email || !password || !firstName || !lastName) {
      throw new BadRequestException(
        'Email, password, firstName and lastName are required',
      );
    }

    if (!termsAcceptance?.termsVersionId || !termsAcceptance?.method) {
      throw new BadRequestException('Terms acceptance is required to register');
    }

    const result = await this.usersService.register(ctx, {
      email,
      password,
      firstName,
      lastName,
      country,
      phone,
      termsAcceptance,
    });

    return {
      success: true,
      data: result,
    };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ValidateResponse(GetMeResponseSchema)
  async getMe(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<PublicMeUser>> {
    const identityVerificationStatus =
      await this.identityVerificationService.getVerificationStatusForUser(
        ctx,
        user.id,
      );
    const bankAccountStatus = user.bankAccount
      ? user.bankAccount.verified
        ? 'approved'
        : 'pending'
      : 'none';
    return {
      success: true,
      data: this.usersService.toPublicMeResponse(
        user,
        identityVerificationStatus,
        bankAccountStatus,
      ),
    };
  }

  @Get('bank-account')
  @UseGuards(JwtAuthGuard)
  async getBankAccount(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<GetBankAccountResponse | null>> {
    const bankAccount = await this.usersService.getMyBankAccount(ctx, user.id);
    return {
      success: true,
      data: bankAccount,
    };
  }

  @Put('upgrade-to-seller')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async acceptSellerTerms(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<UpgradeToSellerResponse>> {
    const updatedUser = await this.usersService.acceptSellerTerms(ctx, user.id);

    return {
      success: true,
      data: updatedUser,
    };
  }

  @Post('profile/avatar')
  @UseGuards(JwtAuthGuard)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: MAX_AVATAR_SIZE_BYTES },
      fileFilter: (_req, file, cb) => {
        if (ALLOWED_AVATAR_MIME_TYPES.includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(
            new BadRequestException(
              `Invalid file type. Allowed: ${ALLOWED_AVATAR_MIME_TYPES.join(', ')}`,
            ),
            false,
          );
        }
      },
    }),
  )
  @HttpCode(HttpStatus.OK)
  async uploadAvatar(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @UploadedFile() file: Multer.File,
  ): Promise<ApiResponse<UploadAvatarResponse>> {
    if (!file) {
      throw new BadRequestException('File is required');
    }

    const updatedUser = await this.usersService.uploadAvatar(ctx, user.id, {
      buffer: file.buffer,
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
    });

    return {
      success: true,
      data: updatedUser,
    };
  }

  @Put('bank-account')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async updateBankAccount(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
    @Body() body: UpdateBankAccountRequest,
  ): Promise<ApiResponse<UpdateBankAccountResponse>> {
    if (!body.holderName?.trim() || !body.cbuOrCvu?.trim()) {
      throw new BadRequestException('holderName and cbuOrCvu are required');
    }
    const updatedUser = await this.usersService.updateBankAccount(ctx, user.id, {
      holderName: body.holderName.trim(),
      cbuOrCvu: body.cbuOrCvu.trim(),
      alias: body.alias?.trim(),
    });
    return {
      success: true,
      data: updatedUser,
    };
  }

  /**
   * List all users with bank account and full bank data (admin only)
   */
  @Get('admin/bank-accounts')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  async listBankAccountsForAdmin(
    @Context() ctx: Ctx,
  ): Promise<ApiResponse<ListAdminBankAccountsResponse>> {
    const data = await this.usersService.getUsersWithBankAccountForAdmin(ctx);
    return {
      success: true,
      data,
    };
  }

  /**
   * Update bank account verification status (admin only)
   */
  @Patch('admin/bank-account-status/:userId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(Role.Admin)
  @HttpCode(HttpStatus.OK)
  async updateBankAccountStatus(
    @Context() ctx: Ctx,
    @Param('userId') userId: string,
    @Body() body: UpdateBankAccountStatusRequest,
  ): Promise<ApiResponse<UpdateBankAccountStatusResponse>> {
    if (body.status !== 'approved' && body.status !== 'rejected') {
      throw new BadRequestException('Status must be "approved" or "rejected"');
    }
    const updatedUser = await this.usersService.setBankAccountVerificationStatus(
      ctx,
      userId,
      body.status,
    );
    return {
      success: true,
      data: updatedUser,
    };
  }
}
