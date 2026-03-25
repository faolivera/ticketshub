# Rate Limiting Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add IP-based rate limiting to all backend endpoints using `@nestjs/throttler` v6, protecting `POST /api/support/contact` and other public endpoints from abuse.

**Architecture:** A custom `IpThrottlerGuard` (registered as a global `APP_GUARD`) extends NestJS's `ThrottlerGuard` to extract client IP from `x-forwarded-for`. Four named profiles are registered in `ThrottlerModule.forRoot()`. Three reusable decorators (`@ThrottleAuthenticated`, `@ThrottleSensitivePublic`, `@ThrottleContact`) combine `@SkipThrottle` + `@Throttle` to give each endpoint exactly one active profile.

**Tech Stack:** `@nestjs/throttler` v6, NestJS `APP_GUARD`, `applyDecorators` from `@nestjs/common`

**Spec:** `docs/superpowers/specs/2026-03-25-rate-limiting-design.md`

---

## File Map

**Create:**
- `backend/src/common/throttler/ip-throttler.guard.ts` — extends `ThrottlerGuard`, overrides `getTracker()` and `canActivate()`
- `backend/src/common/throttler/throttle-authenticated.decorator.ts` — `@ThrottleAuthenticated()`
- `backend/src/common/throttler/throttle-sensitive-public.decorator.ts` — `@ThrottleSensitivePublic()`
- `backend/src/common/throttler/throttle-contact.decorator.ts` — `@ThrottleContact()`
- `backend/src/common/throttler/index.ts` — barrel export
- `backend/test/unit/common/throttler/ip-throttler.guard.spec.ts` — guard unit tests
- `backend/test/unit/common/throttler/throttle-decorators.spec.ts` — decorator metadata tests

**Modify:**
- `backend/package.json` — add `@nestjs/throttler`
- `backend/src/app.module.ts` — register `ThrottlerModule` + `IpThrottlerGuard` as `APP_GUARD`
- `backend/src/modules/tickets/tickets.controller.ts` — class-level `@ThrottleAuthenticated()`
- `backend/src/modules/transactions/transactions.controller.ts` — class-level `@ThrottleAuthenticated()`
- `backend/src/modules/offers/offers.controller.ts` — class-level `@ThrottleAuthenticated()`
- `backend/src/modules/wallet/wallet.controller.ts` — class-level `@ThrottleAuthenticated()`
- `backend/src/modules/reviews/reviews.controller.ts` — class-level `@ThrottleAuthenticated()`
- `backend/src/modules/identity-verification/identity-verification.controller.ts` — class-level `@ThrottleAuthenticated()`
- `backend/src/modules/transaction-chat/transaction-chat.controller.ts` — class-level `@ThrottleAuthenticated()`
- `backend/src/modules/admin/admin.controller.ts` — class-level `@ThrottleAuthenticated()`
- `backend/src/modules/otp/otp.controller.ts` — method-level `@ThrottleSensitivePublic()` on POST /send and POST /verify
- `backend/src/modules/users/users.controller.ts` — method-level mixed decorators
- `backend/src/modules/support/support.controller.ts` — method-level mixed decorators
- `backend/src/modules/payments/payments.controller.ts` — method-level mixed decorators
- `backend/src/modules/bff/bff.controller.ts` — method-level mixed decorators
- `backend/src/modules/health/health.controller.ts` — class-level `@SkipThrottle()`
- `backend/src/modules/gateways/gateway-webhooks.controller.ts` — class-level `@SkipThrottle()`

---

## Task 1: Install `@nestjs/throttler`

**Files:**
- Modify: `backend/package.json`

- [ ] **Step 1: Install the package**

```bash
cd backend && npm install @nestjs/throttler@^6
```

Expected: package added to `dependencies` in `package.json`.

- [ ] **Step 2: Commit**

```bash
git add backend/package.json backend/package-lock.json
git commit -m "chore: install @nestjs/throttler v6"
```

---

## Task 2: TDD — `IpThrottlerGuard`

