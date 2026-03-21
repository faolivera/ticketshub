# Checkout.tsx Split — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the 1771-line `Checkout.tsx` god component into 4 focused hooks and 9 extracted components, leaving `CheckoutPage.tsx` as a clean orchestrator (~400 lines).

**Architecture:** Move data-fetching/state into dedicated hooks (`useCheckoutData`, `useOfferState`, `useCheckoutRisk`, `useTermsGate`), extract inline sub-components into their own files, and rewrite `CheckoutPage.tsx` to compose them. The UI/behavior is unchanged — this is a pure structural refactor.

**Tech Stack:** React 18, TypeScript (strict), Vite, inline styles, `@/` path aliases.

**Spec:** `docs/superpowers/specs/2026-03-20-checkout-split-design.md`

---

## File Map

**Create:**
```
frontend/src/app/pages/checkout/
  CheckoutPage.tsx
  helpers.ts                    ← error-detection helpers (isPricingSnapshotExpiredError, etc.)
  hooks/
    useCheckoutData.ts
    useOfferState.ts
    useCheckoutRisk.ts
    useTermsGate.ts
  components/
    Countdown.tsx
    TrustSignals.tsx
    BuyButton.tsx
    OfferBanner.tsx
    UnavailableOverlay.tsx
    VerificationGate.tsx
    TermsCheckbox.tsx
    CheckoutSummary.tsx
    MakeOfferPanel.tsx
```

**Modify:**
- `frontend/src/app/App.tsx` — update import path (line 17)

**Delete:**
- `frontend/src/app/pages/Checkout.tsx`

---

## Task 1: Create directory structure + extract helper functions

**Files:**
- Create: `frontend/src/app/pages/checkout/helpers.ts`

- [ ] **Step 1: Create directory and helpers file**

Copy the three helper functions from `Checkout.tsx` lines 48–72 into a new file:

