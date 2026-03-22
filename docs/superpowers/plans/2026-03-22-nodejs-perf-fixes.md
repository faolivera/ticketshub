# Node.js Performance Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Eliminate patterns in the backend that unnecessarily consume CPU on the Node.js main thread, preventing latency degradation under load.

**Architecture:** Two independent fix categories: (1) replace multi-pass array filters with a single reduce, (2) replace JSON deep-clone with native `structuredClone`. Unbounded `findMany()` queries are catalogued separately in `docs/superpowers/plans/2026-03-22-unbounded-queries-catalog.md` for case-by-case review.

**Tech Stack:** NestJS, TypeScript, Prisma ORM, Jest

---

## Context for the executor

All issues identified below are in `backend/src/`. Tests live in `backend/test/unit/modules/` and `backend/test/integration/modules/`.

Run tests with:
```bash
cd backend
npm test
npm test -- --testPathPattern="reviews.service"
```

---

## Task 1: Replace triple-filter with single-pass reduce in `reviews.service.ts`

**Problem:** The same reviews array is iterated 3× to count positive/negative/neutral ratings. This happens in 4 places in the same file.

**Files:**
- Modify: `backend/src/modules/reviews/reviews.service.ts`
- Test: `backend/test/unit/modules/reviews/reviews.service.spec.ts`

### Step 1.1: Understand the existing tests

Read `backend/test/unit/modules/reviews/reviews.service.spec.ts` to understand the test structure and what mock setup exists for the affected methods (`getSellerMetrics`, `getSellerMetricsBatch`, `getBuyerMetrics`, `getSellerProfileReviews`).

### Step 1.2: Add a private helper method in reviews.service.ts

In `reviews.service.ts`, add the following private method before the class closing brace (around line 549). This helper replaces all 4 triple-filter occurrences:

```typescript
private countRatings(reviews: { rating: string }[]): {
  positive: number;
  negative: number;
  neutral: number;
} {
  return reviews.reduce(
    (acc, r) => {
      if (r.rating === 'positive') acc.positive++;
      else if (r.rating === 'negative') acc.negative++;
      else if (r.rating === 'neutral') acc.neutral++;
      return acc;
    },
    { positive: 0, negative: 0, neutral: 0 },
  );
}
```

### Step 1.3: Replace occurrence 1 — `getSellerMetrics` (lines 296–303)

**Before:**
```typescript
const totalReviews = reviews.length;
const positiveReviews = reviews.filter(
  (r) => r.rating === 'positive',
).length;
const negativeReviews = reviews.filter(
  (r) => r.rating === 'negative',
).length;
const neutralReviews = reviews.filter((r) => r.rating === 'neutral').length;
```

**After:**
```typescript
const totalReviews = reviews.length;
const { positive: positiveReviews, negative: negativeReviews, neutral: neutralReviews } =
  this.countRatings(reviews);
```

### Step 1.4: Replace occurrence 2 — `getSellerMetricsBatch` (lines 371–380)

Inside the `for (const sellerId of sellerIds)` loop, **before:**
```typescript
const totalReviews = reviews.length;
const positiveReviews = reviews.filter(
  (r) => r.rating === 'positive',
).length;
const negativeReviews = reviews.filter(
  (r) => r.rating === 'negative',
).length;
const neutralReviews = reviews.filter(
  (r) => r.rating === 'neutral',
).length;
```

**After:**
```typescript
const totalReviews = reviews.length;
const { positive: positiveReviews, negative: negativeReviews, neutral: neutralReviews } =
  this.countRatings(reviews);
```

### Step 1.5: Replace occurrence 3 — `getBuyerMetrics` (lines 427–434)

**Before:**
```typescript
const totalReviews = reviews.length;
const positiveReviews = reviews.filter(
  (r) => r.rating === 'positive',
).length;
const negativeReviews = reviews.filter(
  (r) => r.rating === 'negative',
).length;
const neutralReviews = reviews.filter((r) => r.rating === 'neutral').length;
```

**After:**
```typescript
const totalReviews = reviews.length;
const { positive: positiveReviews, negative: negativeReviews, neutral: neutralReviews } =
  this.countRatings(reviews);
```

### Step 1.6: Replace occurrence 4 — `getSellerProfileReviews` (lines 488–492)

**Before:**
```typescript
const stats = {
  positive: reviews.filter((r) => r.rating === 'positive').length,
  neutral: reviews.filter((r) => r.rating === 'neutral').length,
  negative: reviews.filter((r) => r.rating === 'negative').length,
};
```

**After:**
```typescript
const { positive, negative, neutral } = this.countRatings(reviews);
const stats = { positive, negative, neutral };
```

### Step 1.7: Run tests

```bash
cd backend && npm test -- --testPathPattern="reviews.service"
```

Expected: all existing tests pass. The refactor is purely mechanical — same logic, one pass.

### Step 1.8: Commit

```bash
cd backend && git add src/modules/reviews/reviews.service.ts
git commit -m "perf: replace triple-filter with single-pass reduce in reviews rating counting"
```

---

## Task 2: Replace `JSON.parse(JSON.stringify())` with `structuredClone`

