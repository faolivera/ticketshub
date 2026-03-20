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

In `WizardFormState`, replace `pickupAddress: string` with:

```typescript
pickupCity: string;    // maps to Address.city
pickupStreet: string;  // maps to Address.line1
```

Also update `defaultWizardFormState` (the exported default object in the same file) — replace `pickupAddress: ''` with:

```typescript
pickupCity: '',
pickupStreet: '',
```

### 2. Step 4 UI (`StepDeliveryMethod.tsx`)

**Visible input block:** Replace the single address input with two inputs in this order:

1. Label: `"Ciudad"` — bound to `form.pickupCity`, i18n key `sellListingWizard.pickupCity`
2. Label: `"Calle y número"` — bound to `form.pickupStreet`, i18n key `sellListingWizard.pickupStreet`

**`onValueChange` callbacks:** There are two places in this file where `pickupAddress` is cleared when the user switches away from pickup:

- When toggling back to `digital` delivery — replace `pickupAddress: ''` with `pickupCity: '', pickupStreet: ''`
- When switching to `arrange` — replace `pickupAddress: ''` with `pickupCity: '', pickupStreet: ''`

Both must be updated to avoid TypeScript errors after the field is removed from the type.

**Error hint:** The existing `enterPickupAddress` i18n key (used as a validation hint below the input) will be repurposed as a single hint that appears when either field is empty. No new per-field keys are needed — one hint is sufficient.

### 3. Proceed Validation (`SellListingWizard.tsx`)

Replace the current `canProceedStep4` expression with the full three-branch version:

```typescript
const canProceedStep4 = (() => {
  if (form.deliveryMethod === 'digital') return true;
  if (form.physicalDeliveryMethod === 'arrange') return true;
  return (
    form.physicalDeliveryMethod === 'pickup' &&
    form.pickupCity.trim().length > 0 &&
    form.pickupStreet.trim().length > 0
  );
})();
```

### 4. Address Construction on Submit (`SellListingWizard.tsx`)

Inside `handlePublish`, replace the existing inline `pickupAddress` construction:

```typescript
// Before:
pickupAddress: form.physicalDeliveryMethod === 'pickup' && form.pickupAddress.trim()
  ? { line1: form.pickupAddress.trim(), city: '', countryCode: 'AR' }
  : undefined,

// After:
pickupAddress: form.physicalDeliveryMethod === 'pickup'
  ? { line1: form.pickupStreet.trim(), city: form.pickupCity.trim(), countryCode: 'AR' }
  : undefined,
```

### 5. Review Step (`StepReviewAndPublish.tsx`)

Replace the current single `<p>` element that renders `form.pickupAddress` with two lines:

```tsx
<p>{form.pickupCity}</p>
<p>{form.pickupStreet}</p>
```

### 6. i18n (`es.json`)

Add under `sellListingWizard`:
- `pickupCity`: `"Ciudad"`
- `pickupStreet`: `"Calle y número"`

Remove:
- `pickupAddressPlaceholder` (old placeholder `"Calle, número, ciudad, CP"`)
- `pickupAddress` label key (currently `"Dirección de entrega"` — used as the label above the single input, becomes unused after the split)

Keep `enterPickupAddress` as-is — it remains the single validation hint shown when either pickup field is empty.

**`aria-describedby`:** The current single `<Input>` has `aria-describedby={!form.pickupAddress.trim() ? 'pickup-error' : undefined}`. After the split, both new inputs should carry `aria-describedby="pickup-error"` when either field is empty (i.e. `!form.pickupCity.trim() || !form.pickupStreet.trim()`).

## Files to Change

| File | Change |
|------|--------|
| `frontend/src/app/components/sell-listing-wizard/types.ts` | Replace `pickupAddress: string` with `pickupCity` + `pickupStreet` in both the interface and `defaultWizardFormState` |
| `frontend/src/app/components/sell-listing-wizard/steps/StepDeliveryMethod.tsx` | Replace single input with two inputs; update both `onValueChange` callbacks that clear `pickupAddress` |
| `frontend/src/app/pages/SellListingWizard.tsx` | Update `canProceedStep4` (full expression) and `handlePublish` address construction |
| `frontend/src/app/components/sell-listing-wizard/steps/StepReviewAndPublish.tsx` | Display `pickupCity` and `pickupStreet` as two `<p>` elements |
| `frontend/src/i18n/locales/es.json` | Add `pickupCity`, `pickupStreet`; remove `pickupAddressPlaceholder` |

## Out of Scope

- No backend changes needed — `Address` already supports `line1`, `city`, `countryCode`.
- No migration needed — `pickupAddress` is stored as JSON; existing listings with the old format are unaffected at read time.
- No postal code, state, or line2 fields are collected.
- Session-storage drafts: the draft TTL is 2 hours; a user returning with a stale draft will see empty pickup fields (no crash, fields default to `''`). This is accepted as a minor edge case.
