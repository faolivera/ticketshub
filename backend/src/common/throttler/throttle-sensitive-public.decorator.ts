import { Throttle } from '@nestjs/throttler';

// Single-profile architecture: overrides the 'default' profile's ttl/limit for sensitive public
// endpoints (login, register, OTP). See throttle-authenticated.decorator.ts for architecture notes.
export const ThrottleSensitivePublic = (): MethodDecorator & ClassDecorator =>
  Throttle({ default: { ttl: 60_000, limit: 5 } }) as MethodDecorator & ClassDecorator;
