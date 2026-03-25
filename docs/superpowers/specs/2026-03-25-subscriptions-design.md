# Subscriptions Module — Design Spec

**Date:** 2026-03-25
**Status:** Approved

---

## Overview

Add a `subscriptions` module that lets users (logged in or guest) register to receive email notifications when tickets become available for an event. The first and only subscription type is `NOTIFY_TICKET_AVAILABLE`. The logic for *sending* the email is out of scope — this spec covers only the ability to create and count subscriptions.

The entry point is the existing "Sin entradas disponibles" empty state in the Event detail page (`EmptyEventState` component), which already has the UI built but lacks the API wiring.

---

## Database

New model `EventSubscription` added to `schema.prisma`:

```prisma
model EventSubscription {
  id               String   @id @default(uuid())
  eventId          String
  subscriptionType String   // "NOTIFY_TICKET_AVAILABLE" — string for extensibility
  userId           String?  // null for guests
  email            String   // always stored; for users, copied at subscribe time
  createdAt        DateTime @default(now())

  event            Event    @relation(fields: [eventId], references: [id], onDelete: Cascade)
  user             User?    @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@unique([eventId, subscriptionType, email])
  @@index([eventId, subscriptionType])
  @@index([email])
  @@map("event_subscriptions")
}
```

**Key decisions:**
- `email` is always stored and denormalized. For logged-in users it is copied from `user.email` (from the injected user context) at subscribe time — if the user later changes their email, the subscription remains valid.
- `subscriptionType` is a plain `String` (not a Prisma enum) to allow adding future types without enum migration.
- The `@@unique` constraint on `(eventId, subscriptionType, email)` enforces deduplication at the DB level.
- `userId` uses `onDelete: SetNull` so subscriptions survive user deletion (email is still available for future sends).
- `@@index([email])` is included for future email-based lookups (e.g., send logic, unsubscribe-all).

`User` model gains a `subscriptions EventSubscription[]` relation.
`Event` model gains a `subscriptions EventSubscription[]` relation.

---

## Backend

### Module structure

```
backend/src/modules/subscriptions/
  subscriptions.api.ts
  subscriptions.domain.ts
  subscriptions.controller.ts
  subscriptions.service.ts
  subscriptions.repository.interface.ts
  subscriptions.repository.ts
  subscriptions.module.ts
```

### Domain (`subscriptions.domain.ts`)

```typescript
export const SUBSCRIPTION_TYPES = {
  NOTIFY_TICKET_AVAILABLE: 'NOTIFY_TICKET_AVAILABLE',
} as const;

export type SubscriptionType = typeof SUBSCRIPTION_TYPES[keyof typeof SUBSCRIPTION_TYPES];

export const VALID_SUBSCRIPTION_TYPES = Object.values(SUBSCRIPTION_TYPES);

export interface EventSubscription {
  id: string;
  eventId: string;
  subscriptionType: SubscriptionType;
  userId: string | null;
  email: string;
  createdAt: Date;
}
```

### API contract (`subscriptions.api.ts`)

```typescript
// POST /api/subscriptions
export interface CreateSubscriptionRequest {
  eventId: string;
  subscriptionType: 'NOTIFY_TICKET_AVAILABLE';
  email?: string; // required for guests, ignored for authenticated users
}
export interface CreateSubscriptionResponse {
  subscribed: true;
}

// GET /api/subscriptions/count
export interface GetSubscriptionCountResponse {
  count: number;
}
```

### Service method signatures

