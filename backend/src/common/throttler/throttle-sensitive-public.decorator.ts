import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

export const ThrottleSensitivePublic = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SkipThrottle({ default: true }),
    Throttle({ 'sensitive-public': { ttl: 60_000, limit: 5 } }),
  );
