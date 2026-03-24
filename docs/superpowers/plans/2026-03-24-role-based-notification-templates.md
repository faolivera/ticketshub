# Role-Based Notification Templates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `recipientRole` (BUYER/SELLER/ADMIN) as a required dimension on notification templates, so each role that receives an event can have its own independently editable template, and admins can manage everything from a new event detail page.

**Architecture:** Add `NotificationRecipientRole` enum to Prisma schema and domain, propagate it through the repository → template service → processor interface → worker pipeline. All 22 processors declare recipient roles explicitly. A new admin endpoint and detail page replace the flat template management UI.

**Tech Stack:** NestJS + Prisma + PostgreSQL (backend), React + Vite + shadcn/ui (frontend)

---

## File Map

### Backend — Modified
| File | Change |
|------|--------|
| `backend/prisma/schema.prisma` | Add `NotificationRecipientRole` enum; add `recipientRole` field to `NotificationTemplate` and `Notification`; update unique constraint |
| `backend/prisma/migrations/<new>/migration.sql` | Schema SQL + data backfill SQL |
| `backend/src/modules/notifications/notifications.domain.ts` | Add `NotificationRecipientRole` enum; update `NotificationRecipient` interface |
| `backend/src/modules/notifications/notifications.repository.interface.ts` | Add `recipientRole` param to `findTemplate()` |
| `backend/src/modules/notifications/notifications.repository.ts` | Update `findTemplate()` implementation |
| `backend/src/modules/notifications/templates/template.service.ts` | Add `recipientRole` param to `renderContent()` |
| `backend/src/modules/notifications/processors/processor.interface.ts` | Add `role` param to `getTemplateVariables()` |
| `backend/src/modules/notifications/processors/*.processor.ts` | All 22 processors: role-tagged `getRecipients()`, updated `getTemplateVariables()` |
| `backend/src/modules/notifications/notifications.worker.ts` | Pass `recipient.role` through `processRecipient()` / `processChannel()` / `createNotification()` |
| `backend/src/modules/notifications/notifications.api.ts` | Add `recipientRole` to `CreateTemplateRequest`; add `GetNotificationEventDetailResponse` |
| `backend/src/modules/notifications/notifications.service.ts` | Add `getNotificationEventDetail()` method |
| `backend/src/modules/notifications/admin/notifications-admin.controller.ts` | Add `GET /api/admin/notifications/event-detail/:eventType` endpoint |
| `backend/src/modules/notifications/notifications.seeds.ts` | Update all templates with `recipientRole`; fix `syncTemplates()` lookup |

### Backend — Modified tests
| File | Change |
|------|--------|
| `backend/test/unit/modules/notifications/notifications.service.spec.ts` | Add tests for `getNotificationEventDetail()`; update `createMockNotification` factory |

### Frontend — Modified
| File | Change |
|------|--------|
| `frontend/src/api/types/notifications.ts` | Add `NotificationRecipientRole`; add to `NotificationTemplate`; restructure `TEMPLATE_VARIABLES`; update `EVENT_TYPE_RECIPIENTS` |
| `frontend/src/api/services/notifications-admin.service.ts` | Add `getEventDetail()` and `createTemplate()` methods |
| `frontend/src/app/pages/admin/NotificationManagement.tsx` | Simplify table (remove inline toggles + template buttons; add status badge + "Configure →") |

### Frontend — New
| File | Purpose |
|------|---------|
| `frontend/src/app/pages/admin/NotificationEventDetail.tsx` | Detail page: channel config + templates by role grid |

---

## Task 1: Prisma Schema + Migration

**Files:**
- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/<generated>/migration.sql` (via CLI, then edit)

- [ ] **Step 1: Add enum and fields to schema**

  In `backend/prisma/schema.prisma`, add the enum before the `NotificationEvent` model:

  ```prisma
  enum NotificationRecipientRole {
    BUYER
    SELLER
    ADMIN
  }
  ```

  Update `NotificationTemplate` model — add field and replace unique constraint:
  ```prisma
  model NotificationTemplate {
    id                String                    @id @default(uuid())
    eventType         NotificationEventType
    channel           NotificationChannel
    locale            String
    recipientRole     NotificationRecipientRole
    titleTemplate     String
    bodyTemplate      String
    actionUrlTemplate String?
    isActive          Boolean                   @default(true)
    createdAt         DateTime                  @default(now())
    updatedAt         DateTime                  @updatedAt
    updatedBy         String?

    @@unique([eventType, channel, locale, recipientRole])
    @@map("notification_templates")
  }
  ```

  Update `Notification` model — add field after `channel`:
  ```prisma
  recipientRole   NotificationRecipientRole
  ```

- [ ] **Step 2: Create migration file (without applying it)**

  ```bash
  cd backend
  npx prisma migrate dev --create-only --name role-based-notification-templates
  ```

  Note the generated file path printed by the command (e.g. `prisma/migrations/20260324XXXXXX_role_based_notification_templates/migration.sql`).

- [ ] **Step 3: Edit the migration SQL to add data backfill**

  Open the generated `migration.sql`. It will have `ADD COLUMN "recipientRole" ... NOT NULL` which will fail on existing data. Replace those `ADD COLUMN` statements with nullable versions, then add backfill SQL, then add the NOT NULL constraints. The final migration should look like:

  ```sql
  -- 1. Add enum type
  CREATE TYPE "NotificationRecipientRole" AS ENUM ('BUYER', 'SELLER', 'ADMIN');

  -- 2. Add columns as NULLABLE first
  ALTER TABLE "notification_templates" ADD COLUMN "recipientRole" "NotificationRecipientRole";
  ALTER TABLE "notifications" ADD COLUMN "recipientRole" "NotificationRecipientRole";

  -- 3. Drop old unique constraint
  DROP INDEX "notification_templates_eventType_channel_locale_key";

  -- 4. Backfill: BUYER-only events
  UPDATE "notification_templates" SET "recipientRole" = 'BUYER'
  WHERE "eventType" IN (
    'BUYER_PAYMENT_REJECTED', 'TICKET_SENT',
    'OFFER_ACCEPTED', 'OFFER_REJECTED', 'OFFER_CANCELLED', 'OFFER_EXPIRED'
  );

  -- 5. Backfill: SELLER-only events
  UPDATE "notification_templates" SET "recipientRole" = 'SELLER'
  WHERE "eventType" IN (
    'TICKET_RECEIVED', 'TRANSACTION_COMPLETED',
    'IDENTITY_VERIFIED', 'IDENTITY_REJECTED', 'SELLER_VERIFICATION_COMPLETE',
    'EVENT_APPROVED', 'EVENT_REJECTED', 'REVIEW_RECEIVED', 'OFFER_RECEIVED'
  );

  -- 6. Backfill: ADMIN-only events
  UPDATE "notification_templates" SET "recipientRole" = 'ADMIN'
  WHERE "eventType" IN (
    'BUYER_PAYMENT_SUBMITTED', 'IDENTITY_SUBMITTED', 'BANK_ACCOUNT_SUBMITTED'
  );

  -- 7. Backfill multi-role events: assign existing template to first role
  -- PAYMENT_RECEIVED, TRANSACTION_CANCELLED, DISPUTE_RESOLVED -> BUYER (existing becomes buyer template)
  UPDATE "notification_templates" SET "recipientRole" = 'BUYER'
  WHERE "eventType" IN ('PAYMENT_RECEIVED', 'TRANSACTION_CANCELLED', 'DISPUTE_RESOLVED');

  -- DISPUTE_OPENED -> SELLER (existing becomes seller template)
  UPDATE "notification_templates" SET "recipientRole" = 'SELLER'
  WHERE "eventType" = 'DISPUTE_OPENED';

  -- 8. Insert placeholder SELLER templates for multi-role events (initially inactive)
  INSERT INTO "notification_templates" ("id", "eventType", "channel", "locale", "recipientRole", "titleTemplate", "bodyTemplate", "isActive", "createdAt", "updatedAt")
  SELECT
    'nt_placeholder_' || "eventType" || '_' || "channel" || '_' || "locale" || '_seller',
    "eventType",
    "channel",
    "locale",
    'SELLER'::"NotificationRecipientRole",
    '',
    '',
    false,
    NOW(),
    NOW()
  FROM "notification_templates"
  WHERE "eventType" IN ('PAYMENT_RECEIVED', 'TRANSACTION_CANCELLED', 'DISPUTE_RESOLVED')
  AND "recipientRole" = 'BUYER';

  -- 9. Insert placeholder BUYER template for DISPUTE_OPENED
  INSERT INTO "notification_templates" ("id", "eventType", "channel", "locale", "recipientRole", "titleTemplate", "bodyTemplate", "isActive", "createdAt", "updatedAt")
  SELECT
    'nt_placeholder_' || "eventType" || '_' || "channel" || '_' || "locale" || '_buyer',
    "eventType",
    "channel",
    "locale",
    'BUYER'::"NotificationRecipientRole",
    '',
    '',
    false,
    NOW(),
    NOW()
  FROM "notification_templates"
  WHERE "eventType" = 'DISPUTE_OPENED'
  AND "recipientRole" = 'SELLER';

  -- 10. Insert placeholder SELLER template for OFFER_EXPIRED
  INSERT INTO "notification_templates" ("id", "eventType", "channel", "locale", "recipientRole", "titleTemplate", "bodyTemplate", "isActive", "createdAt", "updatedAt")
  SELECT
    'nt_placeholder_' || "eventType" || '_' || "channel" || '_' || "locale" || '_seller',
    "eventType",
    "channel",
    "locale",
    'SELLER'::"NotificationRecipientRole",
    '',
    '',
    false,
    NOW(),
    NOW()
  FROM "notification_templates"
  WHERE "eventType" = 'OFFER_EXPIRED'
  AND "recipientRole" = 'BUYER';

  -- 11. Now enforce NOT NULL
  ALTER TABLE "notification_templates" ALTER COLUMN "recipientRole" SET NOT NULL;
  ALTER TABLE "notifications" ALTER COLUMN "recipientRole" SET NOT NULL;

  -- 12. Add new unique constraint
  CREATE UNIQUE INDEX "notification_templates_eventType_channel_locale_recipientRole_key"
  ON "notification_templates"("eventType", "channel", "locale", "recipientRole");
  ```

  > **Note:** Verify the exact name of the old unique index using `\d notification_templates` in psql before running. Prisma typically names it `notification_templates_eventType_channel_locale_key`.

- [ ] **Step 4: Apply migration**

  ```bash
  cd backend
  npx prisma migrate dev
  ```

  Expected: Migration applied, Prisma client regenerated with `NotificationRecipientRole` type available.

- [ ] **Step 5: Verify schema**

  ```bash
  cd backend
  npx prisma studio
  ```

  Open `NotificationTemplate` table — confirm `recipientRole` column is present and populated.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/prisma/schema.prisma backend/prisma/migrations/
  git commit -m "feat: add NotificationRecipientRole to Prisma schema with data migration"
  ```

