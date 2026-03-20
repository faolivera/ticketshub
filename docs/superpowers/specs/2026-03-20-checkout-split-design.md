# Checkout.tsx Split — Design Spec

## Context

`frontend/src/app/pages/Checkout.tsx` is a 1771-line god component with 19 useState variables, 8 useEffect hooks, and 11 API calls. It handles two purchase flows (direct and offer-based), verification gating (V1/V2/V3), a terms-and-conditions gate, and checkout risk assessment. This spec covers splitting it into focused hooks and components.

---

## Business Logic Summary

**Two purchase flows:**
- **Direct flow**: buyer lands on `/buy/:eventSlug/:listingId` and purchases at listing price.
- **Offer flow**: `offerIdFromUrl` is present in the query string when a seller accepts a buyer's offer. The buyer arrives from `/my-tickets` (offer status screen) or from a push notification. The accepted offer has a countdown expiry — if time runs out, the offer becomes invalid and purchase is blocked.

**Verification levels (block purchase if missing):**
- `missingV1`: buyer has not verified email (required by this listing's risk level)
- `missingV2`: buyer has not verified phone
- `missingV3`: buyer has not verified identity document

If any `missing*` flag is true, the buy button is disabled and a warning with a link to the verification page is shown.

**Terms gate:**
- Appears only when the current platform terms version has not yet been accepted by this user.
- Primarily triggered on first purchase for users who signed up via Google OAuth (skipped the registration flow).
- Accepting terms is required to complete the purchase.

**Checkout risk:**
- Re-fetched from the API whenever quantity or selected payment method changes.
- The `checkoutRisk` response is the single source of truth for `missingV1/V2/V3`.

---

## File Structure

```
frontend/src/app/pages/checkout/
  CheckoutPage.tsx              # Orchestrator (~350 lines)
  hooks/
    useCheckoutData.ts          # Fetches listing, event, seller, payment methods
    useOfferState.ts            # Accepted offer data, countdown, expiry flag
    useCheckoutRisk.ts          # Risk re-fetch on qty/method change; exposes missingV*/isBlocked
    useTermsGate.ts             # Checks if terms acceptance is pending; owns checkbox state
  components/
    OfferBanner.tsx             # Accepted-offer banner + countdown; shows expiry state if expired
    VerificationGate.tsx        # V1/V2/V3 warning with verification links; renders null if not blocked
    TermsCheckbox.tsx           # Terms checkbox; renders null if needsTerms is false
    CheckoutSummary.tsx         # Price breakdown (base price + fee + total)
    Countdown.tsx               # Countdown timer (extracted from current inline)
    BuyButton.tsx               # CTA button (extracted from current inline)
    TrustSignals.tsx            # Trust badges (extracted from current inline)
```

The current `Checkout.tsx` is renamed `CheckoutPage.tsx` and moved into the `checkout/` directory. The router entry in `App.tsx` is updated to import from the new path.

---

## Hook Interfaces

### `useCheckoutData(listingId: string, userId?: string)`

Owns all initial page-load fetches.

```ts
return {
  listing, event, seller,
  paymentMethods,
  selectedPaymentMethod, setSelectedPaymentMethod,
  quantity, setQuantity,
  isLoading, error,
}
```

### `useOfferState(offerIdFromUrl: string | null, userId?: string)`

Only active when `offerIdFromUrl` is non-null.

```ts
return {
  offer,              // OfferWithContext | null
  isOfferFlow,        // true when offerIdFromUrl is present
  isOfferExpired,     // true when countdown reaches zero
  offerSecondsLeft,   // number — drives <Countdown />
}
```

### `useCheckoutRisk(listingId: string, quantity: number, paymentMethodId?: string)`

Re-fetches whenever `quantity` or `paymentMethodId` changes.

```ts
return {
  checkoutRisk,
  missingV1, missingV2, missingV3,  // booleans
  isBlocked,    // true if any missing* is true
  isLoading,
}
```

### `useTermsGate(userId?: string)`

Checks signed terms version vs current platform version.

```ts
return {
  needsTerms,       // boolean — show checkbox when true
  termsAccepted,    // controlled checkbox state
  setTermsAccepted,
  termsVersion,     // string — passed to the sign-terms API on purchase
}
```

---

## Component Contracts

| Component | Key props | Renders null when |
|-----------|-----------|-------------------|
| `OfferBanner` | `offer`, `secondsLeft`, `isExpired` | `isOfferFlow` is false |
| `VerificationGate` | `missingV1`, `missingV2`, `missingV3` | all false |
| `TermsCheckbox` | `needsTerms`, `accepted`, `onChange`, `termsVersion` | `needsTerms` is false |
| `CheckoutSummary` | `basePrice`, `fee`, `total`, `currency` | never |
| `BuyButton` | `isBlocked`, `isLoading`, `onClick`, `label` | never |
| `Countdown` | `secondsLeft` | never |
| `TrustSignals` | — | never |

---

## Orchestrator Shape (CheckoutPage)

```tsx
const data  = useCheckoutData(listingId, userId);
const offer = useOfferState(offerIdFromUrl, userId);
const risk  = useCheckoutRisk(listingId, data.quantity, data.selectedPaymentMethod?.id);
const terms = useTermsGate(userId);

const canBuy = !risk.isBlocked
            && !offer.isOfferExpired
            && !(terms.needsTerms && !terms.termsAccepted)
            && !data.isLoading;

return (
  <>
    <OfferBanner {...offer} />
    <EventCard ... />
    <SellerCard ... />
    <PaymentMethodSelector ... />
    <VerificationGate {...risk} />
    <CheckoutSummary ... />
    <TermsCheckbox {...terms} />
    <BuyButton isBlocked={!canBuy} onClick={handlePurchase} ... />
    <TrustSignals />
  </>
);
```

No React context — data flows explicitly through props.

---

## Error Handling

- Each hook owns its own `error` / `isLoading` state.
- `useCheckoutData` error → full-page error screen (same as today).
- `useCheckoutRisk` error → silent fail; purchase button stays enabled (don't block purchase on a risk-check failure).
- `useOfferState` error → show expired-offer banner (safe fallback).
- `useTermsGate` error → `needsTerms` defaults to false; don't block purchase if terms check fails.

---

## Out of Scope

- Seat selection UI — stays in `CheckoutPage.tsx` (event-specific, not reusable).
- The actual purchase submission handler — stays in `CheckoutPage.tsx` (orchestrates all hooks).
- Changes to backend or API contracts.
- `MyTicket.tsx` split — separate spec.
