import { Throttle } from '@nestjs/throttler';

// Single-profile architecture: overrides the 'default' profile's ttl/limit for the public
// contact form endpoint. See throttle-authenticated.decorator.ts for architecture notes.
export const ThrottleContact = (): MethodDecorator & ClassDecorator =>
  Throttle({ default: { ttl: 600_000, limit: 3 } }) as MethodDecorator & ClassDecorator;