---

## Task 2: Backend Domain Types

**Files:**
- Modify: `backend/src/modules/notifications/notifications.domain.ts`
- Modify: `backend/src/modules/notifications/processors/processor.interface.ts`

- [ ] **Step 1: Add `NotificationRecipientRole` enum to domain**

  In `notifications.domain.ts`, add after `NotificationPriority`:

  ```typescript
  /**
   * Roles that can receive notifications.
   * Each role gets its own distinct template per event type + channel + locale.
   */
  export enum NotificationRecipientRole {
    BUYER = 'BUYER',
    SELLER = 'SELLER',
    ADMIN = 'ADMIN',
  }
  ```

- [ ] **Step 2: Update `NotificationRecipient` interface**

  ```typescript
  // Before
  export interface NotificationRecipient {
    userId: string;
  }

  // After
  export interface NotificationRecipient {
    userId: string;
    role: NotificationRecipientRole;
  }
  ```

- [ ] **Step 3: Add `recipientRole` to `NotificationTemplate` and `Notification` domain interfaces**

  In `NotificationTemplate`:
  ```typescript
  recipientRole: NotificationRecipientRole;
  ```

  In `Notification`:
  ```typescript
  recipientRole: NotificationRecipientRole;
  ```

- [ ] **Step 4: Update `processor.interface.ts` — add `role` to `getTemplateVariables`**

  ```typescript
  getTemplateVariables(
    context: TContext,
    recipientId: string,
    role: NotificationRecipientRole,
  ): Record<string, string>;
  ```

  Also add the import:
  ```typescript
  import type {
    NotificationEventType,
    NotificationRecipient,
    NotificationRecipientRole,
  } from '../notifications.domain';
  ```

- [ ] **Step 5: Run TypeScript compiler to see all call sites that need updating**

  ```bash
  cd backend
  npx tsc --noEmit 2>&1 | head -80
  ```

  Expected: Errors in repository interface, template service, all 22 processors, and worker. These are addressed in the next tasks.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/src/modules/notifications/notifications.domain.ts \
          backend/src/modules/notifications/processors/processor.interface.ts
  git commit -m "feat: add NotificationRecipientRole enum and update domain interfaces"
  ```

---

## Task 3: Repository Interface + Implementation

**Files:**
- Modify: `backend/src/modules/notifications/notifications.repository.interface.ts`
- Modify: `backend/src/modules/notifications/notifications.repository.ts`

- [ ] **Step 1: Update `findTemplate` in the interface**

  In `notifications.repository.interface.ts`, update the signature:

  ```typescript
  /**
   * Find template by event type, channel, locale, and recipient role
   */
  findTemplate(
    ctx: Ctx,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
    recipientRole: NotificationRecipientRole,
  ): Promise<NotificationTemplate | undefined>;
  ```

  Add the import:
  ```typescript
  import {
    NotificationEventType,
    NotificationEventStatus,
    NotificationChannel,
    NotificationRecipientRole,
  } from './notifications.domain';
  ```

- [ ] **Step 2: Update `findTemplate` in the implementation**

  In `notifications.repository.ts`, update the method (around line 558):

  ```typescript
  async findTemplate(
    ctx: Ctx,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
    recipientRole: NotificationRecipientRole,
  ): Promise<NotificationTemplate | undefined> {
    this.logger.debug(ctx, 'findTemplate', { eventType, channel, locale, recipientRole });
    const client = this.getClient(ctx);
    const template = await client.notificationTemplate.findFirst({
      where: {
        eventType: this.mapEventTypeToDb(eventType),
        channel: this.mapChannelToDb(channel),
        locale,
        recipientRole,
        isActive: true,
      },
    });
    return template ? this.mapToNotificationTemplate(template) : undefined;
  }
  ```

  Also update `mapToNotificationTemplate()` helper to include `recipientRole`:
  ```typescript
  recipientRole: template.recipientRole as NotificationRecipientRole,
  ```

- [ ] **Step 3: Update `createNotification()` in the repository to map `recipientRole`**

  The `createNotification()` method needs to pass `recipientRole` to Prisma. Find the `data:` block inside `createNotification()` and add:
  ```typescript
  recipientRole: notification.recipientRole,
  ```

  Also update the `mapToNotification()` helper (if it exists) to include `recipientRole`.

- [ ] **Step 4: Verify compilation**

  ```bash
  cd backend
  npx tsc --noEmit 2>&1 | grep -v "processor\|worker\|template.service\|seeds" | head -40
  ```

  Expected: Errors only in template service, seeds, and processors — repository is clean.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/modules/notifications/notifications.repository.interface.ts \
          backend/src/modules/notifications/notifications.repository.ts
  git commit -m "feat: add recipientRole to findTemplate and createNotification in repository"
  ```

