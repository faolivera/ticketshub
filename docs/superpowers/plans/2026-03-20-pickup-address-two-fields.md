# Pickup Address Two-Field Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the single free-text pickup address field in the sell listing wizard with two explicit fields — "Ciudad" and "Calle y número" — so the backend receives a properly structured `Address` object.

**Architecture:** Pure frontend change across 5 files. The `WizardFormState` type drives everything: change it first, then follow the TypeScript errors to update each consumer. The backend `Address` model already supports `line1`, `city`, `countryCode` — no backend changes needed.

**Tech Stack:** React + TypeScript, Vite, react-i18next, shadcn/ui `Input`/`Label` components

---

## File Map

| File | Role |
|------|------|
| `frontend/src/app/components/sell-listing-wizard/types.ts` | Form state type + default values |
| `frontend/src/app/components/sell-listing-wizard/steps/StepDeliveryMethod.tsx` | Step 4 UI — the two new inputs live here |
| `frontend/src/app/pages/SellListingWizard.tsx` | Validation + submit logic |
| `frontend/src/app/components/sell-listing-wizard/steps/StepReviewAndPublish.tsx` | Step 5 review display |
| `frontend/src/i18n/locales/es.json` | Spanish strings |

> **Note:** No test files exist in this project. Use `npx tsc --noEmit` (run from `frontend/`) to verify TypeScript after each task.

---

## Task 1: Update form state type

**Files:**
- Modify: `frontend/src/app/components/sell-listing-wizard/types.ts:25` (interface field)
- Modify: `frontend/src/app/components/sell-listing-wizard/types.ts:41` (default value)

- [ ] **Step 1: Replace `pickupAddress` in the interface**

  In `WizardFormState` (line 25), replace:
  ```typescript
  pickupAddress: string;
  ```
  With:
  ```typescript
  pickupCity: string;
  pickupStreet: string;
  ```

- [ ] **Step 2: Replace `pickupAddress` in the default object**

  In `defaultWizardFormState` (line 41), replace:
  ```typescript
  pickupAddress: '',
  ```
  With:
  ```typescript
  pickupCity: '',
  pickupStreet: '',
  ```

