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
| `artists` | `string[]?` | ✅ Event | Stored as `String[]` array |
| `popular` | `boolean?` | ✅ Event | Maps to existing `isPopular` field |
| `isManualCreation` | `boolean?` | ❌ | Defined in interface; unused for now |

---

## Section 1: Data Model

### Prisma (`schema.prisma` — `Event` model)

Add three new columns:

```prisma
ticketApp    String?
transferable Boolean?
artists      String[]
```

`isPopular` already exists — no change to the schema for that field.

### Domain type (`events.domain.ts` — `Event`)

Add to the `Event` interface:

```typescript
ticketApp?: string;
transferable?: boolean;
artists: string[];
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

### Zod schema (`api.schemas.ts` — `ImportEventItemSchema`)

```typescript
ticketApp: z.string().optional(),
transferable: z.boolean().optional(),
artists: z.array(z.string()).optional(),
popular: z.boolean().optional(),
isManualCreation: z.boolean().optional(),
```

Cross-field validation via `.superRefine()`: if `transferable` is present but `ticketApp` is absent, emit a validation error.

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
- `ticketApp`, `transferable`, `artists` → direct mapping
- `isPopular` → already mapped; update to use value from input (with `?? false` default)

### `admin.service.ts` — `executeImport`

Map `ImportEventItem` fields to `CreateEventRequest`:

```typescript
ticketApp: item.ticketApp,
transferable: item.transferable,
artists: item.artists ?? [],
isPopular: item.popular,
// isManualCreation is NOT passed — intentionally ignored
```

### `admin.service.ts` — `getImportPreview`

Include new fields in `ImportEventsPreviewItem` mapping so they are visible in the admin preview UI.

### `ImportEventsPreviewItem` (`admin.api.ts`)

Add the four persisted fields to the preview item type:

```typescript
ticketApp?: string;
transferable?: boolean;
artists?: string[];
isPopular?: boolean;
```

---

## Files to Change

| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add `ticketApp`, `transferable`, `artists` to Event |
| `backend/src/modules/admin/admin.api.ts` | Add fields to `ImportEventItem`, `ImportEventsPreviewItem` |
| `backend/src/modules/admin/schemas/api.schemas.ts` | Add fields + superRefine to `ImportEventItemSchema` |
| `backend/src/modules/events/events.api.ts` | Add fields to `CreateEventRequest` |
| `backend/src/modules/events/events.domain.ts` | Add fields to `Event` domain type |
| `backend/src/modules/events/events.service.ts` | Pass new fields in `createEvent` |
| `backend/src/modules/events/events.repository.ts` | Map new fields in Prisma `create` |
| `backend/src/modules/admin/admin.service.ts` | Map import fields in `executeImport` and `getImportPreview` |

---

## Migration

A Prisma migration is required to add the three new nullable columns (`ticketApp`, `transferable`) and the `artists` array (defaults to `[]`) to the `events` table.

---

## Out of Scope

- `isManualCreation` has no downstream effect for now.
- No frontend changes to the import UI (the preview already renders all `ImportEventsPreviewItem` fields dynamically).
- No changes to `TicketListing`.
