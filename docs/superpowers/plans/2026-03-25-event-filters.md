# Event Filters API Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Expose `{ events, filters }` from `GET /api/events`, where `filters.cities` and `filters.categories` are derived from the DB via distinct queries and cached for 24 h; update the frontend to use dynamic filters.

**Architecture:** A new `getDistinctFilters` repository method runs two parallel queries (Prisma `distinct` for categories, raw SQL for JSON-field cities). `EventsService.getEventFilters` wraps the call with `ICacheService.getOrCalculate` (24 h TTL). The controller calls both `listEvents` and `getEventFilters` in `Promise.all` and returns the wrapped response. The frontend type and service are updated to match; `LandingNew` seeds its filter pills and city dropdown from the first API response.

**Tech Stack:** NestJS, Prisma ORM, PostgreSQL, React 18, TypeScript (strict)

---

## File Map

### Backend (modify only)
- `backend/src/modules/events/events.domain.ts` — add `FILTERS_CACHE_KEY` constant
- `backend/src/modules/events/events.api.ts` — add `EventFilters` interface; change `ListEventsPublicResponse` to `{ events: PublicListEventItem[]; filters: EventFilters }`; keep `getHighlightedEvents` using `PublicListEventItem[]` directly
- `backend/src/modules/events/events.repository.interface.ts` — add `getDistinctFilters` method signature
- `backend/src/modules/events/events.repository.ts` — implement `getDistinctFilters`
- `backend/src/modules/events/events.service.ts` — inject `CACHE_SERVICE`; add `getEventFilters`
- `backend/src/modules/events/events.controller.ts` — update `listEvents` handler return type and body
- `backend/test/unit/modules/events/events.service.spec.ts` — add mock for `CACHE_SERVICE` + `AddressService`; add `getEventFilters` tests

### Frontend (modify only)
- `frontend/src/api/types/events.ts` — update `ListEventsPublicResponse`; add `EventFilters`
- `frontend/src/api/services/events.service.ts` — update `listEvents` return type and unwrap
- `frontend/src/app/pages/LandingNew.tsx` — add `filters` state; replace hardcoded `CATS`/`CITIES` with dynamic

---

## Task 1: Add domain constant and API types

**Files:**
- Modify: `backend/src/modules/events/events.domain.ts`
- Modify: `backend/src/modules/events/events.api.ts`

- [ ] **Step 1: Add `FILTERS_CACHE_KEY` to `events.domain.ts`**

In `events.domain.ts`, after `HIGHLIGHTS_CACHE_KEY`:

```typescript
/** Cache key for the available event filters (cities + categories). TTL: 24 h. */
export const FILTERS_CACHE_KEY = 'events:filters';
```

- [ ] **Step 2: Add `EventFilters` interface and update `ListEventsPublicResponse` in `events.api.ts`**

Add after `ListEventsPublicResponse`:

```typescript
/**
 * Available filter options derived from approved events.
 * Cities and categories are distinct values, sorted alphabetically.
 */
export interface EventFilters {
  cities: string[];
  categories: EventCategory[];
}
```

Change `ListEventsPublicResponse`:
```typescript
// Before:
export type ListEventsPublicResponse = PublicListEventItem[];

// After:
export interface ListEventsPublicResponse {
  events: PublicListEventItem[];
  filters: EventFilters;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kfx/proyects/ticketshub
git add backend/src/modules/events/events.domain.ts backend/src/modules/events/events.api.ts
git commit -m "feat(events): add EventFilters type and FILTERS_CACHE_KEY"
```

---

## Task 2: Add `getDistinctFilters` to repository interface and implementation

**Files:**
- Modify: `backend/src/modules/events/events.repository.interface.ts`
- Modify: `backend/src/modules/events/events.repository.ts`

- [ ] **Step 1: Add method to interface**

In `events.repository.interface.ts`, inside `IEventsRepository`, add after `listEventsPaginated`:

