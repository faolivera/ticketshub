# Sell Validate — Proximity + Limits Discriminated Response

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the mismatch between `/api/sell/validate` (paso 4) and `POST /api/tickets` (paso 6) by enriching the validate endpoint to support explicit `validations` flags and returning discriminated status codes (`date_proximity_restriction` vs `listing_limits_restriction`). Add proximity validation to wizard step 1 (date selection).

**Architecture:** The request gains `validations: ('proximity' | 'limits')[]` and optional `eventDateId`. The backend runs only the checks requested and returns the specific reason for failure. The wizard calls validate at step 1 with `['proximity']` and at step 3 with `['limits']`, each showing a contextually appropriate disclaimer.

**Tech Stack:** NestJS (backend), React + react-i18next (frontend), TypeScript throughout.

---

## File Map

| File | Change |
|------|--------|
| `backend/src/modules/bff/bff.api.ts` | Extend `ValidateSellListingRequest`; discriminate `ValidateSellListingResponse` |
| `backend/src/modules/events/events.service.ts` | Add public `findEventDateById` method |
| `backend/src/modules/tickets/tickets.service.ts` | Update `validateListingRisk` signature to accept `validations` + `eventStartsAt` |
| `backend/src/modules/bff/bff.service.ts` | Look up event date and forward to `validateListingRisk` |
| `backend/src/modules/bff/bff.controller.ts` | Update request guard to validate `validations` field |
| `backend/test/unit/modules/tickets/validate-listing-risk.spec.ts` | New unit tests for `validateListingRisk` |
| `frontend/src/api/types/bff.ts` | Mirror request/response type changes |
| `frontend/src/app/components/SellerRiskRestrictionDisclaimer.tsx` | Add `variant` prop for proximity copy |
| `frontend/src/i18n/locales/es.json` | Add proximity restriction i18n keys |
| `frontend/src/i18n/locales/en.json` | Add proximity restriction i18n keys |
| `frontend/src/app/pages/SellListingWizard.tsx` | Step 1 proximity check; step 3 adds `eventDateId` + `validations` |

---

## Task 1: Update backend API contract

**Files:**
- Modify: `backend/src/modules/bff/bff.api.ts:118-128`
- Modify: `backend/src/modules/bff/schemas/api.schemas.ts:333-336`

- [ ] **Step 1: Replace `ValidateSellListingRequest` and `ValidateSellListingResponse`**

```typescript
/**
 * Request for POST /api/sell/validate.
 * validations: which checks to run. 'proximity' requires eventDateId.
 * quantity and pricePerTicket are always required (use amount:0 when only checking proximity).
 */
export interface ValidateSellListingRequest {
  eventDateId?: string;
  validations: ('proximity' | 'limits')[];
  quantity: number;
  pricePerTicket: { amount: number; currency: CurrencyCode };
}

/**
 * Discriminated result of sell listing validation.
 * date_proximity_restriction: event is too close in time for unverified sellers.
 * listing_limits_restriction: listing would exceed unverified seller monetary/count caps.
 */
export type ValidateSellListingResponse =
  | { status: 'can_create' }
  | { status: 'date_proximity_restriction' }
  | { status: 'listing_limits_restriction' };
```

- [ ] **Step 2: Update `ValidateSellListingResponseSchema` in `api.schemas.ts:333-336`**

The `@ValidateResponse` decorator on the controller uses this Zod schema to validate the response at runtime. It must mirror `ValidateSellListingResponse` exactly — otherwise valid responses with the new status codes will be rejected/stripped.

Replace:
```typescript
export const ValidateSellListingResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('can_create') }),
  z.object({ status: z.literal('seller_risk_restriction') }),
]);
```

With:
```typescript
export const ValidateSellListingResponseSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('can_create') }),
  z.object({ status: z.literal('date_proximity_restriction') }),
  z.object({ status: z.literal('listing_limits_restriction') }),
]);
```

- [ ] **Step 3: Commit**