```typescript
// frontend/src/app/pages/checkout/helpers.ts

export function isPricingSnapshotExpiredError(err: unknown): boolean {
  const e = err as Record<string, unknown>;
  const code = e?.code;
  const message = e?.message;
  return (
    (code != null && String(code).startsWith("PRICING_SNAPSHOT_")) ||
    (code === "BAD_REQUEST" && typeof message === "string" && message.includes("Pricing snapshot has expired"))
  );
}

export function isListingUnavailableError(err: unknown): boolean {
  const e = err as Record<string, unknown>;
  const code = String(e?.code ?? "");
  const msg = ((e?.message as string) ?? "").toLowerCase();
  return (
    ["LISTING_NOT_AVAILABLE", "TICKET_NOT_AVAILABLE", "UNITS_UNAVAILABLE", "SOLD_OUT"].includes(code) ||
    msg.includes("not available") || msg.includes("sold out") || msg.includes("no longer available")
  );
}

import type { Offer } from "@/api/types/offers";

export function getExpiredReason(offer: Offer | null): string | null {
  if (!offer) return null;
  if (offer.expiredReason) return offer.expiredReason;
  return offer.acceptedAt ? "buyer_no_purchase" : "seller_no_response";
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -20
```
Expected: no errors (new file has no dependents yet, so tsc sees it as unused — that's OK).

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pages/checkout/helpers.ts
git commit -m "refactor(checkout): extract helper functions to checkout/helpers.ts"
```

---

## Task 2: Extract `useCheckoutData` hook

**Files:**
- Create: `frontend/src/app/pages/checkout/hooks/useCheckoutData.ts`

This hook owns: initial page fetch, selection state (qty, seats, payment method), derived listing values, and the `refresh()` function.

- [ ] **Step 1: Create the hook**

```typescript
// frontend/src/app/pages/checkout/hooks/useCheckoutData.ts
import { useState, useEffect, useCallback } from "react";
import { useTranslation } from "react-i18next";
import { ticketsService } from "@/api/services/tickets.service";
import { useUser } from "@/app/contexts/UserContext";
import { SeatingType, TicketUnitStatus } from "@/api/types";
import type {
  BuyPageData,
  BuyPagePaymentMethodOption,
  CheckoutRisk,
  TicketUnit,
} from "@/api/types";

export interface UseCheckoutDataReturn {
  // raw buy page data
  buyPageData: BuyPageData | null;
  listing: BuyPageData["listing"] | null;
  seller: BuyPageData["seller"] | null;
  paymentMethods: BuyPagePaymentMethodOption[];
  pricingSnapshot: BuyPageData["pricingSnapshot"] | null;
  initialCheckoutRisk: CheckoutRisk | null;  // from buyPageData; used to seed risk before first re-fetch
  // selection
  quantity: number;
  setQuantity: React.Dispatch<React.SetStateAction<number>>;
  selectedUnitIds: string[];
  setSelectedUnitIds: React.Dispatch<React.SetStateAction<string[]>>;
  selectedPaymentMethod: BuyPagePaymentMethodOption | null;
  setSelectedPaymentMethod: React.Dispatch<React.SetStateAction<BuyPagePaymentMethodOption | null>>;
  // derived
  isOwnListing: boolean;
  isNumberedListing: boolean;
  availableUnits: TicketUnit[];
  availableCount: number;
  isVerifiedSeller: boolean;
  isNewSeller: boolean;
  // status
  isLoading: boolean;
  error: string | null;
  // actions
  refresh: () => Promise<void>;
}

export function useCheckoutData(listingId: string | undefined): UseCheckoutDataReturn {
  const { t } = useTranslation();
  const { user } = useUser();

  const [buyPageData, setBuyPageData] = useState<BuyPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<BuyPagePaymentMethodOption | null>(null);

  // Derived from buyPageData
  const listing = buyPageData?.listing ?? null;
  const seller = buyPageData?.seller ?? null;
  const paymentMethods = buyPageData?.paymentMethods ?? [];
  const pricingSnapshot = buyPageData?.pricingSnapshot ?? null;
  const initialCheckoutRisk = buyPageData?.checkoutRisk ?? null;

  const availableUnits: TicketUnit[] =
    listing?.ticketUnits?.filter((u) => u.status === TicketUnitStatus.Available) ?? [];
  const availableCount = availableUnits.length;
  const isNumberedListing = listing?.seatingType === SeatingType.Numbered;
  const isOwnListing = user?.id === listing?.sellerId;
  const isVerifiedSeller = seller?.badges?.some((b) => String(b).toLowerCase().includes("verif")) ?? false;
  const isNewSeller = (seller?.totalSales ?? 0) === 0;

  const availableIdsStr = availableUnits.map((u) => u.id).join(",");

  const fetchBuyPage = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await ticketsService.getBuyPage(id);
      setBuyPageData(data);
      const firstAvailable = data.paymentMethods?.find((m) => m.available !== false);
      if (firstAvailable) setSelectedPaymentMethod(firstAvailable);
    } catch {
      setError(t("buyTicket.errorLoading"));
    } finally {
      setIsLoading(false);
    }
  }, [t]);

  // Initial fetch
  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    setIsLoading(true);
    setError(null);
    (async () => {
      try {
        const data = await ticketsService.getBuyPage(listingId);
        if (!cancelled) {
          setBuyPageData(data);
          const firstAvailable = data.paymentMethods?.find((m) => m.available !== false);
          if (firstAvailable) setSelectedPaymentMethod(firstAvailable);
        }
      } catch {
        if (!cancelled) setError(t("buyTicket.errorLoading"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId, t]);

  // Sync selection when listing loads
  useEffect(() => {
    if (!listing) return;
    const ids = availableUnits.map((u) => u.id);
    if (listing.sellTogether) { setSelectedUnitIds(ids); return; }
    if (!isNumberedListing) {
      setSelectedUnitIds([]);
      setQuantity((q) => Math.min(Math.max(q, 1), Math.max(availableCount, 1)));
      return;
    }
    setSelectedUnitIds(availableCount === 1 && ids[0] ? [ids[0]] : []);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id, listing?.sellTogether, isNumberedListing, availableCount, availableIdsStr]);

  const refresh = useCallback(async () => {
    if (!listingId) return;
    await fetchBuyPage(listingId);
  }, [listingId, fetchBuyPage]);

  return {
    buyPageData,
    listing,
    seller,
    paymentMethods,
    pricingSnapshot,
    initialCheckoutRisk,
    quantity,
    setQuantity,
    selectedUnitIds,
    setSelectedUnitIds,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
    isOwnListing,
    isNumberedListing,
    availableUnits,
    availableCount,
    isVerifiedSeller,
    isNewSeller,
    isLoading,
    error,
    refresh,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```
Expected: no errors in the new file.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pages/checkout/hooks/useCheckoutData.ts
git commit -m "refactor(checkout): extract useCheckoutData hook"
```

---

## Task 3: Extract `useOfferState` hook

**Files:**
- Create: `frontend/src/app/pages/checkout/hooks/useOfferState.ts`

This hook owns: fetching the three offer states (accepted/pending/expired), the countdown timer, and the make-offer/cancel actions.

- [ ] **Step 1: Create the hook**

```typescript
// frontend/src/app/pages/checkout/hooks/useOfferState.ts
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { offersService } from "@/api/services/offers.service";
import { useUser } from "@/app/contexts/UserContext";
import { getExpiredReason } from "@/app/pages/checkout/helpers";
import type { Offer } from "@/api/types/offers";
import type { TicketUnit } from "@/api/types";

export interface UseOfferStateParams {
  offerIdFromUrl: string | null;
  listingId: string | undefined;
  listing: {
    bestOfferConfig?: { enabled?: boolean; minimumPrice?: { amount: number } } | null;
    pricePerTicket: { currency: string };
    sellTogether?: boolean;
  } | null;
  isAuthenticated: boolean;
  isNumberedListing: boolean;
  selectedUnitIds: string[];
  availableUnits: TicketUnit[];
  quantity: number;
  eventSlug: string | undefined;
}

export interface UseOfferStateReturn {
  // Accepted-offer sub-flow
  acceptedOffer: Offer | null;
  isOfferFlow: boolean;
  isOfferExpired: boolean;
  offerSecondsLeft: number;
  // Make-offer sub-flow
  pendingOffer: Offer | null;
  expiredOffer: Offer | null;
  expiredOfferReason: string | null;
  offerOpen: boolean;
  setOfferOpen: (open: boolean) => void;
  offerPriceCents: number;
  setOfferPriceCents: (v: number) => void;
  isSubmittingOffer: boolean;
  offerError: string | null;
  handleSubmitOffer: () => Promise<void>;
  handleCancelOffer: () => Promise<void>;
}

export function useOfferState(params: UseOfferStateParams): UseOfferStateReturn {
  const {
    offerIdFromUrl, listingId, listing,
    isAuthenticated, isNumberedListing,
    selectedUnitIds, availableUnits, quantity, eventSlug,
  } = params;
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();

  const [acceptedOffer, setAcceptedOffer] = useState<Offer | null>(null);
  const [acceptedOfferSecsLeft, setAcceptedOfferSecsLeft] = useState(Infinity);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [expiredOffer, setExpiredOffer] = useState<Offer | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPriceCents, setOfferPriceCents] = useState(0);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  const isOfferFlow = !!offerIdFromUrl;
  const isOfferExpired = acceptedOfferSecsLeft <= 0;
  const expiredOfferReason = getExpiredReason(expiredOffer);

  // Fetch offers for this listing (accepted / pending / expired)
  useEffect(() => {
    if (!listingId || !isAuthenticated || !listing) return;
    let cancelled = false;
    (async () => {
      try {
        const offers = await offersService.listMyOffers();
        const forListing = offers.filter((o) => o.listingId === listingId);
        const accepted = offerIdFromUrl
          ? forListing.find((o) => o.id === offerIdFromUrl && o.status === "accepted")
          : forListing.find((o) => o.status === "accepted");
        const pending = forListing.find((o) => o.status === "pending");
        const expired =
          forListing
            .filter((o) => o.status === "expired")
            .sort(
              (a, b) =>
                new Date(b.updatedAt ?? b.createdAt).getTime() - new Date(a.updatedAt ?? a.createdAt).getTime()
            )[0] ?? null;
        if (!cancelled) {
          setAcceptedOffer(accepted ?? null);
          setPendingOffer(pending ?? null);
          setExpiredOffer(expired ?? null);
        }
      } catch {
        if (!cancelled) {
          setAcceptedOffer(null);
          setPendingOffer(null);
          setExpiredOffer(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [offerIdFromUrl, listingId, isAuthenticated, listing?.pricePerTicket]);

  // Sync accepted offer → selection (handled upstream in useCheckoutData via acceptedOffer dependency;
  // note: this side-effect updates selectedUnitIds which lives in useCheckoutData.
  // The orchestrator passes a setter; see CheckoutPage.tsx for the sync effect)

  // Countdown timer for accepted offer expiry
  useEffect(() => {
    if (!acceptedOffer?.acceptedExpiresAt) return;
    const update = () => {
      const secs = Math.max(
        0,
        Math.floor((new Date(acceptedOffer.acceptedExpiresAt!).getTime() - Date.now()) / 1000)
      );
      setAcceptedOfferSecsLeft(secs);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [acceptedOffer?.acceptedExpiresAt]);

  const handleSubmitOffer = async () => {
    if (!listingId || !listing?.bestOfferConfig?.enabled || !user) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/buy/${eventSlug}/${listingId}` } });
      return;
    }
    const minCents = listing.bestOfferConfig?.minimumPrice?.amount ?? 0;
    if (offerPriceCents < minCents) {
      setOfferError("Tu oferta está por debajo del mínimo aceptado por este vendedor.");
      return;
    }
    const ticketsPayload = isNumberedListing
      ? {
          type: "numbered" as const,
          seats: selectedUnitIds
            .map((id) => availableUnits.find((u) => u.id === id)?.seat)
            .filter((s): s is NonNullable<typeof s> => s != null),
        }
      : { type: "unnumbered" as const, count: quantity };
    if (ticketsPayload.type === "numbered" && ticketsPayload.seats.length === 0) {
      setOfferError(t("buyTicket.selectAtLeastOneSeat"));
      return;
    }
    if (ticketsPayload.type === "unnumbered" && ticketsPayload.count < 1) {
      setOfferError(t("buyTicket.selectAtLeastOneSeat"));
      return;
    }
    setIsSubmittingOffer(true);
    setOfferError(null);
    try {
      const created = await offersService.create({
        listingId,
        offeredPrice: { amount: offerPriceCents, currency: listing.pricePerTicket.currency },
        tickets: ticketsPayload,
      });
      setPendingOffer(created);
      setOfferOpen(false);
    } catch (err: unknown) {
      const e = err as { message?: string };
      setOfferError(e?.message ?? t("buyTicket.offerSubmitFailed"));
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleCancelOffer = async () => {
    if (!pendingOffer) return;
    try {
      await ((offersService as unknown as Record<string, (id: string) => Promise<void>>)
        .cancel ?? (offersService as unknown as Record<string, (id: string) => Promise<void>>)
        .cancelOffer ?? (() => Promise.resolve()))(pendingOffer.id);
    } catch {
      // Optimistic update regardless
    }
    setPendingOffer(null);
    setOfferPriceCents(0);
  };

  return {
    acceptedOffer,
    isOfferFlow,
    isOfferExpired,
    offerSecondsLeft: acceptedOfferSecsLeft,
    pendingOffer,
    expiredOffer,
    expiredOfferReason,
    offerOpen,
    setOfferOpen,
    offerPriceCents,
    setOfferPriceCents,
    isSubmittingOffer,
    offerError,
    handleSubmitOffer,
    handleCancelOffer,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pages/checkout/hooks/useOfferState.ts
git commit -m "refactor(checkout): extract useOfferState hook"
```

---

## Task 4: Extract `useCheckoutRisk` hook

**Files:**
- Create: `frontend/src/app/pages/checkout/hooks/useCheckoutRisk.ts`

- [ ] **Step 1: Create the hook**

**Note on spec deviation:** The spec defines `useCheckoutRisk` as returning `{ checkoutRisk, missingV1, missingV2, missingV3, isBlocked, isLoading }`. This plan uses a slightly different interface: the hook returns `localCheckoutRisk` (the re-fetched risk) and a `reset()` function, while `missingV*` computation stays in `CheckoutPage` because it must combine `localCheckoutRisk` with `initialCheckoutRisk` from `useCheckoutData`. This is a deliberate, self-consistent deviation — the orchestrator computes `effectiveCheckoutRisk = risk.localCheckoutRisk ?? data.initialCheckoutRisk` before computing the derived booleans.

```typescript
// frontend/src/app/pages/checkout/hooks/useCheckoutRisk.ts
import { useState, useEffect, useCallback } from "react";
import { ticketsService } from "@/api/services/tickets.service";
import type { CheckoutRisk } from "@/api/types";

export interface UseCheckoutRiskReturn {
  localCheckoutRisk: CheckoutRisk | null;  // null until first fetch or after reset()
  isLoading: boolean;
  reset: () => void;                        // call after data.refresh() to clear stale risk
}

export function useCheckoutRisk(
  listingId: string | undefined,
  isAuthenticated: boolean,
  listingLoaded: boolean,
  effectiveQuantity: number,
  paymentMethodId: string | undefined,
): UseCheckoutRiskReturn {
  const [localCheckoutRisk, setLocalCheckoutRisk] = useState<CheckoutRisk | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!listingId || !isAuthenticated || !listingLoaded || !paymentMethodId || effectiveQuantity < 1) return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const data = await ticketsService.getCheckoutRisk(listingId, effectiveQuantity, paymentMethodId);
        if (!cancelled) setLocalCheckoutRisk(data.checkoutRisk);
      } catch {
        if (!cancelled) setLocalCheckoutRisk(null);  // silent fail — don't block purchase
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId, isAuthenticated, listingLoaded, paymentMethodId, effectiveQuantity]);

  const reset = useCallback(() => {
    setLocalCheckoutRisk(null);
  }, []);

  return { localCheckoutRisk, isLoading, reset };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pages/checkout/hooks/useCheckoutRisk.ts
