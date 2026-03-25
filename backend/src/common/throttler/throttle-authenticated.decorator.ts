import { Throttle } from '@nestjs/throttler';

// Single-profile architecture: ThrottlerModule.forRoot registers only the 'default' profile.
// These decorators override the 'default' profile's ttl/limit per endpoint.
// Do NOT add extra profiles to forRoot() — that would cause all registered profiles to apply
// to every endpoint simultaneously, ignoring per-endpoint overrides.
export const ThrottleAuthenticated = (): MethodDecorator & ClassDecorator =>
  Throttle({ default: { ttl: 60_000, limit: 200 } }) as MethodDecorator & ClassDecorator;