```bash
git add backend/src/modules/bff/bff.api.ts backend/src/modules/bff/schemas/api.schemas.ts
git commit -m "feat(bff): discriminate validate response; add validations + eventDateId to request"
```

---

## Task 2: Expose `findEventDateById` on EventsService

**Files:**
- Modify: `backend/src/modules/events/events.service.ts`

The service has `findEventDateById` on the repository but no public service method. `BffService` needs it to resolve `eventStartsAt` from `eventDateId`.

- [ ] **Step 1: Add public method**

Find the public section of `EventsService` (after `getEventById`). Add:

```typescript
async findEventDateById(ctx: Ctx, id: string): Promise<EventDate | undefined> {
  return this.eventsRepository.findEventDateById(ctx, id);
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/events/events.service.ts
git commit -m "feat(events): expose findEventDateById on EventsService"
```

---

## Task 3: Update `validateListingRisk` in TicketsService

**Files:**
- Modify: `backend/src/modules/tickets/tickets.service.ts:294-318`
- Create: `backend/test/unit/modules/tickets/validate-listing-risk.spec.ts`

This is the core logic change. The method now accepts which validations to run and an optional `eventStartsAt` for proximity.

- [ ] **Step 1: Write failing tests**

Create `backend/test/unit/modules/tickets/validate-listing-risk.spec.ts`:

```typescript
import { SellerTier } from '../../src/modules/users/users.domain';
import { VerificationHelper } from '../../src/common/utils/verification-helper';

// Minimal mock factory for TicketsService deps
function makeService(overrides: Record<string, unknown> = {}) {
  const defaultUsers = {
    findById: jest.fn().mockResolvedValue({ id: 'u1', emailVerified: true }),
  };
  const defaultConfig = {
    getPlatformConfig: jest.fn().mockResolvedValue({
      riskEngine: {
        seller: { unverifiedSellerMaxSales: 5, unverifiedSellerMaxAmount: { amount: 100000, currency: 'ARS' } },
        buyer: { phoneRequiredEventHours: 48 },
      },
    }),
  };
  const defaultListings = {
    getActiveListingsTotalsForSeller: jest.fn().mockResolvedValue({ count: 0, amounts: [] }),
  };
  const defaultConversion = {
    sumInCurrency: jest.fn().mockResolvedValue({ amount: 0, currency: 'ARS' }),
  };

  // Import actual service; inject mocks via constructor or test harness
  // (Adjust to match the project's NestJS testing pattern)
  return { defaultUsers, defaultConfig, defaultListings, defaultConversion, ...overrides };
}

describe('validateListingRisk', () => {
  it('returns can_create for VERIFIED_SELLER regardless of validations', async () => {
    // mock VerificationHelper.sellerTier to return VERIFIED_SELLER
    // call validateListingRisk with any validations
    // expect { status: 'can_create' }
  });

  it('returns date_proximity_restriction when proximity validation requested and event is within window', async () => {
    // mock sellerTier to return unverified tier
    // pass eventStartsAt = new Date(Date.now() + 2 * 60 * 60 * 1000) (2h, within 48h window)
    // validations: ['proximity']
    // expect { status: 'date_proximity_restriction' }
  });

  it('returns can_create when proximity validation requested but event is outside window', async () => {
    // pass eventStartsAt = new Date(Date.now() + 72 * 60 * 60 * 1000) (72h, outside 48h window)
    // validations: ['proximity']
    // expect { status: 'can_create' }
  });

  it('returns listing_limits_restriction when limits validation requested and value exceeds cap', async () => {
    // mock sumInCurrency to return { amount: 200000 } (exceeds 100000 cap)
    // validations: ['limits']
    // expect { status: 'listing_limits_restriction' }
  });

  it('skips proximity check when validations only includes limits', async () => {
    // validations: ['limits'], no eventStartsAt
    // even if event is imminent, should not return proximity restriction
    // expect limits result
  });

  it('skips limits check when validations only includes proximity', async () => {
    // validations: ['proximity'], eventStartsAt outside window
    // even if value exceeds cap, should return can_create
  });
});
```

