# Unbounded Queries Catalog

All `findMany()` calls in `backend/src/` that have no `take`/`skip` and therefore can return an unlimited number of rows. Each entry needs to be reviewed individually to decide the right fix (pagination, hard cap, DB-side aggregation, or accept-as-is if the dataset is naturally small).

**Legend**
- `getAll` — no filter at all, returns every row in the table
- `getByX` — scoped to a single entity, but that entity may have many rows
- `getByXs` — batched lookup by an array of IDs; bounded by caller but no DB-side limit
- `search` — open-ended filter, could match many rows

---

## modules/users/users.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `getAll` | 39 | none | Returns every user. Admin-only. **Critical.** |
| `findByIds` | 54 | `id IN [ids]` | Bounded by input array. Low risk unless array is huge. |
| `findByEmails` | 75 | `email IN [emails]` | Bounded by input array. Low risk. |
| `findByEmailContaining` | 110 | `email CONTAINS term` | Open search — could match many users. |
| `getSellers` | 155 | `acceptedSellerTermsAt != null` | All registered sellers. Could be large. |
| `getAdmins` | 165 | `role = 'Admin'` | Naturally small set. Low risk. |

---

## modules/events/events.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `getAllEvents` | 78 | none, ordered by createdAt | All events. Admin-only. **Critical.** |
| `findEventsByIds` | 87 | `id IN [ids]` | Bounded by input array. |
| `getExistingImportSourceKeys` | 95 | `importInfo != null`, select only | Grows with every import. Medium risk. |
| `getDatesByEventIds` | 112 | `eventId IN [ids]` | Bounded by input array. |
| `getSectionsByEventIds` | 125 | `eventId IN [ids]` | Bounded by input array. |
| `getApprovedEvents` | 134 | `status = approved` | All approved events. Could be large. |
| `getPendingEvents` (events) | 209 | `status = pending` | Internal admin use. Medium risk. |
| `getPendingEvents` (dates) | 212 | `status = pending`, select only | Medium risk. |
| `getPendingEvents` (sections) | 216 | `status = pending`, select only | Medium risk. |
| `getPendingEvents` (by ids) | 237 | `id IN [additionalEventIds]` | Bounded by input array. |

---

## modules/tickets/tickets.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `getAll` | 322 | none, includes ticketUnits | All listings + nested units. **Critical.** |
| `getActiveListings` | 332 | `status = Active`, includes ticketUnits | All active listings + nested units. **Critical.** |
| `getByEventId` | 432 | `eventId` | All listings for an event. Could be large for popular events. |
| `getByEventDateId` | 446 | `eventDateId` | All listings for an event date. |
| `getBySellerId` | 463 | `sellerId` | All listings by a seller. |
| `getPendingByEventId` | 600 | `eventId + status` | Medium risk. |
| `getPendingByEventDateId` | 635 | `eventDateId + status` | Medium risk. |
| `getAllByEventDateId` | 672 | `eventDateId` | All listings for a date (includes sold). |
| `getPendingByEventSectionId` | 686 | `eventSectionId + status` | Medium risk. |

---

## modules/transactions/transactions.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `getAll` | 117 | none, ordered by createdAt | All transactions. Admin-only. **Critical.** |
| `getByBuyerId` | 129 | `buyerId` | All purchases by a user. Could be large. |
| `getBySellerId` | 171 | `sellerId` | All sales by a user. Could be large. |

---

## modules/reviews/reviews.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `getAll` | 58 | none, includes transaction | All reviews in system. Admin-only. **Critical.** |
| `getByTransactionId` | 97 | `transactionId` | Max 2 reviews per transaction. Low risk. |
| `getByRevieweeIdAndRole` | 114 | `revieweeId + role` | All reviews received by a user. Could grow large. |
| `getByRevieweeIdsAndRole` | 136 | `revieweeId IN [ids] + role` | Bounded by input array. |
| `getByReviewerId` | 153 | `reviewerId` | All reviews written by a user. Could grow. |

---

## modules/support/support.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `getAllTickets` | 66 | none, ordered by createdAt | All support tickets. Admin-only. **Critical.** |
| `getTicketsByUserId` | 76 | `userId` | All tickets by a user. Low risk (most users few tickets). |
| `getActiveTickets` | 85 | `status IN [active states]` | All open tickets system-wide. Medium risk. |

---

## modules/wallet/wallet.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `getTransactionsByUserId` | 181 | `walletUserId` | All wallet tx for a user. Could grow large for active users. |

---

## modules/payment-confirmations/payment-confirmations.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `findAllPending` | 55 | `status = pending` | All pending confirmations. Used by cron job — cron frequency limits exposure. |
| `getPendingTransactionIds` | 70 | `status = pending`, select only | Same as above. |

---

## modules/offers/offers.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `findByListingId` | 124 | `listingId` | All offers on a listing. Low risk normally. |
| `findByListingIds` | 135 | `listingId IN [ids]` | Bounded by input array. |
| `findByUserId` | 145 | `userId` | All offers made by a user. Could grow. |
| `findPendingOrAcceptedByListingId` | 293 | `listingId + status` | Active offers only. Low risk. |

---

## modules/promotions/promotions.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `findByUserIdAndPromotionCodeId` | 129 | `userId + promotionCodeId` | Small result set. Low risk. |
| `findActiveByUserIdAndType` | 144 | `userId + type + status` | Small result set. Low risk. |
| `list` | 173 | various optional filters | Admin-facing list. Medium risk. |

---

## modules/promotions/promotion-codes.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `list` | 95 | none, ordered by createdAt | All promo codes. Admin-only. Medium risk. |

---

## modules/notifications/notifications.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `findPendingEvents` | 84 | `status = PENDING` | Used by notification cron job. Risk depends on event throughput. |
| `findAllTemplates` | 571 | none | Config table — naturally small. Low risk. |
| `findAllChannelConfigs` | 648 | none | Config table — naturally small. Low risk. |

---

## modules/identity-verification/identity-verification.repository.ts

| Method | Line | Filter | Notes |
|--------|------|--------|-------|
| `findAll` | 64 | optional status filter | Admin-facing. Medium risk. |
| `findAllPending` | 73 | `status = pending` | All pending verifications. Medium risk. |

---

## Decision guide for each entry

When reviewing each query, consider:

1. **Is the dataset naturally bounded?** (e.g., admins, config rows) → accept as-is
2. **Is it used by a cron job?** → add `take` + offset-based loop or cursor pagination
3. **Is it user-scoped and the user can have many rows?** → add `take` + `skip` pagination, expose via paginated endpoint
4. **Is it admin-only and a full list is genuinely needed?** → add `take: 500` hard cap + `logger.warn` when hit, then add a proper paginated admin endpoint
5. **Is it used for internal aggregation (no HTTP response)?** → consider pushing the aggregation to SQL (`COUNT`, `GROUP BY`) instead of fetching rows
