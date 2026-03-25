import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

export const ThrottleContact = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SkipThrottle({ default: true, authenticated: true, 'sensitive-public': true }),
    Throttle({ contact: { ttl: 600_000, limit: 3 } }),
  );