**Files:**
- Create: `backend/test/unit/common/throttler/ip-throttler.guard.spec.ts`
- Create: `backend/src/common/throttler/ip-throttler.guard.ts`

### Step 1: Write failing tests

- [ ] Create `backend/test/unit/common/throttler/ip-throttler.guard.spec.ts`:

```ts
import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { IpThrottlerGuard } from '@/common/throttler/ip-throttler.guard';

// Minimal mock — we only test the two overridden methods, not the full guard pipeline
const makeGuard = () =>
  new IpThrottlerGuard({} as any, {} as any, {} as any);

const makeReq = (overrides: Partial<{ headers: Record<string, string>; socket: { remoteAddress?: string }; path: string }> = {}) => ({
  headers: {},
  socket: { remoteAddress: undefined },
  path: '/api/some-route',
  ...overrides,
});

describe('IpThrottlerGuard', () => {
  describe('getTracker', () => {
    it('returns first IP from x-forwarded-for when present', async () => {
      const guard = makeGuard();
      const req = makeReq({ headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' } });
      const ip = await (guard as any).getTracker(req);
      expect(ip).toBe('1.2.3.4');
    });

    it('falls back to socket.remoteAddress when x-forwarded-for is absent', async () => {
      const guard = makeGuard();
      const req = makeReq({ socket: { remoteAddress: '9.9.9.9' } });
      const ip = await (guard as any).getTracker(req);
      expect(ip).toBe('9.9.9.9');
    });

    it('throws UnauthorizedException when both sources are absent', async () => {
      const guard = makeGuard();
      const req = makeReq();
      await expect((guard as any).getTracker(req)).rejects.toThrow(UnauthorizedException);
    });
  });

  describe('canActivate', () => {
    it('returns true immediately for /metrics without calling super', async () => {
      const guard = makeGuard();
      const superSpy = jest
        .spyOn(ThrottlerGuard.prototype, 'canActivate')
        .mockResolvedValue(true);

      const ctx = {
        switchToHttp: () => ({ getRequest: () => makeReq({ path: '/metrics' }) }),
      } as unknown as ExecutionContext;

      const result = await guard.canActivate(ctx);
      expect(result).toBe(true);
      expect(superSpy).not.toHaveBeenCalled();
      superSpy.mockRestore();
    });
  });
});
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd backend && npm test -- --testPathPattern="ip-throttler.guard.spec"
```

Expected: FAIL — `IpThrottlerGuard` module not found.

### Step 3: Implement the guard

- [ ] Create `backend/src/common/throttler/ip-throttler.guard.ts`:

```ts
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.path === '/metrics') return true;
    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, unknown>): Promise<string> {
    const ip =
      (req.headers as Record<string, string>)['x-forwarded-for']
        ?.split(',')[0]
        ?.trim() ||
      (req.socket as { remoteAddress?: string })?.remoteAddress;
    if (!ip) throw new UnauthorizedException('Cannot determine client IP');
    return ip;
  }
}
```

- [ ] **Step 4: Run tests — verify they pass**

```bash
cd backend && npm test -- --testPathPattern="ip-throttler.guard.spec"
```

Expected: PASS — 4 tests passing.

- [ ] **Step 5: Commit**

```bash
git add backend/src/common/throttler/ip-throttler.guard.ts \
        backend/test/unit/common/throttler/ip-throttler.guard.spec.ts
git commit -m "feat(throttler): add IpThrottlerGuard with IP extraction and /metrics bypass"
```

---

## Task 3: TDD — Throttle Decorators

**Files:**
- Create: `backend/test/unit/common/throttler/throttle-decorators.spec.ts`
- Create: `backend/src/common/throttler/throttle-authenticated.decorator.ts`
- Create: `backend/src/common/throttler/throttle-sensitive-public.decorator.ts`
- Create: `backend/src/common/throttler/throttle-contact.decorator.ts`
- Create: `backend/src/common/throttler/index.ts`

### Step 1: Write failing tests

- [ ] Create `backend/test/unit/common/throttler/throttle-decorators.spec.ts`:

