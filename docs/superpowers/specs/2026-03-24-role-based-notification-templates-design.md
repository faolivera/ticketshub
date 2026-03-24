# Role-Based Notification Templates

**Date:** 2026-03-24
**Status:** Approved

## Problem

The current `NotificationTemplate` model has a unique constraint on `(eventType, channel, locale)`. This means only one template exists per event type + channel + locale combination. For events that notify multiple roles (e.g., `PAYMENT_RECEIVED` goes to both buyer and seller), the system cannot have different templates per role — the processor works around this by injecting content directly as template variables (`{{title}}`, `{{body}}`), bypassing the template system entirely. As a result, admins cannot manage the content of multi-role notifications from the admin panel.

## Goals

1. Each role that receives a notification gets its own independently editable template.
2. All templates are required — no fallback to a generic template.
3. Admins can manage channel config (enable/disable, priority) and templates from one cohesive detail page per event type.
4. No manual scripts needed in production — all migrations run via `prisma migrate deploy`.

## Roles

Templates are differentiated by three recipient roles: `BUYER`, `SELLER`, `ADMIN`.

`counterparty` is a runtime concept (buyer or seller depending on context), not a template identity. It is removed from the recipient model.

Every template carries an explicit `recipientRole` — including events that only go to one role (e.g., `EVENT_APPROVED` → `SELLER`). This keeps the model consistent with no special cases.

---

## Section 1 — Data Model

### New enum

```prisma
enum NotificationRecipientRole {
  BUYER
  SELLER
  ADMIN
}
```

### `NotificationTemplate` changes

- Add field: `recipientRole NotificationRecipientRole`
- Replace unique constraint:
  - **Before:** `@@unique([eventType, channel, locale])`
  - **After:** `@@unique([eventType, channel, locale, recipientRole])`

### `Notification` changes

- Add field: `recipientRole NotificationRecipientRole`
- Stored at send time for audit and filtering purposes.

### Migration strategy

All data transformations are embedded directly in the Prisma migration SQL file (no separate production script):

1. Add `recipientRole` to both tables as nullable.
2. `UPDATE notification_templates` — assign roles based on the known `EVENT_TYPE_RECIPIENTS` mapping. Single-role events get their role set directly. Multi-role events: the existing template is assigned the first role; new placeholder templates are inserted for remaining roles with `is_active = false`.
3. Alter both columns to `NOT NULL`.

`notifications.seeds.ts` is updated to include `recipientRole` on all seed templates so fresh environments seed correctly without relying on the migration data step.

---

## Section 2 — Backend

### `NotificationRecipient` (domain)

```typescript
// Before
interface NotificationRecipient {
  userId: string;
}

// After
interface NotificationRecipient {
  userId: string;
  role: NotificationRecipientRole;
}
```

### Processors (all 27)

Each processor already knows which role each userId plays. They now declare it explicitly:

```typescript
// payment-received.processor.ts
async getRecipients(_ctx, context): Promise<NotificationRecipient[]> {
  return [
    { userId: context.buyerId, role: NotificationRecipientRole.BUYER },
    { userId: context.sellerId, role: NotificationRecipientRole.SELLER },
  ];
}
```

For admin-only events (e.g., `IDENTITY_SUBMITTED`):
```typescript
const adminIds = await this.usersService.getAdminUserIds(ctx);
return adminIds.map(userId => ({ userId, role: NotificationRecipientRole.ADMIN }));
```

### `getTemplateVariables` signature

The current pattern of `if (recipientId === context.buyerId)` to infer role is replaced with an explicit role parameter:

```typescript
// Before
getTemplateVariables(context: TContext, recipientId: string): Record<string, string>

// After
getTemplateVariables(context: TContext, recipientId: string, role: NotificationRecipientRole): Record<string, string>
```

### `TemplateService.renderContent()`

Adds `recipientRole` as a required parameter. The repository `findTemplate()` query adds it to the lookup: `(eventType, channel, locale, recipientRole)`.

