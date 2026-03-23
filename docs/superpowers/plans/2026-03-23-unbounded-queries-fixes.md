# Unbounded Queries — Fixes Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate unbounded `findMany()` calls that can cause full-table scans and OOM errors under production load.

**Architecture:** Changes are isolated to the repository and service layers. No new endpoints, no schema migrations. Each task is independent and safe to deploy individually.

**Companion doc:** `2026-03-23-unbounded-queries-catalog.md` — full catalog of every unbounded query with risk classification.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, TypeScript (strict)

---

## Decision Log

Each case below records the problem, the decision made, and the rationale.

---

## Task 1: Delete dead code — `getAll` / `getSellers` methods

**Priority:** High (do first — reduces noise for all subsequent tasks)

**Files to touch:**
- `backend/src/modules/users/users.repository.ts` — delete `getAll`, `getSellers`
- `backend/src/modules/users/users.repository.interface.ts` — delete `getAll`, `getSellers`
- `backend/src/modules/users/users.service.ts` — delete `getSellers` method
- `backend/src/modules/tickets/tickets.repository.ts` — delete `getAll`
- `backend/src/modules/tickets/tickets.repository.interface.ts` — delete `getAll`
- `backend/src/modules/transactions/transactions.repository.ts` — delete `getAll`
- `backend/src/modules/transactions/transactions.repository.interface.ts` — delete `getAll`
- `backend/src/modules/reviews/reviews.repository.ts` — delete `getAll`
- `backend/src/modules/reviews/reviews.repository.interface.ts` — delete `getAll`
- `backend/src/modules/support/support.repository.ts` — delete `getAllTickets`
- `backend/src/modules/support/support.repository.interface.ts` — delete `getAllTickets`

**What to do:**
- [ ] Confirm no callers exist (grep for each method name across all `*.service.ts`, `*.controller.ts`, `*.scheduler.ts`, `*.processor.ts`)
- [ ] Delete the method from the concrete repository implementation
- [ ] Delete the method signature from the repository interface
- [ ] Delete the service wrapper if one exists (`users.service.getSellers`)
- [ ] Run `npm test` to confirm no tests reference these methods
- [ ] Commit

**Why dead code:** These methods exist in the interface and implementation but no service, controller, scheduler, or processor calls them. They represent unrealized features or old code that was never cleaned up.

---

## Task 2: Risk engine — replace `getBySellerId` with SQL aggregate

**Priority:** Critical — this runs on every listing create and update (hot path, synchronous)

**Problem:** `getActiveListingsTotalsForSeller` in `tickets.service.ts` (line ~101) calls `ticketsRepository.getBySellerId(ctx, sellerId)`, fetches ALL listings for the seller, then filters `status === Active` in memory and sums amounts. For an active seller this is 10–200 rows every time they touch a listing.

**Decision:** New repository method that pushes the aggregation to the DB.

**Files to touch:**
- `backend/src/modules/tickets/tickets.repository.ts` — add `getActiveListingsSummaryBySellerId`
- `backend/src/modules/tickets/tickets.repository.interface.ts` — add the method signature
- `backend/src/modules/tickets/tickets.service.ts` — update `getActiveListingsTotalsForSeller` to use the new method
- `backend/src/test/unit/modules/tickets/tickets.service.spec.ts` — update mocks

**What to do:**
- [ ] Add `getActiveListingsSummaryBySellerId(ctx, sellerId, excludeListingId?)` to the repo interface. Return type: `{ count: number; amounts: { amount: number; currency: string }[] }`
- [ ] Implement using Prisma: `findMany({ where: { sellerId, status: 'Active', NOT: { id: excludeListingId } }, select: { pricePerTicket: true } })` — select only price fields, no relations. This avoids fetching full listing rows.
  - Note: `getAll` was fetching with `include: ticketUnits`. The new method must NOT include ticketUnits — prices live on the listing itself.
- [ ] Update `getActiveListingsTotalsForSeller` in `tickets.service.ts` to call the new method directly instead of `getBySellerId` + in-memory filter
- [ ] Run unit tests, fix mocks
- [ ] Commit

**Why not a raw COUNT:** The method needs both a count AND the list of amounts (to sum per-currency). Prisma `findMany` with `select: { pricePerTicket: true }` returns only the price field — small payload, no full scan of related rows.