```typescript
/**
 * Get distinct cities and categories from approved events.
 * Cities are extracted from the JSON `location` field.
 * Both lists are sorted alphabetically.
 */
getDistinctFilters(ctx: Ctx): Promise<{ cities: string[]; categories: EventCategory[] }>;
```

- [ ] **Step 2: Implement in repository**

In `events.repository.ts`, add this method (find an appropriate location near other read methods):

```typescript
async getDistinctFilters(ctx: Ctx): Promise<{ cities: string[]; categories: EventCategory[] }> {
  this.logger.debug(ctx, 'getDistinctFilters');
  const [categoryRows, cityRows] = await Promise.all([
    this.prisma.event.findMany({
      where: { status: 'approved' },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    }),
    this.prisma.$queryRaw<Array<{ city: string }>>`
      SELECT DISTINCT "location"->>'city' AS city
      FROM   "Event"
      WHERE  status = 'approved'
        AND  "location"->>'city' IS NOT NULL
        AND  "location"->>'city' != ''
      ORDER BY "location"->>'city'
    `,
  ]);
  return {
    categories: categoryRows.map((r) => r.category as EventCategory),
    cities: cityRows.map((r) => r.city),
  };
}
```

> **Raw SQL note (CLAUDE.md):** `location` has no `@map()` → PostgreSQL column is `location` (no quoting needed). The `events` table is the actual DB table name (lowercase plural, confirmed from migrations). Status enum stored as lowercase `'approved'`.

- [ ] **Step 3: Commit**

```bash
cd /Users/kfx/proyects/ticketshub
git add backend/src/modules/events/events.repository.interface.ts backend/src/modules/events/events.repository.ts
git commit -m "feat(events): add getDistinctFilters repository method"
```

---

## Task 3: Add `getEventFilters` to `EventsService`

**Files:**
- Modify: `backend/src/modules/events/events.service.ts`

- [ ] **Step 1: Inject `CACHE_SERVICE` into the service**

Import the cache interface at the top of `events.service.ts`:

```typescript
import { CACHE_SERVICE, type ICacheService } from '../../common/cache';
```

Add to imports from `events.domain.ts`:
```typescript
import {
  // ...existing imports...
  FILTERS_CACHE_KEY,
} from './events.domain';
```

Add to the constructor parameters:
```typescript
@Inject(CACHE_SERVICE)
private readonly cache: ICacheService,
```

- [ ] **Step 2: Add `getEventFilters` method**

Add import for `EventFilters` type at the top:
```typescript
import type {
  // ...existing imports...
  EventFilters,
} from './events.api';
```

Add method to `EventsService`:

```typescript
/**
 * Returns distinct cities and categories from approved events.
 * Result is cached for 24 hours.
 */
async getEventFilters(ctx: Ctx): Promise<EventFilters> {
  this.logger.debug(ctx, 'getEventFilters');
  return this.cache.getOrCalculate(
    FILTERS_CACHE_KEY,
    24 * 60 * 60,
    () => this.eventsRepository.getDistinctFilters(ctx),
  );
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kfx/proyects/ticketshub
git add backend/src/modules/events/events.service.ts
git commit -m "feat(events): add getEventFilters with 24h cache"
```

---

## Task 4: Update controller `listEvents` handler

**Files:**
- Modify: `backend/src/modules/events/events.controller.ts`

- [ ] **Step 1: Update import for `ListEventsPublicResponse`**

`ListEventsPublicResponse` is already imported. Also add `EventFilters` import:

```typescript
import type {
  // ...existing imports...
  EventFilters,
} from './events.api';
```

Also add `FILTERS_CACHE_KEY` to the import from `events.domain`:
```typescript
import {
  EventCategory,
  BANNER_CONSTRAINTS,
  ALLOWED_BANNER_MIME_TYPES,
  HIGHLIGHTS_CACHE_KEY,
  FILTERS_CACHE_KEY,
  // ...
} from './events.domain';
```

- [ ] **Step 2: Fix `getHighlightedEvents` return type and update `listEvents` handler**

