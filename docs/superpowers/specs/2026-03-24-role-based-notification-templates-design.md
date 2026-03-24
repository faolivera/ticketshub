# Role-Based Notification Templates

**Date:** 2026-03-24
**Status:** Approved (rev 2)

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

### Processors (all 21)

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

**Special case — `DISPUTE_OPENED`:**
`counterparty` is a runtime-resolved role: either buyer or seller depending on who opened the dispute. The processor resolves it at runtime:
```typescript
async getRecipients(_ctx, context): Promise<NotificationRecipient[]> {
  const role = context.openedByRole === 'buyer'
    ? NotificationRecipientRole.SELLER
    : NotificationRecipientRole.BUYER;
  return [{ userId: context.counterpartyId, role }];
}
```
Both a `BUYER` template and a `SELLER` template must exist for `DISPUTE_OPENED`. The processor returns whichever applies at runtime. Both templates are seeded with real content (not left as inactive placeholders) since both are always needed.

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

The existing locale fallback behavior is **preserved**: if a template for the user's locale is not found, the service falls back to `es`. This applies per `(eventType, channel, recipientRole)` tuple — the role dimension does not affect locale fallback logic.

### `INotificationsRepository.findTemplate()` signature

Updated to include `recipientRole`:
```typescript
// Before
findTemplate(ctx, eventType, channel, locale): Promise<NotificationTemplate | undefined>

// After
findTemplate(ctx, eventType, channel, locale, recipientRole): Promise<NotificationTemplate | undefined>
```

Both the interface and implementation must be updated.

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
- `POST /api/admin/notifications/templates` — requires `recipientRole` in body. **No server-side validation** of whether the role is valid for that event type (out of scope). Orphaned templates created for invalid role+event combinations are harmless — no processor will ever look them up, so they are never sent. They may appear in the detail page UI but will be labeled as unexpected and filtered from the overview status count.
- New: `GET /api/admin/notifications/events/:eventType` — returns channel config + all templates for that event type, grouped by role. Used by the detail page. Response type: `GetNotificationEventDetailResponse`:
  ```typescript
  interface GetNotificationEventDetailResponse {
    eventType: NotificationEventType;
    channelConfig: NotificationChannelConfig;
    // Backend guarantees an entry for every role that receives this event type.
    // The frontend may treat all role keys as non-optional after loading.
    templatesByRole: Partial<Record<NotificationRecipientRole, {
      role: NotificationRecipientRole;
      templates: NotificationTemplate[]; // all channels × locales for this role
    }>>;
  }
  ```

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

**`TEMPLATE_VARIABLES` for multi-role events** (previously using the `{{title}}`/`{{body}}` bypass — now replaced with real per-role variable sets):

| Event | Role | Variables |
|-------|------|-----------|
| `PAYMENT_RECEIVED` | BUYER | `eventName`, `amountFormatted`, `transactionId` |
| `PAYMENT_RECEIVED` | SELLER | `eventName`, `ticketCount`, `amountFormatted`, `transactionId` |
| `TRANSACTION_CANCELLED` | BUYER | `eventName`, `cancelledBy`, `reason`, `transactionId` |
| `TRANSACTION_CANCELLED` | SELLER | `eventName`, `cancelledBy`, `reason`, `transactionId` |
| `DISPUTE_OPENED` | BUYER | `eventName`, `reason`, `disputeId`, `transactionId` |
| `DISPUTE_OPENED` | SELLER | `eventName`, `reason`, `disputeId`, `transactionId` |
| `DISPUTE_RESOLVED` | BUYER | `eventName`, `resolution`, `resolvedInFavorOf`, `disputeId`, `transactionId` |
| `DISPUTE_RESOLVED` | SELLER | `eventName`, `resolution`, `resolvedInFavorOf`, `disputeId`, `transactionId` |
| `OFFER_EXPIRED` | BUYER | `offerId`, `eventName`, `expiredReason` |
| `OFFER_EXPIRED` | SELLER | `offerId`, `eventName`, `expiredReason` |

Single-role events retain their existing variable sets, now nested under the appropriate role key.

