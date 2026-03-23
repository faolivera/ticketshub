# Import Event New Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `ticketApp`, `transferable`, `artists`, `popular`, and `isManualCreation` to the event import pipeline, persisting the first four on the `Event` model.

**Architecture:** The change flows bottom-up: Prisma schema → domain types → DTOs → repository → service → import contract + admin service. Each layer depends on the one below it, so tasks must run in order. `isManualCreation` is defined in the import contract but intentionally never forwarded downstream.

**Tech Stack:** NestJS, TypeScript (strict), Prisma ORM, Zod, Jest

**Spec:** `docs/superpowers/specs/2026-03-23-import-event-new-fields-design.md`

---

## Task 1: Prisma Schema + Migration

**Files:**
- Modify: `backend/prisma/schema.prisma` (Event model, lines 350–386)

- [ ] **Step 1: Add three new fields to the Event model**

  In `schema.prisma`, inside `model Event { ... }`, add after the `highlight` field (line 374) and before the `// Relations` comment:

  ```prisma
  /** Ticket app name (e.g. "entradas", "movistararena"). */
  ticketApp    String?
  /** Whether tickets are transferable via the ticket app. */
  transferable Boolean?
  /** Artist names for this event. */
  artists      String[]  @default([])
  ```

- [ ] **Step 2: Generate and run the migration**

  ```bash
  cd backend
  npx prisma migrate dev --name add-event-import-fields
  ```

  Expected: migration file created in `prisma/migrations/`, Prisma client regenerated. If prompted for migration name, use `add_event_import_fields`.

- [ ] **Step 3: Verify Prisma client has the new fields**

  ```bash
  cd backend
  npx prisma generate
  ```

  Expected: no errors. After this, TypeScript will know about `ticketApp`, `transferable`, `artists` on the Prisma Event type.

- [ ] **Step 4: Commit**

  ```bash
  cd backend
  git add prisma/
  git commit -m "feat: add ticketApp, transferable, artists columns to events table"
  ```

---

## Task 2: Domain Type and CreateEventRequest DTO

**Files:**
- Modify: `backend/src/modules/events/events.domain.ts` (Event interface, lines 56–80)
- Modify: `backend/src/modules/events/events.api.ts` (CreateEventRequest, lines 17–27)

- [ ] **Step 1: Update the Event domain interface**

  In `events.domain.ts`, add three fields to the `Event` interface after `highlight: boolean;` (line 79):

  ```typescript
  /** Ticket app name (e.g. "entradas", "movistararena"). */
  ticketApp?: string;
  /** Whether tickets are transferable via the ticket app. */
  transferable?: boolean;
  /** Artist names. Always an array; may be empty. */
  artists: string[];
  ```

- [ ] **Step 2: Update CreateEventRequest**

  In `events.api.ts`, add four optional fields to `CreateEventRequest` after the `slug?` field (line 26):

  ```typescript
  ticketApp?: string;
  transferable?: boolean;
  artists?: string[];
  /** Admin-only: mark the event as popular at creation time. Defaults to false. */
  isPopular?: boolean;
  ```

- [ ] **Step 3: Check TypeScript compiles**

  ```bash
  cd backend
  npx tsc --noEmit
  ```

  Expected: errors about the `Event` type being used without `artists`. These will be fixed in the next task.

- [ ] **Step 4: Commit**

  ```bash
  cd backend
  git add src/modules/events/events.domain.ts src/modules/events/events.api.ts
  git commit -m "feat: add ticketApp, transferable, artists, isPopular to Event domain and CreateEventRequest"
  ```

---

## Task 3: Repository — createEvent + mapToEvent (TDD)

**Files:**
- Modify: `backend/src/modules/events/events.repository.ts` (createEvent lines 34–58, mapToEvent lines 756–780)

The repository is the only place that talks to the DB. No unit test is written here because this file is integration-tested only (per CLAUDE.md). Implement directly.

- [ ] **Step 1: Update `createEvent` in the repository**

  In `events.repository.ts`, inside the `prisma.event.create({ data: { ... } })` call (lines 37–55), add after `highlight: event.highlight ?? false,`:

  ```typescript
  ticketApp: event.ticketApp,
  transferable: event.transferable,
  artists: event.artists ?? [],
  ```

- [ ] **Step 2: Update `mapToEvent` in the repository**

  In `events.repository.ts`, inside the `mapToEvent` method return object (lines 757–779), add after `highlight: prismaEvent.highlight ?? false,`:

  ```typescript
  ticketApp: prismaEvent.ticketApp ?? undefined,
  transferable: prismaEvent.transferable ?? undefined,
  artists: prismaEvent.artists ?? [],
  ```

