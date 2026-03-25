import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

export const ThrottleAuthenticated = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SkipThrottle({ default: true }),
    Throttle({ authenticated: { ttl: 60_000, limit: 200 } }),
  );