---

## Task 4: Template Service

**Files:**
- Modify: `backend/src/modules/notifications/templates/template.service.ts`

- [ ] **Step 1: Update `renderContent()` signature and lookup**

  ```typescript
  async renderContent(
    ctx: Ctx,
    eventType: NotificationEventType,
    channel: NotificationChannel,
    locale: string,
    recipientRole: NotificationRecipientRole,
    variables: Record<string, string>,
  ): Promise<ChannelContent | null> {
    // Try to find template for the requested locale
    let template = await this.repository.findTemplate(
      ctx,
      eventType,
      channel,
      locale,
      recipientRole,
    );

    // Fall back to default locale if not found
    if (!template && locale !== this.defaultLocale) {
      this.logger.debug(
        ctx,
        `Template not found for locale ${locale}, falling back to ${this.defaultLocale}`,
      );
      template = await this.repository.findTemplate(
        ctx,
        eventType,
        channel,
        this.defaultLocale,
        recipientRole,
      );
    }
    // ... rest of method unchanged
  ```

  Add to imports:
  ```typescript
  import {
    NotificationEventType,
    NotificationChannel,
    NotificationRecipientRole,
  } from '../notifications.domain';
  ```

- [ ] **Step 2: Verify compilation**

  ```bash
  cd backend
  npx tsc --noEmit 2>&1 | grep "template.service" | head -20
  ```

  Expected: No errors in `template.service.ts`.

- [ ] **Step 3: Commit**

  ```bash
  git add backend/src/modules/notifications/templates/template.service.ts
  git commit -m "feat: add recipientRole to TemplateService.renderContent"
  ```

---

## Task 5: Update All 22 Processors

**Files:**
- Modify: all files in `backend/src/modules/notifications/processors/*.processor.ts`

Each processor needs two changes:
1. `getRecipients()` — return `{ userId, role }` instead of `{ userId }`
2. `getTemplateVariables()` — accept `role: NotificationRecipientRole` as third parameter (can ignore it in most cases)

- [ ] **Step 1: Update all single-role processors (18 processors)**

  For each processor below, apply the pattern shown. The import line and `getRecipients` change are the same in each; `getTemplateVariables` just adds the `role` parameter (which most processors will ignore with `void role`).

  **Pattern for single-BUYER processors:**
  (`buyer-payment-rejected`, `ticket-sent`, `offer-accepted`, `offer-rejected`, `offer-cancelled`)
  ```typescript
  import { NotificationRecipientRole } from '../notifications.domain';

  async getRecipients(_ctx, context): Promise<NotificationRecipient[]> {
    return [{ userId: context.buyerId, role: NotificationRecipientRole.BUYER }];
  }

  getTemplateVariables(context: TContext, recipientId: string, _role: NotificationRecipientRole): Record<string, string> {
    void recipientId;
    // ... existing return unchanged
  }
  ```

  **Pattern for single-SELLER processors:**
  (`ticket-received`, `transaction-completed`, `identity-verified`, `identity-rejected`,
  `seller-verification-complete`, `event-approved`, `event-rejected`, `review-received`, `offer-received`)
  ```typescript
  async getRecipients(_ctx, context): Promise<NotificationRecipient[]> {
    return [{ userId: context.sellerId, role: NotificationRecipientRole.SELLER }];
  }
  ```

  **Pattern for ADMIN processors:**
  (`buyer-payment-submitted`, `identity-submitted`, `bank-account-submitted`)
  ```typescript
  async getRecipients(ctx, context): Promise<NotificationRecipient[]> {
    const adminIds = await this.usersService.getAdminUserIds(ctx);
    return adminIds.map(userId => ({ userId, role: NotificationRecipientRole.ADMIN }));
  }
  ```

  > **Note:** These admin processors already inject `UsersService`. The return type change is all that's needed.

- [ ] **Step 2: Update multi-role processors (4 processors)**

  **`payment-received.processor.ts`:**
  ```typescript
  async getRecipients(_ctx, context): Promise<NotificationRecipient[]> {
    return [
      { userId: context.buyerId, role: NotificationRecipientRole.BUYER },
      { userId: context.sellerId, role: NotificationRecipientRole.SELLER },
    ];
  }

  getTemplateVariables(
    context: PaymentReceivedContext,
    recipientId: string,
    role: NotificationRecipientRole,
  ): Record<string, string> {
    const amountFormatted = formatMoney(context.amount, context.currency);
    if (role === NotificationRecipientRole.BUYER) {
      return { transactionId: context.transactionId, amountFormatted, eventName: context.eventName };
    }
    return {
      transactionId: context.transactionId,
      amountFormatted,
      eventName: context.eventName,
      ticketCount: String(context.ticketCount),
    };
  }
  ```

  **`transaction-cancelled.processor.ts`:**
  ```typescript
  async getRecipients(_ctx, context): Promise<NotificationRecipient[]> {
    return [
      { userId: context.buyerId, role: NotificationRecipientRole.BUYER },
      { userId: context.sellerId, role: NotificationRecipientRole.SELLER },
    ];
  }

  getTemplateVariables(context, _recipientId, _role): Record<string, string> {
    return {
      eventName: context.eventName,
      cancelledBy: context.cancelledBy,
      reason: context.reason ?? '',
      transactionId: context.transactionId,
    };
  }
  ```

  **`dispute-resolved.processor.ts`:**
  ```typescript
  async getRecipients(_ctx, context): Promise<NotificationRecipient[]> {
    return [
      { userId: context.buyerId, role: NotificationRecipientRole.BUYER },
      { userId: context.sellerId, role: NotificationRecipientRole.SELLER },
    ];
  }
  // getTemplateVariables: add _role param, otherwise unchanged
  ```

  **`dispute-opened.processor.ts`:**
  ```typescript
  async getRecipients(_ctx, context): Promise<NotificationRecipient[]> {
    if (context.openedBy === 'buyer') {
      return [{ userId: context.sellerId, role: NotificationRecipientRole.SELLER }];
    }
    return [{ userId: context.buyerId, role: NotificationRecipientRole.BUYER }];
  }
  // getTemplateVariables: add _role param, otherwise unchanged
  ```

  **`offer-expired.processor.ts`:**
  ```typescript
  async getRecipients(_ctx, context): Promise<NotificationRecipient[]> {
    if (context.expiredReason === 'buyer_no_purchase') {
      return [
        { userId: context.buyerId, role: NotificationRecipientRole.BUYER },
        { userId: context.sellerId, role: NotificationRecipientRole.SELLER },
      ];
    }
    return [{ userId: context.buyerId, role: NotificationRecipientRole.BUYER }];
  }
  // getTemplateVariables: add _role param, otherwise unchanged
  ```

- [ ] **Step 3: Run TypeScript compilation**

  ```bash
  cd backend
  npx tsc --noEmit 2>&1 | grep "processor" | head -20
  ```

  Expected: No errors in processor files.