```typescript
subscribe(ctx: Ctx, userId: string | null, userEmail: string | null, body: CreateSubscriptionRequest): Promise<CreateSubscriptionResponse>
getCount(ctx: Ctx, eventId: string, subscriptionType: string): Promise<GetSubscriptionCountResponse>
```

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/subscriptions` | `OptionalJwtAuthGuard` | Subscribe to event notifications |
| `GET` | `/api/subscriptions/count` | None — no guard applied, intentionally public | Get subscriber count for an event |

The `GET /api/subscriptions/count` endpoint is intentionally public (no `@UseGuards`). It returns aggregate data only (a count) and requires no user identity.

### POST /api/subscriptions — service logic

1. Validate `subscriptionType` is in `VALID_SUBSCRIPTION_TYPES`; throw `BadRequestException` if not.
2. Validate `eventId` references an existing event; throw `NotFoundException` if not. Use `EventsService` (injected from `EventsModule`) to perform this lookup — do not query the events table directly.
3. Resolve email:
   - Authenticated: use `userEmail` from the injected user context (passed from controller via `@User()`) — ignore `body.email` entirely.
   - Guest: use `body.email`. Throw `BadRequestException` if missing or not a valid email format.
4. Upsert: attempt `create`. If a unique constraint violation occurs (P2002), treat as success (idempotent).
5. Return `{ subscribed: true }`.

### GET /api/subscriptions/count — service logic

Query params: `eventId` (required), `subscriptionType` (required). Throw `BadRequestException` if either is absent.

Returns `{ count: number }` — count of `EventSubscription` rows matching `eventId` and `subscriptionType`. If `eventId` does not reference an existing event, return `{ count: 0 }` (do not throw — this is a read-only, non-critical endpoint). `subscriptionType` is not validated against `VALID_SUBSCRIPTION_TYPES` in this endpoint — an unknown value will simply yield `{ count: 0 }`, which is safe and intentional (avoids coupling the read path to the write path's validation).

### Repository interface (`subscriptions.repository.interface.ts`)

Defines the contract for data access. At minimum:

```typescript
create(data: { eventId: string; subscriptionType: string; userId: string | null; email: string }): Promise<EventSubscription>
count(eventId: string, subscriptionType: string): Promise<number>
```

### Module dependency

`SubscriptionsModule` imports `EventsModule` (or whichever module exports `EventsService`) to validate event existence in the `subscribe` method.

### Unit tests

File: `backend/src/test/unit/modules/subscriptions/subscriptions.service.spec.ts`

**`subscribe` method:**
- Happy path — authenticated user subscribes successfully
- Happy path — guest subscribes with valid email
- Idempotent — duplicate subscription (unique constraint violation) returns `{ subscribed: true }` without error
- Event not found — throws `NotFoundException`
- Unknown `subscriptionType` — throws `BadRequestException`
- Guest missing email — throws `BadRequestException`
- Guest invalid email format — throws `BadRequestException`

**`getCount` method:**
- Happy path — returns correct count
- `eventId` missing — throws `BadRequestException`
- `subscriptionType` missing — throws `BadRequestException`
- Non-existent `eventId` — returns `{ count: 0 }`

---

## Frontend

### New service

`frontend/src/api/services/subscriptions.service.ts`

```typescript
subscribe(eventId: string, email?: string): Promise<{ subscribed: true }>
getCount(eventId: string, subscriptionType: string): Promise<{ count: number }>
```

Export from `frontend/src/api/services/index.ts` barrel.

### Changes to `EmptyEventState.tsx`

New props:
- `eventId: string` — passed from `Event.tsx`

Internally uses `useUser()` to detect auth state.

**Logged-in user:**
- Email input pre-filled with `user.email`, `disabled` (read-only, visually blocked).
- Clicking "Avisarme" calls `subscriptions.service.subscribe(eventId)` — no email in body.
- During inflight: button disabled with spinner; input remains disabled (it already is for logged-in users).
- Shows success state on resolve.

**Guest:**
- Email input empty, editable (existing behavior).
- Clicking "Avisarme" validates format client-side, then calls `subscriptions.service.subscribe(eventId, email)`.
- During inflight: button disabled with spinner; input also disabled to prevent edits during the request.
- Shows success state on resolve.

**Success state persistence:** the `alertSent` flag is local component state and resets on unmount. There is no "already subscribed" state fetched from the backend on mount — intentional.

**Error handling:**
- On API error: show a generic inline error message below the input (does not reset the email field).

### Changes to `Event.tsx`

- Replace hardcoded `waitingCount = 0` with state fetched from `GET /api/subscriptions/count?eventId=&subscriptionType=NOTIFY_TICKET_AVAILABLE`.
- Fetch runs in parallel with the existing `ticketsService.getEventPage()` call.
- Pass `eventId` (from `apiEvent.id`) to `EmptyEventState`. The `<EmptyEventState>` component must only be rendered inside the post-load branch where `apiEvent` is confirmed non-null — the empty state already only renders when `sorted.length === 0`, and the `EVENT` object (derived from `apiEvent`) is null-guarded before that point. `eventId` is therefore always a non-null string at the render site and should be typed as required.
- On count fetch error: silently default to `0` (non-critical).
- Remove the existing `console.error("Failed to fetch event page:", err)` at line 199. The `setError(t("eventTickets.errorLoading"))` call on the line above it already provides user-facing feedback; the `console.error` adds no value and violates the project's no-console convention. Simply delete that line.

No new pages or routes.

---

## Out of scope

- Sending the notification email (future work).
- Unsubscribe endpoint.
- Admin view of subscriptions.
- Rate limiting the subscribe endpoint (can be added later via existing throttler setup).
