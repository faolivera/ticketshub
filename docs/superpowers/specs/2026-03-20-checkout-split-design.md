# Checkout.tsx Split — Design Spec

## Context

`frontend/src/app/pages/Checkout.tsx` is a 1771-line god component with 19 useState variables, 8 useEffect hooks, and 11 API calls. It handles two purchase flows (direct and offer-based), a make-offer panel, verification gating (V1/V2/V3), a terms-and-conditions gate, and checkout risk assessment. This spec covers splitting it into focused hooks and components.

---

## Business Logic Summary

**Two purchase flows:**
- **Direct flow**: buyer lands on `/buy/:eventSlug/:listingId` and purchases at listing price using a `pricingSnapshot` (snapshot of the listing price at the time of checkout, used as purchase proof).
- **Offer flow**: `offerIdFromUrl` is present in the query string when a seller accepts a buyer's offer. The buyer arrives from `/my-tickets` (offer status screen) or from a push notification. The accepted offer has a countdown expiry — if time runs out, the offer becomes invalid and purchase is blocked.

**Make-offer panel (direct flow only):**
- Shown when the listing accepts offers and there is no accepted offer in the URL.
- Buyer can open the offer panel, enter an offer price, submit it, or cancel a pending offer.
- A pending offer (submitted but not yet accepted/rejected) blocks making another offer.

**Three offer states fetched from the API (from `listMyOffers()`, filtered by `listingId`):**
- `acceptedOffer` — the accepted offer the buyer is about to purchase (may be identified by `offerIdFromUrl`).
- `pendingOffer` — a pending (not yet decided) offer for this listing.
- `expiredOffer` — the most recently expired offer for this listing (sorted by `updatedAt` desc). This is a distinct API-fetched record, not driven by the countdown timer.

