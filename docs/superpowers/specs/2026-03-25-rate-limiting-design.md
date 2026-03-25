# Rate Limiting — Design Spec

**Date:** 2026-03-25
**Status:** Approved

---

## Problem

`POST /api/support/contact` is a public, unauthenticated endpoint. Without rate limiting, it can be abused to spam support tickets and trigger bulk email sends. No rate limiting exists anywhere in the project today.

---

## Goals

- Protect `POST /api/support/contact` from abuse (primary goal).
- Provide a reusable, low-friction mechanism applicable to any current or future endpoint.
- Keep authenticated endpoints functional with a generous limit.

---

## Non-Goals

- Distributed rate limiting across multiple instances (in-memory store is acceptable for now; Redis migration is a future concern).
- Per-user authenticated throttling (IP-based is sufficient for all cases).

---

## Approach

Use `@nestjs/throttler` — the official NestJS rate limiting package. It integrates natively with the NestJS guard system, supports named throttler profiles, and can be applied per-endpoint via decorators. Migrating to a distributed store later only requires swapping the storage provider in `ThrottlerModule.forRoot()`.

---

## Throttle Profiles

| Profile | Limit | Window | Applied via | Key |
|---|---|---|---|---|
| `default` | 20 req | 1 min | Global guard (automatic) | IP |
| `authenticated` | 200 req | 1 min | `@ThrottleAuthenticated()` | IP |
| `contact` (inline) | 3 req | 10 min | `@Throttle()` on the endpoint | IP |

The `default` profile acts as a catch-all for any public endpoint without an explicit override. The `authenticated` profile is applied manually to all authenticated endpoints to avoid inadvertently throttling legitimate users under the restrictive default.

---

## Architecture

### New dependency

```
@nestjs/throttler
```

### New files

```
backend/src/common/throttler/
  ip-throttler.guard.ts           # Custom guard — overrides getTracker() to use client IP
  throttle-authenticated.decorator.ts  # @ThrottleAuthenticated() shorthand
  index.ts                        # Barrel export
```

### Modified files

| File | Change |
|---|---|
| `backend/package.json` | Add `@nestjs/throttler` |
| `backend/src/app.module.ts` | Register `ThrottlerModule.forRoot()`, add `IpThrottlerGuard` as APP_GUARD |
| `backend/src/modules/support/support.controller.ts` | Add `@Throttle({ contact: { ttl: 600_000, limit: 3 } })` to `POST /api/support/contact` |
| All controllers with authenticated endpoints | Add `@ThrottleAuthenticated()` to the class or relevant methods |

---

## Implementation Details

### `IpThrottlerGuard`

Extends `ThrottlerGuard` and overrides `getTracker()` to extract the client IP from `x-forwarded-for`, falling back to `req.socket.remoteAddress`. This mirrors the existing IP extraction logic already in `support.controller.ts`.

```ts
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    return (
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress ||
      'unknown'
    );
  }
}
```

### `ThrottleAuthenticated` decorator

```ts
export const ThrottleAuthenticated = () =>
  Throttle({ authenticated: { ttl: 60_000, limit: 200 } });
```

### `ThrottlerModule` registration

```ts
ThrottlerModule.forRoot([
  { name: 'default', ttl: 60_000, limit: 20 },
  { name: 'authenticated', ttl: 60_000, limit: 200 },
]),
```

The `contact` profile is defined inline with `@Throttle()` rather than as a named profile, since it is specific to one endpoint.

### Global guard registration

```ts
{
  provide: APP_GUARD,
  useClass: IpThrottlerGuard,
}
```

---

## Controllers to Update with `@ThrottleAuthenticated()`

All controllers that exclusively expose authenticated endpoints (every method behind `JwtAuthGuard`) should be decorated at the class level. Controllers with a mix of public and authenticated routes should be decorated at the method level on authenticated routes only.

Affected modules (initial list — verify during implementation):
- `users`, `tickets`, `transactions`, `offers`, `support` (authenticated methods), `wallet`, `payments`, `reviews`, `identity-verification`, `transaction-chat`, `admin`, `bff` (authenticated BFF routes)

---

## Error Response

When the limit is exceeded, `ThrottlerGuard` automatically throws an HTTP 429 with the following body (NestJS default):

```json
{ "statusCode": 429, "message": "Too Many Requests" }
```

No custom error handling is needed.

---

## Testing

- Unit test for `IpThrottlerGuard.getTracker()`: verify IP extraction from `x-forwarded-for`, fallback to `remoteAddress`, fallback to `'unknown'`.
- No integration tests required for the throttle limits themselves (they depend on timing and are better validated manually or via e2e).
