# Ticket Purchase Cutoff — Design Spec

**Date:** 2026-03-22
**Status:** Approved

---

## Problem

Events with multiple dates currently show all dates — including past ones — on the landing page, the event detail page, and in API responses. Additionally, there is no enforcement preventing purchases or offers from being submitted for event dates that have already passed.

A secondary requirement is a configurable "minimum hours to buy tickets" setting: a platform-level offset that shifts the cutoff forward in time, so that tickets stop being purchasable X hours before the event starts.

---

## Goals

1. Hide events whose **all** dates have passed the cutoff from the landing grid and highlighted events.
2. Filter out individual past dates from any event that still has future dates. This applies to all public-facing endpoints that return event data: the landing page grid (`GET /api/events`), highlighted events (`GET /api/events/highlights`), and the event detail page (`GET /api/event-page/:slug`). Achieved centrally via `toPublicEventItem`.
3. Show "No hay fechas disponibles" on the event detail page when no future dates remain.
4. Reject purchases (`initiatePurchase`) and offers (`createOffer`) at the backend when the listing's event date is past the cutoff.
5. Reject buy-page data fetch (`getBuyPageData`) when the listing's event date is past the cutoff.
6. Allow admins to configure a "minimum hours to buy tickets" offset (default: 0).
7. Centralize all cutoff logic in `EventsService` — no other service computes or hardcodes the cutoff.

---

## Cutoff Definition

```
effectiveCutoff = now + minimumHoursToBuyTickets hours
```

An event date is considered **expired** if `eventDate < effectiveCutoff`.

With `minimumHoursToBuyTickets = 0` (default), this is equivalent to the current `eventDate < now` logic. With `minimumHoursToBuyTickets = 2`, tickets stop being purchasable 2 hours before each event date.

---

## Architecture

### Single Source of Truth

All cutoff computation lives in one private method in `EventsService`. `EventsService` must inject `PlatformConfigService` (already injected in other services like `TransactionsService`), and `EventsModule` must import `ConfigModule`:

```typescript
// backend/src/modules/events/events.service.ts
private async getTicketCutoffDate(ctx: Ctx): Promise<Date> {
  const config = await this.configService.getPlatformConfig(ctx);
  const offsetMs = config.minimumHoursToBuyTickets * 60 * 60 * 1000;
  return new Date(Date.now() + offsetMs);
}
```

No other service or repository calls `new Date()` for cutoff purposes.

### Guard Method

`EventsService` exposes a reusable guard used by `OffersService`, `TransactionsService`, and `BffService`:

```typescript
async assertEventDateNotExpired(ctx: Ctx, eventDateId: string): Promise<void> {
  const cutoff = await this.getTicketCutoffDate(ctx);
  const eventDate = await this.eventsRepository.findEventDateById(ctx, eventDateId);
  if (!eventDate || eventDate.date < cutoff) {
    throw new BadRequestException('Event date is no longer available for purchase');
  }
}
```

`findEventDateById` returns `EventDate | undefined` (consistent with the existing repository return type convention in this codebase).

### Cutoff flow for public event list

`listEvents` in `EventsService` returns `EventWithDatesResponse[]` (raw domain objects, not public DTOs). The public controller endpoint calls `toPublicEventItem` on each result. The cutoff must be fetched once in `listEvents`, passed to `listEventsPaginated` (for the DB-level filter), and also returned alongside the events list so the controller can pass it to `toPublicEventItem`. Implementation options:

- Return `{ events, cutoffDate }` from `listEvents`, or
- Have the controller call `eventsService.getTicketCutoffDate` separately.

Preferred: `listEvents` returns `{ events: EventWithDatesResponse[]; cutoffDate: Date }` so the cutoff travels with the data and callers don't need to call a separate method.

**Note:** `getEventBySlug` (used by `getEventPageData` in BFF) is intentionally not modified — it returns all dates in `EventWithDatesResponse`. Cutoff filtering for the event detail page happens only at the `toPublicEventItem` mapping step.

---

## Changes by Layer

### 1. Data Model

**File:** `backend/prisma/schema.prisma`
**Migration:** `add_minimum_hours_to_buy_tickets`

Add to `PlatformConfig` model:
```prisma
minimumHoursToBuyTickets Int @default(0) @map("minimum_hours_to_buy_tickets")
```

### 2. Config Layer

**Files:** `config.domain.ts`, `config.repository.ts`, `config.service.ts`

- `config.domain.ts` (`PlatformConfig` interface): add `minimumHoursToBuyTickets: number`.
- `config.repository.ts`:
  - `findPlatformConfig` (read mapping): map the new DB column to the domain field.
  - `upsertPlatformConfig` (write path): add `minimumHoursToBuyTickets: config.minimumHoursToBuyTickets` to both the `create` and `update` blocks. Without this the value is never persisted to the DB.
- `config.service.ts`:
  - `updatePlatformConfig` merge block: add `minimumHoursToBuyTickets: body.minimumHoursToBuyTickets ?? current.minimumHoursToBuyTickets`.
  - `validatePlatformConfig`: add validation — integer, min 0, max 168 (one week).
  - `getDefaultsFromHocon` (or equivalent seeding path): return `0` as the default.

### 3. EventsModule + EventsService DI

**Files:** `events.module.ts`, `events.service.ts`

- `events.module.ts`: add `ConfigModule` to the `imports` array.
- `events.service.ts` constructor: inject `PlatformConfigService` (same pattern as `TransactionsService`).

### 4. EventsRepository

**File:** `backend/src/modules/events/events.repository.ts`