### Worker

When processing each recipient:
- Passes `recipient.role` to `TemplateService.renderContent()`
- Passes `recipient.role` to `processor.getTemplateVariables()`
- Saves `recipientRole: recipient.role` on the created `Notification` record

### Admin controller

- `GET /api/admin/notifications/channel-config` — unchanged (event-level config)
- `GET /api/admin/notifications/templates` — now returns templates with `recipientRole` field
- `POST /api/admin/notifications/templates` — requires `recipientRole` in body
- `PUT /api/admin/notifications/templates/:id` — unchanged (role is immutable after creation)
- New: `GET /api/admin/notifications/events/:eventType` — returns channel config + all templates for that event type, grouped by role. Used by the detail page.

---

## Section 3 — Frontend

### Types (`notifications.ts`)

```typescript
export type NotificationRecipientRole = 'BUYER' | 'SELLER' | 'ADMIN';

export interface NotificationTemplate {
  // ... existing fields
  recipientRole: NotificationRecipientRole;
}

// TEMPLATE_VARIABLES becomes role-aware
export const TEMPLATE_VARIABLES: Record<
  NotificationEventType,
  Partial<Record<NotificationRecipientRole, string[]>>
>
```

`EVENT_TYPE_RECIPIENTS` is updated to remove `counterparty`, replacing it with the concrete role(s) per event.

### Routing

New route: `/admin/notifications/:eventType` — the event detail page.

### Overview page (`NotificationManagement.tsx`)

The table is simplified. Columns: event name, recipients (role badges), status badge ("Complete" / "N missing"), "Configure →" button. The inline toggles and template buttons move to the detail page.

### Detail page (`NotificationEventDetail.tsx`) — new file

Two sections:

**1. Channel configuration**
- Toggle: In-App enabled/disabled
- Toggle: Email enabled/disabled
- Select: Priority (LOW / NORMAL / HIGH / URGENT)
- Saves via `PUT /api/admin/notifications/channel-config/:eventType` (existing endpoint)

**2. Templates by role**

One section per role that receives this event. Each role section shows:
- Role badge + completion status ("Complete" / "N missing")
- 2×2 grid: columns = In-App / Email, cells = ES / EN
- Each cell: template preview (title truncated) + "Edit →" link, or dashed border + "+ Create →" if missing
- `isActive` toggle visible inline on each cell

Clicking "Edit →" or "+ Create →" opens the existing template dialog, pre-populated with `eventType`, `channel`, `locale`, and `recipientRole`. Available variables shown in the dialog are filtered to the role's specific variable set from `TEMPLATE_VARIABLES`.

---

## Section 4 — Migration

### What runs in production

Only `prisma migrate deploy`. The migration SQL file contains both schema changes and data backfill. No separate scripts or manual steps.

### Data backfill logic (embedded in migration SQL)

**Single-role events** — `UPDATE` existing templates setting `recipient_role` to the known role.

**Multi-role events** — assign the existing template to the first role via `UPDATE`. `INSERT` placeholder templates for remaining roles with `is_active = false` and empty content. The admin sees these as "missing" in the detail page and fills them in before enabling.

Multi-role events requiring manual completion post-deploy:
- `PAYMENT_RECEIVED` (buyer + seller)
- `TRANSACTION_CANCELLED` (buyer + seller)
- `DISPUTE_OPENED` (buyer or seller as counterparty — split into two roles)
- `DISPUTE_RESOLVED` (buyer + seller)
- `OFFER_EXPIRED` (buyer + seller)

### Seeds

`notifications.seeds.ts` is updated to seed all templates with `recipientRole` explicitly set. This ensures fresh environments (dev, staging) work correctly without relying on the backfill SQL.

---

## Out of scope

- Per-user notification preferences (opt-in/opt-out)
- Template versioning / history
- Additional locales beyond ES/EN
- Bulk admin broadcast notifications
