# Design: New Fields on ImportEventItem → Event

**Date:** 2026-03-23
**Status:** Approved

---

## Overview

Add five new fields to `ImportEventItem` and propagate four of them through the import pipeline to be persisted on the `Event` model. One field (`isManualCreation`) is defined in the import contract but not persisted.

---

## New Fields

| Field | Type | Persisted | Notes |
|-------|------|-----------|-------|
| `ticketApp` | `string?` | ✅ Event | e.g. "entradas", "movistararena" |
| `transferable` | `boolean?` | ✅ Event | Only valid if `ticketApp` is present |
| `artists` | `string[]?` | ✅ Event | Stored as `String[]` array, defaults to `[]` |
| `popular` | `boolean?` | ✅ Event | Maps to existing `isPopular` field |
| `isManualCreation` | `boolean?` | ❌ | Defined in interface only; intentionally unused for now |

---

## Section 1: Data Model

### Prisma (`schema.prisma` — `Event` model)

Add three new columns:

```prisma
ticketApp    String?
transferable Boolean?
artists      String[]  @default([])
```

`isPopular` already exists — no change to the schema for that field.

### Domain type (`events.domain.ts` — `Event`)

Add to the `Event` interface:

```typescript
ticketApp?: string;
transferable?: boolean;
artists: string[];  // non-optional; always an array (may be empty)
```

---

## Section 2: Import Contract

### `ImportEventItem` (`admin.api.ts`)

Add all five fields with JSDoc comments as specified:

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

### Zod schema (`api.schemas.ts` — `ImportEventItemSchema` and `ImportEventsPreviewItemSchema`)

Add to `ImportEventItemSchema`:

```typescript
ticketApp: z.string().optional(),
transferable: z.boolean().optional(),
artists: z.array(z.string()).optional(),
popular: z.boolean().optional(),
isManualCreation: z.boolean().optional(),
```

Add to `ImportEventsPreviewItemSchema`:

```typescript
ticketApp: z.string().optional(),
transferable: z.boolean().optional(),
artists: z.array(z.string()).optional(),
isPopular: z.boolean().optional(),
```

Cross-field validation via `.superRefine()` on `ImportEventItemSchema` only:

```typescript
.superRefine((val, ctx) => {
  if (val.transferable !== undefined && !val.ticketApp) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ['transferable'],
      message: 'transferable requires ticketApp to be present',
    });
  }
})
```

Note: `CreateEventRequest` has no Zod schema; input validation flows entirely from `ImportEventItemSchema` in the admin module.

---

## Section 3: Flow Wiring

### `CreateEventRequest` (`events.api.ts`)

Add new optional fields:

```typescript
ticketApp?: string;
transferable?: boolean;
artists?: string[];
isPopular?: boolean;  // was always false; now settable at creation time
```

### `events.service.ts` — `createEvent`

Pass new fields from `CreateEventRequest` to the repository. `isPopular` defaults to `false` if not provided (preserving existing behavior).

### `events.repository.ts` — `createEvent`

Map new fields to Prisma `create` call:
- `ticketApp`, `transferable` → direct mapping (undefined stays undefined → null in DB)
- `artists` → `data.artists ?? []`
- `isPopular` → `data.isPopular ?? false` (same default as before)

### `events.repository.ts` — `mapToEvent`

The private `mapToEvent` method maps Prisma rows back to the domain `Event` type. Add the three new fields:
- `ticketApp: prismaEvent.ticketApp ?? undefined`
- `transferable: prismaEvent.transferable ?? undefined`
- `artists: prismaEvent.artists ?? []`

### `admin.service.ts` — `executeImport`

Map `ImportEventItem` fields to `CreateEventRequest`:

```typescript
ticketApp: item.ticketApp,
transferable: item.transferable,
artists: item.artists ?? [],
isPopular: item.popular,         // rename: popular → isPopular
// isManualCreation is NOT passed — intentionally ignored
```

### `admin.service.ts` — `getImportPreview`

`getImportPreview` constructs `ImportEventsPreviewItem` objects as explicit manual literals (not via spread). Add the four new fields directly into each object literal with the same renames as `executeImport`:

```typescript
ticketApp: item.ticketApp,
transferable: item.transferable,
artists: item.artists ?? [],
isPopular: item.popular,         // rename: popular → isPopular
```

### `ImportEventsPreviewItem` (`admin.api.ts`)

Add the four persisted fields to the preview item type:

```typescript
ticketApp?: string;
transferable?: boolean;
artists?: string[];
isPopular?: boolean;
```

---

## Section 4: Unit Tests

Per project policy, all service layer changes require unit tests.

**`admin.service.spec.ts` — `executeImport`:** Add test cases covering:
- New fields (`ticketApp`, `transferable`, `artists`, `popular`) are correctly passed to `createEvent`
- `isManualCreation` is never forwarded to `createEvent`
- `popular: true` maps to `isPopular: true` in the request

**`admin.service.spec.ts` — `getImportPreview`:** Add test cases covering:
- New fields (`ticketApp`, `transferable`, `artists`) appear in the returned preview item
- `popular: true` maps to `isPopular: true` in the preview item

**`events.service.spec.ts` — `createEvent`:** Add test cases covering:
- New fields are passed through to the repository
- `isPopular` defaults to `false` when not provided (regression test)
- `artists` defaults to `[]` when not provided

---

## Files to Change

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add `ticketApp`, `transferable`, `artists` to Event |
| `backend/src/modules/admin/admin.api.ts` | Add fields to `ImportEventItem`, `ImportEventsPreviewItem` |
| `backend/src/modules/admin/schemas/api.schemas.ts` | Add fields to `ImportEventItemSchema` + superRefine; add fields to `ImportEventsPreviewItemSchema` |
| `backend/src/modules/events/events.api.ts` | Add fields to `CreateEventRequest` |
| `backend/src/modules/events/events.domain.ts` | Add fields to `Event` domain type |
| `backend/src/modules/events/events.service.ts` | Pass new fields in `createEvent` |
| `backend/src/modules/events/events.repository.ts` | Map new fields in Prisma `create`; map in `mapToEvent` |
| `backend/src/modules/admin/admin.service.ts` | Map import fields in `executeImport` and `getImportPreview` |
| `backend/test/unit/modules/admin/admin.service.spec.ts` | Add test cases for new field mapping |
| `backend/test/unit/modules/events/events.service.spec.ts` | Add test cases for new fields in `createEvent` |

---

## Migration

A Prisma migration is required:
- `ticketApp String?` — new nullable column
- `transferable Boolean?` — new nullable column
- `artists String[] @default([])` — new non-null array column with empty-array default (existing rows will have `[]`)

---

## Out of Scope

- `isManualCreation` has no downstream effect for now. It is defined in `ImportEventItem` and its Zod schema but is never forwarded.
- No frontend changes to the import UI.
- No changes to `TicketListing`.