- `listEventsPaginated` accepts a `cutoffDate: Date` parameter (replacing internal `new Date()`).
- New method: `findEventDateById(ctx, eventDateId): Promise<EventDate | undefined>` — used by `assertEventDateNotExpired`.

The DB-level date filter in `listEventsPaginated`:
```typescript
where.dates = {
  some: { status: 'approved', date: { gte: cutoffDate } }
}
```

This ensures events with no future dates are excluded at the DB level, so pagination counts remain accurate.

### 5. EventsService

**File:** `backend/src/modules/events/events.service.ts`

- Add private `getTicketCutoffDate(ctx): Promise<Date>`.
- Add public `assertEventDateNotExpired(ctx, eventDateId): Promise<void>`.
- `listEvents`: fetch cutoff once, pass to `listEventsPaginated`. Return `{ events, cutoffDate }` so callers can pass it to `toPublicEventItem`.
- `getHighlightedEvents` (or its cache-fill callback): fetch cutoff once, pass to `listEventsPaginated` and to `toPublicEventItem` for each event.
- `toPublicEventItem`: accepts `cutoffDate?: Date` in options. When `cutoffDate` is `undefined`, **no date filtering is applied** — all dates are returned. Public-facing callers explicitly pass the fetched cutoff; admin callers omit it to see all dates.

### 6. EventsController

**File:** `backend/src/modules/events/events.controller.ts`

- Public list endpoint: destructure `{ events, cutoffDate }` from `listEvents`, pass `cutoffDate` to each `toPublicEventItem` call.
- Highlights endpoint (`getHighlightedEvents` cache-fill callback): same — destructure `{ events, cutoffDate }` from `listEvents`, pass `cutoffDate` to each `toPublicEventItem` call inside the callback. This is critical because highlights are cached for 24 hours; failing to apply the cutoff here would serve stale past dates until cache expiry.
- Admin-facing endpoints that call `toPublicEventItem`: omit `cutoffDate` entirely — admins see all dates.

### 7. BffService

**File:** `backend/src/modules/bff/bff.service.ts`

- `getEventPageData`: call `getTicketCutoffDate` (via `eventsService`), pass result to `toPublicEventItem` as `cutoffDate`.
- `getBuyPageData`: call `eventsService.assertEventDateNotExpired(ctx, listing.eventDateId)` after fetching the listing.

### 8. OffersService

**File:** `backend/src/modules/offers/offers.service.ts`

- `createOffer`: call `eventsService.assertEventDateNotExpired(ctx, listing.eventDateId)` after the existing listing validations.

### 9. TransactionsService

**File:** `backend/src/modules/transactions/transactions.service.ts`

- `initiatePurchase`: call `eventsService.assertEventDateNotExpired(ctx, listing.eventDateId)` after fetching the listing.

### 10. Admin Config — Backend

**Files:** `admin.api.ts`, admin Zod schema, `admin.service.ts`

- Add `minimumHoursToBuyTickets: number` to the `UpdatePlatformConfigRequest` schema and handler. No new endpoint needed — uses existing `PATCH /api/admin/platform-config`.

### 11. Frontend — Event Detail Page

**File:** `frontend/src/app/pages/Event.tsx`

When `event.dates` is empty after BFF response:
- Hide the date selector (pills and dropdown).
- Hide the buy / make-offer buttons.
- Show a message using `t('event.noDatesAvailable')` in the appropriate location in the layout.

### 12. Frontend — Admin Platform Config

**File:** `frontend/src/app/pages/admin/PlatformConfig.tsx` (or equivalent)

- Add a numeric input (integer, min 0) for `minimumHoursToBuyTickets` with label from i18n key `admin.platformConfig.minimumHoursToBuyTickets`.

### 13. Frontend — Buy Page

No changes needed. The existing `isListingUnavailableError` helper and `UnavailableOverlay` component already handle `BadRequestException` responses. The error message from `assertEventDateNotExpired` (`"Event date is no longer available for purchase"`) matches the `msg.includes("not available")` check.

### 14. Frontend — LandingNew.tsx

No additional changes needed. A frontend date filter (`new Date(d.date) >= now`) was already added to `eventToCardShape` in a prior fix and is intentionally retained as a belt-and-suspenders guard against stale cached data. It does not affect pagination (it filters dates within an event card, not events from the result set).

### 15. i18n

**Files:** `frontend/src/i18n/locales/en.json`, `es.json`

| Key | EN | ES |
|---|---|---|
| `event.noDatesAvailable` | `"No dates available for this event"` | `"No hay fechas disponibles para este evento"` |
| `admin.platformConfig.minimumHoursToBuyTickets` | `"Minimum hours before event to stop selling tickets"` | `"Horas mínimas antes del evento para dejar de vender entradas"` |

---

## Unit Tests

The following service methods require new unit test coverage:

- `EventsService.assertEventDateNotExpired` — expired date throws, future date passes, config offset applied correctly.
- `OffersService.createOffer` — new case: expired event date throws.
- `TransactionsService.initiatePurchase` — new case: expired event date throws.

---

## Migration Notes

- Default value of `minimumHoursToBuyTickets = 0` means zero behavior change on deploy.
- `toPublicEventItem` keeps its `cutoffDate` optional — admin-facing callers omit it and see all dates, which is correct.
- `getEventBySlug` is not modified — it returns all dates in `EventWithDatesResponse`. Cutoff filtering for the event detail page happens only at the mapping layer (`toPublicEventItem`).
- All `new Date()` hardcodings used as event cutoffs are replaced by the parameterized `cutoffDate`. The only remaining `new Date()` usages are for timestamps (createdAt, updatedAt, expiresAt) which are unrelated.
