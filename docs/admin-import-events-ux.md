# Admin Import Events — UX Flow

This document describes the intended user experience for the admin “Import Events” feature, from upload to events being available for sellers.

---

## Goals

- Admin uploads a JSON file with a list of events.
- Each imported event gets a **generated slug**, **basic images** (see below), and is **approved** so sellers can create listings immediately.
- The flow is predictable, safe (validation before commit), and gives clear feedback.

---

## Flow Overview

```
[Upload JSON] → [Validate] → [Preview] → [Confirm] → [Create & Approve] → [Summary]
                    ↓ fail          (optional)
              [Show errors]
```

---

## Step 1: Upload

- **Where**: Admin UI (e.g. “Import events” in admin events section).
- **Action**: Admin selects or drops a `.json` file.
- **Payload**: Must match `ImportEventsPayload` (root `{ "events": [ ... ] }`).

**UX**: Single file input; optional “Download sample JSON” link so admins can see the expected shape.

---

## Step 2: Validate

- **When**: As soon as the file is selected (or on “Validate” click).
- **Backend**: Parse JSON and run validation (e.g. Zod schema):
  - Required fields, types, enums (category, seatingType).
  - Dates: valid ISO 8601, optionally “not in the past” (configurable or documented).
  - Sections: at least one per event, unique names per event.
  - Address: required fields (e.g. line1, city, countryCode).
- **Output**:
  - **Success**: Go to Step 3 (Preview).
  - **Failure**: Show **per-event (and optionally per-field) errors**, e.g.:
    - `"Event at index 2: Invalid date at index 0 (must be ISO 8601)."`
    - `"Event at index 5: At least one section required."`
    - Do not create any events.

**UX**: Errors listed by row/index and field so the admin can fix the JSON and re-upload.

---

## Step 3: Preview (recommended)

- **Purpose**: Show what will be created before committing, and display **generated slugs**.
- **Content** (per event):
  - Name, category, venue.
  - Location (e.g. city, country).
  - **Generated slug** (using same rule as `generateEventSlug(name, venue, id)`; id can be a temporary/preview id or “preview” for display).
  - Count of dates and list of date labels (e.g. first 3 + “and N more”).
  - Sections: names and seating types.
- **Actions**:
  - **Confirm import** → Step 4.
  - **Cancel** → Discard and return (no data changed).

**UX**: Table or cards; slugs visible so admin can spot duplicates or naming issues. No persistence in this step.

---

## Step 4: Create & Approve

- **When**: Admin clicks “Confirm import” (or “Import N events”).
- **Backend** (per event, in order):
  1. **Create event**: name, category, venue, location; `imageIds` from payload or default (see below); **slug** from `generateEventSlug(name, venue, eventId)` with the new `eventId`.
  2. **Set status**: `EventStatus.Approved`, `approvedBy` = admin user id (so no approval queue for imports).
  3. **Create dates**: one per item in `dates[]`; each with `EventDateStatus.Approved`, `approvedBy` = admin.
  4. **Create sections**: one per item in `sections[]`; each with `EventSectionStatus.Approved`, `approvedBy` = admin.
  5. **Basic images**: apply chosen strategy (see below).

**UX**: Single “Import” action; optional progress indicator if we support large batches (e.g. “Importing 3 of 20…”). No per-event confirmations.

---

## Step 5: Summary

- **After creation**:
  - Success: “Imported N events” and list of created events (name + slug, link to event page if applicable).
  - Partial failure: “Imported M of N events” and list of errors for the failed ones (e.g. “Event ‘X’ failed: slug already in use”). Only commit successful events; report the rest.
- **Idempotency**: No automatic “replace by slug” or “update if exists”; each run creates new events. Duplicate slugs can be rejected or suffixed (product decision).

**UX**: Clear success/error summary and links to the created events so admin can verify and sellers can start creating listings.

---

## “Basic images” for each event

- **Current model**: Event has `imageIds: string[]` (gallery) and optional `banners` (square, rectangle, og_image). SSR uses `defaultOgImage` when no banner is set.
- **Options**:
  1. **No images**: `imageIds: []`, no banners. Frontend/SSR already falls back to default OG image. Easiest; admin can add images later.
  2. **Single default image**: One shared “default event” image (e.g. in DB or asset); set `imageIds: [defaultEventImageId]` for every imported event. Improves listing appearance until admin replaces.
  3. **Placeholder banners**: Generate or assign one placeholder image and set it as square (and optionally rectangle) banner per event. Requires a placeholder asset or service.

**Recommendation**: Start with **(1)** and document that imported events have no images until the admin uploads them; optionally add **(2)** later if a default event image exists. “Basic images” can be clarified as “event is valid and ready for listings; images are optional and can be added after import.”

---

## Out of scope for v1 (optional later)

- Editing slug in preview (would require two-phase create or “reserve slug”).
- Updating existing events from import (e.g. match by slug and update dates/sections).
- Bulk edit after import (e.g. set same default image for all).

---

## Summary table

| Step   | Actor | Action              | System response                          |
|--------|--------|---------------------|------------------------------------------|
| Upload | Admin  | Select JSON file    | Parse; validate structure and rules      |
| Errors | Admin  | (none)              | Show validation errors by event/field    |
| Preview| Admin  | (auto after valid)   | Show events + generated slugs, no save   |
| Confirm| Admin  | Click “Import”      | Create events, dates, sections; approve |
| Summary| Admin  | (none)              | Show created events + links or errors    |

Once the flow is agreed, implementation can follow: validation schema (Zod), preview endpoint, import endpoint, then admin UI.
