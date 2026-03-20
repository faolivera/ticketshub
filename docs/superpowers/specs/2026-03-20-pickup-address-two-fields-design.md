# Pickup Address: Two Separate Fields

**Date:** 2026-03-20
**Status:** Approved

## Context

In the sell listing wizard (step 4 — Delivery Method), when the seller selects Physical delivery and then "Recogida" (pickup), they currently see a single free-text field for the pickup address. This field is stored as `Address.line1` with `city: ''` and `countryCode: 'AR'`.

The goal is to replace that single field with two explicit fields — **Ciudad** and **Calle y número** — so that the Address stored in the backend has a proper city value.

## Requirements

- When `deliveryMethod === 'physical'` and `physicalDeliveryMethod === 'pickup'`, show two inputs:
  1. **Ciudad** (maps to `Address.city`)
  2. **Calle y número** (maps to `Address.line1`)
- Both fields are required to proceed past step 4.
- Country is hardcoded to Argentina (`countryCode: 'AR'`), not collected from the user.
- The review step (step 5) must display both fields.

## Design

### 1. Wizard Form State (`types.ts`)

Replace `pickupAddress: string` with two flat fields:

```typescript
pickupCity: string;    // replaces the city portion
pickupStreet: string;  // replaces line1 / the old pickupAddress string
```

Default values: `pickupCity: ''`, `pickupStreet: ''`.

### 2. Step 4 UI (`StepDeliveryMethod.tsx`)

Replace the single address input with two inputs rendered in this order:

1. Label: `"Ciudad"` — bound to `form.pickupCity`
2. Label: `"Calle y número"` — bound to `form.pickupStreet`

### 3. Proceed Validation (`SellListingWizard.tsx`)

Update `canProceedStep4`:

```typescript
return form.physicalDeliveryMethod === 'pickup'
  && form.pickupCity.trim().length > 0
  && form.pickupStreet.trim().length > 0;
```

### 4. Address Construction on Submit (`SellListingWizard.tsx`)

```typescript
pickupAddress: form.physicalDeliveryMethod === 'pickup'
  ? {
      line1: form.pickupStreet.trim(),
      city: form.pickupCity.trim(),
      countryCode: 'AR',
    }
  : undefined
```

### 5. Review Step (`StepReviewAndPublish.tsx`)

Display the pickup address using both fields where the old single string was shown.

### 6. i18n (`es.json`)

Add or update keys under `sellListingWizard`:
- `pickupCity`: `"Ciudad"`
- `pickupStreet`: `"Calle y número"`

Remove or repurpose the old placeholder `"Calle, número, ciudad, CP"` for `pickupAddressPlaceholder`.

## Files to Change

| File | Change |
|------|--------|
| `frontend/src/app/components/sell-listing-wizard/types.ts` | Replace `pickupAddress: string` with `pickupCity` + `pickupStreet` |
| `frontend/src/app/components/sell-listing-wizard/steps/StepDeliveryMethod.tsx` | Replace single input with two inputs |
| `frontend/src/app/pages/SellListingWizard.tsx` | Update validation + address construction + reset state |
| `frontend/src/app/components/sell-listing-wizard/steps/StepReviewAndPublish.tsx` | Display two fields in review |
| `frontend/src/i18n/locales/es.json` | Add `pickupCity`, `pickupStreet` keys |

## Out of Scope

- No backend changes needed — `Address` already supports `line1`, `city`, `countryCode`.
- No migration needed — `pickupAddress` is stored as JSON, existing listings with the old format are unaffected.
- No postal code, state, or line2 fields are collected.