**Verification levels (block purchase if missing):**
- `missingV1`: buyer has not verified email (required by this listing's risk level)
- `missingV2`: buyer has not verified phone
- `missingV3`: buyer has not verified identity document

If any `missing*` flag is true, the buy button is disabled and a warning with a link to the verification page is shown.

**Terms gate:**
- Appears only when the current platform terms version has not yet been accepted by this user.
- Primarily triggered on first purchase for users who signed up via Google OAuth (skipped the registration flow).
- Accepting terms is required to complete the purchase.
- Implementation: two sequential API calls — `getTermsStatus()` to check compliance, and only if non-compliant, `getCurrentTerms()` to fetch the version ID needed for the sign-terms call at purchase time. `termsVersion` is null until the second call resolves.

**Checkout risk:**
- Re-fetched from the API whenever the effective quantity or selected payment method changes.
- In offer flow, the effective quantity comes from the offer's ticket payload (not from the direct-flow quantity selector).
- The `checkoutRisk` response is the single source of truth for `missingV1/V2/V3`.

**Unavailability:**
- `isUnavailable` is set to true when the purchase API call fails due to the listing no longer being available (race condition). This triggers a full-column overlay blocking further purchase attempts.
- A second overlay trigger: `expiredOffer && availableCount === 0 && !acceptedOffer && !pendingOffer` — the buyer arrives with a previously-expired offer and the listing is sold out. The orchestrator computes `isExpiredOfferSoldOut` from these conditions and passes it to `UnavailableOverlay`.

---

## File Structure

```
frontend/src/app/pages/checkout/
  CheckoutPage.tsx              # Orchestrator (~400 lines)
  hooks/
    useCheckoutData.ts          # Fetches listing, event, seller, payment methods, pricingSnapshot
    useOfferState.ts            # Accepted offer (banner/countdown) + make-offer/cancel actions
    useCheckoutRisk.ts          # Risk re-fetch on effectiveQty/method change; exposes missingV*/isBlocked
    useTermsGate.ts             # Two-step terms check; owns checkbox state and termsVersion
  components/
    OfferBanner.tsx             # Accepted-offer banner + countdown (offer flow only)
    UnavailableOverlay.tsx      # Full-column overlay for expired offer or sold-out listing
    VerificationGate.tsx        # V1/V2/V3 warning with verification links; renders null if not blocked
    TermsCheckbox.tsx           # Terms checkbox; renders null if needsTerms is false
    CheckoutSummary.tsx         # Price breakdown (base price + fee + total)
    MakeOfferPanel.tsx          # Offer price input, submit, cancel (direct flow only)
    Countdown.tsx               # Countdown timer (extracted from current inline)
    BuyButton.tsx               # CTA button (extracted from current inline)
    TrustSignals.tsx            # Trust badges (extracted from current inline)
```

The current `Checkout.tsx` is renamed `CheckoutPage.tsx` and moved into the `checkout/` directory. The router entry in `App.tsx` is updated to import from the new path.

---

## Hook Interfaces

### `useCheckoutData(listingId: string, userId?: string)`

Owns all initial page-load fetches. Returns `pricingSnapshot` which is required for the purchase API call in direct flow (and must be non-null for the buy button to be enabled in direct flow).

```ts
return {
  listing,
  event,
  seller,
  paymentMethods,
  selectedPaymentMethod, setSelectedPaymentMethod,
  quantity, setQuantity,             // direct flow qty selector
  selectedUnitIds, setSelectedUnitIds, // numbered-ticket seat selection (may be empty array)
  isOwnListing,                      // true if the viewer is the listing's seller
  isNumberedListing,                 // true when listing uses numbered ticket units
  pricingSnapshot,                   // required for direct-flow purchase; null until loaded
  availableCount,                    // total available tickets on this listing
  availableUnits,                    // full unit objects (used in handlePurchase for unitsToPurchase)
  isLoading, error,
  refresh,                           // re-fetches getBuyPage and resets localCheckoutRisk; called after snapshot-expired error
}
```

### `useOfferState(offerIdFromUrl: string | null, listingId: string, userId?: string)`

Covers two distinct sub-flows:

**Accepted-offer sub-flow** (active when `offerIdFromUrl` is non-null):
- Fetches the accepted offer and starts the countdown timer.
- `isOfferExpired` becomes true when the countdown reaches zero.

**Make-offer sub-flow** (active in direct flow when listing `acceptsOffers` is true):
- Manages the offer panel open/close state, the offer price input, submission, and cancellation.
- `pendingOffer` holds a submitted-but-not-yet-decided offer (blocks further submissions).

```ts
return {
  // Accepted-offer sub-flow
  acceptedOffer,       // OfferWithContext | null
  isOfferFlow,         // true when offerIdFromUrl is present
  isOfferExpired,      // true when countdown reaches zero
  offerSecondsLeft,    // number — drives <Countdown />

  // Make-offer sub-flow
  pendingOffer,        // existing pending offer for this listing/user (or null)
  expiredOffer,        // most recently expired offer for this listing (API-fetched, not countdown-based)
  expiredOfferReason,  // string — from getExpiredReason(expiredOffer), shown in UnavailableOverlay
  offerOpen,           // boolean — offer panel visibility
  setOfferOpen,
  offerPriceCents,     // number — controlled input
  setOfferPriceCents,
  isSubmittingOffer,   // boolean
  offerError,          // string | null
  handleSubmitOffer,   // () => Promise<void>
  handleCancelOffer,   // () => Promise<void>
}
```

### `useCheckoutRisk(listingId: string, effectiveQuantity: number, paymentMethodId?: string)`

`effectiveQuantity` is computed by the orchestrator:
- Offer flow: comes from `acceptedOffer.tickets.count` (or seats length for numbered tickets).
- Direct flow: comes from `data.selectedUnitIds.length` (numbered) or `data.quantity` (general admission).

Re-fetches whenever `effectiveQuantity` or `paymentMethodId` changes.

```ts
return {
  checkoutRisk,
  missingV1, missingV2, missingV3,  // booleans
  isBlocked,    // true if any missing* is true
  isLoading,
}
```

### `useTermsGate(userId?: string)`

Two sequential API calls:
1. `getTermsStatus()` — determines if user is compliant. If compliant, `needsTerms` is false and no second call is made.
2. `getCurrentTerms(TermsUserType.Buyer)` — only called when non-compliant. Fetches the terms version ID.

`termsVersion` is null until the second call resolves. `handlePurchase` in the orchestrator must guard `termsVersion !== null` before passing it to the sign-terms API.

```ts
return {
  needsTerms,         // boolean — show checkbox when true
  termsAccepted,      // controlled checkbox state
  setTermsAccepted,
  termsVersion,       // string | null — null until second API call resolves
}
```

---

## Component Contracts

| Component | Key props | Renders null when |
|-----------|-----------|-------------------|
| `OfferBanner` | `offer`, `secondsLeft` | `isOfferFlow` is false |
| `UnavailableOverlay` | `isUnavailable`, `isExpiredOfferSoldOut`, `expiredOfferReason` | both booleans false |
| `VerificationGate` | `missingV1`, `missingV2`, `missingV3` | all false |
| `TermsCheckbox` | `needsTerms`, `accepted`, `onChange` | `needsTerms` is false |
| `CheckoutSummary` | `basePrice`, `fee`, `total`, `currency` | never |
| `MakeOfferPanel` | `open`, `onOpen`, `priceCents`, `onChange`, `onSubmit`, `onCancel`, `pendingOffer`, `isSubmitting`, `error` | `isOfferFlow` is true (no make-offer in accepted-offer flow) |
| `BuyButton` | `isBlocked`, `isLoading`, `onClick`, `label` | never |
| `Countdown` | `secondsLeft` | never |
| `TrustSignals` | — | never |

---

## Orchestrator Shape (CheckoutPage)

```tsx
const data  = useCheckoutData(listingId, userId);
const offer = useOfferState(offerIdFromUrl, listingId, userId);

// Effective quantity: offer takes precedence over selector
const effectiveQty = offer.isOfferFlow
  ? (offer.acceptedOffer?.tickets.type === 'numbered'
      ? offer.acceptedOffer.tickets.seats.length
      : offer.acceptedOffer?.tickets.count ?? 1)
  : (data.selectedUnitIds.length > 0 ? data.selectedUnitIds.length : data.quantity);

const risk  = useCheckoutRisk(listingId, effectiveQty, data.selectedPaymentMethod?.id);
const terms = useTermsGate(userId);

// State owned by CheckoutPage
const [isUnavailable, setIsUnavailable] = useState(false);
const [isPurchasing,  setIsPurchasing]  = useState(false);
const [purchaseError, setPurchaseError] = useState<string | null>(null);

// canProceed: listing.sellTogether bypasses selection requirement entirely;
// otherwise numbered listings require at least one seat, GA requires qty > 0.
const canProceed =
  data.listing?.sellTogether ||
  (data.isNumberedListing ? data.selectedUnitIds.length > 0 : data.quantity > 0);

// canMakeOffer: offer panel CTA shown only when offers enabled, no accepted offer active,
// buyer can proceed, and viewer is not the seller.
const canMakeOffer =
  (data.listing?.bestOfferConfig?.enabled ?? false) &&
  !offer.acceptedOffer &&
  canProceed &&
  !data.isOwnListing;

// Second overlay trigger: buyer arrives with a previously-expired offer and listing is sold out.
const isExpiredOfferSoldOut =
  !!offer.expiredOffer &&
  (data.availableCount ?? 0) === 0 &&
  !offer.acceptedOffer &&
  !offer.pendingOffer;

const canBuy =
  canProceed &&
  !data.isOwnListing &&
  !risk.isBlocked &&
  !offer.isOfferExpired &&
  !(terms.needsTerms && !terms.termsAccepted) &&
  !(terms.needsTerms && terms.termsVersion === null) &&  // terms version not yet loaded
  (offer.isOfferFlow ? true : !!data.pricingSnapshot);  // direct flow needs snapshot

// handlePurchase guard sequence (executed in order):
// 1. Auth redirect → navigate to /login with `from` state if not authenticated.
// 2. Identity hard-block → if missingV2 || missingV3, set purchaseError and return early.
// 3. Terms pre-flight → if terms required but not accepted/loaded, set purchaseError and return early.
// 4. Accept terms API call (if needed) → call termsService.acceptTerms(), then refresh status.
// 5. Purchase API call:
//    - Offer flow: initiatePurchase({ listingId, paymentMethodId, offerId })
//    - Direct flow: resolve unitsToPurchase (sellTogether → all available; numbered → selectedUnitIds;
//      GA → availableUnits.slice(0, quantity)); then initiatePurchase({ listingId, ticketUnitIds, paymentMethodId, pricingSnapshotId })
// 6. On success: navigate to /transaction/:id with state { from: '/my-tickets' }.
// 7. Error branches:
//    - isPricingSnapshotExpiredError → set purchaseError("pricesChanged"), call data.refresh()
//    - isListingUnavailableError → setIsUnavailable(true)
//    - other → setPurchaseError(message)

return (
  <>
    <UnavailableOverlay
      isUnavailable={isUnavailable}
      isExpiredOfferSoldOut={isExpiredOfferSoldOut}
      expiredOfferReason={offer.expiredOfferReason}
    />
    <OfferBanner offer={offer.acceptedOffer} secondsLeft={offer.offerSecondsLeft} />
    <EventCard ... />
    <SellerCard ... />
    <PaymentMethodSelector ... />
    <VerificationGate {...risk} />
    <CheckoutSummary ... />
    <TermsCheckbox {...terms} />
    {purchaseError && <ErrorMessage message={purchaseError} />}
    <BuyButton isBlocked={!canBuy} isLoading={isPurchasing} onClick={handlePurchase} ... />
    {canMakeOffer && <MakeOfferPanel {...offer} />}
    <TrustSignals />
  </>
);
```

No React context — data flows explicitly through props.

**`BuyButton` disabling behaviour:** `isBlocked={true}` prevents clicks AND renders the button visually disabled. `isLoading={true}` (when `isPurchasing`) also prevents clicks and shows a spinner. Both props contribute to disabling the button; `isPurchasing` does not flow through `isBlocked`.

---

## Error Handling

- Each hook owns its own `error` / `isLoading` state.
- `useCheckoutData` error → full-page error screen (same as today).
- `useCheckoutData` exposes `refresh()` — called by `handlePurchase` after `isPricingSnapshotExpiredError`; re-fetches the buy page to obtain a fresh `pricingSnapshot`.
- `useCheckoutRisk` error → silent fail; purchase button stays enabled (don't block purchase on a risk-check failure).
- `useOfferState` (accepted offer fetch) error → all three offer states set to null; `isOfferFlow` stays true but `acceptedOffer` is null, so `isExpiredOfferSoldOut` may trigger the overlay.
- `useOfferState` (make-offer) error → `offerError` string shown inside `MakeOfferPanel`.
- `useTermsGate` error → `needsTerms` defaults to false; don't block purchase if terms check fails.
- `handlePurchase` error branches (see Orchestrator Shape for full sequence):
  - `isPricingSnapshotExpiredError` → set `purchaseError` ("pricesChanged"), call `data.refresh()` to reload snapshot.
  - `isListingUnavailableError` → set `isUnavailable = true` (shows `UnavailableOverlay`).
  - Other errors → set `purchaseError` to the error message.

---

## Out of Scope

- Changes to backend or API contracts.
- `MyTicket.tsx` split — separate spec.