```ts
// In @nestjs/throttler v6, metadata is stored with composite keys:
//   @Throttle({ name: { ttl, limit } }) → Reflect.defineMetadata(THROTTLER_TTL + name, ttl, target)
//   @SkipThrottle({ name: true })       → Reflect.defineMetadata(THROTTLER_SKIP + name, true, target)
// So assertions must use the composite key directly.
import { THROTTLER_LIMIT, THROTTLER_SKIP, THROTTLER_TTL } from '@nestjs/throttler';
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
```

- [ ] **Step 2: Run tests — verify they fail**

```bash
cd backend && npm test -- --testPathPattern="throttle-decorators.spec"
```

Expected: FAIL — modules not found.

### Step 3: Implement the decorators

- [ ] Create `backend/src/common/throttler/throttle-authenticated.decorator.ts`:

```ts
import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

export const ThrottleAuthenticated = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SkipThrottle({ default: true }),
    Throttle({ authenticated: { ttl: 60_000, limit: 200 } }),
  );
```

- [ ] Create `backend/src/common/throttler/throttle-sensitive-public.decorator.ts`:

```ts
import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

export const ThrottleSensitivePublic = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SkipThrottle({ default: true }),
    Throttle({ 'sensitive-public': { ttl: 60_000, limit: 5 } }),
  );
```

- [ ] Create `backend/src/common/throttler/throttle-contact.decorator.ts`:

```ts
import { applyDecorators } from '@nestjs/common';
import { SkipThrottle, Throttle } from '@nestjs/throttler';

export const ThrottleContact = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SkipThrottle({ default: true, authenticated: true, 'sensitive-public': true }),
    Throttle({ contact: { ttl: 600_000, limit: 3 } }),
  );
```

- [ ] Create `backend/src/common/throttler/index.ts`:

```ts
export { IpThrottlerGuard } from './ip-throttler.guard';
export { ThrottleAuthenticated } from './throttle-authenticated.decorator';
export { ThrottleSensitivePublic } from './throttle-sensitive-public.decorator';
export { ThrottleContact } from './throttle-contact.decorator';
```

- [ ] **Step 4: Run all throttler tests — verify they pass**

```bash
cd backend && npm test -- --testPathPattern="throttler"
```

Expected: PASS — all 12 tests passing (4 from guard spec + 8 from decorator spec).

- [ ] **Step 5: Commit**

```bash
git add backend/src/common/throttler/ \
        backend/test/unit/common/throttler/throttle-decorators.spec.ts
git commit -m "feat(throttler): add ThrottleAuthenticated, ThrottleSensitivePublic, ThrottleContact decorators"
```

---

## Task 4: Wire `ThrottlerModule` globally in `AppModule`

**Files:**
- Modify: `backend/src/app.module.ts`

- [ ] **Step 1: Add ThrottlerModule and APP_GUARD to `app.module.ts`**

Add to the imports at the top of the file:

```ts
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule } from '@nestjs/throttler';
import { IpThrottlerGuard } from './common/throttler';
```

Add `ThrottlerModule.forRoot(...)` to the `imports` array (after `ScheduleModule.forRoot()`):

```ts
ThrottlerModule.forRoot([
  { name: 'default',          ttl: 60_000,  limit: 20  },
  { name: 'authenticated',    ttl: 60_000,  limit: 200 },
  { name: 'sensitive-public', ttl: 60_000,  limit: 5   },
  { name: 'contact',          ttl: 600_000, limit: 3   },
]),
```