git commit -m "refactor(checkout): extract useCheckoutRisk hook"
```

---

## Task 5: Extract `useTermsGate` hook

**Files:**
- Create: `frontend/src/app/pages/checkout/hooks/useTermsGate.ts`

- [ ] **Step 1: Create the hook**

```typescript
// frontend/src/app/pages/checkout/hooks/useTermsGate.ts
import { useState, useEffect } from "react";
import { termsService } from "@/api/services/terms.service";
import { TermsUserType } from "@/api/types/terms";
import type { GetTermsStatusResponse } from "@/api/types";

export interface UseTermsGateReturn {
  needsTerms: boolean;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  termsVersion: string | null;
  termsStatus: GetTermsStatusResponse | null;
  setTermsStatus: React.Dispatch<React.SetStateAction<GetTermsStatusResponse | null>>;
  isLoading: boolean;
}

export function useTermsGate(isAuthenticated: boolean): UseTermsGateReturn {
  const [termsStatus, setTermsStatus] = useState<GetTermsStatusResponse | null>(null);
  const [termsStatusLoading, setTermsStatusLoading] = useState(false);
  const [buyTermsVersionId, setBuyTermsVersionId] = useState<string | null>(null);
  const [buyTermsLoading, setBuyTermsLoading] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);

  const needsTerms = isAuthenticated && termsStatus?.buyer != null && !termsStatus.buyer.isCompliant;

  // Step 1: check compliance
  useEffect(() => {
    if (!isAuthenticated) { setTermsStatus(null); return; }
    let cancelled = false;
    setTermsStatusLoading(true);
    termsService
      .getTermsStatus()
      .then((s) => { if (!cancelled) setTermsStatus(s); })
      .catch(() => { if (!cancelled) setTermsStatus(null); })
      .finally(() => { if (!cancelled) setTermsStatusLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Step 2: fetch terms version only when non-compliant
  useEffect(() => {
    if (!needsTerms) { setBuyTermsVersionId(null); setBuyTermsLoading(false); return; }
    let cancelled = false;
    setBuyTermsLoading(true);
    termsService
      .getCurrentTerms(TermsUserType.Buyer)
      .then((terms) => { if (!cancelled) setBuyTermsVersionId(terms.id); })
      .catch(() => { if (!cancelled) setBuyTermsVersionId(null); })
      .finally(() => { if (!cancelled) setBuyTermsLoading(false); });
    return () => { cancelled = true; };
  }, [needsTerms]);

  return {
    needsTerms,
    termsAccepted,
    setTermsAccepted,
    termsVersion: buyTermsVersionId,
    termsStatus,
    setTermsStatus,
    isLoading: termsStatusLoading || buyTermsLoading,
  };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pages/checkout/hooks/useTermsGate.ts
git commit -m "refactor(checkout): extract useTermsGate hook"
```

---

## Task 6: Extract simple display components

**Files:**
- Create: `frontend/src/app/pages/checkout/components/Countdown.tsx`
- Create: `frontend/src/app/pages/checkout/components/TrustSignals.tsx`
- Create: `frontend/src/app/pages/checkout/components/BuyButton.tsx`
- Create: `frontend/src/app/pages/checkout/components/PriceLine.tsx`

These are extracted from the inline definitions in `Checkout.tsx` (lines 74–102 for Countdown, 1696–1797 for PriceLine/BuyButton/TrustSignals).

- [ ] **Step 1: Create Countdown.tsx**

The current `Countdown` (lines 74–102) uses `targetDate` and `onSecondsChange`. Keep the same interface since `OfferBanner` will use it:

```tsx
// frontend/src/app/pages/checkout/components/Countdown.tsx
import { useState, useEffect } from "react";

interface CountdownProps {
  targetDate: string;
  onSecondsChange?: (secs: number) => void;
}

export function Countdown({ targetDate, onSecondsChange }: CountdownProps) {
  const [display, setDisplay] = useState("");
  useEffect(() => {
    if (!targetDate) return;
    const update = () => {
      const secs = Math.max(0, Math.floor((new Date(targetDate).getTime() - Date.now()) / 1000));
      const h = Math.floor(secs / 3600);
      const m = Math.floor((secs % 3600) / 60);
      const s = secs % 60;
      setDisplay(
        h > 0
          ? `${h}h ${String(m).padStart(2, "0")}m`
          : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
      );
      onSecondsChange?.(secs);
    };
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [targetDate, onSecondsChange]);
  return <span>{display}</span>;
}
```

- [ ] **Step 2: Create TrustSignals.tsx**

Copy from `Checkout.tsx` lines 1761–1797, adjusting imports:

```tsx
// frontend/src/app/pages/checkout/components/TrustSignals.tsx
import { Lock, Shield, CreditCard } from "lucide-react";
import { V, VLIGHT, GREEN, GLIGHT, AMBER, AMBER_BG_LIGHT, MUTED, BORDER } from "@/lib/design-tokens";

export function TrustSignals() {
  return (
    <div style={{ padding: "12px 22px 18px", borderTop: `1px solid ${BORDER}` }}>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {[
          {
            icon: <Lock size={10} />,
            iconColor: GREEN, iconBg: GLIGHT,
            text: "Tu pago queda en escrow hasta que recibís las entradas",
          },
          {
            icon: <Shield size={10} />,
            iconColor: V, iconBg: VLIGHT,
            text: "Reembolso garantizado si las entradas no son válidas",
          },
          {
            icon: <CreditCard size={10} />,
            iconColor: AMBER, iconBg: AMBER_BG_LIGHT,
            text: "Pago encriptado y seguro",
          },
        ].map(({ icon, iconColor, iconBg, text }) => (
          <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
            <div style={{
              width: 16, height: 16, borderRadius: "50%",
              background: iconBg, color: iconColor,
              display: "flex", alignItems: "center", justifyContent: "center",
              flexShrink: 0, marginTop: 1,
            }}>
              {icon}
            </div>
            <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.45 }}>{text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create BuyButton.tsx**

Copy from `Checkout.tsx` lines 1725–1758:

```tsx
// frontend/src/app/pages/checkout/components/BuyButton.tsx
import { Loader2, Shield } from "lucide-react";
import { V, BORD2, MUTED, WARN_SOLID, S } from "@/lib/design-tokens";

interface BuyButtonProps {
  label: string;
  variant: "primary" | "warn" | "disabled";
  onClick: (() => void) | undefined;
  total: string | null;
  disabled: boolean;
  isLoading: boolean;
}

export function BuyButton({ label, variant, onClick, total, disabled, isLoading }: BuyButtonProps) {
  const styles: Record<string, React.CSSProperties> = {
    primary: { background: V, color: "white", cursor: "pointer", opacity: 1 },
    warn: { background: WARN_SOLID, color: "white", cursor: "not-allowed", opacity: 1 },
    disabled: { background: BORD2, color: MUTED, cursor: "not-allowed", opacity: 0.8 },
  };
  const st = styles[variant] || styles.disabled;
  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%", padding: "13px 16px", borderRadius: 12, border: "none",
        fontSize: 14, fontWeight: 700,
        display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        transition: "all 0.18s", ...S, ...st,
      }}
    >
      {isLoading
        ? <Loader2 size={15} className="animate-spin" />
        : variant === "primary" && <Shield size={15} />}
      <span>{label}{total ? ` · ${total}` : ""}</span>
    </button>
  );
}
```

- [ ] **Step 4: Create PriceLine.tsx**

Copy from `Checkout.tsx` lines 1698–1723:

```tsx
// frontend/src/app/pages/checkout/components/PriceLine.tsx
import { GREEN, DARK, HINT } from "@/lib/design-tokens";

interface PriceLineProps {
  label: string;
  sub: string | null | undefined;
  value: string;
  isDiscount?: boolean;
}

export function PriceLine({ label, sub, value, isDiscount }: PriceLineProps) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div>
        <p style={{ fontSize: 13.5, color: isDiscount ? GREEN : DARK, fontWeight: 500 }}>{label}</p>
        {sub != null && sub !== "" && (
          <div style={{ fontSize: 11.5, color: isDiscount ? GREEN : HINT, marginTop: 1 }}>{sub}</div>
        )}
      </div>
      <span style={{
        fontSize: 13.5, fontWeight: 600,
        color: isDiscount ? GREEN : DARK,
        whiteSpace: "nowrap",
      }}>
        {value}
      </span>
    </div>
  );
}
```

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/pages/checkout/components/
git commit -m "refactor(checkout): extract Countdown, TrustSignals, BuyButton, PriceLine components"
```

---

## Task 7: Extract `OfferBanner`, `UnavailableOverlay`, `VerificationGate`, `TermsCheckbox`

**Files:**
- Create: `frontend/src/app/pages/checkout/components/OfferBanner.tsx`
- Create: `frontend/src/app/pages/checkout/components/UnavailableOverlay.tsx`
- Create: `frontend/src/app/pages/checkout/components/VerificationGate.tsx`
- Create: `frontend/src/app/pages/checkout/components/TermsCheckbox.tsx`

Find the source JSX in `Checkout.tsx` by searching for comments `// OFFER ACCEPTED`, `// showUnavailable`, `// VERIFICATION`, `// TERMS`.

- [ ] **Step 1: Create OfferBanner.tsx**

The accepted-offer banner (green box with countdown). `secondsLeft` comes from `useOfferState`'s timer — `OfferBanner` does NOT render its own `<Countdown>` to avoid two independent timers. Instead it formats `secondsLeft` directly.

Find in `Checkout.tsx` the green banner (SUCCESS_LIGHT background) near the top of the right column render. Copy the exact JSX and adapt props:

```tsx
// frontend/src/app/pages/checkout/components/OfferBanner.tsx
import { Clock } from "lucide-react";
import { SUCCESS_LIGHT, SUCCESS_BORDER, DARK, MUTED, ERROR_DARK, S } from "@/lib/design-tokens";
import type { Offer } from "@/api/types/offers";

interface OfferBannerProps {
  offer: Offer | null;
  isOfferFlow: boolean;
  secondsLeft: number;  // from useOfferState — single source of truth for the countdown
}

function formatSeconds(secs: number): string {
  if (secs <= 0) return "00:00";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  return h > 0
    ? `${h}h ${String(m).padStart(2, "0")}m`
    : `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function OfferBanner({ offer, isOfferFlow, secondsLeft }: OfferBannerProps) {
  if (!isOfferFlow || !offer) return null;

  return (
    <div style={{
      background: SUCCESS_LIGHT, border: `1px solid ${SUCCESS_BORDER}`,
      borderRadius: 12, padding: "12px 16px", marginBottom: 12,
      display: "flex", alignItems: "flex-start", gap: 10,
      ...S,
    }}>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 2 }}>
          Oferta aceptada
        </p>
        {offer.acceptedExpiresAt && (
          <p style={{ fontSize: 12, color: ERROR_DARK, display: "flex", alignItems: "center", gap: 4, fontWeight: 600 }}>
            <Clock size={11} />
            Expira en {formatSeconds(secondsLeft)}
          </p>
        )}
        <p style={{ fontSize: 12, color: MUTED, marginTop: 2 }}>
          Esta oferta fue aceptada. Confirmá el pago antes de que expire.
        </p>
      </div>
    </div>
  );
}
```

**Note:** Copy the exact JSX from `Checkout.tsx`'s green banner. The important change from the original is: replace `<Countdown targetDate={...} onSecondsChange={...} />` with `{formatSeconds(secondsLeft)}`. `secondsLeft` is driven by `useOfferState`'s internal timer and passed down through the orchestrator.

- [ ] **Step 2: Create UnavailableOverlay.tsx**

Find in `Checkout.tsx` by searching for `showUnavailable` in the JSX render. It's a full-column overlay:

```tsx
// frontend/src/app/pages/checkout/components/UnavailableOverlay.tsx
import { AlertCircle } from "lucide-react";
import { ERROR, BADGE_DEMAND_BG, BADGE_DEMAND_BORDER, DARK, MUTED, S } from "@/lib/design-tokens";

interface UnavailableOverlayProps {
  isUnavailable: boolean;
  isExpiredOfferSoldOut: boolean;
  expiredOfferReason: string | null;
}

export function UnavailableOverlay({ isUnavailable, isExpiredOfferSoldOut, expiredOfferReason }: UnavailableOverlayProps) {
  if (!isUnavailable && !isExpiredOfferSoldOut) return null;

  const title = isExpiredOfferSoldOut && expiredOfferReason === "buyer_no_purchase"
    ? "Tu tiempo para confirmar expiró"
    : "Esta entrada ya no está disponible";
  const subtitle = isExpiredOfferSoldOut && expiredOfferReason === "buyer_no_purchase"
    ? "La oferta fue aceptada pero no confirmaste el pago a tiempo. Podés buscar otras entradas disponibles."
    : "Alguien más compró esta entrada mientras la estabas revisando. Podés buscar otras entradas disponibles.";

  return (
    <div style={{
      background: BADGE_DEMAND_BG, border: `1px solid ${BADGE_DEMAND_BORDER}`,
      borderRadius: 12, padding: "16px 20px", textAlign: "center",
      ...S,
    }}>
      <AlertCircle size={22} style={{ color: ERROR, margin: "0 auto 8px" }} />
      <p style={{ fontSize: 14, fontWeight: 700, color: DARK, marginBottom: 4 }}>{title}</p>
      <p style={{ fontSize: 13, color: MUTED }}>{subtitle}</p>
    </div>
  );
}
```

**Note:** Find the exact text/copy for the overlay in `Checkout.tsx` by searching for `showUnavailable` in the JSX. Use whatever strings are already there rather than the placeholders above.

- [ ] **Step 3: Create VerificationGate.tsx**

Find in `Checkout.tsx` by searching for `cannotPurchaseDueToVerification` in the JSX. Shows warning with links for V1/V2/V3:

```tsx
// frontend/src/app/pages/checkout/components/VerificationGate.tsx
import { AlertCircle, Mail } from "lucide-react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { ERROR, BADGE_DEMAND_BG, BADGE_DEMAND_BORDER, DARK, V, S } from "@/lib/design-tokens";

interface VerificationGateProps {
  missingV1: boolean | undefined;
  missingV2: boolean | undefined;
  missingV3: boolean | undefined;
}

export function VerificationGate({ missingV1, missingV2, missingV3 }: VerificationGateProps) {
  const { t } = useTranslation();
  if (!missingV1 && !missingV2 && !missingV3) return null;

  // Copy the exact JSX from Checkout.tsx that renders the verification warning card.
  // Search for `cannotPurchaseDueToVerification` in the render section.
  // Replace references to missingV1/missingV2/missingV3 with the props above.
  // The component should return the warning card JSX directly.
  return (
    <div style={{
      background: BADGE_DEMAND_BG, border: `1px solid ${BADGE_DEMAND_BORDER}`,
      borderRadius: 12, padding: "14px 16px", marginBottom: 12,
      ...S,
    }}>
      <div style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
        <AlertCircle size={16} style={{ color: ERROR, flexShrink: 0, marginTop: 1 }} />
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 4 }}>
            {t("buyTicket.verificationRequired")}
          </p>
          {missingV1 && (
            <p style={{ fontSize: 12.5, marginBottom: 3 }}>
              <Mail size={11} style={{ display: "inline", marginRight: 4 }} />
              {t("buyTicket.verifyEmail")} —{" "}
              <Link to="/profile/verify-email" style={{ color: V, fontWeight: 600 }}>
                {t("buyTicket.verifyNow")}
              </Link>
            </p>
          )}
          {missingV2 && (
            <p style={{ fontSize: 12.5, marginBottom: 3 }}>
              {t("buyTicket.verifyPhone")} —{" "}
              <Link to="/profile/verify-phone" style={{ color: V, fontWeight: 600 }}>
                {t("buyTicket.verifyNow")}
              </Link>
            </p>
          )}
          {missingV3 && (
            <p style={{ fontSize: 12.5 }}>
              {t("buyTicket.verifyIdentity")} —{" "}
              <Link to="/profile/verify-identity" style={{ color: V, fontWeight: 600 }}>
                {t("buyTicket.verifyNow")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
```

**Note:** Copy the exact JSX from `Checkout.tsx` — search for `missingV1` or `buyTicket.verifyEmail` in the render section. Use whatever is already rendered there.

- [ ] **Step 4: Create TermsCheckbox.tsx**

Find in `Checkout.tsx` by searching for `showBuyTermsBlock` in the JSX. Shows the terms acceptance checkbox:

```tsx
// frontend/src/app/pages/checkout/components/TermsCheckbox.tsx
import { useTranslation } from "react-i18next";
import { ClientTnC } from "@/app/components/ClientTnC";
import { V, VLIGHT, VL_BORDER, DARK, BORDER, S } from "@/lib/design-tokens";

interface TermsCheckboxProps {
  needsTerms: boolean;
  accepted: boolean;
  onChange: (v: boolean) => void;
}

export function TermsCheckbox({ needsTerms, accepted, onChange }: TermsCheckboxProps) {
  const { t } = useTranslation();
  if (!needsTerms) return null;

  // Copy the exact JSX from Checkout.tsx that renders the terms block.
  // Search for `showBuyTermsBlock` in the render section.
  // Replace buyTermsAccepted → accepted, setBuyTermsAccepted(v) → onChange(v).
  return (
    <div style={{
      background: VLIGHT, border: `1px solid ${VL_BORDER}`,
      borderRadius: 12, padding: "14px 16px", marginBottom: 12,
      ...S,
    }}>
      <label style={{ display: "flex", alignItems: "flex-start", gap: 10, cursor: "pointer" }}>
        <div
          onClick={() => onChange(!accepted)}
          style={{
            width: 18, height: 18, borderRadius: 5, border: `2px solid ${accepted ? V : VL_BORDER}`,
            background: accepted ? V : "white",
            display: "flex", alignItems: "center", justifyContent: "center",
            flexShrink: 0, marginTop: 1, cursor: "pointer",
          }}
        >
          {accepted && <span style={{ color: "white", fontSize: 11, fontWeight: 900 }}>✓</span>}
        </div>
        <p style={{ fontSize: 12.5, color: DARK, lineHeight: 1.5 }}>
          {t("buyTicket.acceptTermsText")}{" "}
          <ClientTnC />
        </p>
      </label>
    </div>
  );
}
```

**Note:** Copy the exact JSX for the terms block from `Checkout.tsx` and replace state references with props.

- [ ] **Step 5: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 6: Commit**

```bash
git add frontend/src/app/pages/checkout/components/
git commit -m "refactor(checkout): extract OfferBanner, UnavailableOverlay, VerificationGate, TermsCheckbox components"
```

---

## Task 8: Extract `CheckoutSummary` and `MakeOfferPanel`

**Files:**
- Create: `frontend/src/app/pages/checkout/components/CheckoutSummary.tsx`
- Create: `frontend/src/app/pages/checkout/components/MakeOfferPanel.tsx`

- [ ] **Step 1: Create CheckoutSummary.tsx**

Find in `Checkout.tsx` by searching for `PriceLine` usage in the render — it's the order summary card. Extract it with typed props:

```tsx
// frontend/src/app/pages/checkout/components/CheckoutSummary.tsx
import { useTranslation } from "react-i18next";
import { PriceLine } from "./PriceLine";
import { formatCurrencyFromUnits } from "@/lib/format-currency";
import { V, DARK, MUTED, BORDER, CARD, SHADOW_CARD_SM, S } from "@/lib/design-tokens";

interface CheckoutSummaryProps {
  pricePerTicket: number;        // in units (e.g. 1500.00)
  selectedQuantity: number;
  subtotal: number;
  servicePrice: number;
  feeDiscount: number;
  grandTotal: number;
  hasDiscount: boolean;
  currency: string;
  summarySubLabel: string;
}

export function CheckoutSummary({
  pricePerTicket, selectedQuantity, subtotal, servicePrice,
  feeDiscount, grandTotal, hasDiscount, currency, summarySubLabel,
}: CheckoutSummaryProps) {
  const { t } = useTranslation();
  const fmtUnits = (v: number) => formatCurrencyFromUnits(v, currency);

  // Copy the order summary card JSX from Checkout.tsx.
  // Search for the card with the "Resumen del pedido" or "Order summary" label.
  // Replace all local variable references with the props above.
  // PriceLine is already extracted and can be imported.
  return (
    <div style={{
      background: CARD, border: `1px solid ${BORDER}`,
      borderRadius: 16, overflow: "hidden", boxShadow: SHADOW_CARD_SM,
    }}>
      {/* Copy the full order summary card JSX from Checkout.tsx here */}
    </div>
  );
}
```

**Note:** Find the "Resumen del pedido" / order summary card section in `Checkout.tsx`. It contains `<PriceLine>` usages for subtotal, service fee, discount, and grand total. Copy it entirely and replace local variable references with the props.

- [ ] **Step 2: Create MakeOfferPanel.tsx**

Find in `Checkout.tsx` by searching for `offerOpen` or `cta-offer-btn` in the JSX. This is the make-offer panel that appears below the BuyButton:

```tsx
// frontend/src/app/pages/checkout/components/MakeOfferPanel.tsx
import { Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { formatCurrencyFromUnits } from "@/lib/format-currency";
import type { Offer } from "@/api/types/offers";

interface MakeOfferPanelProps {
  offerOpen: boolean;
  setOfferOpen: (v: boolean) => void;
  offerPriceCents: number;
  setOfferPriceCents: (v: number) => void;
  onSubmit: () => Promise<void>;
  onCancel: () => Promise<void>;
  pendingOffer: Offer | null;
  isSubmitting: boolean;
  offerError: string | null;
  currency: string;
  listingPrice: number; // cents — shown as reference
  minimumPriceCents: number;
}

export function MakeOfferPanel(props: MakeOfferPanelProps) {
  const { t } = useTranslation();
  const {
    offerOpen, setOfferOpen, offerPriceCents, setOfferPriceCents,
    onSubmit, onCancel, pendingOffer, isSubmitting, offerError,
    currency, listingPrice, minimumPriceCents,
  } = props;

  // Copy the full offer panel JSX from Checkout.tsx.
  // Search for `offerOpen` or `cta-offer-btn` className in the render.
  // Replace all local state/handler references with props above.
  // setOfferError becomes internal to this component or passed as a prop.
  return null; // Replace with actual JSX
}
```

**Note:** The offer panel is one of the larger JSX sections. Find it in `Checkout.tsx` by locating the section that renders the `cta-offer-btn` button (the "Hacer una oferta" CTA) and the offer input form that appears below it. Extract everything from the outer `canMakeOffer && (...)` condition inward. The `offerError` display with "Intentar con otro monto" button can be kept inside this component — add an internal `resetError` button handler.

- [ ] **Step 3: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/pages/checkout/components/CheckoutSummary.tsx frontend/src/app/pages/checkout/components/MakeOfferPanel.tsx
git commit -m "refactor(checkout): extract CheckoutSummary and MakeOfferPanel components"
```

---

## Task 9: Write CheckoutPage.tsx (the orchestrator)

**Files:**
- Create: `frontend/src/app/pages/checkout/CheckoutPage.tsx`

This is the largest task. The orchestrator:
1. Reads URL params
2. Calls the 4 hooks
3. Computes derived values (`effectiveQty`, `canProceed`, `canBuy`, etc.)
4. Contains `handlePurchase`
5. Renders all extracted components + the sections that stayed inline (event card, seller card, payment method selector, seat picker)

- [ ] **Step 1: Create the file**

Start from the existing `Checkout.tsx`. The strategy is:
- Replace the top-level `useState`/`useEffect` blocks with the 4 hook calls
- Keep all JSX exactly as-is, just updating references to use hook return values
- Add `isUnavailable`, `isPurchasing`, `purchaseError` as local state
- Add the `handlePurchase` function (copy from `Checkout.tsx` lines 426–498, updating references)
- Add a `useEffect` to sync `acceptedOffer → selectedUnitIds` (this was in Checkout.tsx lines 334–350; in the split it must run in CheckoutPage since it calls `setSelectedUnitIds` from `useCheckoutData`)

```typescript
// frontend/src/app/pages/checkout/CheckoutPage.tsx
import React, { useState, useEffect } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
// ... (keep all existing imports from Checkout.tsx that are still needed)

// Hooks
import { useCheckoutData } from "./hooks/useCheckoutData";
import { useOfferState } from "./hooks/useOfferState";
import { useCheckoutRisk } from "./hooks/useCheckoutRisk";
import { useTermsGate } from "./hooks/useTermsGate";

// Components
import { OfferBanner } from "./components/OfferBanner";
import { UnavailableOverlay } from "./components/UnavailableOverlay";
import { VerificationGate } from "./components/VerificationGate";
import { TermsCheckbox } from "./components/TermsCheckbox";
import { CheckoutSummary } from "./components/CheckoutSummary";
import { MakeOfferPanel } from "./components/MakeOfferPanel";
import { BuyButton } from "./components/BuyButton";
import { TrustSignals } from "./components/TrustSignals";
import { Countdown } from "./components/Countdown";

// Helpers
import { isPricingSnapshotExpiredError, isListingUnavailableError } from "./helpers";

// ... other imports (termsService, transactionsService, design tokens, etc.)

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { eventSlug, listingId } = useParams<{ eventSlug: string; listingId: string }>();
  const [searchParams] = useSearchParams();
  const offerIdFromUrl = searchParams.get("offerId");
  const navigate = useNavigate();
  const { isAuthenticated, user } = useUser();

  // ── Hooks ──
  const data = useCheckoutData(listingId);

  const offer = useOfferState({
    offerIdFromUrl,
    listingId,
    listing: data.listing,
    isAuthenticated,
    isNumberedListing: data.isNumberedListing,
    selectedUnitIds: data.selectedUnitIds,
    availableUnits: data.availableUnits,
    quantity: data.quantity,
    eventSlug,
  });

  // Sync accepted offer → selection state (was lines 334–350 in Checkout.tsx)
  useEffect(() => {
    if (!offer.acceptedOffer || !data.listing) return;
    if (offer.acceptedOffer.tickets?.type === "unnumbered") {
      data.setQuantity(offer.acceptedOffer.tickets.count);
      data.setSelectedUnitIds([]);
    } else {
      const seats = offer.acceptedOffer.tickets?.seats ?? [];
      const ids = seats
        .map((seat) =>
          data.availableUnits.find(
            (u) => u.seat?.row === seat.row && u.seat?.seatNumber === seat.seatNumber
          )?.id
        )
        .filter((id): id is string => id != null);
      data.setSelectedUnitIds(ids);
    }
  }, [offer.acceptedOffer?.id, data.listing?.id]);

  // effectiveQty for risk check
  const effectiveQty = offer.isOfferFlow
    ? (offer.acceptedOffer?.tickets?.type === "numbered"
        ? (offer.acceptedOffer?.tickets?.seats?.length ?? 0)
        : (offer.acceptedOffer?.tickets?.count ?? 0))
    : (data.selectedUnitIds.length > 0 ? data.selectedUnitIds.length : data.quantity);

  const risk = useCheckoutRisk(
    listingId,
    isAuthenticated,
    !!data.listing,
    effectiveQty,
    data.selectedPaymentMethod?.id,
  );
  const terms = useTermsGate(isAuthenticated);

  // ── Effective checkout risk (local re-fetch takes precedence over initial) ──
  const effectiveCheckoutRisk = risk.localCheckoutRisk ?? data.initialCheckoutRisk;
  const missingV1 = effectiveCheckoutRisk?.missingV1 ?? (effectiveCheckoutRisk?.requireV1 && !user?.emailVerified);
  const missingV2 = effectiveCheckoutRisk?.missingV2 ?? (effectiveCheckoutRisk?.requireV2 && !user?.phoneVerified);
  const missingV3 = effectiveCheckoutRisk?.missingV3 ?? (effectiveCheckoutRisk?.requireV3 && !user?.identityVerified);
  const cannotPurchaseDueToVerification = isAuthenticated && (missingV1 || missingV2 || missingV3);

  // ── Local page state ──
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);

  // ── Derived ──
  const canProceed =
    data.listing?.sellTogether ||
    (data.isNumberedListing ? data.selectedUnitIds.length > 0 : data.quantity > 0);

  const canMakeOffer =
    (data.listing?.bestOfferConfig?.enabled ?? false) &&
    !offer.acceptedOffer &&
    canProceed &&
    !data.isOwnListing;

  const isExpiredOfferSoldOut =
    !!offer.expiredOffer &&
    (data.availableCount ?? 0) === 0 &&
    !offer.acceptedOffer &&
    !offer.pendingOffer;

  const showUnavailable = isUnavailable || isExpiredOfferSoldOut;

  const canBuy =
    canProceed &&
    !data.isOwnListing &&
    !cannotPurchaseDueToVerification &&
    !offer.isOfferExpired &&
    !(terms.needsTerms && !terms.termsAccepted) &&
    !(terms.needsTerms && terms.termsVersion === null) &&
    (offer.isOfferFlow ? true : !!data.pricingSnapshot);

  // Keep the rest of the derived values from Checkout.tsx (selectedQuantity, pricePerTicket,
  // listingCurrency, subtotal, servicePrice, feeDiscount, grandTotal, etc.) — copy lines 173–219.

  // ── handlePurchase — copy from Checkout.tsx lines 426–498 ──
  const handlePurchase = async () => {
    // ... copy verbatim, replacing:
    //   setTermsStatus(updated) → terms.setTermsStatus(updated)
    //   setBuyTermsAccepted(false) → terms.setTermsAccepted(false)
    //   setBuyTermsVersionId(null) — this is internal to useTermsGate; set via terms.setTermsStatus refresh
    //   showBuyTermsBlock → terms.needsTerms
    //   buyTermsAccepted → terms.termsAccepted
    //   buyTermsVersionId → terms.termsVersion
    //   pricingSnapshot → data.pricingSnapshot
    //   acceptedOffer → offer.acceptedOffer
    //   selectedPaymentMethod → data.selectedPaymentMethod
    //   availableUnits → data.availableUnits
    //   isNumberedListing → data.isNumberedListing
    //   selectedUnitIds → data.selectedUnitIds
    //   quantity → data.quantity
    // On isPricingSnapshotExpiredError: call data.refresh() + risk.reset()
    // instead of the old refreshBuyPageData() which also cleared localCheckoutRisk.
  };

  // ── toggleSeatSelection ──
  const toggleSeatSelection = (unitId: string) => {
    if (data.listing?.sellTogether || offer.acceptedOffer) return;
    data.setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  // ── Render ──
  // Copy all JSX from Checkout.tsx lines 558–1694 verbatim, updating:
  // - Local state references → hook return values (as mapped above)
  // - Replace inline Countdown/BuyButton/TrustSignals/PriceLine with imported components
  // - Add <OfferBanner>, <UnavailableOverlay>, <VerificationGate>, <TermsCheckbox>, <MakeOfferPanel>
  //   in their correct positions (replacing the inline JSX blocks)
  // - showUnavailable → computed above
  // - primaryBtnDisabled → !canBuy || isPurchasing
}
```

**Critical implementation note for `handlePurchase`:**

1. **Pricing snapshot expired:** When `isPricingSnapshotExpiredError` is caught, call BOTH `await data.refresh()` AND `risk.reset()`. The original code's `refreshBuyPageData()` also cleared `localCheckoutRisk`. In the split, these are two separate operations.

2. **Terms state after acceptance:** After `termsService.acceptTerms()` + `await termsService.getTermsStatus()`, write this exact sequence:
   ```typescript
   const updated = await termsService.getTermsStatus();
   terms.setTermsStatus(updated);      // triggers useTermsGate's needsTerms re-evaluation
   terms.setTermsAccepted(false);      // reset checkbox for next time
   // termsVersion resets automatically when needsTerms becomes false
   ```

3. **OfferBanner render:** Pass `secondsLeft` from the hook:
   ```tsx
   <OfferBanner offer={offer.acceptedOffer} isOfferFlow={offer.isOfferFlow} secondsLeft={offer.offerSecondsLeft} />
   ```
   Do NOT pass `targetDate` — the hook owns the timer.

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd frontend && npx tsc --noEmit 2>&1 | head -50
```
Fix any type errors before proceeding.

- [ ] **Step 3: Commit**

```bash
git add frontend/src/app/pages/checkout/CheckoutPage.tsx
git commit -m "refactor(checkout): write CheckoutPage orchestrator using extracted hooks and components"
```

---

## Task 10: Update App.tsx + delete Checkout.tsx + final verification

**Files:**
- Modify: `frontend/src/app/App.tsx` (line 17)
- Delete: `frontend/src/app/pages/Checkout.tsx`

- [ ] **Step 1: Update App.tsx import**

Change line 17:
```typescript
// Before:
import Checkout from '@/app/pages/Checkout';

// After:
import Checkout from '@/app/pages/checkout/CheckoutPage';
```

- [ ] **Step 2: Delete the old file**

```bash
rm frontend/src/app/pages/Checkout.tsx
```

- [ ] **Step 3: Full TypeScript check**

```bash
cd frontend && npx tsc --noEmit 2>&1
```
Expected: no errors. Fix any remaining type errors.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/app/App.tsx
git add -u frontend/src/app/pages/Checkout.tsx
git commit -m "refactor(checkout): switch router to CheckoutPage, delete old Checkout.tsx"
```

---

## Summary

After all 10 tasks complete:

| Before | After |
|--------|-------|
| 1 file, 1771 lines | 15 files, ~150 lines average |
| 19 useState at top level | 4 focused hooks |
| 4 inline sub-components | 9 exported components |
| No TypeScript errors | No TypeScript errors |
| Identical runtime behavior | Identical runtime behavior |