- [ ] **Step 4: Run tests**

  ```bash
  cd backend
  npm test
  ```

  Expected: All existing tests pass (no tests for processors directly, but compilation errors would fail).

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/modules/notifications/processors/
  git commit -m "feat: add explicit recipientRole to all 22 notification processors"
  ```

---

## Task 6: Update Worker

**Files:**
- Modify: `backend/src/modules/notifications/notifications.worker.ts`

The worker currently calls `processor.getRecipients()` (now returns `{ userId, role }`) and passes `recipient.userId` to `processRecipient()`. We need to thread `recipient.role` all the way through.

- [ ] **Step 1: Update `processClaimedEvent()` — pass role to `processRecipient`**

  Change the loop (around line 88):
  ```typescript
  for (const recipient of recipients) {
    const locale = localeByUserId.get(recipient.userId) ?? this.defaultLocale;
    await this.processRecipient(
      ctx,
      event,
      recipient.userId,
      recipient.role,      // new
      locale,
      channelConfig,
      processor.getTemplateVariables(event.context, recipient.userId, recipient.role), // add role
    );
  }
  ```

- [ ] **Step 2: Update `processRecipient()` signature**

  ```typescript
  private async processRecipient(
    ctx: Ctx,
    event: NotificationEvent,
    userId: string,
    role: NotificationRecipientRole,   // new
    locale: string,
    channelConfig: NotificationChannelConfig,
    variables: Record<string, string>,
  ): Promise<void> {
    // ...
    for (const channel of channels) {
      await this.processChannel(ctx, event, userId, role, channel, locale, variables);
    }
  }
  ```

- [ ] **Step 3: Update `processChannel()` signature + pass role to `renderContent` and `createNotification`**

  ```typescript
  private async processChannel(
    ctx: Ctx,
    event: NotificationEvent,
    userId: string,
    role: NotificationRecipientRole,   // new
    channel: NotificationChannel,
    locale: string,
    variables: Record<string, string>,
  ): Promise<void> {
    const content = await this.templateService.renderContent(
      ctx,
      event.type,
      channel,
      locale,
      role,          // new
      variables,
    );

    if (!content) { /* unchanged */ }

    const notification = await this.service.createNotification(ctx, {
      eventId: event.id,
      eventType: event.type,
      recipientId: userId,
      recipientRole: role,   // new
      channel,
      title: content.title,
      body: content.body,
      actionUrl: content.actionUrl,
    });
    // ...
  }
  ```

  Add to imports:
  ```typescript
  import {
    NotificationChannel,
    NotificationRecipientRole,
  } from './notifications.domain';
  ```

- [ ] **Step 4: Update `notifications.service.ts` — `createNotification` to accept and persist `recipientRole`**

  Find `createNotification()` in `notifications.service.ts`. Add `recipientRole` to the input type and pass it to the repository call:

  ```typescript
  async createNotification(
    ctx: Ctx,
    data: {
      eventId: string;
      eventType: NotificationEventType;
      recipientId: string;
      recipientRole: NotificationRecipientRole;  // new
      channel: NotificationChannel;
      title: string;
      body: string;
      actionUrl?: string;
    },
  ): Promise<Notification> {
    return this.repository.createNotification(ctx, {
      ...data,
      id: generateNotificationId(),
      status: NotificationStatus.PENDING,
      read: false,
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
  }
  ```

- [ ] **Step 5: Run compilation**

  ```bash
  cd backend
  npx tsc --noEmit 2>&1 | grep -E "worker|service" | head -20
  ```

  Expected: No errors in worker or service.

- [ ] **Step 6: Commit**

  ```bash
  git add backend/src/modules/notifications/notifications.worker.ts \
          backend/src/modules/notifications/notifications.service.ts
  git commit -m "feat: thread recipientRole through worker and createNotification"
  ```

---

## Task 7: Admin API Types + Service Method + Controller Endpoint

**Files:**
- Modify: `backend/src/modules/notifications/notifications.api.ts`
- Modify: `backend/src/modules/notifications/notifications.service.ts`
- Modify: `backend/src/modules/notifications/admin/notifications-admin.controller.ts`

- [ ] **Step 1: Add `recipientRole` to `CreateTemplateRequest` in `notifications.api.ts`**

  ```typescript
  export interface CreateTemplateRequest {
    eventType: NotificationEventType;
    channel: string;
    locale: string;
    recipientRole: string;   // new
    titleTemplate: string;
    bodyTemplate: string;
    actionUrlTemplate?: string;
  }
  ```

  Also add the new response type at the end of the admin section:

  ```typescript
  /**
   * GET /admin/notifications/event-detail/:eventType
   */
  export interface NotificationEventDetailTemplateGroup {
    role: NotificationRecipientRole;
    templates: NotificationTemplate[];
  }

  export interface GetNotificationEventDetailResponse {
    eventType: NotificationEventType;
    channelConfig: NotificationChannelConfig;
    templatesByRole: Partial<Record<NotificationRecipientRole, NotificationEventDetailTemplateGroup>>;
  }
  ```

  Add imports at top of file:
  ```typescript
  import {
    NotificationEventType,
    NotificationRecipientRole,
  } from './notifications.domain';
  ```

- [ ] **Step 2: Add `getNotificationEventDetail()` to `notifications.service.ts`**

  ```typescript
  async getNotificationEventDetail(
    ctx: Ctx,
    eventType: NotificationEventType,
  ): Promise<GetNotificationEventDetailResponse> {
    this.logger.debug(ctx, 'getNotificationEventDetail', { eventType });

    const channelConfig = await this.repository.findChannelConfig(ctx, eventType);
    if (!channelConfig) {
      throw new NotFoundException(`Channel config not found for event type: ${eventType}`);
    }

    const allTemplates = await this.repository.findAllTemplates(ctx);
    const eventTemplates = allTemplates.filter(t => t.eventType === eventType);

    const templatesByRole: Partial<Record<NotificationRecipientRole, NotificationEventDetailTemplateGroup>> = {};

    for (const template of eventTemplates) {
      const role = template.recipientRole;
      if (!templatesByRole[role]) {
        templatesByRole[role] = { role, templates: [] };
      }
      templatesByRole[role]!.templates.push(template);
    }

    return { eventType, channelConfig, templatesByRole };
  }
  ```

  Add `GetNotificationEventDetailResponse` to imports from `notifications.api`.

- [ ] **Step 3: Add the endpoint to the controller**

  In `notifications-admin.controller.ts`, add to the TEMPLATES section:

  ```typescript
  /**
   * Get event detail: channel config + all templates grouped by role
   */
  @Get('event-detail/:eventType')
  async getNotificationEventDetail(
    @Context() ctx: Ctx,
    @Param('eventType') eventType: NotificationEventType,
  ): Promise<ApiResponse<GetNotificationEventDetailResponse>> {
    const result = await this.service.getNotificationEventDetail(ctx, eventType);
    return { success: true, data: result };
  }
  ```

  Add `GetNotificationEventDetailResponse` to the imports.

- [ ] **Step 4: Compile and verify**

  ```bash
  cd backend
  npx tsc --noEmit 2>&1 | head -20
  ```

  Expected: No errors.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/modules/notifications/notifications.api.ts \
          backend/src/modules/notifications/notifications.service.ts \
          backend/src/modules/notifications/admin/notifications-admin.controller.ts
  git commit -m "feat: add getNotificationEventDetail endpoint"
  ```

---

## Task 8: Update Seeds

**Files:**
- Modify: `backend/src/modules/notifications/notifications.seeds.ts`

- [ ] **Step 1: Update `syncTemplates()` to include `recipientRole` in the lookup**

  Find the `syncTemplates()` method. Update the `findTemplate` call:
  ```typescript
  const existing = await this.repository.findTemplate(
    ctx,
    template.eventType,
    template.channel,
    template.locale,
    template.recipientRole,   // new
  );
  ```

- [ ] **Step 2: Update `getDefaultTemplates()` — add `recipientRole` to all template definitions**

  This method returns an array of template objects. Each entry needs `recipientRole` added. Example:

  ```typescript
  // BUYER_PAYMENT_SUBMITTED (admin receives this)
  {
    eventType: NotificationEventType.BUYER_PAYMENT_SUBMITTED,
    channel: NotificationChannel.IN_APP,
    locale: 'es',
    recipientRole: NotificationRecipientRole.ADMIN,
    titleTemplate: '...',
    bodyTemplate: '...',
  },
  ```

  Apply the role mapping to all existing templates:
  - `BUYER_PAYMENT_SUBMITTED` → `ADMIN`
  - `PAYMENT_RECEIVED` → needs TWO entries: one `BUYER`, one `SELLER` (with role-appropriate content)
  - `BUYER_PAYMENT_REJECTED` → `BUYER`
  - `TICKET_SENT` → `BUYER`
  - `TICKET_RECEIVED` → `SELLER`
  - `TRANSACTION_COMPLETED` → `SELLER`
  - `TRANSACTION_CANCELLED` → needs TWO entries: `BUYER` and `SELLER`
  - `DISPUTE_OPENED` → needs TWO entries: `BUYER` and `SELLER` (both with real content)
  - `DISPUTE_RESOLVED` → needs TWO entries: `BUYER` and `SELLER`
  - `IDENTITY_VERIFIED` → `SELLER`
  - `IDENTITY_REJECTED` → `SELLER`
  - `IDENTITY_SUBMITTED` → `ADMIN`
  - `BANK_ACCOUNT_SUBMITTED` → `ADMIN`
  - `SELLER_VERIFICATION_COMPLETE` → `SELLER`
  - `EVENT_APPROVED` → `SELLER`
  - `EVENT_REJECTED` → `SELLER`
  - `REVIEW_RECEIVED` → `SELLER`
  - `OFFER_RECEIVED` → `SELLER`
  - `OFFER_ACCEPTED` → `BUYER`
  - `OFFER_REJECTED` → `BUYER`
  - `OFFER_CANCELLED` → `BUYER`
  - `OFFER_EXPIRED` → `BUYER` (SELLER entry can be inactive placeholder)

  For `PAYMENT_RECEIVED` SELLER template, use real content (replace the `{{title}}`/`{{body}}` bypass):
  ```typescript
  {
    eventType: NotificationEventType.PAYMENT_RECEIVED,
    channel: NotificationChannel.IN_APP,
    locale: 'es',
    recipientRole: NotificationRecipientRole.SELLER,
    titleTemplate: 'Nuevo pago confirmado',
    bodyTemplate: 'Recibimos el pago por {{ticketCount}} entrada(s) para "{{eventName}}". ¡Transferílas lo antes posible!',
    actionUrlTemplate: '/transactions/{{transactionId}}',
  },
  ```

  Add `NotificationRecipientRole` to imports in the seeds file.

- [ ] **Step 3: Also update `seedTemplates()` skip-check if present**

  If `seedTemplates()` has an early-return check based on count (like `seedChannelConfigs`), verify it won't skip now that there are more templates than before.

- [ ] **Step 4: Run the app and verify seeds execute cleanly**

  ```bash
  cd backend
  npm run start:dev 2>&1 | grep -E "template|seed|sync" | head -20
  ```

  Expected: Log lines showing templates synced/created with no errors.

- [ ] **Step 5: Commit**

  ```bash
  git add backend/src/modules/notifications/notifications.seeds.ts
  git commit -m "feat: update notification seeds with recipientRole on all templates"
  ```

---

## Task 9: Backend Unit Tests

**Files:**
- Modify: `backend/test/unit/modules/notifications/notifications.service.spec.ts`

- [ ] **Step 1: Update `createMockNotification` factory to include `recipientRole`**

  ```typescript
  import { NotificationRecipientRole } from '../../../../src/modules/notifications/notifications.domain';

  const createMockNotification = (overrides: Partial<Notification> = {}): Notification => ({
    // ... existing fields
    recipientRole: NotificationRecipientRole.BUYER,  // new
    ...overrides,
  });
  ```

- [ ] **Step 2: Write failing test for `getNotificationEventDetail` — not found**

  ```typescript
  describe('getNotificationEventDetail', () => {
    it('throws NotFoundException when channel config does not exist', async () => {
      repository.findChannelConfig.mockResolvedValue(undefined);

      await expect(
        service.getNotificationEventDetail(mockCtx, NotificationEventType.PAYMENT_RECEIVED),
      ).rejects.toThrow('Channel config not found');
    });
  ```

- [ ] **Step 3: Run to verify it fails**

  ```bash
  cd backend
  npm test -- --testPathPattern="notifications.service.spec" -t "getNotificationEventDetail"
  ```

  Expected: FAIL — `getNotificationEventDetail is not a function` or similar.

- [ ] **Step 4: Write failing test for happy path**

  ```typescript
    it('returns channel config and templates grouped by role', async () => {
      const mockConfig = {
        id: 'ncc_1', eventType: NotificationEventType.PAYMENT_RECEIVED,
        inAppEnabled: true, emailEnabled: true, priority: NotificationPriority.HIGH,
        updatedAt: new Date(),
      };
      const mockBuyerTemplate = {
        id: 'nt_1', eventType: NotificationEventType.PAYMENT_RECEIVED,
        channel: NotificationChannel.IN_APP, locale: 'es',
        recipientRole: NotificationRecipientRole.BUYER,
        titleTemplate: 'T', bodyTemplate: 'B', isActive: true,
        createdAt: new Date(), updatedAt: new Date(),
      };
      const mockSellerTemplate = {
        ...mockBuyerTemplate, id: 'nt_2',
        recipientRole: NotificationRecipientRole.SELLER,
      };

      repository.findChannelConfig.mockResolvedValue(mockConfig);
      repository.findAllTemplates.mockResolvedValue([mockBuyerTemplate, mockSellerTemplate]);

      const result = await service.getNotificationEventDetail(
        mockCtx, NotificationEventType.PAYMENT_RECEIVED,
      );

      expect(result.channelConfig).toEqual(mockConfig);
      expect(result.templatesByRole[NotificationRecipientRole.BUYER]?.templates).toHaveLength(1);
      expect(result.templatesByRole[NotificationRecipientRole.SELLER]?.templates).toHaveLength(1);
    });
  });
  ```

- [ ] **Step 5: Run both tests to verify they fail**

  ```bash
  cd backend
  npm test -- --testPathPattern="notifications.service.spec" -t "getNotificationEventDetail"
  ```

  Expected: FAIL.

- [ ] **Step 6: Verify the implementation passes the tests**

  (Implementation was done in Task 7 Step 2.)

  ```bash
  cd backend
  npm test -- --testPathPattern="notifications.service.spec"
  ```

  Expected: All tests in this file pass.

- [ ] **Step 7: Run full test suite**

  ```bash
  cd backend
  npm test
  ```

  Expected: All tests pass.

- [ ] **Step 8: Commit**

  ```bash
  git add backend/test/unit/modules/notifications/notifications.service.spec.ts
  git commit -m "test: add getNotificationEventDetail tests and update notification mock factory"
  ```

---

## Task 10: Frontend Types

**Files:**
- Modify: `frontend/src/api/types/notifications.ts`

- [ ] **Step 1: Add `NotificationRecipientRole` type and update `NotificationTemplate`**

  ```typescript
  export type NotificationRecipientRole = 'BUYER' | 'SELLER' | 'ADMIN';

  export interface NotificationTemplate {
    id: string;
    eventType: NotificationEventType;
    channel: NotificationChannel;
    locale: string;
    recipientRole: NotificationRecipientRole;   // new
    titleTemplate: string;
    bodyTemplate: string;
    actionUrlTemplate?: string;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    updatedBy?: string;
  }
  ```

- [ ] **Step 2: Add new API response types**

  ```typescript
  export interface NotificationEventDetailTemplateGroup {
    role: NotificationRecipientRole;
    templates: NotificationTemplate[];
  }

  export interface GetNotificationEventDetailResponse {
    eventType: NotificationEventType;
    channelConfig: NotificationChannelConfig;
    templatesByRole: Partial<Record<NotificationRecipientRole, NotificationEventDetailTemplateGroup>>;
  }

  export interface CreateTemplateRequest {
    eventType: NotificationEventType;
    channel: NotificationChannel;
    locale: string;
    recipientRole: NotificationRecipientRole;
    titleTemplate: string;
    bodyTemplate: string;
    actionUrlTemplate?: string;
  }
  ```

- [ ] **Step 3: Restructure `TEMPLATE_VARIABLES` to be role-aware**

  ```typescript
  export const TEMPLATE_VARIABLES: Record<
    NotificationEventType,
    Partial<Record<NotificationRecipientRole, string[]>>
  > = {
    // Single-role events: nest under the role key
    BUYER_PAYMENT_SUBMITTED: {
      ADMIN: ['buyerName', 'eventName', 'amount', 'currency', 'amountFormatted', 'transactionId'],
    },
    BUYER_PAYMENT_REJECTED: {
      BUYER: ['sellerName', 'eventName', 'rejectionReason', 'transactionId'],
    },
    TICKET_SENT: {
      BUYER: ['eventName', 'eventDate', 'venue', 'transactionId'],
    },
    TICKET_RECEIVED: {
      SELLER: ['eventName', 'transactionId'],
    },
    TRANSACTION_COMPLETED: {
      SELLER: ['eventName', 'amount', 'currency', 'amountFormatted', 'transactionId'],
    },
    IDENTITY_VERIFIED: { SELLER: ['userName'] },
    IDENTITY_REJECTED: { SELLER: ['userName', 'rejectionReason'] },
    IDENTITY_SUBMITTED: { ADMIN: ['userName'] },
    BANK_ACCOUNT_SUBMITTED: { ADMIN: ['userName'] },
    SELLER_VERIFICATION_COMPLETE: { SELLER: ['userName'] },
    EVENT_APPROVED: { SELLER: ['eventName', 'eventSlug'] },
    EVENT_REJECTED: { SELLER: ['eventName', 'eventSlug', 'rejectionReason'] },
    REVIEW_RECEIVED: { SELLER: ['reviewerName', 'rating', 'comment', 'transactionId'] },
    OFFER_RECEIVED: {
      SELLER: ['offerId', 'listingId', 'eventName', 'offeredAmount', 'currency', 'amountFormatted'],
    },
    OFFER_ACCEPTED: {
      BUYER: ['offerId', 'listingId', 'eventName', 'offeredAmount', 'currency', 'amountFormatted'],
    },
    OFFER_REJECTED: { BUYER: ['offerId', 'listingId', 'eventName'] },
    OFFER_CANCELLED: { BUYER: ['offerId', 'listingId', 'eventName', 'reason'] },
    // Multi-role events
    PAYMENT_RECEIVED: {
      BUYER: ['eventName', 'amountFormatted', 'transactionId'],
      SELLER: ['eventName', 'ticketCount', 'amountFormatted', 'transactionId'],
    },
    TRANSACTION_CANCELLED: {
      BUYER: ['eventName', 'cancelledBy', 'reason', 'transactionId'],
      SELLER: ['eventName', 'cancelledBy', 'reason', 'transactionId'],
    },
    DISPUTE_OPENED: {
      BUYER: ['eventName', 'reason', 'disputeId', 'transactionId'],
      SELLER: ['eventName', 'reason', 'disputeId', 'transactionId'],
    },
    DISPUTE_RESOLVED: {
      BUYER: ['eventName', 'resolution', 'resolvedInFavorOf', 'disputeId', 'transactionId'],
      SELLER: ['eventName', 'resolution', 'resolvedInFavorOf', 'disputeId', 'transactionId'],
    },
    OFFER_EXPIRED: {
      BUYER: ['offerId', 'eventName', 'expiredReason'],
      SELLER: ['offerId', 'eventName', 'expiredReason'],
    },
  };
  ```

- [ ] **Step 4: Update `EVENT_TYPE_RECIPIENTS` — remove `counterparty`, replace with concrete roles**

  ```typescript
  export type NotificationRecipient = 'buyer' | 'seller' | 'admin';

  export const EVENT_TYPE_RECIPIENTS: Record<NotificationEventType, NotificationRecipient[]> = {
    BUYER_PAYMENT_SUBMITTED: ['admin'],
    PAYMENT_RECEIVED: ['buyer', 'seller'],
    BUYER_PAYMENT_REJECTED: ['buyer'],
    TICKET_SENT: ['buyer'],
    TICKET_RECEIVED: ['seller'],
    TRANSACTION_COMPLETED: ['seller'],
    TRANSACTION_CANCELLED: ['buyer', 'seller'],
    DISPUTE_OPENED: ['buyer', 'seller'],  // both templates exist, one used at runtime
    DISPUTE_RESOLVED: ['buyer', 'seller'],
    OFFER_RECEIVED: ['seller'],
    OFFER_ACCEPTED: ['buyer'],
    OFFER_REJECTED: ['buyer'],
    OFFER_CANCELLED: ['buyer'],
    OFFER_EXPIRED: ['buyer', 'seller'],
    IDENTITY_SUBMITTED: ['admin'],
    IDENTITY_VERIFIED: ['seller'],
    IDENTITY_REJECTED: ['seller'],
    BANK_ACCOUNT_SUBMITTED: ['admin'],
    SELLER_VERIFICATION_COMPLETE: ['seller'],
    EVENT_APPROVED: ['seller'],
    EVENT_REJECTED: ['seller'],
    REVIEW_RECEIVED: ['seller'],
  };
  ```

- [ ] **Step 5: Check TypeScript compilation**

  ```bash
  cd frontend
  npx tsc --noEmit 2>&1 | grep "notifications" | head -20
  ```

  Expected: Errors in `NotificationManagement.tsx` where `TEMPLATE_VARIABLES` was used with the old flat structure. These are addressed in Task 12.

- [ ] **Step 6: Commit**

  ```bash
  git add frontend/src/api/types/notifications.ts
  git commit -m "feat: add NotificationRecipientRole and role-aware TEMPLATE_VARIABLES to frontend types"
  ```

---

## Task 11: Frontend Admin Service

**Files:**
- Modify: `frontend/src/api/services/notifications-admin.service.ts`

- [ ] **Step 1: Add `getEventDetail` and `createTemplate` methods**

  ```typescript
  import type {
    // ... existing imports
    GetNotificationEventDetailResponse,
    CreateTemplateRequest,
  } from '../types/notifications';

  export const notificationsAdminService = {
    // ... existing methods unchanged

    async getEventDetail(eventType: NotificationEventType): Promise<GetNotificationEventDetailResponse> {
      const response = await apiClient.get<GetNotificationEventDetailResponse>(
        `/admin/notifications/event-detail/${eventType}`
      );
      return response.data;
    },

    async createTemplate(data: CreateTemplateRequest): Promise<NotificationTemplate> {
      const response = await apiClient.post<NotificationTemplate>(
        '/admin/notifications/templates',
        data
      );
      return response.data;
    },
  };
  ```

- [ ] **Step 2: Compile check**

  ```bash
  cd frontend
  npx tsc --noEmit 2>&1 | grep "notifications-admin.service" | head -10
  ```

  Expected: No errors.

- [ ] **Step 3: Add route for detail page to the admin router**

  Find the admin routing file (look for where `NotificationManagement` is currently registered):

  ```bash
  grep -r "NotificationManagement" frontend/src --include="*.tsx" -l
  ```

  In that routing file, add the new route:
  ```typescript
  import { NotificationEventDetail } from '@/app/pages/admin/NotificationEventDetail';

  // Add alongside existing notification route:
  { path: '/admin/notifications/:eventType', element: <NotificationEventDetail /> },
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/api/services/notifications-admin.service.ts
  git commit -m "feat: add getEventDetail and createTemplate to admin notification service"
  ```

---

## Task 12: Simplify Overview Page

**Files:**
- Modify: `frontend/src/app/pages/admin/NotificationManagement.tsx`

The current page fetches both channel configs AND templates in one call, and shows toggles + template buttons inline. After this task, it only needs the channel configs for the status badges, and navigates to the detail page.

- [ ] **Step 1: Remove template-related state and handlers**

  Remove: `editingTemplate`, `templateFormData`, `saving`, `formError`, `isTemplateDialogOpen`, `handleOpenEditTemplate`, `handleOpenEditForChannel`, `handleSaveTemplate`, and the Dialog component at the bottom.

  The `fetchBothAsync` can be simplified to only fetch configs:
  ```typescript
  const fetchAsync = useCallback(async () => {
    return notificationsAdminService.getChannelConfigs();
  }, []);
  ```

  `templates` state is no longer needed — the detail page handles templates.

- [ ] **Step 2: Add navigation and status badge**

  Add `useNavigate` from react-router-dom:
  ```typescript
  import { useNavigate } from 'react-router-dom';
  const navigate = useNavigate();
  ```

  Create a helper to compute missing ES templates per event type. Since we no longer fetch templates on this page, we use a simpler heuristic: the status will just show "Configurar →" — actual completeness is shown on the detail page. (Optionally, add a `missingCount` field to the channel config response in a future iteration.)

- [ ] **Step 3: Rewrite the table**

  Replace the table body to match the new simplified structure. Each row gets:
  - Event type name + description
  - Role badges (from `EVENT_TYPE_RECIPIENTS`)
  - "Configurar →" button that navigates to `/admin/notifications/:eventType`

  Remove the columns: In-App toggle, Email toggle, Priority, Templates.

  ```tsx
  <TableRow key={config.id}>
    <TableCell>
      <div className="font-medium text-sm">
        {t(`admin.notifications.eventTypes.${eventType}`)}
      </div>
      <div className="text-xs text-muted-foreground mt-0.5">
        {t(`admin.notifications.eventTypeDescriptions.${eventType}`)}
      </div>
    </TableCell>
    <TableCell>
      <div className="flex flex-wrap gap-1">
        {(EVENT_TYPE_RECIPIENTS[eventType] ?? []).map((recipient) => (
          <span key={recipient} className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${RECIPIENT_STYLES[recipient]}`}>
            {t(`admin.notifications.recipients.${recipient}`)}
          </span>
        ))}
      </div>
    </TableCell>
    <TableCell>
      <Button
        variant="outline"
        size="sm"
        onClick={() => navigate(`/admin/notifications/${eventType}`)}
        className="h-7 gap-1.5 text-xs"
      >
        {t('admin.notifications.configure')} →
      </Button>
    </TableCell>
  </TableRow>
  ```

- [ ] **Step 4: Update `RECIPIENT_STYLES` for the removed `counterparty` type**

  ```typescript
  const RECIPIENT_STYLES: Record<NotificationRecipient, string> = {
    buyer: 'bg-sky-100 text-sky-700 border-sky-200',
    seller: 'bg-emerald-100 text-emerald-700 border-emerald-200',
    admin: 'bg-violet-100 text-violet-700 border-violet-200',
  };
  ```

- [ ] **Step 5: Add missing i18n key**

  In `frontend/src/i18n/locales/es.json`:
  ```json
  "configure": "Configurar"
  ```

  In `frontend/src/i18n/locales/en.json`:
  ```json
  "configure": "Configure"
  ```

- [ ] **Step 6: Compile check**

  ```bash
  cd frontend
  npx tsc --noEmit 2>&1 | grep "NotificationManagement" | head -10
  ```

  Expected: No errors.

- [ ] **Step 7: Commit**

  ```bash
  git add frontend/src/app/pages/admin/NotificationManagement.tsx \
          frontend/src/i18n/locales/es.json \
          frontend/src/i18n/locales/en.json
  git commit -m "feat: simplify notification overview page, add Configure button"
  ```

---

## Task 13: Detail Page

**Files:**
- Create: `frontend/src/app/pages/admin/NotificationEventDetail.tsx`

This is the main new frontend component. It has two sections: channel config and templates by role.

- [ ] **Step 1: Create the file with the data fetching skeleton**

  ```typescript
  import { useState, useEffect, useCallback } from 'react';
  import { useParams, useNavigate } from 'react-router-dom';
  import { useAsync } from '@/app/hooks';
  import { useTranslation } from 'react-i18next';
  import { notificationsAdminService } from '@/api/services/notifications-admin.service';
  import type {
    NotificationEventType,
    NotificationChannel,
    NotificationRecipientRole,
    NotificationTemplate,
    NotificationChannelConfig,
    NotificationPriority,
    GetNotificationEventDetailResponse,
  } from '@/api/types/notifications';
  import {
    TEMPLATE_VARIABLES,
    EVENT_TYPE_RECIPIENTS,
  } from '@/api/types/notifications';
  // shadcn/ui imports: Card, Button, Switch, Select, Badge, Label, Input, Textarea, Dialog ...

  export function NotificationEventDetail() {
    const { eventType } = useParams<{ eventType: string }>();
    const navigate = useNavigate();
    const { t } = useTranslation();

    const fetchDetail = useCallback(async () => {
      if (!eventType) return null;
      return notificationsAdminService.getEventDetail(eventType as NotificationEventType);
    }, [eventType]);

    const { data, isLoading, error, execute } = useAsync(fetchDetail);

    useEffect(() => { execute(); }, [execute]);

    if (isLoading) return <div>{t('common.loading')}</div>;
    if (error || !data) return <div>Error loading event details</div>;

    return (
      <div className="space-y-6">
        {/* breadcrumb, channel config section, templates by role section */}
      </div>
    );
  }
  ```

- [ ] **Step 2: Build the channel config section**

  Extract into a component or inline. Handles inAppEnabled, emailEnabled, priority toggles, calls `notificationsAdminService.updateChannelConfig()` on change (same optimistic update pattern as the old overview page).

  ```tsx
  {/* Channel Configuration Card */}
  <Card>
    <CardHeader>
      <CardTitle>{t('admin.notifications.channels.title')}</CardTitle>
    </CardHeader>
    <CardContent className="flex gap-4 flex-wrap">
      <div className="flex items-center gap-3 border rounded-lg p-3">
        <Switch
          checked={data.channelConfig.inAppEnabled}
          onCheckedChange={(checked) => handleToggle('inApp', checked)}
        />
        <div>
          <div className="text-sm font-semibold">In-App</div>
          <div className="text-xs text-muted-foreground">
            {data.channelConfig.inAppEnabled ? t('common.enabled') : t('common.disabled')}
          </div>
        </div>
      </div>
      {/* Same for email */}
      {/* Priority select */}
    </CardContent>
  </Card>
  ```

- [ ] **Step 3: Build the templates-by-role section**

  For each role in `EVENT_TYPE_RECIPIENTS[eventType]` (uppercase), render a role section card.

  Inside each role section, render a 2-column grid (In-App | Email). Each column has up to 2 locale cells (ES required, EN optional).

  ```tsx
  {(['BUYER', 'SELLER', 'ADMIN'] as NotificationRecipientRole[])
    .filter(role => EVENT_TYPE_RECIPIENTS[eventType as NotificationEventType]
      ?.includes(role.toLowerCase() as any))
    .map(role => {
      const group = data.templatesByRole[role];
      const templates = group?.templates ?? [];
      const findTemplate = (channel: NotificationChannel, locale: string) =>
        templates.find(t => t.channel === channel && t.locale === locale);

      return (
        <Card key={role}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <Badge className={ROLE_STYLES[role]}>{role}</Badge>
              {/* completeness badge */}
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 divide-x">
              {(['IN_APP', 'EMAIL'] as NotificationChannel[]).map(channel => (
                <div key={channel} className="px-4 first:pl-0 last:pr-0">
                  <div className="text-xs font-semibold uppercase text-muted-foreground mb-3">
                    {channel === 'IN_APP' ? 'In-App' : 'Email'}
                  </div>
                  <div className="flex gap-2">
                    {/* ES cell (required) */}
                    <TemplateCell
                      template={findTemplate(channel, 'es')}
                      eventType={eventType as NotificationEventType}
                      channel={channel}
                      locale="es"
                      role={role}
                      required
                      onEdit={() => openEditDialog(findTemplate(channel, 'es')!, role)}
                      onCreate={() => openCreateDialog(channel, 'es', role)}
                      onRefresh={execute}
                    />
                    {/* EN cell (optional) */}
                    <TemplateCell
                      template={findTemplate(channel, 'en')}
                      eventType={eventType as NotificationEventType}
                      channel={channel}
                      locale="en"
                      role={role}
                      required={false}
                      onEdit={() => openEditDialog(findTemplate(channel, 'en')!, role)}
                      onCreate={() => openCreateDialog(channel, 'en', role)}
                      onRefresh={execute}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      );
    })}
  ```

- [ ] **Step 4: Build `TemplateCell` component (inline or separate)**

  ```tsx
  function TemplateCell({
    template, eventType, channel, locale, role, required,
    onEdit, onCreate, onRefresh,
  }: TemplateCellProps) {
    const [saving, setSaving] = useState(false);

    const handleToggleActive = async () => {
      if (!template) return;
      setSaving(true);
      await notificationsAdminService.updateTemplate(template.id, {
        titleTemplate: template.titleTemplate,
        bodyTemplate: template.bodyTemplate,
        actionUrlTemplate: template.actionUrlTemplate,
        isActive: !template.isActive,
      });
      await onRefresh();
      setSaving(false);
    };

    if (!template) {
      return (
        <div
          className={`flex-1 border rounded-md p-2 text-xs cursor-pointer ${
            required
              ? 'border-dashed border-red-300 bg-red-50'
              : 'border-dashed border-gray-200 bg-gray-50'
          }`}
          onClick={onCreate}
        >
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold">{locale.toUpperCase()}</span>
            <span className={required ? 'text-red-500' : 'text-gray-400'}>
              {required ? 'falta' : 'usa ES'}
            </span>
          </div>
          <div className="text-gray-400 italic">Sin template</div>
          <div className="mt-2 text-purple-600 font-medium">+ Crear →</div>
        </div>
      );
    }

    return (
      <div className="flex-1 border rounded-md p-2 text-xs cursor-pointer" onClick={onEdit}>
        <div className="flex justify-between items-center mb-1">
          <span className="font-semibold">{locale.toUpperCase()}</span>
          <Switch
            checked={template.isActive}
            disabled={saving}
            onCheckedChange={handleToggleActive}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
        <div className="text-gray-600 line-clamp-2">{template.titleTemplate}</div>
        <div className="mt-2 text-purple-600 font-medium">Editar →</div>
      </div>
    );
  }
  ```

- [ ] **Step 5: Build the edit/create dialog**

  Reuse the same dialog pattern from `NotificationManagement.tsx` (title, body, actionUrl, isActive fields). Key additions:

  - Show `role`, `channel`, `locale` as read-only context at the top
  - Pass `isActive` as `false` when `titleTemplate` or `bodyTemplate` is empty (forced disabled)
  - On create: call `notificationsAdminService.createTemplate()` with `recipientRole`
  - On edit: call `notificationsAdminService.updateTemplate()`
  - Show variables from `TEMPLATE_VARIABLES[eventType]?.[role] ?? []`

  ```tsx
  {/* isActive toggle — disabled when content is empty */}
  <Switch
    id="isActive"
    checked={formData.isActive}
    disabled={!formData.titleTemplate.trim() || !formData.bodyTemplate.trim()}
    onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
  />
  ```

- [ ] **Step 6: Add i18n keys for any new strings**

  In both `es.json` and `en.json`, add keys like:
  - `admin.notifications.detail.channelConfig` → "Configuración de canales"
  - `admin.notifications.detail.templatesByRole` → "Templates por rol"
  - `admin.notifications.detail.complete` → "Completo"
  - `admin.notifications.detail.missingEs` → "Falta ES"
  - `admin.notifications.detail.usesFallback` → "Usa ES"

- [ ] **Step 7: TypeScript compilation**

  ```bash
  cd frontend
  npx tsc --noEmit 2>&1 | head -30
  ```

  Expected: No errors.

- [ ] **Step 8: Manual smoke test**

  Start the dev server and navigate to `/admin/notifications/PAYMENT_RECEIVED`. Verify:
  - Channel config toggles work
  - Buyer section shows 1 ES template (active) + 1 EN cell showing "usa ES" fallback indicator
  - Seller section shows ES template (may be inactive placeholder from migration) + "Crear" button for EN

- [ ] **Step 9: Commit**

  ```bash
  git add frontend/src/app/pages/admin/NotificationEventDetail.tsx \
          frontend/src/i18n/locales/es.json \
          frontend/src/i18n/locales/en.json
  git commit -m "feat: add NotificationEventDetail admin page with channel config and role-based template grid"
  ```

---

## Task 14: Wire Up Routing

**Files:**
- Modify: admin routing file (find with `grep -r "NotificationManagement" frontend/src --include="*.tsx" -l`)

- [ ] **Step 1: Add the new route**

  ```typescript
  import { NotificationEventDetail } from '@/app/pages/admin/NotificationEventDetail';

  // Alongside existing /admin/notifications route:
  { path: '/admin/notifications/:eventType', element: <NotificationEventDetail /> },
  ```

  Make sure this route comes BEFORE the parent `/admin/notifications` route if using a flat route list, or is a child route if using nested routing.

- [ ] **Step 2: Verify navigation works end-to-end**

  Open `/admin/notifications` → click "Configurar →" on any event type → verify the detail page loads.

- [ ] **Step 3: Final compilation + tests**

  ```bash
  cd backend && npm test
  cd ../frontend && npx tsc --noEmit
  ```

  Expected: All tests pass, no TypeScript errors.

- [ ] **Step 4: Final commit**

  ```bash
  git add -A
  git commit -m "feat: wire up admin notification detail route"
  ```