---

## Task 3: Transaction counts — replace fetch+filter with Prisma aggregate

**Priority:** High — called on seller profile page, listing detail page (public), and review metrics endpoints

**Problem:**
- `getSellerCompletedSalesTotal` (transactions.service.ts ~line 1528): calls `getBySellerId` → fetches all seller transactions → `.filter(completed).reduce(count)` → returns a number
- `getBuyerCompletedPurchasesTotal` (transactions.service.ts ~line 1549): same pattern for buyers

**Decision:** Replace both methods with Prisma `.count()` queries scoped by status.

**Files to touch:**
- `backend/src/modules/transactions/transactions.repository.ts` — add `countCompletedBySellerId`, `countCompletedByBuyerId`
- `backend/src/modules/transactions/transactions.repository.interface.ts` — add signatures
- `backend/src/modules/transactions/transactions.service.ts` — update `getSellerCompletedSalesTotal` and `getBuyerCompletedPurchasesTotal`
- Relevant unit test files

**What to do:**
- [ ] Add `countCompletedBySellerId(ctx, sellerId): Promise<number>` to the repo — use `prisma.transaction.count({ where: { sellerId, status: 'Completed' } })`
  - Verify the exact `TransactionStatus` enum value for "completed" in the codebase before writing this
- [ ] Add `countCompletedByBuyerId(ctx, buyerId): Promise<number>` — same pattern
- [ ] Update both service methods to call the new repo methods instead of `getBySellerId`/`getByBuyerId`
- [ ] Confirm `getBySellerId` and `getByBuyerId` in transactions repo have no other callers after this change. If they do, leave them. If not, they become candidates for removal in a follow-up.
- [ ] Run unit tests, fix mocks
- [ ] Commit

---

## Task 4: Review metrics — push count/avg to SQL aggregate

**Priority:** High — public endpoints (`GET /api/reviews/seller:userId`, `GET /api/reviews/buyer:userId`), no auth required

**Problem:** `getSellerMetrics` and `getBuyerMetrics` in `reviews.service.ts` call `getByRevieweeIdAndRole` to fetch ALL reviews for a user, then compute average rating and count in memory. Public, unauthenticated endpoints — any user can trigger this for any seller/buyer ID.

**Decision (C):** Metrics (count, avg rating) → SQL aggregate. Review list (`getSellerProfileReviews`) → paginate separately. These are already separate service methods; the fix is in the data access layer for each.

**Files to touch:**
- `backend/src/modules/reviews/reviews.repository.ts` — add `getMetricsByRevieweeIdAndRole` returning `{ count, avgRating }`
- `backend/src/modules/reviews/reviews.repository.interface.ts` — add signature
- `backend/src/modules/reviews/reviews.service.ts` — update `getSellerMetrics` and `getBuyerMetrics` to use the new aggregate method
- `backend/src/modules/reviews/reviews.repository.ts` — add `take`/`skip` to `getByRevieweeIdAndRole` (used by `getSellerProfileReviews`)
- Relevant unit test files

**What to do:**
- [ ] Add `getMetricsByRevieweeIdAndRole(ctx, revieweeId, role)` to the repo. Use Prisma `aggregate`: `prisma.review.aggregate({ where: { revieweeId, role }, _count: true, _avg: { rating: true } })`. Return `{ count: number; avgRating: number | null }`.
- [ ] Update `getSellerMetrics` and `getBuyerMetrics` in `reviews.service.ts` to call the new aggregate method instead of `getByRevieweeIdAndRole`
- [ ] Add `take` and `skip` parameters to `getByRevieweeIdAndRole` (default: `take: 20`, `skip: 0`) for use by `getSellerProfileReviews`
- [ ] Propagate pagination params up through the service method and the BFF call if needed
- [ ] Run unit tests, fix mocks
- [ ] Commit

---

## Task 5: Seller dashboard listings — hard cap + tech debt marker

**Priority:** Medium — seller dashboard, authenticated

**Problem:** `getMyListings` via BFF calls `getBySellerId` with no limit. A prolific seller could have hundreds of listings.

**Decision (B):** Hard cap `take: 100`. Mark as tech debt with a TODO comment.

**Files to touch:**
- `backend/src/modules/tickets/tickets.repository.ts` — add `take: 100` to `getBySellerId`