- [ ] **Step 3: Check TypeScript compiles**

  ```bash
  cd backend
  npx tsc --noEmit
  ```

  Expected: TypeScript errors are now resolved for `artists` (non-optional field now mapped). Possible remaining errors in `events.service.ts` where the `Event` literal is built — those get fixed in Task 4.

- [ ] **Step 4: Commit**

  ```bash
  cd backend
  git add src/modules/events/events.repository.ts
  git commit -m "feat: map ticketApp, transferable, artists in events repository"
  ```

---

## Task 4: Events Service — createEvent (TDD)

**Files:**
- Modify: `backend/src/modules/events/events.service.ts` (createEvent, lines 182–200)
- Test: `backend/test/unit/modules/events/events.service.spec.ts`

- [ ] **Step 1: Write the failing tests**

  Add a new `describe('createEvent', ...)` block at the end of the `EventsService` describe block (before the final `}`), after the `assertEventDateNotExpired` describe block (after line 1494):

  ```typescript
  describe('createEvent', () => {
    const mockAdminUser = {
      id: 'admin_1',
      email: 'admin@test.com',
      emailVerified: true,
      phoneVerified: true,
      roles: ['admin'],
    };

    const baseRequest: CreateEventRequest = {
      name: 'Test Concert',
      category: EventCategory.Concert,
      venue: 'Test Hall',
      location: { line1: '1 Main St', city: 'Buenos Aires', countryCode: 'AR' },
    };

    beforeEach(() => {
      (service as any).usersService = { findById: jest.fn().mockResolvedValue(mockAdminUser) };
      eventsRepository.createEvent.mockImplementation(async (_ctx, event) => event);
    });

    it('should pass ticketApp, transferable, and artists to the repository', async () => {
      const request: CreateEventRequest = {
        ...baseRequest,
        ticketApp: 'entradas',
        transferable: true,
        artists: ['Bad Bunny', 'J Balvin'],
      };

      const result = await service.createEvent(mockCtx, 'admin_1', Role.Admin, request);

      expect(eventsRepository.createEvent).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({
          ticketApp: 'entradas',
          transferable: true,
          artists: ['Bad Bunny', 'J Balvin'],
        }),
      );
      expect(result.ticketApp).toBe('entradas');
      expect(result.transferable).toBe(true);
      expect(result.artists).toEqual(['Bad Bunny', 'J Balvin']);
    });

    it('should default artists to [] when not provided', async () => {
      await service.createEvent(mockCtx, 'admin_1', Role.Admin, baseRequest);

      expect(eventsRepository.createEvent).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({ artists: [] }),
      );
    });

    it('should set isPopular from request when provided', async () => {
      const request: CreateEventRequest = { ...baseRequest, isPopular: true };

      await service.createEvent(mockCtx, 'admin_1', Role.Admin, request);

      expect(eventsRepository.createEvent).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({ isPopular: true }),
      );
    });

    it('should default isPopular to false when not provided (regression)', async () => {
      await service.createEvent(mockCtx, 'admin_1', Role.Admin, baseRequest);

      expect(eventsRepository.createEvent).toHaveBeenCalledWith(
        mockCtx,
        expect.objectContaining({ isPopular: false }),
      );
    });
  });
  ```

  You also need to import `CreateEventRequest` and `Role` at the top of the test file if not already imported. Check imports at lines 1–40 of the file.

- [ ] **Step 2: Run the tests to verify they fail**

  ```bash
  cd backend
  npm test -- --testPathPattern="events.service.spec" --verbose 2>&1 | tail -30
  ```

  Expected: The new `createEvent` tests FAIL because the service still uses `artists: undefined` / `isPopular: false` hardcoded.

- [ ] **Step 3: Update `createEvent` in the service**

  In `events.service.ts`, replace the `Event` literal built at lines 182–198:

  ```typescript
  const event: Event = {
    id: eventId,
    slug,
    name: data.name,
    category: data.category,
    venue: data.venue,
    location: data.location,
    imageIds: data.imageIds || [],
    importInfo: data.importInfo,
    status: isAdmin ? EventStatus.Approved : EventStatus.Pending,
    createdBy: userId,
    approvedBy: isAdmin ? userId : undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    isPopular: data.isPopular ?? false,
    highlight: false,
    ticketApp: data.ticketApp,
    transferable: data.transferable,
    artists: data.artists ?? [],
  };
  ```

  The only changes vs current code are:
  - `isPopular: false` → `isPopular: data.isPopular ?? false`
  - Add `ticketApp: data.ticketApp,`
  - Add `transferable: data.transferable,`
  - Add `artists: data.artists ?? [],`

- [ ] **Step 4: Run the tests to verify they pass**

  ```bash
  cd backend
  npm test -- --testPathPattern="events.service.spec" --verbose 2>&1 | tail -30
  ```

  Expected: All tests pass including the four new ones.

