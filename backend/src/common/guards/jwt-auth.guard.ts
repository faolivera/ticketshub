import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Inject,
} from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';
import { Request } from 'express';
import { Ctx } from '../types/context';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Not authenticated');
    }

    const token = authHeader.substring(7);
    const payload = this.usersService.verifyToken(token);

    if (!payload) {
      throw new UnauthorizedException('Invalid or expired token');
    }
    const requestId =
      (request.headers['x-request-id'] as string) ||
      `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    // Build context object
    const ctxDefault: Ctx = {
      source: 'HTTP',
      requestId,
      timestamp: new Date(),
      method: request.method,
      path: request.path || request.url,
      userId: undefined,
      metadata: {},
    };
    // Get context from request (set by ContextInterceptor)
    const ctx = (request as any).ctx || ctxDefault;

    const userData = await this.usersService.getAuthenticatedUserInfo(
      ctx,
      payload.userId,
    );

    if (!userData) {
      throw new UnauthorizedException('User not found');
    }

    // Attach user info and token to request
    (request as any).user = userData;
    (request as any).token = token;
    return true;
  }
}