**What to do:**
- [ ] In `getBySellerId`, add `take: 100` to the Prisma `findMany` call
- [ ] Add a comment above: `// TODO: paginate — https://github.com/your-org/ticketshub/issues/XXX`
- [ ] Verify this does not break `getActiveListingsTotalsForSeller` — after Task 2, that method no longer uses `getBySellerId`, so it is safe
- [ ] Run unit tests
- [ ] Commit

---

## Task 6: Notifications cron — hard cap + pending count metric

**Priority:** Critical — cron runs every 10 seconds

**Problem:** `findPendingEvents` in `notifications.repository.ts` (line 84) fetches ALL pending notification events on every cron tick. Under backlog, this is an unbounded full scan every 10 seconds.

**Decision (B):** Add `take: 200` hard cap. Additionally, run a `COUNT(*)` before (or alongside) the fetch and log it as a metric so we can monitor backlog growth.

**Files to touch:**
- `backend/src/modules/notifications/notifications.repository.ts` — add `take: 200` and a `countPending` method (or include count in return value)
- `backend/src/modules/notifications/notifications.service.ts` — log the pending count
- `backend/src/modules/notifications/notifications.scheduler.ts` — verify the cron frequency and add log

**What to do:**
- [ ] In `findPendingEvents`, add `take: 200` to the `findMany` call
- [ ] Add a separate `countPendingEvents(ctx): Promise<number>` method to the repo using `prisma.notificationEvent.count({ where: { status: 'PENDING' } })`
  - Alternatively, use Prisma transaction to do both in one round-trip: `prisma.$transaction([count, findMany])`