- [ ] **Step 3: Verify TypeScript reports errors on consumers (expected)**

  ```bash
  cd frontend && npx tsc --noEmit 2>&1 | grep pickupAddress
  ```
  Expected: errors in `StepDeliveryMethod.tsx`, `SellListingWizard.tsx`, `StepReviewAndPublish.tsx` referencing `pickupAddress`. This confirms which lines need updating in later tasks.

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/app/components/sell-listing-wizard/types.ts
  git commit -m "refactor(wizard): split pickupAddress into pickupCity + pickupStreet in form state"
  ```

---

## Task 2: Update Step 4 — Delivery Method UI

**Files:**
- Modify: `frontend/src/app/components/sell-listing-wizard/steps/StepDeliveryMethod.tsx`

There are **three** places that reference `pickupAddress` in this file:

1. **Line 31** — `onValueChange` for the digital/physical radio group clears `pickupAddress` when switching back to digital
2. **Line 82** — `onValueChange` for the pickup/arrange radio group clears `pickupAddress` when switching to arrange
3. **Lines 119–137** — the visible input block rendered when `physicalDeliveryMethod === 'pickup'`

- [ ] **Step 1: Fix the digital/physical toggle (line 31)**

  Replace:
  ```typescript
  pickupAddress: value === 'physical' ? form.pickupAddress : '',
  ```
  With:
  ```typescript
  pickupCity: value === 'physical' ? form.pickupCity : '',
  pickupStreet: value === 'physical' ? form.pickupStreet : '',
  ```

- [ ] **Step 2: Fix the pickup/arrange toggle (line 82)**

  Replace:
  ```typescript
  pickupAddress: value === 'arrange' ? '' : form.pickupAddress,
  ```
  With:
  ```typescript
  pickupCity: value === 'arrange' ? '' : form.pickupCity,
  pickupStreet: value === 'arrange' ? '' : form.pickupStreet,
  ```

- [ ] **Step 3: Replace the single input block with two inputs (lines 119–137)**

  Replace the entire block:
  ```tsx
  {form.physicalDeliveryMethod === 'pickup' && (
    <div style={{ marginTop: 16 }}>
      <Label htmlFor="wizard-pickup-address" style={{ fontSize: 13.5, fontWeight: 600, color: DARK, display: 'block', marginBottom: 6, ...S }}>
        {t('sellListingWizard.pickupAddress')} <span style={{ color: '#dc2626' }}>*</span>
      </Label>
      <Input
        id="wizard-pickup-address"
        value={form.pickupAddress}
        onChange={(e) => onFormChange({ pickupAddress: e.target.value })}
        placeholder={t('sellListingWizard.pickupAddressPlaceholder')}
        className="min-h-[44px]"
        aria-describedby={!form.pickupAddress.trim() ? 'pickup-error' : undefined}
      />
      {!form.pickupAddress.trim() && (
        <p id="pickup-error" style={{ fontSize: 12.5, color: MUTED, marginTop: 4, ...S }}>
          {t('sellListingWizard.enterPickupAddress')}
        </p>
      )}
    </div>
  )}
  ```

  With:
  ```tsx
  {form.physicalDeliveryMethod === 'pickup' && (
    <div style={{ marginTop: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
      {/* Ciudad */}
      <div>
        <Label htmlFor="wizard-pickup-city" style={{ fontSize: 13.5, fontWeight: 600, color: DARK, display: 'block', marginBottom: 6, ...S }}>
          {t('sellListingWizard.pickupCity')} <span style={{ color: '#dc2626' }}>*</span>
        </Label>
        <Input
          id="wizard-pickup-city"
          value={form.pickupCity}
          onChange={(e) => onFormChange({ pickupCity: e.target.value })}
          className="min-h-[44px]"
          aria-describedby={(!form.pickupCity.trim() || !form.pickupStreet.trim()) ? 'pickup-error' : undefined}
        />
      </div>
      {/* Calle y número */}
      <div>
        <Label htmlFor="wizard-pickup-street" style={{ fontSize: 13.5, fontWeight: 600, color: DARK, display: 'block', marginBottom: 6, ...S }}>
          {t('sellListingWizard.pickupStreet')} <span style={{ color: '#dc2626' }}>*</span>
        </Label>
        <Input
          id="wizard-pickup-street"
          value={form.pickupStreet}
          onChange={(e) => onFormChange({ pickupStreet: e.target.value })}
          className="min-h-[44px]"
          aria-describedby={(!form.pickupCity.trim() || !form.pickupStreet.trim()) ? 'pickup-error' : undefined}
        />
      </div>
      {(!form.pickupCity.trim() || !form.pickupStreet.trim()) && (
        <p id="pickup-error" style={{ fontSize: 12.5, color: MUTED, marginTop: 4, ...S }}>
          {t('sellListingWizard.enterPickupAddress')}
        </p>
      )}
    </div>
  )}
  ```

- [ ] **Step 4: Verify TypeScript — this file should now be clean**

  ```bash
  cd frontend && npx tsc --noEmit 2>&1 | grep StepDeliveryMethod
  ```
  Expected: no errors for this file.

- [ ] **Step 5: Commit**

  ```bash
  git add frontend/src/app/components/sell-listing-wizard/steps/StepDeliveryMethod.tsx
  git commit -m "feat(wizard): replace single pickup address input with Ciudad + Calle y número fields"
  ```

---

## Task 3: Update validation and submit in SellListingWizard

**Files:**
- Modify: `frontend/src/app/pages/SellListingWizard.tsx:415` (validation)
- Modify: `frontend/src/app/pages/SellListingWizard.tsx:551-553` (submit)

- [ ] **Step 1: Update `canProceedStep4` (line 415)**

  Replace:
  ```typescript
  return form.physicalDeliveryMethod === 'pickup' && form.pickupAddress.trim().length > 0;
  ```
  With:
  ```typescript
  return (
    form.physicalDeliveryMethod === 'pickup' &&
    form.pickupCity.trim().length > 0 &&
    form.pickupStreet.trim().length > 0
  );
  ```

- [ ] **Step 2: Update `pickupAddress` construction in `handlePublish` (lines 551–553)**

  Replace:
  ```typescript
  pickupAddress: form.physicalDeliveryMethod === 'pickup' && form.pickupAddress.trim()
    ? { line1: form.pickupAddress.trim(), city: '', countryCode: 'AR' }
    : undefined,
  ```
  With:
  ```typescript
  pickupAddress: form.physicalDeliveryMethod === 'pickup'
    ? { line1: form.pickupStreet.trim(), city: form.pickupCity.trim(), countryCode: 'AR' }
    : undefined,
  ```

- [ ] **Step 3: Verify TypeScript — this file should now be clean**

  ```bash
  cd frontend && npx tsc --noEmit 2>&1 | grep SellListingWizard
  ```
  Expected: no errors for this file.

- [ ] **Step 4: Commit**

  ```bash
  git add frontend/src/app/pages/SellListingWizard.tsx
  git commit -m "feat(wizard): update pickup validation and address construction for split fields"
  ```

---

## Task 4: Update Step 5 — Review display

**Files:**
- Modify: `frontend/src/app/components/sell-listing-wizard/steps/StepReviewAndPublish.tsx:149`

- [ ] **Step 1: Replace single `<p>` with two `<p>` elements (line 149)**

  Replace:
  ```tsx
  <p style={{ fontSize: 13, color: MUTED, marginTop: 2, ...S }}>{form.pickupAddress}</p>
  ```
  With:
  ```tsx
  <p style={{ fontSize: 13, color: MUTED, marginTop: 2, ...S }}>{form.pickupCity}</p>
  <p style={{ fontSize: 13, color: MUTED, ...S }}>{form.pickupStreet}</p>
  ```

- [ ] **Step 2: Verify TypeScript is fully clean**

  ```bash
  cd frontend && npx tsc --noEmit 2>&1 | grep -v node_modules
  ```
  Expected: zero errors.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/app/components/sell-listing-wizard/steps/StepReviewAndPublish.tsx
  git commit -m "feat(wizard): display pickupCity and pickupStreet separately in review step"
  ```

---

## Task 5: Update i18n strings

**Files:**
- Modify: `frontend/src/i18n/locales/es.json`

There are two separate `sellListingWizard` sections in this file — one under `sellTicket` (around line 1396) and one under `sellListingWizard` (around line 1543). The keys to change are in the **`sellListingWizard`** section (lines 1543–1568).

- [ ] **Step 1: Add `pickupCity` and `pickupStreet`, remove `pickupAddress` and `pickupAddressPlaceholder`**

  In the `sellListingWizard` object, find and remove:
  ```json
  "pickupAddress": "Dirección de entrega",
  "pickupAddressPlaceholder": "Calle, número, ciudad, CP",
  ```

  Add in their place:
  ```json
  "pickupCity": "Ciudad",
  "pickupStreet": "Calle y número",
  ```

  Keep `"enterPickupAddress"` unchanged — it is used as the shared validation hint for both fields.

  > **Tip:** Search for `"Dirección de entrega"` to locate the exact line in the `sellListingWizard` section (distinct from the `sellTicket` section which has its own `pickupAddress` key — do not touch the `sellTicket` section).

- [ ] **Step 2: Verify no remaining references to the removed keys**

  ```bash
  cd frontend && grep -r "pickupAddressPlaceholder\|sellListingWizard\.pickupAddress" src/
  ```
  Expected: no output.

- [ ] **Step 3: Commit**

  ```bash
  git add frontend/src/i18n/locales/es.json
  git commit -m "i18n: replace pickupAddress/pickupAddressPlaceholder with pickupCity + pickupStreet"
  ```

---

## Final verification

- [ ] **Run the dev server and manually test the full happy path:**

  ```bash
  cd frontend && npm run dev
  ```

  1. Start a new listing in the sell wizard
  2. In step 4, select "Físico" → "Recogida"
  3. Verify two inputs appear: "Ciudad" and "Calle y número"
  4. Verify the Next button is disabled until both are filled
  5. Fill both fields and proceed to step 5
  6. Verify both fields appear in the review summary
  7. Publish and confirm the listing is created (network tab: `pickupAddress` payload should have `city` and `line1` both populated, `countryCode: "AR"`)

- [ ] **Test the state-reset paths:**

  1. Fill both pickup fields, then switch from "Recogida" to "Acordar" — fields should clear
  2. Fill both pickup fields, then switch from "Físico" to "Digital" — fields should clear, re-selecting "Físico" → "Recogida" shows empty fields