- [ ] **Step 2: Run tests to confirm they fail**

```bash
cd /Users/kfx/proyects/ticketshub/backend
npx jest test/unit/modules/tickets/validate-listing-risk.spec.ts --no-coverage
```

Expected: tests run (some may be pending/skipped) or fail with import errors.

- [ ] **Step 3: Update `validateListingRisk` signature and implementation**

Replace the existing method (`tickets.service.ts:294-318`):

```typescript
/**
 * Validate whether the seller can create a listing from a risk perspective (Tier 0 limits).
 * @param data.validations Which checks to run: 'proximity' checks event date nearness, 'limits' checks monetary/count caps.
 * @param data.eventStartsAt Required when 'proximity' is in validations.
 */
async validateListingRisk(
  ctx: Ctx,
  sellerId: string,
  data: {
    quantity: number;
    pricePerTicket: ConfigMoney;
    validations: ('proximity' | 'limits')[];
    eventStartsAt?: Date;
  },
): Promise<{ status: 'can_create' | 'date_proximity_restriction' | 'listing_limits_restriction' }> {
  const user = await this.usersService.findById(ctx, sellerId);
  if (!user || !VerificationHelper.canSell(user)) {
    throw new ForbiddenException(
      'Only sellers with verified email and phone can create listings',
    );
  }
  if (VerificationHelper.sellerTier(user) === SellerTier.VERIFIED_SELLER) {
    return { status: 'can_create' };
  }

  if (data.validations.includes('proximity') && data.eventStartsAt) {
    const withinLimits = await this.checkUnverifiedSellerListingLimits(
      ctx,
      sellerId,
      { amount: 0, currency: data.pricePerTicket.currency },
      { eventStartsAt: data.eventStartsAt },
    );
    if (!withinLimits) {
      return { status: 'date_proximity_restriction' };
    }
  }

  if (data.validations.includes('limits')) {
    const newListingValue: ConfigMoney = {
      amount: data.pricePerTicket.amount * data.quantity,
      currency: data.pricePerTicket.currency,
    };
    const withinLimits = await this.checkUnverifiedSellerListingLimits(
      ctx,
      sellerId,
      newListingValue,
    );
    if (!withinLimits) {
      return { status: 'listing_limits_restriction' };
    }
  }

  return { status: 'can_create' };
}
```

Note: `checkUnverifiedSellerListingLimits` short-circuits on proximity (lines 138-149) before checking amounts — this ordering must be preserved. By passing `amount: 0` and only caring about the boolean return, we isolate the proximity check.

**Design decision — silent skip:** When `validations` includes `'proximity'` but `eventStartsAt` is `undefined` (because `eventDateId` was omitted or not found), the proximity check is skipped and the method returns `can_create`. This is intentional: the controller guard (Task 5) does not require `eventDateId` when `validations: ['proximity']` because failing silently is safer than blocking the seller on a lookup error. The `BffService` (Task 4) only resolves `eventStartsAt` when `eventDateId` is present, so this path is only hit on malformed requests.

- [ ] **Step 4: Fill in and run tests**

Complete the test stubs with the project's NestJS test harness pattern (see `backend/test/unit/common/filters/http-exception.filter.spec.ts` for the mock style). Run:

```bash
npx jest test/unit/modules/tickets/validate-listing-risk.spec.ts --no-coverage
```

Expected: all tests pass.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/tickets/tickets.service.ts \
        backend/test/unit/modules/tickets/validate-listing-risk.spec.ts
