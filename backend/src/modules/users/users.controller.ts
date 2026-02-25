import {
  Controller,
  Post,
  Get,
  Put,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { User } from '../../common/decorators/user.decorator';
import { Context } from '../../common/decorators/ctx.decorator';
import { ValidateResponse } from '../../common/decorators/validate-response.decorator';
import { AuthenticatedUserPublicInfo } from './users.domain';
import type { Ctx } from '../../common/types/context';
import type { ApiResponse } from '../../common/types/api';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  UpgradeToSellerResponse,
} from './users.api';
import {
  LoginResponseSchema,
  GetMeResponseSchema,
} from './schemas/api.schemas';

@Controller('api/users')
export class UsersController {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
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
    const { email, password, firstName, lastName, country, termsAcceptance } = body;

    if (!email || !password || !firstName || !lastName || !country) {
      throw new BadRequestException(
        'Email, password, firstName, lastName and country are required',
      );
    }

    if (!termsAcceptance?.termsVersionId || !termsAcceptance?.method) {
      throw new BadRequestException(
        'Terms acceptance is required to register',
      );
    }

    const result = await this.usersService.register(ctx, {
      email,
      password,
      firstName,
      lastName,
      country,
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
  ): Promise<ApiResponse<AuthenticatedUserPublicInfo>> {
    return {
      success: true,
      data: user,
    };
  }

  @Put('upgrade-to-seller')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async upgradeToSeller(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<UpgradeToSellerResponse>> {
    const updatedUser = await this.usersService.upgradeToSeller(ctx, user.id);

    return {
      success: true,
      data: updatedUser,
    };
  }
}
