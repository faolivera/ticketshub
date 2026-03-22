# Ticket Purchase Cutoff — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Centralize event date cutoff logic in `EventsService` so expired events are hidden from all public surfaces, purchases/offers are rejected for expired dates, and admins can configure a "minimum hours before event" buffer.

**Architecture:** A private `getTicketCutoffDate(ctx)` method in `EventsService` computes `now + minimumHoursToBuyTickets hours` from `PlatformConfig`. All DB-level date filters and `toPublicEventItem` mapping receive this cutoff as a parameter. A public `assertEventDateNotExpired(ctx, eventDateId)` guard is called by `OffersService`, `TransactionsService`, and `BffService` before any write operation.

**Tech Stack:** NestJS, TypeScript (strict), Prisma ORM, PostgreSQL, Zod, React 18, react-i18next

**Spec:** `docs/superpowers/specs/2026-03-22-ticket-cutoff-design.md`

---

## File Map

| File | Change |
|---|---|
| `backend/prisma/schema.prisma` | Add `minimumHoursToBuyTickets` field |
| `backend/prisma/migrations/…/migration.sql` | New migration (generated) |
| `backend/src/modules/config/config.domain.ts` | Add field to `PlatformConfig` interface |
| `backend/src/modules/config/config.api.ts` | Add field to `GetPlatformConfigResponse` + `UpdatePlatformConfigRequest` |
| `backend/src/modules/config/schemas/api.schemas.ts` | Add field to `GetPlatformConfigResponseSchema` + `UpdatePlatformConfigRequestSchema` |
| `backend/src/modules/config/config.repository.ts` | Map field in `findPlatformConfig` read, add to both `create`/`update` in `upsertPlatformConfig`, add to `mergeWithVerificationDefaults` |
| `backend/src/modules/config/config.service.ts` | Add to merge, validate, and HOCON defaults |
| `backend/src/modules/events/events.module.ts` | Import `ConfigModule` |
| `backend/src/modules/events/events.service.ts` | Inject `PlatformConfigService`; add `getTicketCutoffDate`, `assertEventDateNotExpired`; update `listEvents` return type; update `toPublicEventItem` |
| `backend/src/modules/events/events.controller.ts` | Update `listEvents` and `getHighlightedEvents` handlers to forward `cutoffDate` |
| `backend/src/modules/events/events.repository.ts` | Add `cutoffDate` param to `listEventsPaginated` |
| `backend/src/modules/bff/bff.service.ts` | `getEventPageData`: pass cutoff to mapper; `getBuyPageData`: assert date not expired |
| `backend/src/modules/offers/offers.module.ts` | Import `EventsModule` |
| `backend/src/modules/offers/offers.service.ts` | `createOffer`: assert date not expired |
| `backend/src/modules/support/support-seed.service.ts` | Update `listEvents` call to destructure `{ events }` |
| `backend/src/modules/transactions/transactions.service.ts` | `initiatePurchase`: assert date not expired |
| `frontend/src/api/types/admin.ts` | Add field to `PlatformConfig` + `UpdatePlatformConfigRequest` |
| `frontend/src/app/pages/admin/PlatformConfig.tsx` | Add input for the new field |
| `frontend/src/app/pages/Event.tsx` | Show "no dates" message when `dates` array is empty |
| `frontend/src/i18n/locales/en.json` | Add two new keys |
| `frontend/src/i18n/locales/es.json` | Add two new keys |
| `backend/test/unit/modules/events/events.service.spec.ts` | New tests for `assertEventDateNotExpired`; update mock setup for `PlatformConfigService` |
| `backend/test/unit/modules/offers/offers.service.spec.ts` | New test: `createOffer` rejects expired date |
| `backend/test/unit/modules/admin/admin.service.spec.ts` | No change needed (config tested via config.service) |

---

## Task 1: Prisma migration — add `minimumHoursToBuyTickets`

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: migration (via `prisma migrate dev`)

- [ ] **Step 1: Add field to Prisma schema**

In `schema.prisma`, find the `PlatformConfig` model and add after `transactionChatMaxMessages`:

```prisma
minimumHoursToBuyTickets Int @default(0) @map("minimum_hours_to_buy_tickets")
```

- [ ] **Step 2: Run migration**

```bash
cd backend
npx prisma migrate dev --name add_minimum_hours_to_buy_tickets
```