git commit -m "feat(tickets): validateListingRisk supports explicit validations + discriminated status"
```

---

## Task 4: Update `BffService.validateSellListing`

**Files:**
- Modify: `backend/src/modules/bff/bff.service.ts:218-227`

`BffService` needs to resolve `eventStartsAt` from `eventDateId` when proximity validation is requested, then forward it to `validateListingRisk`.

- [ ] **Step 1: Update `validateSellListing`**

Replace the existing method body:

```typescript
async validateSellListing(
  ctx: Ctx,
  userId: string,
  body: ValidateSellListingRequest,
): Promise<ValidateSellListingResponse> {
  let eventStartsAt: Date | undefined;
  if (body.validations.includes('proximity') && body.eventDateId) {
    const eventDate = await this.eventsService.findEventDateById(ctx, body.eventDateId);
    eventStartsAt = eventDate?.date;
  }
  return this.ticketsService.validateListingRisk(ctx, userId, {
    quantity: body.quantity,
    pricePerTicket: body.pricePerTicket,
    validations: body.validations,
    eventStartsAt,
  });
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/bff/bff.service.ts
git commit -m "feat(bff): forward eventStartsAt to validateListingRisk for proximity check"
```

---

## Task 5: Update controller request guard

**Files:**
- Modify: `backend/src/modules/bff/bff.controller.ts:93-95`

Add validation for the new required `validations` field.

- [ ] **Step 1: Update guard**

Replace the existing guard (lines 93-95):

```typescript
if (
  !Array.isArray(body.validations) ||
  body.validations.length === 0 ||
  body.quantity < 1 ||
  body.pricePerTicket?.amount < 0
) {
  throw new BadRequestException(
    'validations (non-empty array), quantity, and pricePerTicket.amount are required and must be valid',
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add backend/src/modules/bff/bff.controller.ts
git commit -m "fix(bff): validate new validations field in sell/validate controller guard"
```

---

## Task 6: Update frontend API types

**Files:**
- Modify: `frontend/src/api/types/bff.ts:38-44`

- [ ] **Step 1: Mirror backend contract**

Replace the existing `ValidateSellListingRequest` and add the new response type:

```typescript
/**
 * Request for POST /api/sell/validate.
 * validations: which checks to run. 'proximity' requires eventDateId.
 */
export interface ValidateSellListingRequest {
  eventDateId?: string;
  validations: ('proximity' | 'limits')[];
  quantity: number;
  pricePerTicket: { amount: number; currency: string };
}

/**
 * Discriminated result of sell listing validation.
 */
export type ValidateSellListingResponse =
  | { status: 'can_create' }
  | { status: 'date_proximity_restriction' }
  | { status: 'listing_limits_restriction' };
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/api/types/bff.ts
git commit -m "feat(frontend/types): mirror discriminated validate response contract"
```

---

## Task 7: Add proximity copy and update disclaimer component

**Files:**
- Modify: `frontend/src/i18n/locales/es.json`
- Modify: `frontend/src/i18n/locales/en.json`
- Modify: `frontend/src/app/components/SellerRiskRestrictionDisclaimer.tsx`

- [ ] **Step 1: Add i18n keys to `es.json`**

Inside the `"sellTicket"` object (after `"sellerRiskRestrictionVerifyCta"`), add:

```json
"proximityRestrictionTitle": "Para publicar este evento necesitás verificarte",
"proximityRestrictionIntro": "Los vendedores no verificados no pueden publicar entradas de eventos con fecha próxima. Completá tu verificación como vendedor, es rápido.",
"proximityRestrictionVerifyCta": "Completar verificación"
```

- [ ] **Step 2: Add i18n keys to `en.json`**

Inside the `"sellTicket"` object (after `"sellerRiskRestrictionVerifyCta"`), add:

```json
"proximityRestrictionTitle": "Verification required for this event",
"proximityRestrictionIntro": "Unverified sellers cannot publish tickets for events happening soon. Complete your seller verification — it only takes a few minutes.",
"proximityRestrictionVerifyCta": "Complete verification"
```

- [ ] **Step 3: Add `variant` prop to `SellerRiskRestrictionDisclaimer`**

Replace the full component file:

```typescript
import { FC } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ShieldCheck } from 'lucide-react';
import { cn } from '@/app/components/ui/utils';

interface SellerRiskRestrictionDisclaimerProps {
  className?: string;
  variant?: 'limits' | 'proximity';
}

/**
 * Reusable disclaimer shown when the seller cannot create/update a listing due to risk limits (unverified seller).
 * variant='limits' (default): exceeds monetary/count caps.
 * variant='proximity': event date is too close for unverified sellers.
 */
export const SellerRiskRestrictionDisclaimer: FC<SellerRiskRestrictionDisclaimerProps> = ({
  className,
  variant = 'limits',
}) => {
  const { t } = useTranslation();

  const titleKey = variant === 'proximity'
    ? 'sellTicket.proximityRestrictionTitle'
    : 'sellTicket.sellerRiskRestrictionTitle';
  const introKey = variant === 'proximity'
    ? 'sellTicket.proximityRestrictionIntro'
    : 'sellTicket.sellerRiskRestrictionIntro';
  const ctaKey = variant === 'proximity'
    ? 'sellTicket.proximityRestrictionVerifyCta'
    : 'sellTicket.sellerRiskRestrictionVerifyCta';

  return (
    <div
      className={cn(
        'rounded-lg border border-amber-200 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/30',
        className
      )}
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="h-5 w-5 shrink-0 text-amber-600 mt-0.5" />
        <div className="min-w-0">
          <p className="font-semibold text-amber-800 dark:text-amber-200 mb-1">
            {t(titleKey)}
          </p>
          <p className="text-sm text-amber-700 dark:text-amber-300 mb-3">
            {t(introKey)}
          </p>
          <Link
            to="/become-seller"
            className="inline-block px-4 py-2 bg-amber-600 text-white text-sm font-semibold rounded-lg hover:bg-amber-700 transition-colors"
          >
            {t(ctaKey)}
          </Link>
        </div>
      </div>
    </div>
  );
};
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/i18n/locales/es.json \
        frontend/src/i18n/locales/en.json \
        frontend/src/app/components/SellerRiskRestrictionDisclaimer.tsx
git commit -m "feat(frontend): add proximity restriction variant to SellerRiskRestrictionDisclaimer"
```

---

## Task 8: Update `SellListingWizard` — step 1 proximity + step 3 limits

**Files:**
- Modify: `frontend/src/app/pages/SellListingWizard.tsx`

Two changes: (a) add proximity check before leaving step 1, (b) add `eventDateId`+`validations` to existing step 3 call.

- [ ] **Step 1: Add `showProximityRestriction` state**

After line 233 (`const [showSellerRiskRestriction...`), add:

```typescript
const [showProximityRestriction, setShowProximityRestriction] = useState(false);
```

- [ ] **Step 2: Add a `validateProximity` helper**

Add a helper just before `handleNext` (around line 435):

```typescript
const validateProximity = async (): Promise<boolean> => {
  if (!form.eventDateId) return true;
  setIsValidatingStep(true);
  try {
    const result = await bffService.validateSellListing({
      eventDateId: form.eventDateId,
      validations: ['proximity'],
      quantity: 1,
      pricePerTicket: { amount: 0, currency: sellerCurrency },
    });
    if (result.status === 'date_proximity_restriction') {
      setShowProximityRestriction(true);
      return false;
    }
    return true;
  } catch {
    return true; // non-blocking on network error
  } finally {
    setIsValidatingStep(false);
  }
};
```

- [ ] **Step 3: Clear `showProximityRestriction` in `handleNext` and `handleBack`**

In `handleNext` (line 436), add `setShowProximityRestriction(false);` alongside the existing `setShowSellerRiskRestriction(false);`.

In `handleBack` (line 428), add the same.

- [ ] **Step 4: Wire proximity check in `handleNext` for step 1 (desktop)**

Inside `handleNext`, before the existing `if (currentStep === 3)` block, add:

```typescript
if (currentStep === 1) {
  const ok = await validateProximity();
  if (!ok) return;
  setCurrentStep(2);
  if (returnToReview) setReturnToReview(false);
  return;
}
```

- [ ] **Step 5: Wire proximity check in `handleDateSelect` for mobile**

The current mobile path (line 348): `if (isMobile) setCurrentStep(2);`

Replace with:

```typescript
if (isMobile) {
  const ok = await validateProximity();
  if (ok) setCurrentStep(2);
}
```

Make `handleDateSelect` `async`:

```typescript
const handleDateSelect = async (eventDate: EventDate) => {
  setShowProximityRestriction(false);
  setForm((prev) => ({ ...prev, eventDateId: eventDate.id }));
  if (isMobile) {
    const ok = await validateProximity();
    if (ok) setCurrentStep(2);
  }
};
```

Note: `validateProximity` uses `form.eventDateId` but the state update is async. Fix by passing the ID directly:

```typescript
const validateProximity = async (eventDateId?: string): Promise<boolean> => {
  const id = eventDateId ?? form.eventDateId;
  if (!id) return true;
  setIsValidatingStep(true);
  try {
    const result = await bffService.validateSellListing({
      eventDateId: id,
      validations: ['proximity'],
      quantity: 1,
      pricePerTicket: { amount: 0, currency: sellerCurrency },
    });
    if (result.status === 'date_proximity_restriction') {
      setShowProximityRestriction(true);
      return false;
    }
    return true;
  } catch {
    return true;
  } finally {
    setIsValidatingStep(false);
  }
};

// Then in handleDateSelect:
const handleDateSelect = async (eventDate: EventDate) => {
  setShowProximityRestriction(false);
  setForm((prev) => ({ ...prev, eventDateId: eventDate.id }));
  if (isMobile) {
    const ok = await validateProximity(eventDate.id);
    if (ok) setCurrentStep(2);
  }
};

// And in handleNext for step 1 (no ID param needed — form already has it):
if (currentStep === 1) {
  const ok = await validateProximity();
  if (!ok) return;
  setCurrentStep(2);
  if (returnToReview) setReturnToReview(false);
  return;
}
```

- [ ] **Step 6: Update step 3 validate call to use new contract**

In `handleNext`, inside the `if (currentStep === 3)` block, replace the `bffService.validateSellListing` call (lines 445-448):

```typescript
const result = await bffService.validateSellListing({
  eventDateId: form.eventDateId || undefined,
  validations: ['limits'],
  quantity,
  pricePerTicket: { amount: Math.round(form.pricePerTicket * 100), currency: sellerCurrency },
});
if (result.status === 'listing_limits_restriction' || result.status === 'date_proximity_restriction') {
  setShowSellerRiskRestriction(true);
  return;
}
```

- [ ] **Step 7: Render proximity disclaimer at step 1**

After line 668 (`{showSellerRiskRestriction && ...}`), add:

```tsx
{showProximityRestriction && (
  <SellerRiskRestrictionDisclaimer variant="proximity" className="mt-4" />
)}
```

Make sure `SellerRiskRestrictionDisclaimer` is imported at the top of the file if it isn't already.

- [ ] **Step 8: Commit**

```bash
git add frontend/src/app/pages/SellListingWizard.tsx
git commit -m "feat(wizard): validate proximity at step 1; add eventDateId+validations to step 3"
```

---

## Task 9: Manual smoke test

- [ ] **Step 1: Start backend and frontend**

```bash
# In one terminal
cd /Users/kfx/proyects/ticketshub/backend && npm run start:dev

# In another
cd /Users/kfx/proyects/ticketshub/frontend && npm run dev
```

- [ ] **Step 2: Test proximity block at step 1**

As an unverified seller, select an event with a date within the proximity window. On step 1 (date selection):
- Desktop: select date, click "Siguiente" → expect proximity disclaimer, no advance to step 2.
- Mobile: select date → expect disclaimer inline on step 1, no advance.

- [ ] **Step 3: Test happy path at step 1**

Select an event with a date far in the future → step 1 advances to step 2 normally.

- [ ] **Step 4: Test limits block at step 3**

Set a price that exceeds the unverified seller cap → expect limits disclaimer on step 3 (existing behavior).

- [ ] **Step 5: Verify no regression at step 6**

Complete the full flow with a valid date and valid price → listing created successfully.
