import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.path === '/metrics') return true;
    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip =
      (req.headers as Record<string, string>)['x-forwarded-for']
        ?.split(',')[0]
        ?.trim() ||
      (req.socket as { remoteAddress?: string })?.remoteAddress;
    if (!ip) throw new UnauthorizedException('Cannot determine client IP');
    return ip;
  }
}