`EVENT_TYPE_RECIPIENTS` is updated to remove `counterparty`, replacing it with the concrete role(s) per event. `DISPUTE_OPENED` maps to `['buyer', 'seller']` (both templates exist, one is used at runtime).

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
- Role badge + completion status ("Complete" / "Missing ES template")
- 2×2 grid: columns = In-App / Email, cells = ES / EN
- **ES cell:** required — shows template preview + "Edit →", or dashed red border + "+ Create →" if missing
- **EN cell:** optional — shows template preview + "Edit →" if it exists, or a neutral "uses ES fallback" indicator if absent. No error state.
- `isActive` toggle visible inline on each cell

Clicking "Edit →" or "+ Create →" opens the existing template dialog, pre-populated with `eventType`, `channel`, `locale`, and `recipientRole`. Available variables shown in the dialog are filtered to the role's specific variable set from `TEMPLATE_VARIABLES`.

**Template save validation:** `titleTemplate` and `bodyTemplate` must be non-empty before saving. The `isActive` toggle in the dialog is disabled (and forced to `false`) when either field is empty, preventing blank templates from being enabled.

---

## Section 4 — Migration

### What runs in production

Only `prisma migrate deploy`. The migration SQL file contains both schema changes and data backfill. No separate scripts or manual steps.

### Data backfill logic (embedded in migration SQL)

**Single-role events** — `UPDATE` existing templates setting `recipient_role` to the known role.

**Multi-role events** — assign the existing template to the first role via `UPDATE`. `INSERT` placeholder templates for remaining roles with `is_active = false` and empty content. The admin sees these as "N missing" in the detail page and completes them before enabling.

**`DISPUTE_OPENED`** — the existing template is assigned to `SELLER` (the more common counterparty). A `BUYER` placeholder is inserted as `is_active = false`. Both need real authored content before going live.

**`OFFER_EXPIRED`** — the existing template is assigned to `BUYER`. A `SELLER` placeholder is inserted as `is_active = false`.

The `OFFER_EXPIRED` processor has conditional recipient logic: when `expiredReason === 'buyer_no_purchase'` it returns both buyer and seller; when `expiredReason === 'seller_no_response'` it returns only buyer. The processor must be updated to return role-tagged recipients:
```typescript
if (context.expiredReason === 'buyer_no_purchase') {
  return [
    { userId: context.buyerId, role: NotificationRecipientRole.BUYER },
    { userId: context.sellerId, role: NotificationRecipientRole.SELLER },
  ];
}
return [{ userId: context.buyerId, role: NotificationRecipientRole.BUYER }];
```
When `SELLER` is returned but the SELLER template is inactive, `TemplateService.renderContent()` returns `null` and the worker skips that channel with a warning log. This is acceptable — the seller was not notified for `OFFER_EXPIRED` before this change either. Once the admin authors the SELLER template, activating it will enable seller notifications for the `buyer_no_purchase` case.

Multi-role events requiring manual template completion post-deploy:
- `PAYMENT_RECEIVED` — new `SELLER` template needed (existing → `BUYER`)
- `TRANSACTION_CANCELLED` — new `SELLER` template needed (existing → `BUYER`)
- `DISPUTE_OPENED` — new `BUYER` template needed (existing → `SELLER`)
- `DISPUTE_RESOLVED` — new `SELLER` template needed (existing → `BUYER`)
- `OFFER_EXPIRED` — new `SELLER` template needed (existing → `BUYER`)

### Seeds

`notifications.seeds.ts` is updated to seed all templates with `recipientRole` explicitly set. This ensures fresh environments (dev, staging) work correctly without relying on the backfill SQL.

The seeder's `syncTemplates()` method (called at `onModuleInit`) must also be updated to include `recipientRole` in its `findTemplate()` lookup call. Without this, it will attempt to create duplicate templates or crash on the new unique constraint at app startup.

---

## Out of scope

- Per-user notification preferences (opt-in/opt-out)
- Template versioning / history
- Additional locales beyond ES/EN
- Mandatory EN templates — ES is the only required locale; EN is optional with automatic fallback to ES
- Bulk admin broadcast notifications
