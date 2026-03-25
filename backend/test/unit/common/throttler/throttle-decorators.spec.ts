// In @nestjs/throttler v6, metadata is stored with composite keys:
//   @Throttle({ name: { ttl, limit } }) → Reflect.defineMetadata(THROTTLER_TTL + name, ttl, target)
//   @SkipThrottle({ name: true })       → Reflect.defineMetadata(THROTTLER_SKIP + name, true, target)
// So assertions must use the composite key directly.
// Note: these constants are not re-exported from the main index in v6.5.0, import from internal path.
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { THROTTLER_LIMIT, THROTTLER_SKIP, THROTTLER_TTL } = require('@nestjs/throttler/dist/throttler.constants');
import { ThrottleAuthenticated } from '@/common/throttler/throttle-authenticated.decorator';
import { ThrottleSensitivePublic } from '@/common/throttler/throttle-sensitive-public.decorator';
import { ThrottleContact } from '@/common/throttler/throttle-contact.decorator';

function applyToClass(decorator: ClassDecorator) {
  @(decorator as ClassDecorator)
  class Target {}
  return Target;
}

describe('ThrottleAuthenticated', () => {
  it('sets authenticated throttle metadata', () => {
    const target = applyToClass(ThrottleAuthenticated() as ClassDecorator);
    expect(Reflect.getMetadata(THROTTLER_TTL + 'authenticated', target)).toBe(60_000);
    expect(Reflect.getMetadata(THROTTLER_LIMIT + 'authenticated', target)).toBe(200);
  });

  it('marks default profile as skipped', () => {
    const target = applyToClass(ThrottleAuthenticated() as ClassDecorator);
    expect(Reflect.getMetadata(THROTTLER_SKIP + 'default', target)).toBe(true);
  });
});

describe('ThrottleSensitivePublic', () => {
  it('sets sensitive-public throttle metadata', () => {
    const target = applyToClass(ThrottleSensitivePublic() as ClassDecorator);
    expect(Reflect.getMetadata(THROTTLER_TTL + 'sensitive-public', target)).toBe(60_000);
    expect(Reflect.getMetadata(THROTTLER_LIMIT + 'sensitive-public', target)).toBe(5);
  });

  it('marks default profile as skipped', () => {
    const target = applyToClass(ThrottleSensitivePublic() as ClassDecorator);
    expect(Reflect.getMetadata(THROTTLER_SKIP + 'default', target)).toBe(true);
  });
});

describe('ThrottleContact', () => {
  it('sets contact throttle metadata', () => {
    const target = applyToClass(ThrottleContact() as ClassDecorator);
    expect(Reflect.getMetadata(THROTTLER_TTL + 'contact', target)).toBe(600_000);
    expect(Reflect.getMetadata(THROTTLER_LIMIT + 'contact', target)).toBe(3);
  });

  it('marks default, authenticated, and sensitive-public as skipped', () => {
    const target = applyToClass(ThrottleContact() as ClassDecorator);
    expect(Reflect.getMetadata(THROTTLER_SKIP + 'default', target)).toBe(true);
    expect(Reflect.getMetadata(THROTTLER_SKIP + 'authenticated', target)).toBe(true);
    expect(Reflect.getMetadata(THROTTLER_SKIP + 'sensitive-public', target)).toBe(true);
  });
});