Expected: new migration file created in `backend/prisma/migrations/`, Prisma client regenerated.

- [ ] **Step 3: Verify**

```bash
npx prisma studio
```

Open the `PlatformConfig` table and confirm `minimum_hours_to_buy_tickets` column exists with default 0.

- [ ] **Step 4: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/
git commit -m "feat: add minimum_hours_to_buy_tickets to PlatformConfig schema"
```

---

## Task 2: Config layer — domain, repository, service, API types, Zod schemas

**Files:**
- Modify: `backend/src/modules/config/config.domain.ts`
- Modify: `backend/src/modules/config/config.api.ts`
- Modify: `backend/src/modules/config/schemas/api.schemas.ts`
- Modify: `backend/src/modules/config/config.repository.ts`
- Modify: `backend/src/modules/config/config.service.ts`

- [ ] **Step 1: Add field to `PlatformConfig` interface**

In `config.domain.ts`, add after `exchangeRates`:

```typescript
/** Hours before event start after which tickets can no longer be purchased. Default 0 (no buffer). */
minimumHoursToBuyTickets: number;
```

- [ ] **Step 2: Add field to `config.api.ts`**

In `GetPlatformConfigResponse` interface, add:
```typescript
minimumHoursToBuyTickets: number;
```

In `UpdatePlatformConfigRequest` interface, add:
```typescript
minimumHoursToBuyTickets?: number;
```

- [ ] **Step 3: Add field to Zod schemas**

In `backend/src/modules/config/schemas/api.schemas.ts`:

In `GetPlatformConfigResponseSchema` (around line 65), add:
```typescript
minimumHoursToBuyTickets: z.number().int().min(0).max(168),
```

In `UpdatePlatformConfigRequestSchema` (around line 81), add:
```typescript
minimumHoursToBuyTickets: z.number().int().min(0).max(168).optional(),
```

- [ ] **Step 4: Update `config.repository.ts` — read mapping**

In `findPlatformConfig`, the base object passed to `mergeWithVerificationDefaults` is typed as `Omit<PlatformConfig, 'riskEngine' | 'exchangeRates'>`. Add the new field to that object:

```typescript
minimumHoursToBuyTickets: row.minimumHoursToBuyTickets,
```

- [ ] **Step 5: Update `config.repository.ts` — `mergeWithVerificationDefaults`**

The method signature is `mergeWithVerificationDefaults(base: Omit<PlatformConfig, 'riskEngine' | 'exchangeRates'>, riskEngine)`. It spreads `base` into the result — no change needed here since the field is already in `base`.

- [ ] **Step 6: Update `config.repository.ts` — write path (`upsertPlatformConfig`)**

In the `create` block, add after `transactionChatMaxMessages`:
```typescript
minimumHoursToBuyTickets: config.minimumHoursToBuyTickets,
```

In the `update` block, add the same:
```typescript
minimumHoursToBuyTickets: config.minimumHoursToBuyTickets,
```

Also in the return mapping from `row` (after `upsert`), the `mergeWithVerificationDefaults` call needs the field:
```typescript
minimumHoursToBuyTickets: row.minimumHoursToBuyTickets,
```

- [ ] **Step 7: Update `config.service.ts` — merge**

In `updatePlatformConfig`, in the `merged` object, add after `transactionChatMaxMessages`:
```typescript
minimumHoursToBuyTickets:
  body.minimumHoursToBuyTickets ?? current.minimumHoursToBuyTickets,
