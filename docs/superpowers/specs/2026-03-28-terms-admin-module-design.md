# Terms & Conditions Admin Module — Design Spec

**Date:** 2026-03-28
**Status:** Approved

## Summary

A simple admin module to view and edit the HTML content of the two active terms & conditions versions (buyer and seller). No version history, no drafts — just overwrite the active version's content in place.

---

## Constraints & Assumptions

- There are always exactly 2 active terms versions: one for `buyer`, one for `seller`.
- Content is stored as raw HTML in the `content` field of the `terms_versions` table.
- Only admin users may modify terms content.
- No version bumping on save — the `version` label is not changed.

---

## Backend

### New Endpoint

```
PATCH /api/admin/terms/:userType/content
```

- **Guards:** `JwtAuthGuard` + `RolesGuard` with `@Roles('admin')`
- **Param:** `userType` — `buyer` | `seller`
- **Body:** `UpdateTermsContentRequest { content: string }`
- **Response:** `ApiResponse<UpdateTermsContentResponse>`

### New API Types (`terms.api.ts`)

```typescript
export interface UpdateTermsContentRequest {
  content: string;
}

export interface UpdateTermsContentResponse {
  id: string;
  userType: TermsUserType;
  versionLabel: string;
  updatedAt: Date;
}
```

### Service method (`terms.service.ts`)

New method `updateTermsContent(ctx, userType, content)`:
1. `findActiveByUserType(ctx, userType)` — throws `NotFoundException` if no active version exists.
2. `termsRepository.updateContent(ctx, id, content)` — updates the `content` field.
3. Returns `UpdateTermsContentResponse`.

### Repository changes (`terms.repository.interface.ts` + `terms.repository.ts`)

Add `updateContent(ctx: Ctx, id: string, content: string): Promise<TermsVersion>` — wraps a `prisma.termsVersion.update({ where: { id }, data: { content } })`.

### Controller changes (`terms.controller.ts`)

New handler at the bottom of `TermsController`:

```typescript
@Patch('admin/:userType/content')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin')
async updateTermsContent(...): Promise<ApiResponse<UpdateTermsContentResponse>>
```

---

## Frontend

### New page: `TermsManagement.tsx`

**Path:** `frontend/src/app/pages/admin/TermsManagement.tsx`

**Layout:**
- Two tabs: Buyers / Sellers (using existing shadcn `Tabs` component)
- Each tab contains:
  - A `<textarea>` (full-width, ~400px height, monospace font) with the current HTML content
  - A "Save" button with loading / success / error feedback
  - A toggle button "Preview" that shows the HTML rendered via `dangerouslySetInnerHTML` below the textarea

**Data flow:**
1. On tab mount, calls `GET /api/terms/current/:userType` to load the current `id` and content (`contentSummary` field, which maps from `content` in DB).
2. On save, calls `PATCH /api/admin/terms/:userType/content` with the textarea value.
3. Preview updates in real-time from the textarea state (no extra network call).

### Frontend service (`terms.service.ts`)

Add method:

```typescript
async updateTermsContent(userType: TermsUserType, content: string): Promise<UpdateTermsContentResponse>
```

No new service file — this belongs to the existing `termsService`.

### New API types (`frontend/src/api/types/terms.ts`)

```typescript
export interface UpdateTermsContentRequest {
  content: string;
}

export interface UpdateTermsContentResponse {
  id: string;
  userType: TermsUserType;
  versionLabel: string;
  updatedAt: string;
}
```

### Router

Add the route under the admin section. Add a "Terms & Conditions" link in `AdminDashboard.tsx`.

### i18n

New keys in `en.json` and `es.json`:

```json
"termsManagement": {
  "title": "Terms & Conditions",
  "buyers": "Buyers",
  "sellers": "Sellers",
  "save": "Save",
  "preview": "Preview",
  "hidePreview": "Hide Preview",
  "saveSuccess": "Terms updated successfully",
  "saveError": "Failed to update terms",
  "noActiveTerms": "No active terms found for this user type"
}
```

---

## Security

- The `PATCH` endpoint requires `admin` role via `RolesGuard`. No admin user can be a regular buyer or seller simultaneously.
- The existing `GET /api/terms/current/:userType` (public) and `GET /:versionId/content` endpoints are unchanged and continue to serve users.
- `dangerouslySetInnerHTML` in the preview is admin-only UI — admins are trusted to input valid HTML.