- [ ] **Step 5: Commit**

  ```bash
  cd backend
  git add src/modules/events/events.service.ts test/unit/modules/events/events.service.spec.ts
  git commit -m "feat: pass ticketApp, transferable, artists, isPopular through createEvent"
  ```

---

## Task 5: Import Contract — Admin API Types

**Files:**
- Modify: `backend/src/modules/admin/admin.api.ts` (ImportEventItem lines 976–997, ImportEventsPreviewItem lines 1011–1024)

- [ ] **Step 1: Add fields to `ImportEventItem`**

  In `admin.api.ts`, add five fields to the `ImportEventItem` interface after `slug?` (line 996):

  ```typescript
  /** Ticket app name (e.g. "entradas", "movistararena"). Omitted if not present. */
  ticketApp?: string;
  /** Whether tickets are transferable. Only present if ticketApp exists. */
  transferable?: boolean;
  /** Artist names. Omitted if empty. */
  artists?: string[];
  /** Whether the event is popular. Omitted if not present. */
  popular?: boolean;
  /** Whether the event was created manually. Omitted if not present. */
  isManualCreation?: boolean;
  ```

- [ ] **Step 2: Add fields to `ImportEventsPreviewItem`**

  In `admin.api.ts`, add four fields to the `ImportEventsPreviewItem` interface after `sourceId: string;` (line 1023):

  ```typescript
  ticketApp?: string;
  transferable?: boolean;
  artists?: string[];
  isPopular?: boolean;
  ```

- [ ] **Step 3: Check TypeScript compiles**

  ```bash
  cd backend
  npx tsc --noEmit
  ```

  Expected: no errors (these are all optional additions to interfaces).

- [ ] **Step 4: Commit**

  ```bash
  cd backend
  git add src/modules/admin/admin.api.ts
  git commit -m "feat: add new fields to ImportEventItem and ImportEventsPreviewItem"
  ```

---

## Task 6: Zod Schemas — ImportEventItemSchema + ImportEventsPreviewItemSchema

**Files:**
- Modify: `backend/src/modules/admin/schemas/api.schemas.ts` (ImportEventItemSchema lines 778–809, ImportEventsPreviewItemSchema lines 815–827)

- [ ] **Step 1: Add fields to `ImportEventItemSchema`**

  In `api.schemas.ts`, inside the `.object({ ... })` of `ImportEventItemSchema`, add after the `slug` field (after line 799, before the closing `})`):

  ```typescript
  ticketApp: z.string().optional(),
  transferable: z.boolean().optional(),
  artists: z.array(z.string()).optional(),
  popular: z.boolean().optional(),
  isManualCreation: z.boolean().optional(),
  ```

- [ ] **Step 2: Add the `transferable` cross-field validation**

  The schema currently ends with `.refine(...)` for section name uniqueness. Add a `.superRefine()` after that `.refine()`:

  ```typescript
  .superRefine((val, ctx) => {
    if (val.transferable !== undefined && !val.ticketApp) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['transferable'],
        message: 'transferable requires ticketApp to be present',
      });
    }
  });
  ```

  The full schema now ends with:
  ```
  .refine(...)
  .superRefine(...);
  ```

- [ ] **Step 3: Add fields to `ImportEventsPreviewItemSchema`**

  In `api.schemas.ts`, inside the `.object({ ... })` of `ImportEventsPreviewItemSchema`, add after `sourceId: z.string(),` (line 826):

  ```typescript
  ticketApp: z.string().optional(),
  transferable: z.boolean().optional(),
  artists: z.array(z.string()).optional(),
  isPopular: z.boolean().optional(),
  ```

