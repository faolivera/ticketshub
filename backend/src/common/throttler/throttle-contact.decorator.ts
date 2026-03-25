import { Throttle } from '@nestjs/throttler';

export const ThrottleContact = (): MethodDecorator & ClassDecorator =>
  Throttle({ default: { ttl: 600_000, limit: 3 } }) as MethodDecorator & ClassDecorator;