`ListEventsPublicResponse` is now `{ events, filters }`, but `getHighlightedEvents` returns a plain array. Fix its return type to `PublicListEventItem[]` (no change to the body — just the TypeScript annotation):

```typescript
// Change only the return type annotation:
@Get('highlights')
async getHighlightedEvents(
  @Context() ctx: Ctx,
): Promise<ApiResponse<PublicListEventItem[]>> {
  // body unchanged
}
```

Then update `listEvents` to call `getEventFilters` in parallel:

```typescript
@Get()
async listEvents(
  @Context() ctx: Ctx,
  @Query('category') category?: EventCategory,
  @Query('search') search?: string,
  @Query('limit') limit?: string,
  @Query('offset') offset?: string,
  @Query('highlighted') highlighted?: string,
): Promise<ApiResponse<ListEventsPublicResponse>> {
  const query: ListEventsQuery = {
    status: 'approved',
    category,
    search,
    limit: limit ? parseInt(limit, 10) : undefined,
    offset: offset ? parseInt(offset, 10) : undefined,
    highlighted: highlighted === 'true' ? true : undefined,
  };
  const [rawEvents, cutoffDate, filters] = await Promise.all([
    this.eventsService.listEvents(ctx, query, false),
    this.eventsService.getTicketCutoffDate(ctx),
    this.eventsService.getEventFilters(ctx),
  ]);
  const events = rawEvents.map((e) =>
    this.eventsService.toPublicEventItem(e, { includeStatus: false, cutoffDate }),
  );
  return { success: true, data: { events, filters } };
}
```

> Note: Remove unused imports (`EventFilters`, `FILTERS_CACHE_KEY`) from the controller if they cause lint warnings — they are not needed directly in the controller.

- [ ] **Step 3: Commit**

```bash
cd /Users/kfx/proyects/ticketshub
git add backend/src/modules/events/events.controller.ts
git commit -m "feat(events): include filters in GET /api/events response"
```

---

## Task 5: Update service unit tests

**Files:**
- Modify: `backend/test/unit/modules/events/events.service.spec.ts`

- [ ] **Step 1: Add missing mocks to `beforeEach`**

The test module is missing `AddressService` and `CACHE_SERVICE`. Add them:

Import at top:
```typescript
import { CACHE_SERVICE } from '../../../../src/common/cache';
import { AddressService } from '../../../../src/modules/address/address.service';
```

In `mockEventsRepository`, add:
```typescript
getDistinctFilters: jest.fn(),
```

Add mock objects:
```typescript
const mockAddressService = {
  // add methods if needed; empty object if no methods called by tested paths
};

const mockCacheService = {
  getOrCalculate: jest.fn(),
  invalidate: jest.fn(),
  clear: jest.fn(),
};
```

Add to `providers` array in `Test.createTestingModule`:
```typescript
{ provide: AddressService, useValue: mockAddressService },
{ provide: CACHE_SERVICE, useValue: mockCacheService },
```

Add to variable declarations at top of `describe`:
```typescript
let cacheService: jest.Mocked<{ getOrCalculate: jest.Mock; invalidate: jest.Mock; clear: jest.Mock }>;
```

Assign in `beforeEach` after module compilation:
```typescript
cacheService = module.get(CACHE_SERVICE);
```

- [ ] **Step 2: Write failing test for `getEventFilters`**

Add a new `describe` block:

