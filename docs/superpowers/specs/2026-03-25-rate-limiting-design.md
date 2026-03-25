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
- Do not break payment webhooks, health checks, or Prometheus scraping.

---

## Non-Goals

- Distributed rate limiting across multiple instances (in-memory store is acceptable for now; Redis migration is a future concern).
- Per-user authenticated throttling keyed by user ID (IP-based is sufficient for all cases).

---

## Approach

Use `@nestjs/throttler` v6 — the official NestJS rate limiting package. It integrates natively with the NestJS guard system, supports named throttler profiles, and can be applied per-endpoint via decorators.

> **ttl units:** `@nestjs/throttler` v4+ uses **milliseconds** for `ttl`. All values in this spec are in ms.

> **Migrating to distributed store:** Requires installing `nestjs-throttler-storage-redis` (a separate third-party package) and passing a `storage` option to `ThrottlerModule.forRoot()`. Existing in-memory windows are not migrated — all counters reset on deploy. This is a future concern.

---

## Throttle Profiles

All four profiles must be registered in `ThrottlerModule.forRoot()`. In `@nestjs/throttler` v6 the guard iterates exclusively over the profiles defined in `forRoot()` — decorator metadata is only consulted as an *override* for a profile already in that list. A profile absent from `forRoot()` is silently ignored.

| Profile name | Limit | Window (ms) | Registered in forRoot? | Applied via |
|---|---|---|---|---|
| `default` | 20 req | 60 000 (1 min) | Yes — global catch-all | Automatic |
| `authenticated` | 200 req | 60 000 (1 min) | Yes | `@ThrottleAuthenticated()` |
| `sensitive-public` | 5 req | 60 000 (1 min) | Yes | `@ThrottleSensitivePublic()` |
| `contact` | 3 req | 600 000 (10 min) | Yes | `@Throttle({ contact: ... })` inline |

Because all profiles are registered globally, a decorated endpoint would normally be checked against **all four** profiles. To make `@ThrottleAuthenticated()` and `@ThrottleSensitivePublic()` *replace* the `default` rather than add to it, each decorator must also apply `@SkipThrottle({ default: true })`. This makes the decorated endpoint subject only to its own profile.

---

## IP Extraction and the "unknown" Fallback

The custom `IpThrottlerGuard` extracts IP from `x-forwarded-for`, falling back to `req.socket.remoteAddress`. If neither is available the guard **throws `UnauthorizedException`** rather than returning `'unknown'` — a shared `'unknown'` bucket would allow all unidentifiable requests to pool their quota.

---

## Architecture

### New dependency

```
@nestjs/throttler  (v6)
```

### New files

```
backend/src/common/throttler/
  ip-throttler.guard.ts                  # Custom guard — overrides getTracker() to use client IP
  throttle-authenticated.decorator.ts    # @ThrottleAuthenticated()
  throttle-sensitive-public.decorator.ts # @ThrottleSensitivePublic()
  index.ts                               # Barrel export
```

### Modified files

| File | Change |
|---|---|
| `backend/package.json` | Add `@nestjs/throttler` |
| `backend/src/app.module.ts` | Register `ThrottlerModule.forRoot()`, add `IpThrottlerGuard` as `APP_GUARD` |
| `backend/src/modules/support/support.controller.ts` | `@Throttle({ contact: { ttl: 600_000, limit: 3 } })` on `POST /api/support/contact` |
| `backend/src/modules/users/users.controller.ts` | `@ThrottleSensitivePublic()` on `POST /login`, `POST /register`, `POST /auth/google` |
| `backend/src/modules/otp/otp.controller.ts` | `@ThrottleAuthenticated()` at class level (class is already `@UseGuards(JwtAuthGuard)`) |
| `backend/src/modules/health/health.controller.ts` | `@SkipThrottle()` at class level |
| `backend/src/modules/gateways/gateway-webhooks.controller.ts` | `@SkipThrottle()` at class level — covers `POST /api/payments/webhook/uala-bis` and `POST /api/payments/webhook/mercadopago` |
| `backend/src/modules/payments/payments.controller.ts` | `@SkipThrottle()` on `POST /api/payments/webhook` |
| All controllers with exclusively authenticated endpoints | `@ThrottleAuthenticated()` at class level |
| Controllers with mixed public/authenticated routes | `@ThrottleAuthenticated()` at method level on authenticated methods |

### `@SkipThrottle()` required

