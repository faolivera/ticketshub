import { Throttle } from '@nestjs/throttler';

export const ThrottleAuthenticated = (): MethodDecorator & ClassDecorator =>
  Throttle({ default: { ttl: 60_000, limit: 200 } }) as MethodDecorator & ClassDecorator;