```typescript
describe('getEventFilters', () => {
  const mockFilters = {
    cities: ['Buenos Aires', 'Córdoba'],
    categories: [EventCategory.Concert, EventCategory.Festival],
  };

  it('returns filters from cache.getOrCalculate', async () => {
    cacheService.getOrCalculate.mockImplementation(
      async (_key: string, _ttl: number, fn: () => Promise<unknown>) => fn(),
    );
    eventsRepository.getDistinctFilters.mockResolvedValue(mockFilters);

    const result = await service.getEventFilters(mockCtx);

    expect(result).toEqual(mockFilters);
    expect(cacheService.getOrCalculate).toHaveBeenCalledWith(
      'events:filters',
      24 * 60 * 60,
      expect.any(Function),
    );
    expect(eventsRepository.getDistinctFilters).toHaveBeenCalledWith(mockCtx);
  });

  it('returns cached value without calling the repository on cache hit', async () => {
    cacheService.getOrCalculate.mockResolvedValue(mockFilters);

    const result = await service.getEventFilters(mockCtx);

    expect(result).toEqual(mockFilters);
    expect(eventsRepository.getDistinctFilters).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 3: Run tests and verify they pass**

```bash
cd /Users/kfx/proyects/ticketshub/backend
npm test -- --testPathPattern="events.service.spec"
```

Expected: all tests pass (including the new `getEventFilters` suite).

- [ ] **Step 4: Commit**

```bash
cd /Users/kfx/proyects/ticketshub
git add backend/test/unit/modules/events/events.service.spec.ts
git commit -m "test(events): add getEventFilters unit tests"
```

---

## Task 6: Update frontend types and service

**Files:**
- Modify: `frontend/src/api/types/events.ts`
- Modify: `frontend/src/api/services/events.service.ts`

- [ ] **Step 1: Update `ListEventsPublicResponse` in `frontend/src/api/types/events.ts`**

Add `EventFilters` interface and update the response type:

```typescript
/**
 * Available filter options derived from approved events.
 */
export interface EventFilters {
  cities: string[];
  categories: EventCategory[];
}

// Change:
export type ListEventsPublicResponse = PublicListEventItem[];
// To:
export interface ListEventsPublicResponse {
  events: PublicListEventItem[];
  filters: EventFilters;
}
```

- [ ] **Step 2: Update `frontend/src/api/services/events.service.ts`**

`listEvents` needs no body change — the type update propagates automatically. Verify:
```typescript
async listEvents(query?: ListEventsQuery): Promise<ListEventsPublicResponse> {
  const response = await apiClient.get<ListEventsPublicResponse>('/events', { params: query });
  return response.data; // now { events, filters }
}
```

`getHighlightedEvents` returns `Promise<ListEventsPublicResponse>` but the backend's highlights endpoint still returns a plain array. Fix its return type:
```typescript
// Change return type from ListEventsPublicResponse to PublicListEventItem[]:
async getHighlightedEvents(): Promise<PublicListEventItem[]> {
  const response = await apiClient.get<PublicListEventItem[]>('/events/highlights');
  return response.data;
}
```

- [ ] **Step 3: Commit**

```bash
cd /Users/kfx/proyects/ticketshub
git add frontend/src/api/types/events.ts frontend/src/api/services/events.service.ts
git commit -m "feat(frontend): update ListEventsPublicResponse to include filters"
```

---

## Task 7: Update `LandingNew.tsx` to use dynamic filters

**Files:**
- Modify: `frontend/src/app/pages/LandingNew.tsx`

Context: The file currently has:
- `CATS` (line 112): hardcoded Spanish category labels
- `CAT_TO_API` (line 114): maps Spanish label → `EventCategory` string
- `CITIES` (line 121): hardcoded city names
- `filteredCities` (line 295): derived from `CITIES`
- `activeCat` / `activeCity` state initialized to `"Todos"` / `"Todas las ciudades"`

- [ ] **Step 1: Add reverse mapping and filters state**

Import `EventFilters` at the top:
```typescript
import type { PublicListEventItem, EventFilters } from '@/api/types';
```
(or from wherever the types are re-exported)

Replace the hardcoded arrays with a reverse mapping constant (keep `CAT_TO_API` as-is, add `API_TO_CAT`):

```typescript
// Remove:
const CATS   = ["Todos","Recital","Festival","Teatro","Deportes","Electrónica"];
const CITIES = ["Todas las ciudades","Buenos Aires","Córdoba","Rosario","Mendoza","La Plata","Tucumán"];