**Problem:** `transactions.repository.ts:503–504` performs a JSON round-trip to deep-clone an object for audit payloads. `structuredClone` is the native, faster alternative built into Node.js 17+.

**Files:**
- Modify: `backend/src/modules/transactions/transactions.repository.ts`

### Step 2.1: Locate and replace

Find `serializeUpdatesPayload` at line ~503:

**Before:**
```typescript
private serializeUpdatesPayload(updateData: Record<string, unknown>): object {
  return JSON.parse(JSON.stringify(updateData));
}
```

**After:**
```typescript
private serializeUpdatesPayload(updateData: Record<string, unknown>): object {
  return structuredClone(updateData);
}
```

`structuredClone` is a global in Node.js 17+ — no import needed.

### Step 2.2: Run tests

```bash
cd backend && npm test -- --testPathPattern="transactions"
```

Expected: all tests pass.

### Step 2.3: Commit

```bash
cd backend && git add src/modules/transactions/transactions.repository.ts
git commit -m "perf: replace JSON round-trip clone with structuredClone in transactions audit"
```

---

## Task 3: Remove `toLocaleDateString` from the map loop in `reviews.service.ts`

**Problem:** `getSellerProfileReviews` (line 520–545) calls `new Date().toLocaleDateString('en-US', {...})` inside a `.map()` for every review. Locale-aware date formatting in V8 is expensive.

**Fix:** Return ISO date strings from the backend and let the frontend format them. The `SellerProfileReview` type in the API contract must be updated to use `string` (ISO 8601) instead of pre-formatted strings.

**Files:**
- Modify: `backend/src/modules/reviews/reviews.service.ts`
- Modify: `backend/src/modules/reviews/reviews.api.ts` (check the `SellerProfileReview` type)
- Modify: `frontend/src/api/types/sellers.ts` (mirror type `SellerReview` — `eventDate` field)
- Modify: `frontend/src/app/pages/SellerProfile.tsx` (render sites for `review.reviewDate` and `review.eventDate`)

### Step 4.1: Locate the `SellerProfileReview` API type

Read `backend/src/modules/reviews/reviews.api.ts` and find the `SellerProfileReview` interface. Note the field names for `eventDate` and `reviewDate`.

### Step 4.2: Update the API type

Change the `eventDate` and `reviewDate` fields from pre-formatted strings to ISO string with a comment:

```typescript
// ISO 8601 — format on the client side
eventDate: string | null;
reviewDate: string;
```

> If the field was already `string`, the shape is the same; just the semantic content changes (ISO vs. locale-formatted). Update JSDoc if present.

### Step 4.3: Update `getSellerProfileReviews` in `reviews.service.ts`

**Before (inside the `.map()`):**
```typescript
eventDate: listing?.eventDate
  ? new Date(listing.eventDate).toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
  : 'Unknown',
reviewDate: new Date(review.createdAt).toLocaleDateString('en-US', {
  month: 'long',
  day: 'numeric',
  year: 'numeric',
}),
```

**After:**
```typescript
eventDate: listing?.eventDate
  ? new Date(listing.eventDate).toISOString()
  : null,
reviewDate: new Date(review.createdAt).toISOString(),
```

### Step 4.4: Update the frontend mirror type in `sellers.ts`

Open `frontend/src/api/types/sellers.ts` and find the `SellerReview` interface. Change `eventDate` from `string` to `string | null`:

```typescript
// Before:
eventDate: string;

// After:
eventDate: string | null;
```

`reviewDate` stays as `string` (the backend always provides it).

### Step 4.5: Update the frontend render site in `SellerProfile.tsx`

Open `frontend/src/app/pages/SellerProfile.tsx`. There are exactly two render sites to update:

**`reviewDate` (line ~500):**
```tsx
// Before:
<span>{review.reviewDate}</span>

// After:
<span>
  {new Date(review.reviewDate).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })}
</span>
```

**`eventDate` (line ~583) — must handle null:**
```tsx
// Before:
<span>{review.eventDate}</span>

// After:
<span>
  {review.eventDate
    ? new Date(review.eventDate).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
    : 'Unknown'}
</span>
```

### Step 4.6: Run backend tests

```bash
cd backend && npm test -- --testPathPattern="reviews.service"
```

Expected: tests pass. If any test asserts the exact formatted string (e.g., `"March 22, 2026"`), update those assertions to check for ISO format instead.

### Step 4.7: Verify frontend compiles

```bash
cd frontend && npm run build
```

Expected: no TypeScript errors. The type change from `string` to `string | null` on `eventDate` must resolve cleanly.

### Step 4.8: Verify frontend renders correctly

Start the dev server and navigate to a seller profile page that shows reviews. Confirm dates render as before.

```bash
cd frontend && npm run dev
```

### Step 4.9: Commit

```bash
git add \
  backend/src/modules/reviews/reviews.service.ts \
  backend/src/modules/reviews/reviews.api.ts \
  frontend/src/api/types/sellers.ts \
  frontend/src/app/pages/SellerProfile.tsx
git commit -m "perf: move date formatting from backend map loop to frontend"
```