```

- [ ] **Step 8: Update `config.service.ts` — validation**

In `validatePlatformConfig`, add:
```typescript
const MIN_HOURS_TO_BUY = 0;
const MAX_HOURS_TO_BUY = 168; // 1 week
if (
  !Number.isInteger(config.minimumHoursToBuyTickets) ||
  config.minimumHoursToBuyTickets < MIN_HOURS_TO_BUY ||
  config.minimumHoursToBuyTickets > MAX_HOURS_TO_BUY
) {
  throw new BadRequestException(
    `minimumHoursToBuyTickets must be an integer between ${MIN_HOURS_TO_BUY} and ${MAX_HOURS_TO_BUY}`,
  );
}
```

- [ ] **Step 9: Update `config.service.ts` — HOCON defaults**

In `getDefaultsFromHocon`, in the returned object, add:
```typescript
minimumHoursToBuyTickets: 0,
```

- [ ] **Step 10: Run TypeScript compiler to confirm no errors**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 11: Commit**

```bash
git add backend/src/modules/config/
git commit -m "feat: add minimumHoursToBuyTickets to PlatformConfig domain, repo, service, and API types"
```

---

## Task 3: EventsService — inject config, add cutoff methods, update `toPublicEventItem` and `listEvents`

**Files:**
- Modify: `backend/src/modules/events/events.module.ts`
- Modify: `backend/src/modules/events/events.service.ts`
- Modify: `backend/test/unit/modules/events/events.service.spec.ts`

- [ ] **Step 1: Write failing tests for `assertEventDateNotExpired`**

In `backend/test/unit/modules/events/events.service.spec.ts`:

First, add `PlatformConfigService` to the mock setup. In `beforeEach`, add to `mockEventsRepository`:
```typescript
getApprovedEventsForSelection: jest.fn(),
listEventsPaginated: jest.fn(),
```
(these may already exist — check and add only what's missing)

Add `PlatformConfigService` mock to providers:
```typescript
const mockPlatformConfigService = {
  getPlatformConfig: jest.fn(),
};
```

Add to `providers` array in `Test.createTestingModule`:
```typescript
{ provide: PlatformConfigService, useValue: mockPlatformConfigService },
```

Add import at top:
```typescript
import { PlatformConfigService } from '../../../../src/modules/config/config.service';
```

Then add a new `describe` block:

```typescript
describe('assertEventDateNotExpired', () => {
  const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2h from now
  const pastDate = new Date(Date.now() - 60 * 60 * 1000);       // 1h ago

  beforeEach(() => {
    mockPlatformConfigService.getPlatformConfig.mockResolvedValue({
      minimumHoursToBuyTickets: 0,
    });
  });

  it('should not throw when event date is in the future', async () => {
    eventsRepository.findEventDateById.mockResolvedValue({
      id: 'edt_1',
      date: futureDate,
    } as any);

    await expect(
      service.assertEventDateNotExpired(mockCtx, 'edt_1'),
    ).resolves.toBeUndefined();
  });

  it('should throw BadRequestException when event date is in the past', async () => {
    eventsRepository.findEventDateById.mockResolvedValue({
      id: 'edt_1',
      date: pastDate,
    } as any);

    await expect(
      service.assertEventDateNotExpired(mockCtx, 'edt_1'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should throw BadRequestException when event date not found', async () => {
    eventsRepository.findEventDateById.mockResolvedValue(undefined);

    await expect(
      service.assertEventDateNotExpired(mockCtx, 'edt_missing'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should apply minimumHoursToBuyTickets offset', async () => {
    // Event is 30 minutes from now, but buffer is 1 hour → should be expired
    const soonDate = new Date(Date.now() + 30 * 60 * 1000);
    mockPlatformConfigService.getPlatformConfig.mockResolvedValue({
      minimumHoursToBuyTickets: 1,
    });
    eventsRepository.findEventDateById.mockResolvedValue({
      id: 'edt_soon',
      date: soonDate,
    } as any);

    await expect(
      service.assertEventDateNotExpired(mockCtx, 'edt_soon'),
    ).rejects.toThrow(BadRequestException);
  });

  it('should pass when event date is beyond the offset window', async () => {
    // Event is 2 hours from now, buffer is 1 hour → should NOT be expired
    const twoHoursFromNow = new Date(Date.now() + 2 * 60 * 60 * 1000);
    mockPlatformConfigService.getPlatformConfig.mockResolvedValue({
      minimumHoursToBuyTickets: 1,
    });
    eventsRepository.findEventDateById.mockResolvedValue({
      id: 'edt_2h',
      date: twoHoursFromNow,
    } as any);

    await expect(
      service.assertEventDateNotExpired(mockCtx, 'edt_2h'),
    ).resolves.toBeUndefined();
  });
});
```

- [ ] **Step 2: Run tests to verify they fail**

```bash
cd backend
npm test -- --testPathPattern="events.service.spec" --no-coverage
```

Expected: FAIL — `service.assertEventDateNotExpired is not a function` (or similar).

- [ ] **Step 3: Add `ConfigModule` to `events.module.ts`**

```typescript
import { ConfigModule } from '../config/config.module';
```

Add `ConfigModule` to the `imports` array in `@Module`.

- [ ] **Step 4: Add `PlatformConfigService` injection to `EventsService`**

Add import:
```typescript
import { PlatformConfigService } from '../config/config.service';
```

Add to constructor:
```typescript
@Inject(PlatformConfigService)
private readonly platformConfigService: PlatformConfigService,
```

- [ ] **Step 5: Add `getTicketCutoffDate` (public — needed by BffService)**

Add after the constructor:
```typescript
/**
 * Compute the effective ticket purchase cutoff date.
 * effectiveCutoff = now + minimumHoursToBuyTickets hours.
 * With default config (0 hours) this equals now.
 */
async getTicketCutoffDate(ctx: Ctx): Promise<Date> {
  const config = await this.platformConfigService.getPlatformConfig(ctx);
  const offsetMs = config.minimumHoursToBuyTickets * 60 * 60 * 1000;
  return new Date(Date.now() + offsetMs);
}
```

- [ ] **Step 6: Add `assertEventDateNotExpired`**

```typescript
/**
 * Throws BadRequestException if the given event date is expired (before effectiveCutoff).
 * Call this before creating offers, initiating purchases, or serving the buy page.
 */
async assertEventDateNotExpired(ctx: Ctx, eventDateId: string): Promise<void> {
  const cutoff = await this.getTicketCutoffDate(ctx);
  const eventDate = await this.eventsRepository.findEventDateById(ctx, eventDateId);
  if (!eventDate || eventDate.date < cutoff) {
    throw new BadRequestException('Event date is no longer available for purchase');
  }
}
```

- [ ] **Step 7: Update `toPublicEventItem` — remove hardcoded `new Date()` filter**

Current signature (line ~884):
```typescript
toPublicEventItem(
  event: EventWithDatesResponse,
  options?: { includeStatus?: boolean },
): PublicListEventItem
```

New signature:
```typescript
toPublicEventItem(
  event: EventWithDatesResponse,
  options?: { includeStatus?: boolean; cutoffDate?: Date },
): PublicListEventItem
```

Replace the dates filter (currently line ~905-911):
```typescript
// OLD:
dates: (event.dates ?? [])
  .filter((d) => new Date(d.date) >= new Date())
  .map((d) => ({ ... })),

// NEW:
dates: (event.dates ?? [])
  .filter((d) =>
    options?.cutoffDate === undefined || new Date(d.date) >= options.cutoffDate!,
  )
  .map((d) => ({
    id: d.id,
    date: d.date instanceof Date ? d.date.toISOString() : String(d.date),
    status: d.status,
  })),
```

When `cutoffDate` is `undefined` (admin callers), all dates are returned. Public callers pass the computed cutoff.

- [ ] **Step 8: Update `listEvents` return type**

Change signature from:
```typescript
async listEvents(
  ctx: Ctx,
  query: ListEventsQuery,
  includeAllStatuses: boolean = false,
): Promise<EventWithDatesResponse[]>
```

To:
```typescript
async listEvents(
  ctx: Ctx,
  query: ListEventsQuery,
  includeAllStatuses: boolean = false,
): Promise<{ events: EventWithDatesResponse[]; cutoffDate: Date }>
```

At the top of the method body, fetch the cutoff (only for public calls, but fetching it always is simpler and correct):
```typescript
const cutoffDate = await this.getTicketCutoffDate(ctx);
```

Pass it to `listEventsPaginated`:
```typescript
const result = await this.eventsRepository.listEventsPaginated(ctx, {
  approvedOnly: !includeAllStatuses,
  status: query.status as EventStatus | undefined,
  category: query.category,
  search: query.search,
  limit,
  offset,
  orderBy: isPublicListing ? 'rankingScore' : 'createdAt',
  highlighted: query.highlighted,
  cutoffDate,  // ← add this
});
```

Change the final return from:
```typescript
return withImages.map((e) => { ... });
```

To:
```typescript
const events = withImages.map((e) => { ... });
return { events, cutoffDate };
```

- [ ] **Step 9: Fix all callers of `listEvents` outside `events.service.ts`**

There is one external caller to update now (the controller is handled in Task 5):

**`backend/src/modules/support/support-seed.service.ts` line ~148:**
```typescript
// OLD:
const existingEvents = await this.eventsService.listEvents(...);
const existingBadBunny = existingEvents.find(...);

// NEW:
const { events: existingEvents } = await this.eventsService.listEvents(...);
const existingBadBunny = existingEvents.find(...);
```

Also search for any internal calls to `this.listEvents` within `events.service.ts` itself and destructure those too.

- [ ] **Step 10: Run tests**

```bash
cd backend
npm test -- --testPathPattern="events.service.spec" --no-coverage
```

Expected: new `assertEventDateNotExpired` tests PASS. Existing tests may fail if they mock `listEvents` — if so, update mocks. Fix any TypeScript errors.

- [ ] **Step 11: Commit**

```bash
git add backend/src/modules/events/events.module.ts \
        backend/src/modules/events/events.service.ts \
        backend/test/unit/modules/events/events.service.spec.ts
git commit -m "feat: add getTicketCutoffDate and assertEventDateNotExpired to EventsService"
```

---

## Task 4: EventsRepository — parameterize `listEventsPaginated`

**Files:**
- Modify: `backend/src/modules/events/events.repository.ts`
- Modify: `backend/src/modules/events/events.repository.interface.ts` (if `listEventsPaginated` is declared there)

- [ ] **Step 1: Update `listEventsPaginated` signature**

In `events.repository.ts`, find `listEventsPaginated` (line ~141). Add `cutoffDate: Date` to the `opts` parameter object:

```typescript
async listEventsPaginated(
  _ctx: Ctx,
  opts: {
    approvedOnly: boolean;
    status?: EventStatus;
    category?: EventCategory;
    search?: string;
    limit: number;
    offset: number;
    orderBy?: 'createdAt' | 'rankingScore';
    highlighted?: boolean;
    cutoffDate: Date;  // ← add
  },
): Promise<{ events: Event[]; total: number }>
```

- [ ] **Step 2: Replace hardcoded `new Date()` with `opts.cutoffDate`**

Replace:
```typescript
date: { gte: new Date() },
```

With:
```typescript
date: { gte: opts.cutoffDate },
```

- [ ] **Step 3: Update the repository interface (if applicable)**

If `IEventsRepository` in `events.repository.interface.ts` declares `listEventsPaginated`, add `cutoffDate: Date` to that signature too.

- [ ] **Step 4: Run TypeScript check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors (EventsService already passes `cutoffDate` from Task 3).

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/events/events.repository.ts \
        backend/src/modules/events/events.repository.interface.ts
git commit -m "feat: pass cutoffDate to listEventsPaginated for DB-level date filtering"
```

---

## Task 5: EventsController — forward `cutoffDate` from `listEvents`

**Files:**
- Modify: `backend/src/modules/events/events.controller.ts`

- [ ] **Step 1: Update `listEvents` handler (public endpoint)**

Find the `listEvents` controller method (~line 122). Change:
```typescript
const events = await this.eventsService.listEvents(ctx, query, false);
const data: ListEventsPublicResponse = events.map((e) =>
  this.eventsService.toPublicEventItem(e, { includeStatus: false }),
);
```

To:
```typescript
const { events, cutoffDate } = await this.eventsService.listEvents(ctx, query, false);
const data: ListEventsPublicResponse = events.map((e) =>
  this.eventsService.toPublicEventItem(e, { includeStatus: false, cutoffDate }),
);
```

- [ ] **Step 2: Update `getHighlightedEvents` cache-fill callback**

Find the `getHighlightedEvents` handler (~line 96). Change:
```typescript
const events = await this.eventsService.listEvents(
  ctx,
  { status: 'approved', highlighted: true, limit: 20 },
  false,
);
return events.map((e) =>
  this.eventsService.toPublicEventItem(e, { includeStatus: false }),
);
```

To:
```typescript
const { events, cutoffDate } = await this.eventsService.listEvents(
  ctx,
  { status: 'approved', highlighted: true, limit: 20 },
  false,
);
return events.map((e) =>
  this.eventsService.toPublicEventItem(e, { includeStatus: false, cutoffDate }),
);
```

- [ ] **Step 3: Update `getEvent` single-event handler**

The `GET /api/events/:id` handler (~line 169) also calls `toPublicEventItem` with no `cutoffDate`, which would now expose past dates since `undefined` means no filtering. Fix:

```typescript
async getEvent(
  @Context() ctx: Ctx,
  @Param('id') id: string,
): Promise<ApiResponse<PublicListEventItem>> {
  const event = await this.eventsService.getEventById(ctx, id);
  const cutoffDate = await this.eventsService.getTicketCutoffDate(ctx);
  const data = this.eventsService.toPublicEventItem(event, {
    includeStatus: true,
    cutoffDate,
  });
  return { success: true, data };
}
```

- [ ] **Step 4: Check for any other `listEvents` or `toPublicEventItem` callers in the controller**

Search for any remaining calls to `this.eventsService.listEvents` or `toPublicEventItem` in the controller file. Admin-facing callers that explicitly serve all dates should omit `cutoffDate`.

- [ ] **Step 5: Run TypeScript check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add backend/src/modules/events/events.controller.ts
git commit -m "feat: forward cutoffDate from listEvents to toPublicEventItem in EventsController"
```

---

## Task 6: BffService — apply cutoff to event page and guard buy page

**Files:**
- Modify: `backend/src/modules/bff/bff.service.ts`

- [ ] **Step 1: Update `getEventPageData`**

Find the call to `toPublicEventItem` inside `getEventPageData` (~line 94):
```typescript
const event = this.eventsService.toPublicEventItem(fullEvent, { includeStatus: true });
```

Replace with:
```typescript
const cutoffDate = await this.eventsService.getTicketCutoffDate(ctx);
const event = this.eventsService.toPublicEventItem(fullEvent, {
  includeStatus: true,
  cutoffDate,
});
```

- [ ] **Step 2: Update `getBuyPageData`**

After `const listing = await this.ticketsService.getListingById(ctx, ticketId);`, add:

```typescript
await this.eventsService.assertEventDateNotExpired(ctx, listing.eventDateId);
```

- [ ] **Step 3: Run TypeScript check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add backend/src/modules/bff/bff.service.ts
git commit -m "feat: apply ticket cutoff in BFF getEventPageData and getBuyPageData"
```

---

## Task 7: OffersService — reject expired dates on `createOffer`

**Files:**
- Modify: `backend/src/modules/offers/offers.service.ts`
- Modify: `backend/test/unit/modules/offers/offers.service.spec.ts`

- [ ] **Step 1: Write failing test**

In `offers.service.spec.ts`, add `EventsService` to the mock setup:

```typescript
import { EventsService } from '../../../../src/modules/events/events.service';
```

Add to mocks in `beforeEach`:
```typescript
const mockEventsService = {
  assertEventDateNotExpired: jest.fn(),
};
```

Add to providers:
```typescript
{ provide: EventsService, useValue: mockEventsService },
```

Add test case in the `createOffer` describe block (create one if it doesn't exist):

```typescript
describe('createOffer', () => {
  const mockListing: TicketListingWithEvent = {
    id: 'listing_1',
    sellerId: 'seller_1',
    eventDateId: 'edt_1',
    status: 'Active',
    bestOfferConfig: { enabled: true, minimumPrice: { amount: 1000, currency: 'ARS' } },
    eventName: 'Test Event',
  } as any;

  beforeEach(() => {
    ticketsService.getListingById.mockResolvedValue(mockListing);
    mockEventsService.assertEventDateNotExpired.mockResolvedValue(undefined);
    offersRepository.findActiveByUserAndListing.mockResolvedValue(null);
    mockPlatformConfigService.getPlatformConfig.mockResolvedValue({
      offerPendingExpirationMinutes: 60,
    });
    offersRepository.create.mockResolvedValue({ id: 'off_new' } as any);
  });

  it('should throw BadRequestException when event date is expired', async () => {
    mockEventsService.assertEventDateNotExpired.mockRejectedValue(
      new BadRequestException('Event date is no longer available for purchase'),
    );

    await expect(
      service.createOffer(mockCtx, 'buyer_1', {
        listingId: 'listing_1',
        offeredPrice: { amount: 1000, currency: 'ARS' },
      } as any),
    ).rejects.toThrow(BadRequestException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
npm test -- --testPathPattern="offers.service.spec" --no-coverage
```

Expected: FAIL — `mockEventsService.assertEventDateNotExpired` is not called / module not provided.

- [ ] **Step 3: Update `offers.module.ts` to import `EventsModule`**

Open `backend/src/modules/offers/offers.module.ts`. Add:
```typescript
import { forwardRef } from '@nestjs/common';
import { EventsModule } from '../events/events.module';
```

Add `forwardRef(() => EventsModule)` to the `imports` array. Use `forwardRef` to avoid circular dependency issues (EventsModule imports TicketsModule which may import OffersModule).

- [ ] **Step 4: Add `EventsService` injection to `OffersService`**

In `offers.service.ts`, add import:
```typescript
import { EventsService } from '../events/events.service';
```

Add to constructor:
```typescript
@Inject(EventsService)
private readonly eventsService: EventsService,
```

- [ ] **Step 5: Call `assertEventDateNotExpired` in `createOffer`**

After the existing `listing.status !== 'Active'` check (~line 69), add:

```typescript
await this.eventsService.assertEventDateNotExpired(ctx, listing.eventDateId);
```

- [ ] **Step 6: Run tests**

```bash
cd backend
npm test -- --testPathPattern="offers.service.spec" --no-coverage
```

Expected: new test PASS, all existing tests still PASS.

- [ ] **Step 7: Commit**

```bash
git add backend/src/modules/offers/offers.module.ts \
        backend/src/modules/offers/offers.service.ts \
        backend/test/unit/modules/offers/offers.service.spec.ts
git commit -m "feat: reject createOffer when event date is expired"
```

---

## Task 8: TransactionsService — reject expired dates on `initiatePurchase`

**Files:**
- Modify: `backend/src/modules/transactions/transactions.service.ts`
- Modify: `backend/test/unit/modules/transactions/transactions.service.spec.ts`

- [ ] **Step 1: Write failing test in `transactions.service.spec.ts`**

Open `backend/test/unit/modules/transactions/transactions.service.spec.ts`. Find the `initiatePurchase` describe block. Add a mock for `eventsService.assertEventDateNotExpired` (it may already be mocked — if so, configure its rejection value):

```typescript
it('should throw BadRequestException when event date is expired', async () => {
  // Arrange: listing found, but event date is expired
  mockTicketsService.getListingById.mockResolvedValue({
    id: 'listing_1',
    sellerId: 'seller_1',
    eventDateId: 'edt_expired',
    status: 'Active',
  } as any);
  mockEventsService.assertEventDateNotExpired.mockRejectedValue(
    new BadRequestException('Event date is no longer available for purchase'),
  );

  // Act & Assert
  await expect(
    service.initiatePurchase(mockCtx, 'buyer_1', 'listing_1', undefined, 'pm_1', undefined, undefined),
  ).rejects.toThrow(BadRequestException);
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
cd backend
npm test -- --testPathPattern="transactions.service.spec" --no-coverage
```

Expected: FAIL — `assertEventDateNotExpired` is not called yet.

- [ ] **Step 4: Add `assertEventDateNotExpired` call to `initiatePurchase`**

In `transactions.service.ts`, find `initiatePurchase` (~line 184). After `const listing = await this.ticketsService.getListingById(ctx, listingId);` and the `sellerId === buyerId` check, add:

```typescript
await this.eventsService.assertEventDateNotExpired(ctx, listing.eventDateId);
```

`EventsService` is already imported in `TransactionsService`. Check the constructor — if the injection is not already there, add it using `forwardRef`:
```typescript
@Inject(forwardRef(() => EventsService))
private readonly eventsService: EventsService,
```

- [ ] **Step 5: Run tests**

```bash
cd backend
npm test -- --testPathPattern="transactions.service.spec" --no-coverage
```

Expected: new test PASS, all existing tests PASS.

- [ ] **Step 6: Run TypeScript check**

```bash
cd backend
npx tsc --noEmit
```

Expected: no errors.

- [ ] **Step 7: Run all tests to catch regressions**

```bash
cd backend
npm test --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 8: Commit**

```bash
git add backend/src/modules/transactions/transactions.service.ts \
        backend/test/unit/modules/transactions/transactions.service.spec.ts
git commit -m "feat: reject initiatePurchase when event date is expired"
```

---

## Task 9: Frontend — i18n strings

**Files:**
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/i18n/locales/es.json`

- [ ] **Step 1: Add keys to `en.json`**

Find an appropriate section (e.g. under `"event"`) and add:
```json
"noDatesAvailable": "No dates available for this event"
```

Find or create `"admin"` → `"platformConfig"` and add:
```json
"minimumHoursToBuyTickets": "Minimum hours before event to stop selling tickets"
```

- [ ] **Step 2: Add keys to `es.json`**

Same structure:
```json
"noDatesAvailable": "No hay fechas disponibles para este evento"
```

```json
"minimumHoursToBuyTickets": "Horas mínimas antes del evento para dejar de vender entradas"
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/i18n/
git commit -m "feat: add i18n keys for ticket cutoff feature"
```

---

## Task 10: Frontend — Event detail page "no dates" state

**Files:**
- Modify: `frontend/src/app/pages/Event.tsx`

- [ ] **Step 1: Locate where dates are rendered**

In `Event.tsx`, find the date selector pills and the buy/offer buttons. Based on the existing code, `event.dates` (the `EventDisplay.dates` array) drives both the date dropdown and the buy button visibility.

- [ ] **Step 2: Add "no dates" message and hide actions**

Find the section that renders date selectors and buy/offer actions. Wrap it in a conditional:

```tsx
{event.dates.length === 0 ? (
  <p style={{ color: MUTED, fontSize: '14px', fontFamily: S.fontFamily }}>
    {t('event.noDatesAvailable')}
  </p>
) : (
  // existing date selector + buy/offer UI
)}
```

Make sure `useTranslation` is already imported (it should be — check at top of file).

- [ ] **Step 3: Verify `buildEventAndTickets` still filters by `status === "approved"`**

The function `buildEventAndTickets` in `Event.tsx` filters `apiEvent.dates` by `status === "approved"`. Since the backend now omits past dates entirely (when `cutoffDate` is passed), the frontend filter is now redundant but harmless — leave it in place.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/pages/Event.tsx
git commit -m "feat: show 'no dates available' message on event page when all dates expired"
```

---

## Task 11: Frontend — Admin Platform Config page

**Files:**
- Modify: `frontend/src/api/types/admin.ts`
- Modify: `frontend/src/app/pages/admin/PlatformConfig.tsx`

- [ ] **Step 1: Add field to frontend `PlatformConfig` type**

In `frontend/src/api/types/admin.ts`, line ~694:

```typescript
export interface PlatformConfig {
  // ... existing fields ...
  minimumHoursToBuyTickets: number;
}
```

Also in `UpdatePlatformConfigRequest` (~line 710):
```typescript
minimumHoursToBuyTickets?: number;
```

- [ ] **Step 2: Add input in `PlatformConfig.tsx`**

Find where other numeric fields are rendered (e.g. `paymentTimeoutMinutes`). Add a similar input:

```tsx
<div>
  <label style={labelStyle}>
    {t('admin.platformConfig.minimumHoursToBuyTickets')}
  </label>
  <input
    type="number"
    min={0}
    max={168}
    step={1}
    value={config.minimumHoursToBuyTickets ?? 0}
    onChange={(e) =>
      setConfig((prev) =>
        prev ? { ...prev, minimumHoursToBuyTickets: parseInt(e.target.value, 10) || 0 } : prev,
      )
    }
    style={inputStyle}
  />
</div>
```

Also include it in the `payload` built before calling `adminService.updatePlatformConfig` (~line 254):
```typescript
minimumHoursToBuyTickets: config.minimumHoursToBuyTickets,
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/api/types/admin.ts \
        frontend/src/app/pages/admin/PlatformConfig.tsx
git commit -m "feat: add minimumHoursToBuyTickets field to admin platform config UI"
```

---

## Task 12: Final verification

- [ ] **Step 1: Run full backend test suite**

```bash
cd backend
npm test --no-coverage
```

Expected: all tests PASS.

- [ ] **Step 2: Run TypeScript check on both workspaces**

```bash
cd backend && npx tsc --noEmit
cd ../frontend && npx tsc --noEmit
```

Expected: no errors in either.

- [ ] **Step 3: Verify the `LandingNew.tsx` frontend filter**

Open `frontend/src/app/pages/LandingNew.tsx` and confirm `eventToCardShape` still has the in-memory filter `new Date(d.date) >= now`. This belt-and-suspenders check was added in a prior session and should remain — no change needed.

- [ ] **Step 4: Confirm migration default**

Verify that seeding an empty DB (first boot with no `PlatformConfig` row) correctly returns `minimumHoursToBuyTickets: 0` from `getDefaultsFromHocon`. No behavioral change on deploy.

- [ ] **Step 5: Commit if any cleanup was needed**

```bash
git add -A
git commit -m "chore: final cleanup for ticket cutoff feature"
```