// Add alongside CAT_TO_API:
const API_TO_CAT: Record<string, string> = {
  Concert:    "Recital",
  Festival:   "Festival",
  Theater:    "Teatro",
  Sports:     "Deportes",
  Other:      "Electrónica",
  Conference: "Conferencia",
  Comedy:     "Comedia",
};
```

Inside the component, add a `filters` state after the existing state declarations:
```typescript
const [filters, setFilters] = useState<EventFilters | null>(null);
```

Derive `cats` and `cities` from `filters` (with sensible fallbacks while loading):
```typescript
const cats   = ["Todos",               ...(filters?.categories.map((c) => API_TO_CAT[c] ?? c) ?? [])];
const cities = ["Todas las ciudades",  ...(filters?.cities ?? [])];
```

- [ ] **Step 2: Extract filters from API responses**

In the initial fetch effect, update the page-1 call to extract filters:

```typescript
// Before:
const data = await eventsService.listEvents({ limit: PAGE_SIZE, offset: 0 });
page1 = Array.isArray(data) ? data : [];

// After:
const response = await eventsService.listEvents({ limit: PAGE_SIZE, offset: 0 });
if (!cancelled) setFilters(response.filters);
page1 = response.events;
```

Update all remaining 3 call sites to extract `.events`:

**Call site 2 — background page-2 prefetch (inside the initial `useEffect`):**
```typescript
// Before:
void eventsService
  .listEvents({ limit: PAGE_SIZE, offset: PAGE_SIZE })
  .then((data) => {
    if (cancelled || ignoreInitialPage2PrefetchRef.current) return;
    const page2 = Array.isArray(data) ? data : [];
    setPrefetchedPage(page2);
    setHasMore(page2.length > 0);
  })

// After:
void eventsService
  .listEvents({ limit: PAGE_SIZE, offset: PAGE_SIZE })
  .then(({ events: page2 }) => {
    if (cancelled || ignoreInitialPage2PrefetchRef.current) return;
    setPrefetchedPage(page2);
    setHasMore(page2.length > 0);
  })
```

**Call site 3 — `handleLoadMore` direct fetch:**
```typescript
// Before:
const data = await eventsService.listEvents({ limit: PAGE_SIZE, offset: prevLen });
shownBatch = Array.isArray(data) ? data : [];

// After:
const { events: shownBatch } = await eventsService.listEvents({ limit: PAGE_SIZE, offset: prevLen });
```
(Remove the `let shownBatch` declaration above and use `const` here — or keep `let` and assign.)

**Call site 4 — `handleLoadMore` next-page prefetch:**
```typescript
// Before:
const nextData = await eventsService.listEvents({ limit: PAGE_SIZE, offset: offsetAfterAppend });
const nextPage = Array.isArray(nextData) ? nextData : [];

// After:
const { events: nextPage } = await eventsService.listEvents({ limit: PAGE_SIZE, offset: offsetAfterAppend });
```

- [ ] **Step 3: Update all usages of `CATS` and `CITIES`**

Search for every usage of `CATS` and `CITIES` in the file and replace with `cats` and `cities` (the derived variables from step 1). There should be:
- 2–3 occurrences of `CATS` (pills render, mobile render, possibly `activeCat` reset logic)
- 2–3 occurrences of `CITIES` (city dropdown render, `filteredCities`)

`filteredCities` line (currently `CITIES.filter(...)`) becomes:
```typescript
const filteredCities = cities.filter((c: string) =>
  c.toLowerCase().includes(citySearch.toLowerCase()),
);
```

- [ ] **Step 4: TypeScript check**

```bash
cd /Users/kfx/proyects/ticketshub/frontend
npx tsc --noEmit
```

Expected: no type errors.

- [ ] **Step 5: Run backend tests to ensure nothing broke**

```bash
cd /Users/kfx/proyects/ticketshub/backend
npm test
```

Expected: all tests pass.

- [ ] **Step 6: Commit**

```bash
cd /Users/kfx/proyects/ticketshub
git add frontend/src/app/pages/LandingNew.tsx
git commit -m "feat(landing): replace hardcoded filters with dynamic data from API"
```
