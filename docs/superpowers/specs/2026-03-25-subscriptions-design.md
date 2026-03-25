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
  @@map("event_subscriptions")
}
```

**Key decisions:**
- `email` is always stored and denormalized. For logged-in users it is copied from their account at subscribe time — if the user later changes their email, the subscription remains valid.
- `subscriptionType` is a plain `String` (not a Prisma enum) to allow adding future types without enum migration.
- The `@@unique` constraint on `(eventId, subscriptionType, email)` enforces deduplication at the DB level.
- `userId` uses `onDelete: SetNull` so subscriptions survive user deletion (email is still available for future sends).

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

### Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/subscriptions` | `OptionalJwtAuthGuard` | Subscribe to event notifications |
| `GET` | `/api/subscriptions/count` | None (public) | Get subscriber count for an event |

**POST /api/subscriptions — logic:**
1. Validate `eventId` references an existing event; throw `NotFoundException` if not.
2. Resolve email: if authenticated → fetch `user.email` from DB (ignore body email entirely); if guest → use `body.email` (required; throw `BadRequestException` if missing or invalid format).
3. Upsert: attempt `create`; if unique constraint violation, treat as success (idempotent).
4. Return `{ subscribed: true }`.

**GET /api/subscriptions/count — query params:**
- `eventId: string` (required)
- `subscriptionType: string` (required)

Returns `{ count: number }` — count of subscriptions matching the filters.

### Unit tests

File: `backend/src/test/unit/modules/subscriptions/subscriptions.service.spec.ts`

**`subscribe` method:**
- Happy path — authenticated user subscribes successfully
- Happy path — guest subscribes with valid email
- Idempotent — duplicate subscription returns `{ subscribed: true }` without error
- Event not found — throws `NotFoundException`
- Guest missing email — throws `BadRequestException`
- Guest invalid email format — throws `BadRequestException`

**`getCount` method:**
- Happy path — returns correct count

---

## Frontend

### New service

`frontend/src/api/services/subscriptions.service.ts`

```typescript
subscribe(eventId: string, email?: string): Promise<{ subscribed: true }>
getCount(eventId: string, subscriptionType: string): Promise<{ count: number }>
```

### Changes to `EmptyEventState.tsx`

New props:
- `eventId: string` — passed from `Event.tsx`

Internally uses `useUser()` to detect auth state.

**Logged-in user:**
- Email input pre-filled with `user.email`, `disabled` (read-only, visually blocked).
- Clicking "Avisarme" calls `subscriptions.service.subscribe(eventId)` — no email in body.
- Shows success state on resolve.

**Guest:**
- Email input empty, editable (existing behavior).
- Clicking "Avisarme" validates format, then calls `subscriptions.service.subscribe(eventId, email)`.
- Shows success state on resolve.

**Error handling:**
- On API error: show a generic inline error message below the input (does not reset the email field).
- Loading state: button shows spinner, disabled during inflight request.

### Changes to `Event.tsx`

- Replace hardcoded `waitingCount = 0` with state fetched from `GET /api/subscriptions/count?eventId=&subscriptionType=NOTIFY_TICKET_AVAILABLE`.
- Fetch runs in parallel with the existing `ticketsService.getEventPage()` call.
- Pass `eventId` (from `apiEvent.id`) to `EmptyEventState`.
- On count fetch error: silently default to `0` (non-critical).

No new pages or routes.

---

## Out of scope

- Sending the notification email (future work).
- Unsubscribe endpoint.
- Admin view of subscriptions.
- Rate limiting the subscribe endpoint (can be added later via existing throttler setup).
