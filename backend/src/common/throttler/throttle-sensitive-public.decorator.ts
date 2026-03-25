import { Throttle } from '@nestjs/throttler';

export const ThrottleSensitivePublic = (): MethodDecorator & ClassDecorator =>
  Throttle({ default: { ttl: 60_000, limit: 5 } }) as MethodDecorator & ClassDecorator;