- [ ] In the notifications service `getPendingEvents` (or in the scheduler's `processEvents`), call `countPendingEvents` and log the result: `this.logger.debug(ctx, 'processPendingEvents', { pendingCount, processing: events.length })`
- [ ] If `pendingCount > 200`, log a warning: this signals backlog is growing and the batch size may need increasing
- [ ] Run unit tests
- [ ] Commit

---

## Task 7: Admin event listings — paginate

**Priority:** High — admin panel, no user-facing but admin can break the server

**Problem:** `admin.service.ts` line 775 calls `ticketsRepository.getAllByEventId(ctx, eventId)` — all listings for an event, no limit. Used in the admin event detail page.

**Decision:** Paginate. Add `page`/`limit` query params to the admin endpoint.

**Files to touch:**
- `backend/src/modules/tickets/tickets.repository.ts` — add `take`/`skip` to `getAllByEventId` (or add a new `getAllByEventIdPaginated` method following the existing pagination pattern in the codebase)
- `backend/src/modules/admin/admin.service.ts` — pass pagination params to the repo call
- `backend/src/modules/admin/admin.controller.ts` — accept `page`/`limit` query params on the listings endpoint
- `backend/src/modules/admin/admin.api.ts` — update response type to include `total`
- Relevant unit test files

**What to do:**
- [ ] Check how other paginated methods are structured in the codebase (e.g., `getAllEventsPaginated`) — use the same pattern
- [ ] Add `getAllByEventIdPaginated(ctx, eventId, { page, limit })` to the repo interface and implementation. Default: `limit: 50`.
- [ ] Update `admin.service.getEventListings` to accept and pass pagination params, return `{ listings, total }`
- [ ] Update the admin controller endpoint to accept optional `page` and `limit` query params
- [ ] Run unit tests
- [ ] Commit

---

## Task 8: Admin user search — move LIMIT to DB

**Priority:** High — open text search, currently does DB scan then slices in memory

**Problem:** `findByEmailContaining` in `users.repository.ts` (line 110) has no `take`. The service calls `users.slice(0, USER_SEARCH_LIMIT)` after the fact — DB already scanned and returned potentially thousands of rows.

**Decision:** Move `take: USER_SEARCH_LIMIT` (currently 20 in `admin.service.ts`) into the repository query.

**Files to touch:**
- `backend/src/modules/users/users.repository.ts` — add `take` param to `findByEmailContaining`
- `backend/src/modules/users/users.repository.interface.ts` — update signature to accept optional `take`
- `backend/src/modules/admin/admin.service.ts` — remove the `.slice(0, USER_SEARCH_LIMIT)` call, pass `take: USER_SEARCH_LIMIT` to the repo

**What to do:**
- [ ] Add optional `take?: number` to `findByEmailContaining` signature. Apply it in the `findMany` call.
- [ ] In `admin.service.searchUsersByEmail`, pass `USER_SEARCH_LIMIT` as `take` and remove the in-memory `.slice()`
- [ ] Run unit tests
- [ ] Commit

---

## Task 9: Admin list endpoints — hard cap 500 + tech debt markers

**Priority:** Medium — admin only, but still risky at scale

**Affected queries:**
- `events.getPendingEvents` → `GET /api/admin/events/pending`
- `identity-verification.findAll` → `GET /api/admin/identity-verifications`
- `support.getActiveTickets` → `GET /api/support/admin/tickets-active`
- `promotion-codes.list` → `GET /api/admin/promotions/promotion-codes`

**Decision:** Add `take: 500` + `logger.warn` when the result hits the cap. Add TODO comment marking them for proper pagination.

**Files to touch:**
- `backend/src/modules/events/events.repository.ts` — `getPendingEvents`
- `backend/src/modules/identity-verification/identity-verification.repository.ts` — `findAll`
- `backend/src/modules/support/support.repository.ts` — `getActiveTickets`
- `backend/src/modules/promotions/promotion-codes.repository.ts` — `list`

**What to do (same pattern for each):**
- [ ] Add `take: 500` to the `findMany` call
- [ ] After the query, if `results.length === 500`, call `this.logger.warn(ctx, 'methodName', { warning: 'result cap reached — implement pagination' })`
- [ ] Add `// TODO: paginate this endpoint` comment
- [ ] Run unit tests
- [ ] Commit (one commit per module, or group all four into one commit)

---

## Task 10: Internal admin operations — add warning logs

**Priority:** Low — admin actions, not hot path, naturally bounded by event scope

**Affected queries:**
- `getPendingByEventId` — activates listings when event is approved
- `getPendingByEventDateId` — activates listings when event date is approved
- `getPendingByEventSectionId` — activates listings when event section is approved
- `getAllByEventDateId` — used in date deletion check and cancel
- `getAllByEventSectionId` — used in section deletion check and cancel

**Decision (A):** Accept as-is. Add warning log if result count exceeds 500 so we can detect if any event ever reaches that volume.

**Files to touch:**
- `backend/src/modules/tickets/tickets.repository.ts` — add post-query warn log to each of the five methods above

**What to do:**
- [ ] After each `findMany`, add: `if (listings.length > 500) this.logger.warn(ctx, 'methodName', { count: listings.length, warning: 'unusually large result set' })`
- [ ] No behavior change, no cap — just observability
- [ ] Commit

---

## Tech Debt Backlog

Items deferred with documented rationale. Create issues for these.

| Item | Location | Why deferred |
|------|----------|--------------|
| Paginate `getMyListings` (seller dashboard) | `tickets.service.ts` `getMyListings` → `getBySellerId` | Feature not actively used; hard cap of 100 is sufficient for now |
| Paginate `offers.findByUserId` | `offers.repository.ts` `findByUserId` | Offers feature low traffic; acceptable at current scale |
| Paginate `getTransactionsByUserId` (wallet) | `wallet.repository.ts` | Wallet page not in active use |
| Proper pagination for admin list endpoints | events pending, identity-verification, support active tickets, promo codes | Hard cap of 500 is sufficient; proper pagination needed before scaling |
| Notifications cron batch cursor | `notifications.repository.ts` `findPendingEvents` | `take: 200` covers current load; cursor pagination needed if backlog consistently exceeds 200 |

---

## Execution order

1. **Task 1** — dead code removal (no risk, cleans up the codebase)
2. **Task 2** — risk engine aggregate (highest user impact, hot path)
3. **Task 3** — transaction counts (high impact, simple change)
4. **Task 8** — admin user search LIMIT (quick win)
5. **Task 6** — notifications cron cap (job safety)
6. **Task 4** — review metrics aggregate (public endpoints)
7. **Task 5** — seller listings hard cap (after Task 2 confirms `getBySellerId` is safe to cap)
8. **Task 7** — admin event listings pagination
9. **Task 9** — admin list hard caps
10. **Task 10** — warning logs (observability, no behavior change)
