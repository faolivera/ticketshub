// @nestjs/throttler v6 stores per-profile metadata with composite keys:
//   Throttle({ default: { ttl, limit } }) → Reflect.defineMetadata('THROTTLER:TTL' + 'default', ttl, target)
// So assertions must use the composite key directly.
// @nestjs/throttler v6 metadata keys (stable string values of the library's constants)
const THROTTLER_TTL = 'THROTTLER:TTL';
const THROTTLER_LIMIT = 'THROTTLER:LIMIT';
import { ThrottleAuthenticated } from '@/common/throttler/throttle-authenticated.decorator';
import { ThrottleSensitivePublic } from '@/common/throttler/throttle-sensitive-public.decorator';
import { ThrottleContact } from '@/common/throttler/throttle-contact.decorator';

function applyToClass(decorator: ClassDecorator) {
  @(decorator as ClassDecorator)
  class Target {}
  return Target;
}

describe('ThrottleAuthenticated', () => {
  it('overrides default profile to 200 req/min', () => {
    const target = applyToClass(ThrottleAuthenticated() as ClassDecorator);
    expect(Reflect.getMetadata(THROTTLER_TTL + 'default', target)).toBe(60_000);
    expect(Reflect.getMetadata(THROTTLER_LIMIT + 'default', target)).toBe(200);
  });
});

describe('ThrottleSensitivePublic', () => {
  it('overrides default profile to 5 req/min', () => {
    const target = applyToClass(ThrottleSensitivePublic() as ClassDecorator);
    expect(Reflect.getMetadata(THROTTLER_TTL + 'default', target)).toBe(60_000);
    expect(Reflect.getMetadata(THROTTLER_LIMIT + 'default', target)).toBe(5);
  });
});

describe('ThrottleContact', () => {
  it('overrides default profile to 3 req/10min', () => {
    const target = applyToClass(ThrottleContact() as ClassDecorator);
    expect(Reflect.getMetadata(THROTTLER_TTL + 'default', target)).toBe(600_000);
    expect(Reflect.getMetadata(THROTTLER_LIMIT + 'default', target)).toBe(3);
  });
});