| Endpoint / Controller | Reason |
|---|---|
| `GET /health` (`health.controller.ts`) | Monitoring probes from a single IP; false 429s would cause alerts |
| `POST /api/payments/webhook/uala-bis`, `POST /api/payments/webhook/mercadopago` (`gateway-webhooks.controller.ts`) | Payment provider retries; 429 causes silent reconciliation failures |
| `POST /api/payments/webhook` (`payments.controller.ts`) | Same — legacy generic webhook endpoint |

### Prometheus `/metrics`

`PrometheusModule` from `@willsoto/nestjs-prometheus` auto-creates a `GET /metrics` endpoint on its own controller which cannot be decorated directly. `IpThrottlerGuard.canActivate()` must be overridden to bypass throttling for this path:

```ts
async canActivate(context: ExecutionContext): Promise<boolean> {
  const req = context.switchToHttp().getRequest<Request>();
  if (req.path === '/metrics') return true;
  return super.canActivate(context);
}
```

### Public endpoints covered by `default` (20 req/min) — acceptable

| Endpoints | Rationale |
|---|---|
| `GET /api/events`, `GET /api/events/:id`, etc. | Read-only, 20 req/min is adequate for human browsing |
| `GET /api/terms/*` | Static content reads |
| `GET /api/event-page/:slug`, `GET /api/buy/:ticketId`, `GET /api/sellers/:id` (BFF) | Public BFF reads |
| SSR routes | Crawlers hitting a single IP will be throttled — acceptable |

---

## Implementation Details

### `ThrottlerModule` registration

```ts
ThrottlerModule.forRoot([
  { name: 'default',           ttl: 60_000,  limit: 20  },
  { name: 'authenticated',     ttl: 60_000,  limit: 200 },
  { name: 'sensitive-public',  ttl: 60_000,  limit: 5   },
  { name: 'contact',           ttl: 600_000, limit: 3   },
]),
```

All four profiles are registered so the guard can iterate them. Custom decorators use `@SkipThrottle({ default: true })` to prevent the `default` profile from also applying to their endpoints.

### Global guard registration

```ts
{
  provide: APP_GUARD,
  useClass: IpThrottlerGuard,
}
```

### `IpThrottlerGuard`

```ts
@Injectable()
export class IpThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest<Request>();
    if (req.path === '/metrics') return true;
    return super.canActivate(context);
  }

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip =
      (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
      req.socket?.remoteAddress;
    if (!ip) throw new UnauthorizedException('Cannot determine client IP');
    return ip;
  }
}
```

### `ThrottleAuthenticated` decorator

Skips `default` and applies `authenticated` — endpoint is subject only to 200 req/min.

```ts
export const ThrottleAuthenticated = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SkipThrottle({ default: true }),
    Throttle({ authenticated: { ttl: 60_000, limit: 200 } }),
  );
```

### `ThrottleSensitivePublic` decorator

Skips `default` and applies `sensitive-public` — endpoint is subject only to 5 req/min.

```ts
export const ThrottleSensitivePublic = (): MethodDecorator & ClassDecorator =>
  applyDecorators(
    SkipThrottle({ default: true }),
    Throttle({ 'sensitive-public': { ttl: 60_000, limit: 5 } }),
  );
```

### `contact` inline throttle

The contact endpoint skips `default` and applies `contact`. Because `@Throttle()` implicitly activates all registered profiles, we must explicitly skip the others:

```ts
@SkipThrottle({ default: true, authenticated: true, 'sensitive-public': true })
@Throttle({ contact: { ttl: 600_000, limit: 3 } })
@Post('contact')
```

---

## Error Response

When the limit is exceeded, `ThrottlerGuard` automatically throws HTTP 429:

```json
{ "statusCode": 429, "message": "Too Many Requests" }
```

No custom error handling is needed.

---

## Testing

### Unit tests (`ip-throttler.guard.spec.ts`)

- `getTracker()` returns the first IP from `x-forwarded-for` when present.
- `getTracker()` falls back to `req.socket.remoteAddress` when header is absent.
- `getTracker()` throws `UnauthorizedException` when both are absent.
- `canActivate()` returns `true` without calling `super.canActivate()` when path is `/metrics`.

### Decorator tests

- `ThrottleAuthenticated()` emits the correct throttler metadata (`authenticated` profile, 200 limit, 60 000 ms ttl).
- `ThrottleSensitivePublic()` emits the correct throttler metadata (`sensitive-public` profile, 5 limit, 60 000 ms ttl).

### Manual verification

After wiring `APP_GUARD`, send >20 requests in under a minute to any unprotected public endpoint and verify HTTP 429. This confirms the global guard is active — it cannot be covered by unit tests alone.