Add `IpThrottlerGuard` as a global guard to the `providers` array (create this array if it doesn't exist):

```ts
providers: [
  {
    provide: APP_GUARD,
    useClass: IpThrottlerGuard,
  },
],
```

- [ ] **Step 2: Run the full unit test suite to verify no breakage**

```bash
cd backend && npm test
```

Expected: all tests pass. No 429 errors in tests (mocks isolate from the real guard).

- [ ] **Step 3: Commit**

```bash
git add backend/src/app.module.ts
git commit -m "feat(throttler): register ThrottlerModule and IpThrottlerGuard globally"
```

---

## Task 5: Apply `@ThrottleAuthenticated()` to exclusively-authenticated controllers

These controllers have only authenticated endpoints — decorate at class level.

**Files (modify each):**
- `backend/src/modules/tickets/tickets.controller.ts`
- `backend/src/modules/transactions/transactions.controller.ts`
- `backend/src/modules/offers/offers.controller.ts`
- `backend/src/modules/wallet/wallet.controller.ts`
- `backend/src/modules/reviews/reviews.controller.ts`
- `backend/src/modules/identity-verification/identity-verification.controller.ts`
- `backend/src/modules/transaction-chat/transaction-chat.controller.ts`
- `backend/src/modules/admin/admin.controller.ts`

For each file: add the import and class-level decorator. The pattern is identical for all nine.

- [ ] **Step 1: Update each controller**

For each controller file listed above, add to the imports:

```ts
import { ThrottleAuthenticated } from '../../common/throttler';
```

(Adjust the relative path as needed based on the file's location.)

Then add `@ThrottleAuthenticated()` on the line immediately before the `@Controller(...)` decorator:

```ts
@ThrottleAuthenticated()
@Controller('api/tickets')
export class TicketsController {
```

Repeat this pattern for all nine controllers.

- [ ] **Step 2: Run tests**

```bash
cd backend && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add \
  backend/src/modules/tickets/tickets.controller.ts \
  backend/src/modules/transactions/transactions.controller.ts \
  backend/src/modules/offers/offers.controller.ts \
  backend/src/modules/wallet/wallet.controller.ts \
  backend/src/modules/reviews/reviews.controller.ts \
  backend/src/modules/identity-verification/identity-verification.controller.ts \
  backend/src/modules/transaction-chat/transaction-chat.controller.ts \
  backend/src/modules/admin/admin.controller.ts
git commit -m "feat(throttler): apply @ThrottleAuthenticated to exclusively-authenticated controllers"
```

---

## Task 6: Apply decorators to mixed controllers

These controllers have a mix of public and authenticated routes. Decorators are applied at method level.

**Files:**
- Modify: `backend/src/modules/users/users.controller.ts`
- Modify: `backend/src/modules/support/support.controller.ts`
- Modify: `backend/src/modules/payments/payments.controller.ts`
- Modify: `backend/src/modules/bff/bff.controller.ts`
- Modify: `backend/src/modules/otp/otp.controller.ts`

### `users.controller.ts`

Add import:
```ts
import { ThrottleAuthenticated, ThrottleSensitivePublic } from '../../common/throttler';
```

Apply `@ThrottleSensitivePublic()` above these three methods:
- `POST /login` (look for `@Post('login')`)
- `POST /register` (look for `@Post('register')`)
- `POST /auth/google` (look for `@Post('auth/google')`)

Apply `@ThrottleAuthenticated()` above all other methods that have `@UseGuards(JwtAuthGuard)`:
- `GET /me`
- `GET /bank-account`
- `PUT /upgrade-to-seller`
- `POST /profile/avatar`
- `PUT /bank-account`
- `GET /admin/bank-accounts`
- `PATCH /admin/bank-account-status/:userId`

### `support.controller.ts`

Add import:
```ts
import { ThrottleAuthenticated, ThrottleContact } from '../../common/throttler';
```

Apply `@ThrottleContact()` above `@Post('contact')`.

Apply `@ThrottleAuthenticated()` above all other methods:
- `@Post()` (authenticated create ticket)
- `@Get()` (list tickets)
- `@Get(':id')` (get ticket)
- `@Post(':id/messages')` (add message)
- `@Post(':id/close')` (close ticket)
- `@Patch(':id/resolve')` (resolve dispute)
- `@Get('admin/active')` (list active)
- `@Patch(':id/status')` (update status)

### `payments.controller.ts`

Add import:
```ts
import { ThrottleAuthenticated } from '../../common/throttler';
import { SkipThrottle } from '@nestjs/throttler';
```

Apply `@SkipThrottle()` above `@Post('webhook')`.

Apply `@ThrottleAuthenticated()` above:
- `@Get(':id')` (get payment)
- `@Post(':id/confirm')` (confirm payment)

### `otp.controller.ts`

OTP send/verify are sensitive operations (abuse target) — apply the stricter 5 req/min profile even though the endpoints require authentication.

Add import:
```ts
import { ThrottleSensitivePublic } from '../../common/throttler';
```

Apply `@ThrottleSensitivePublic()` above:
- `@Post('send')`
- `@Post('verify')`

### `bff.controller.ts`

Add import:
```ts
import { ThrottleAuthenticated } from '../../common/throttler';
```

Apply `@ThrottleAuthenticated()` above these methods (those with `@UseGuards(JwtAuthGuard)`):
- `GET /sell-ticket/config`
- `POST /sell/validate`
- `GET /my-tickets`
- `GET /activity-history`
- `GET /buy/:ticketId/checkout-risk`
- `GET /transaction-details/:id`

The public routes (`GET /sellers/:id`, `GET /buy/:ticketId` with `OptionalJwtAuthGuard`, `GET /event-page/:eventSlug`) receive no decorator — they use the `default` 20 req/min profile.

- [ ] **Step 1: Apply all method-level decorators to the four mixed controllers**

(Follow the per-controller instructions above.)

- [ ] **Step 2: Run tests**

```bash
cd backend && npm test
```

Expected: all tests pass.

- [ ] **Step 3: Commit**

```bash
git add \
  backend/src/modules/users/users.controller.ts \
  backend/src/modules/support/support.controller.ts \
  backend/src/modules/payments/payments.controller.ts \
  backend/src/modules/bff/bff.controller.ts \
  backend/src/modules/otp/otp.controller.ts
git commit -m "feat(throttler): apply throttle decorators to mixed controllers"
```

---

## Task 7: Apply `@SkipThrottle()` to webhooks and health

**Files:**
- Modify: `backend/src/modules/health/health.controller.ts`
- Modify: `backend/src/modules/gateways/gateway-webhooks.controller.ts`

These endpoints must never be throttled. Payment webhooks retry on failure — a 429 would silently break order reconciliation. Health checks run from a single monitoring IP.

- [ ] **Step 1: Update `health.controller.ts`**

Add import:
```ts
import { SkipThrottle } from '@nestjs/throttler';
```

Add `@SkipThrottle()` at class level, above `@Controller(...)`.

- [ ] **Step 2: Update `gateway-webhooks.controller.ts`**

Add import:
```ts
import { SkipThrottle } from '@nestjs/throttler';
```

Add `@SkipThrottle()` at class level, above `@Controller(...)`.

- [ ] **Step 3: Run tests**

```bash
cd backend && npm test
```

Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add \
  backend/src/modules/health/health.controller.ts \
  backend/src/modules/gateways/gateway-webhooks.controller.ts
git commit -m "feat(throttler): skip throttling on health and payment webhook endpoints"
```

---

## Task 8: Manual verification

- [ ] **Step 1: Start the backend**

```bash
cd backend && npm run start:dev
```

- [ ] **Step 2: Verify default limit triggers (20 req/min on a public endpoint)**

Send 25 rapid requests to a public non-sensitive endpoint:

```bash
for i in $(seq 1 25); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/api/events; done
```

Expected: first ~20 return `200`, subsequent return `429`.

- [ ] **Step 3: Verify health check is never throttled**

```bash
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/health; done
```

Expected: all `200`.

- [ ] **Step 4: Verify `/metrics` is never throttled**

```bash
for i in $(seq 1 30); do curl -s -o /dev/null -w "%{http_code}\n" http://localhost:3000/metrics; done
```

Expected: all `200`.

- [ ] **Step 5: Final commit if any adjustments were made**

```bash
git add -p
git commit -m "fix(throttler): manual verification adjustments"
```
