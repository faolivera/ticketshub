import {
  Injectable,
  CanActivate,
  ExecutionContext,
  Inject,
} from '@nestjs/common';
import { UsersService } from '../../modules/users/users.service';
import { Request } from 'express';

/**
 * Optional JWT Auth Guard
 * Similar to JwtAuthGuard but doesn't throw if authentication fails.
 * If a valid token is present, it attaches the user to the request.
 * If no token or invalid token, it allows the request to proceed without user.
 */
@Injectable()
export class OptionalJwtAuthGuard implements CanActivate {
  constructor(
    @Inject(UsersService)
    private readonly usersService: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const authHeader = request.headers.authorization;

    // If no auth header, allow request to proceed without user
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return true;
    }

    try {
      const token = authHeader.substring(7);
      const payload = this.usersService.verifyToken(token);

      // If token is invalid or expired, allow request to proceed without user
      if (!payload) {
        return true;
      }

      // Get context from request (set by ContextInterceptor)
      const ctx = (request as any).ctx || { source: 'HTTP' as const };

      const userData = await this.usersService.getAuthenticatedUserInfo(
        ctx,
        payload.userId,
      );

      // If user not found, allow request to proceed without user
      if (!userData) {
        return true;
      }

      // Attach user info and token to request if valid
      (request as any).user = userData;
      (request as any).token = token;
    } catch (error) {
      // If any error occurs during validation, allow request to proceed without user
      return true;
    }

    return true;
  }
}