- [ ] **Step 4: Check TypeScript compiles**

  ```bash
  cd backend
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 5: Commit**

  ```bash
  cd backend
  git add src/modules/admin/schemas/api.schemas.ts
  git commit -m "feat: add new fields to ImportEventItemSchema and ImportEventsPreviewItemSchema"
  ```

---

## Task 7: Admin Service — executeImport + getImportPreview (TDD)

**Files:**
- Modify: `backend/src/modules/admin/admin.service.ts` (executeImport lines 1945–1953, getImportPreview lines 1798–1810)
- Test: `backend/test/unit/modules/admin/admin.service.spec.ts`

- [ ] **Step 1: Write the failing tests for `executeImport`**

  In `admin.service.spec.ts`, inside the `describe('executeImport', ...)` block (after line 2088, before the `'should report failed event'` test), add a new test:

  ```typescript
  it('should forward ticketApp, transferable, artists, and popular→isPopular to createEvent', async () => {
    const payload = {
      events: [
        {
          ...validPayload.events[0],
          ticketApp: 'entradas',
          transferable: true,
          artists: ['Bizarrap'],
          popular: true,
          isManualCreation: true,
        },
      ],
    };

    eventsService.createEvent.mockResolvedValue({
      ...mockCreatedEvent,
      ticketApp: 'entradas',
      transferable: true,
      artists: ['Bizarrap'],
      isPopular: true,
    });
    eventsService.addEventDate.mockResolvedValue({} as never);
    eventsService.addEventSection.mockResolvedValue({} as never);

    await service.executeImport(mockCtx, payload, 'admin_1');

    expect(eventsService.createEvent).toHaveBeenCalledWith(
      mockCtx,
      'admin_1',
      Role.Admin,
      expect.objectContaining({
        ticketApp: 'entradas',
        transferable: true,
        artists: ['Bizarrap'],
        isPopular: true,
      }),
    );
    // isManualCreation must NOT appear in the createEvent call
    const callArg = (eventsService.createEvent as jest.Mock).mock.calls[0][3];
    expect(callArg).not.toHaveProperty('isManualCreation');
  });
  ```

- [ ] **Step 2: Write the failing tests for `getImportPreview`**

  In `admin.service.spec.ts`, inside the `describe('getImportPreview', ...)` block (after line 2008, before the `'should exclude events'` test), add a new test:

  ```typescript
  it('should include ticketApp, transferable, artists, and popular→isPopular in preview items', async () => {
    const payload = {
      events: [
        {
          ...validPayload.events[0],
          ticketApp: 'movistararena',
          transferable: false,
          artists: ['Taylor Swift'],
          popular: true,
        },
      ],
    };

    const result = await service.getImportPreview(mockCtx, payload);

    expect(result.events[0].ticketApp).toBe('movistararena');
    expect(result.events[0].transferable).toBe(false);
    expect(result.events[0].artists).toEqual(['Taylor Swift']);
    expect(result.events[0].isPopular).toBe(true);
  });
  ```

- [ ] **Step 3: Run the failing tests**

  ```bash
  cd backend
  npm test -- --testPathPattern="admin.service.spec" --verbose 2>&1 | grep -E "PASS|FAIL|✓|✗|×|●" | tail -20
  ```

  Expected: the two new tests FAIL.

- [ ] **Step 4: Update `executeImport` in admin.service.ts**

  In `admin.service.ts`, replace the `createRequest` object literal at lines 1945–1953:

  ```typescript
  const createRequest: CreateEventRequest = {
    name: item.name,
    category: item.category as EventCategory,
    venue: item.venue,
    location: item.location,
    importInfo: { sourceCode: item.sourceCode, sourceId: item.sourceId },
    ...(item.slug != null &&
      item.slug.trim() !== '' && { slug: item.slug.trim() }),
    ticketApp: item.ticketApp,
    transferable: item.transferable,
    artists: item.artists ?? [],
    isPopular: item.popular,
    // isManualCreation is intentionally not forwarded
  };
  ```

- [ ] **Step 5: Update `getImportPreview` in admin.service.ts**

  In `admin.service.ts`, replace the return object literal inside the `.map(...)` at lines 1798–1810:

  ```typescript
  return {
    index,
    name: item.name,
    category: item.category,
    venue: item.venue,
    location: item.location,
    slug,
    datesCount: item.dates.length,
    dateLabels,
    sections: item.sections,
    sourceCode: item.sourceCode,
    sourceId: item.sourceId,
    ticketApp: item.ticketApp,
    transferable: item.transferable,
    artists: item.artists ?? [],
    isPopular: item.popular,
  };
  ```

- [ ] **Step 6: Run all tests to verify they pass**

  ```bash
  cd backend
  npm test -- --testPathPattern="admin.service.spec" --verbose 2>&1 | grep -E "PASS|FAIL|✓|✗|×|●" | tail -20
  ```

  Expected: all tests pass including the two new ones.

- [ ] **Step 7: Run full test suite**

  ```bash
  cd backend
  npm test 2>&1 | tail -20
  ```

  Expected: all tests pass, no regressions.

- [ ] **Step 8: Final TypeScript check**

  ```bash
  cd backend
  npx tsc --noEmit
  ```

  Expected: no errors.

- [ ] **Step 9: Commit**

  ```bash
  cd backend
  git add src/modules/admin/admin.service.ts test/unit/modules/admin/admin.service.spec.ts
  git commit -m "feat: propagate ticketApp, transferable, artists, popular in import flow"
  ```

---

## Summary

After all tasks, the following is true:

- `ticketApp`, `transferable`, `artists` are columns in the `events` table, mapped through domain type → DTO → service → repository.
- Import JSON files can include `ticketApp`, `transferable`, `artists`, `popular`, `isManualCreation`. The first four propagate to the event; `isManualCreation` is parsed and validated but never forwarded.
- `popular` in the import maps to `isPopular` on the event.
- The import preview shows all four persisted fields.
- `isPopular` is now settable at event creation time (not just via admin update), preserving `false` as default.
