import {
  Controller,
  Post,
  Get,
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

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ValidateResponse(GetMeResponseSchema)
  async getMe(
    @Context() ctx: Ctx,
    @User() user: AuthenticatedUserPublicInfo,
  ): Promise<ApiResponse<AuthenticatedUserPublicInfo>> {

    return {
      success: true,
      data: user
    };
  }



}

