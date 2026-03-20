import { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  MapPin, Calendar, Shield, Lock, CheckCircle, AlertCircle,
  Minus, Plus, Check, CreditCard, Loader2, Mail,
  RotateCcw, Clock, X,
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ticketsService } from "@/api/services/tickets.service";
import { transactionsService } from "@/api/services/transactions.service";
import { termsService } from "@/api/services/terms.service";
import { offersService } from "@/api/services/offers.service";
import { TermsUserType, AcceptanceMethod } from "@/api/types/terms";
import { formatMonthYear } from "@/lib/format-date";
import { getInitials } from "@/lib/string-utils";
import { formatCurrencyFromUnits } from "@/lib/format-currency";
import { useUser } from "@/app/contexts/UserContext";
import {
  V, VLIGHT, V_HOVER, VL_BORDER,
  DARK, MUTED, HINT, BG, CARD, SURFACE, BORDER, BORD2,
  GREEN, GLIGHT, GBORD,
  AMBER, ABG, ABORD, AMBER_BG_LIGHT, AMBER_TEXT_DARK,
  ERROR, ERROR_DARK, BADGE_DEMAND_BG, BADGE_DEMAND_BORDER,
  S, E, V_FOCUS_RING,
  SHADOW_CARD, SHADOW_CARD_SM,
  WARN_SOLID,
  GRAY_BG, GRAY_BORDER, GRAY_TEXT,
} from "@/lib/design-tokens";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";
import { ErrorMessage, ErrorAlert } from "@/app/components/ErrorMessage";
import { ClientTnC } from "@/app/components/ClientTnC";
import { PageMeta } from "@/app/components/PageMeta";
import { BackButton } from "@/app/components/BackButton";
import { UserAvatar } from "@/app/components/UserAvatar";
import { SeatingType, TicketUnitStatus } from "@/api/types";
import type {
  BuyPageData,
  BuyPagePaymentMethodOption,
  CheckoutRisk,
  GetTermsStatusResponse,
} from "@/api/types";
import type { Offer } from "@/api/types/offers";

// ─── helpers ─────────────────────────────────────────────────────────────────

function isPricingSnapshotExpiredError(err: any): boolean {
  const code = err?.code;
  const message = err?.message;
  return (
    (code && String(code).startsWith("PRICING_SNAPSHOT_")) ||
    (code === "BAD_REQUEST" && typeof message === "string" && message.includes("Pricing snapshot has expired"))
  );
}

function isListingUnavailableError(err: any): boolean {
  const code = String(err?.code ?? "");
  const msg = (err?.message ?? "").toLowerCase();
  return (
    ["LISTING_NOT_AVAILABLE", "TICKET_NOT_AVAILABLE", "UNITS_UNAVAILABLE", "SOLD_OUT"].includes(code) ||
    msg.includes("not available") || msg.includes("sold out") || msg.includes("no longer available")
  );
}

// Infer expiry reason from offer data if backend doesn't supply it directly
function getExpiredReason(offer: Offer | null): string | null {
  if (!offer) return null;
  if (offer.expiredReason) return offer.expiredReason;
  // If the offer was ever accepted but buyer didn't confirm → buyer_no_purchase
  return offer.acceptedAt ? "buyer_no_purchase" : "seller_no_response";
}

// ─── Countdown ───────────────────────────────────────────────────────────────

interface CountdownProps {
  targetDate: string;
  onSecondsChange?: (secs: number) => void;
}

function Countdown({ targetDate, onSecondsChange }: CountdownProps) {
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
  }, [targetDate]);
  return <span>{display}</span>;
}

// ─── Checkout ────────────────────────────────────────────────────────────────

export default function Checkout() {
  const { t } = useTranslation();
  const { eventSlug, listingId } = useParams<{ eventSlug: string; listingId: string }>();
  const [searchParams] = useSearchParams();
  const offerIdFromUrl = searchParams.get("offerId");
  const navigate = useNavigate();
  const { isAuthenticated, user } = useUser();

  // ── data ──
  const [buyPageData, setBuyPageData] = useState<BuyPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // ── selection ──
  const [quantity, setQuantity] = useState(1);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<BuyPagePaymentMethodOption | null>(null);

  // ── offer ──
  const [acceptedOffer, setAcceptedOffer] = useState<Offer | null>(null);
  const [acceptedOfferSecsLeft, setAcceptedOfferSecsLeft] = useState(Infinity);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [expiredOffer, setExpiredOffer] = useState<Offer | null>(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPriceCents, setOfferPriceCents] = useState(0);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  // ── purchase ──
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);
  const [localCheckoutRisk, setLocalCheckoutRisk] = useState<CheckoutRisk | null>(null);

  // ── terms ──
  const [termsStatus, setTermsStatus] = useState<GetTermsStatusResponse | null>(null);
  const [termsStatusLoading, setTermsStatusLoading] = useState(false);
  const [buyTermsVersionId, setBuyTermsVersionId] = useState<string | null>(null);
  const [buyTermsLoading, setBuyTermsLoading] = useState(false);
  const [buyTermsAccepted, setBuyTermsAccepted] = useState(false);

  // ── derived ──
  const listing = buyPageData?.listing ?? null;
  const seller = buyPageData?.seller ?? null;
  const paymentMethods = buyPageData?.paymentMethods ?? [];
  const pricingSnapshot = buyPageData?.pricingSnapshot ?? null;
  const effectiveCheckoutRisk = localCheckoutRisk ?? buyPageData?.checkoutRisk;

  const missingV1 = effectiveCheckoutRisk?.missingV1 ?? (effectiveCheckoutRisk?.requireV1 && !user?.emailVerified);
  const missingV2 = effectiveCheckoutRisk?.missingV2 ?? (effectiveCheckoutRisk?.requireV2 && !user?.phoneVerified);
  const missingV3 = effectiveCheckoutRisk?.missingV3 ?? (effectiveCheckoutRisk?.requireV3 && !user?.identityVerified);
  const cannotPurchaseDueToVerification = isAuthenticated && (missingV1 || missingV2 || missingV3);
  const buyButtonBlockedByIdentity = isAuthenticated && (missingV2 || missingV3);

  const showBuyTermsBlock =
    isAuthenticated && termsStatus?.buyer != null && !termsStatus.buyer.isCompliant;

  const availableUnits =
    listing?.ticketUnits?.filter((u) => u.status === TicketUnitStatus.Available) ?? [];
  const availableIdsStr = availableUnits.map((u) => u.id).join(",");
  const numberedUnits = availableUnits.filter((u) => u.seat);
  const isNumberedListing = listing?.seatingType === SeatingType.Numbered;
  const availableCount = availableUnits.length;
  const isOwnListing = user?.id === listing?.sellerId;
  const isVerifiedSeller = seller?.badges?.some((b) => String(b).toLowerCase().includes("verif")) ?? false;
  const isNewSeller = (seller?.totalSales ?? 0) === 0;

  const selectedQuantity = acceptedOffer
    ? acceptedOffer.tickets?.type === "numbered"
      ? (acceptedOffer.tickets?.seats?.length ?? 0)
      : (acceptedOffer.tickets?.count ?? 0)
    : listing?.sellTogether
      ? availableCount
      : isNumberedListing
        ? selectedUnitIds.length
        : quantity;

  const listingCurrency = listing?.pricePerTicket?.currency ?? "ARS";
  const listingPricePerTicketUnits = (listing?.pricePerTicket?.amount ?? 0) / 100;
  const pricePerTicket =
    (acceptedOffer
      ? (acceptedOffer.offeredPrice?.amount ?? listing?.pricePerTicket?.amount ?? 0)
      : (listing?.pricePerTicket?.amount ?? 0)) / 100;

  // Spec §6-7: always show maxFee as reference; discount line when selected < max
  const maxFeePercent =
    paymentMethods.length > 0
      ? Math.max(...paymentMethods.map((m) => m.serviceFeePercent ?? 0))
      : (selectedPaymentMethod?.serviceFeePercent ?? 0);
  const selectedFeePercent = selectedPaymentMethod?.serviceFeePercent ?? maxFeePercent;
  const subtotal = pricePerTicket * selectedQuantity;
  const servicePrice = subtotal * (maxFeePercent / 100);
  const feeDiscount = subtotal * ((maxFeePercent - selectedFeePercent) / 100);
  const grandTotal = subtotal + servicePrice - feeDiscount;
  const hasDiscount = feeDiscount > 0;

  const canProceed =
    listing?.sellTogether ||
    (isNumberedListing ? selectedUnitIds.length > 0 : quantity > 0);
  const canBuy =
    canProceed &&
    (acceptedOffer ? true : !!pricingSnapshot) &&
    !isOwnListing &&
    !cannotPurchaseDueToVerification &&
    (!showBuyTermsBlock || buyTermsAccepted);

  const offerEnabled = listing?.bestOfferConfig?.enabled ?? false;
  // Offer CTA shows when: offers on, no active/accepted offer, listing is purchaseable
  const canMakeOffer = offerEnabled && !acceptedOffer && canProceed && !isOwnListing;

  // Savings note for accepted-offer summary
  const offerTicketSavings = acceptedOffer
    ? (listingPricePerTicketUnits - pricePerTicket) * selectedQuantity
    : 0;
  const totalSavings = offerTicketSavings + feeDiscount;

  const offerExpiredReason = getExpiredReason(expiredOffer);
  // Show "entry unavailable" overlay: race-condition detection OR expired+sold
  const showUnavailable =
    isUnavailable || (!!expiredOffer && availableCount === 0 && !acceptedOffer && !pendingOffer);

  const sortedNumberedUnits = [...numberedUnits].sort((a, b) => {
    const rowCmp = (a.seat?.row ?? "").localeCompare(b.seat?.row ?? "");
    if (rowCmp !== 0) return rowCmp;
    return (a.seat?.seatNumber ?? "").localeCompare(b.seat?.seatNumber ?? "", undefined, { numeric: true });
  });

  // Sub-label in summary shows seat codes (numbered) or "price × qty" (unnumbered)
  const summarySubLabel = (() => {
    if (acceptedOffer) {
      if (acceptedOffer.tickets?.type === "numbered") {
        return (
          acceptedOffer.tickets.seats?.map((s) => `${s.row}-${s.seatNumber}`).join(", ") ||
          `${formatCurrencyFromUnits(pricePerTicket, listingCurrency)} × ${selectedQuantity}`
        );
      }
      return `${formatCurrencyFromUnits(pricePerTicket, listingCurrency)} × ${selectedQuantity}`;
    }
    if (isNumberedListing && selectedUnitIds.length > 0) {
      return sortedNumberedUnits
        .filter((u) => selectedUnitIds.includes(u.id))
        .map((u) => (u.seat ? `${u.seat.row}-${u.seat.seatNumber}` : u.id))
        .join(", ");
    }
    return `${formatCurrencyFromUnits(pricePerTicket, listingCurrency)} × ${selectedQuantity}`;
  })();

  // ── effects ──

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      setIsUnavailable(false);
      try {
        const data = await ticketsService.getBuyPage(listingId);
        if (!cancelled) {
          setBuyPageData(data);
          setLocalCheckoutRisk(null);
          const firstAvailable = data.paymentMethods?.find((m) => m.available !== false);
          if (firstAvailable) setSelectedPaymentMethod(firstAvailable);
        }
      } catch (err) {
        if (!cancelled) setError(t("buyTicket.errorLoading"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId, t]);

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
  }, [listing?.id, listing?.sellTogether, isNumberedListing, availableCount, availableIdsStr]);

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
  }, [offerIdFromUrl, listingId, isAuthenticated, listing?.id]);

  useEffect(() => {
    if (!acceptedOffer || !listing) return;
    if (acceptedOffer.tickets?.type === "unnumbered") {
      setQuantity(acceptedOffer.tickets.count);
      setSelectedUnitIds([]);
    } else {
      const seats = acceptedOffer.tickets?.seats ?? [];
      const ids = seats
        .map((seat) =>
          availableUnits.find(
            (u) => u.seat?.row === seat.row && u.seat?.seatNumber === seat.seatNumber
          )?.id
        )
        .filter((id): id is string => id != null);
      setSelectedUnitIds(ids);
    }
  }, [acceptedOffer?.id, listing?.id]);

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

  useEffect(() => {
    if (!showBuyTermsBlock) { setBuyTermsVersionId(null); setBuyTermsLoading(false); return; }
    let cancelled = false;
    setBuyTermsLoading(true);
    termsService
      .getCurrentTerms(TermsUserType.Buyer)
      .then((terms) => { if (!cancelled) setBuyTermsVersionId(terms.id); })
      .catch(() => { if (!cancelled) setBuyTermsVersionId(null); })
      .finally(() => { if (!cancelled) setBuyTermsLoading(false); });
    return () => { cancelled = true; };
  }, [showBuyTermsBlock]);

  const riskQuantity = acceptedOffer
    ? acceptedOffer.tickets?.type === "numbered"
      ? (acceptedOffer.tickets?.seats?.length ?? 0)
      : (acceptedOffer.tickets?.count ?? 0)
    : listing?.sellTogether
      ? availableCount
      : isNumberedListing
        ? selectedUnitIds.length
        : quantity;

  useEffect(() => {
    if (!listingId || !isAuthenticated || !listing || !selectedPaymentMethod?.id || riskQuantity < 1) return;
    let cancelled = false;
    (async () => {
      try {
        const data = await ticketsService.getCheckoutRisk(listingId, riskQuantity, selectedPaymentMethod.id);
        if (!cancelled) setLocalCheckoutRisk(data.checkoutRisk);
      } catch {
        if (!cancelled) setLocalCheckoutRisk(null);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId, isAuthenticated, listing?.id, selectedPaymentMethod?.id, riskQuantity]);

  // ── handlers ──

  const toggleSeatSelection = (unitId: string) => {
    if (listing?.sellTogether || acceptedOffer) return;
    setSelectedUnitIds((prev) =>
      prev.includes(unitId) ? prev.filter((id) => id !== unitId) : [...prev, unitId]
    );
  };

  const refreshBuyPageData = async () => {
    if (!listingId) return;
    setIsLoading(true);
    setError(null);
    setLocalCheckoutRisk(null);
    try {
      const data = await ticketsService.getBuyPage(listingId);
      setBuyPageData(data);
      const firstAvailable = data.paymentMethods?.find((m) => m.available !== false);
      if (firstAvailable) setSelectedPaymentMethod(firstAvailable);
    } catch {
      setError(t("buyTicket.errorLoading"));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePurchase = async () => {
    if (!listing || !listingId) return;
    const useOffer = !!acceptedOffer;
    if (!useOffer && !pricingSnapshot) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/buy/${eventSlug}/${listingId}` } });
      return;
    }
    if (missingV2 || missingV3) {
      setPurchaseError(t("buyTicket.identityRequiredToPurchase"));
      return;
    }
    if (showBuyTermsBlock && (!buyTermsAccepted || !buyTermsVersionId)) {
      setPurchaseError(t("buyTicket.acceptTermsRequired"));
      return;
    }
    setIsPurchasing(true);
    setPurchaseError(null);
    try {
      if (showBuyTermsBlock && buyTermsVersionId) {
        await termsService.acceptTerms(buyTermsVersionId, AcceptanceMethod.Checkbox);
        const updated = await termsService.getTermsStatus();
        setTermsStatus(updated);
        setBuyTermsAccepted(false);
        setBuyTermsVersionId(null);
      }
      if (useOffer) {
        const response = await transactionsService.initiatePurchase({
          listingId,
          paymentMethodId: selectedPaymentMethod?.id ?? "payway",
          offerId: acceptedOffer!.id,
        });
        navigate(`/transaction/${response.transaction.id}`, { state: { from: "/my-tickets" } });
        return;
      }
      const unitsToPurchase = listing.sellTogether
        ? availableUnits.map((u) => u.id)
        : isNumberedListing
          ? selectedUnitIds
          : availableUnits.slice(0, quantity).map((u) => u.id);
      if (!unitsToPurchase.length) {
        setPurchaseError(t("buyTicket.selectAtLeastOneSeat"));
        setIsPurchasing(false);
        return;
      }
      const response = await transactionsService.initiatePurchase({
        listingId,
        ticketUnitIds: unitsToPurchase,
        paymentMethodId: selectedPaymentMethod?.id ?? "payway",
        pricingSnapshotId: pricingSnapshot!.id,
      });
      navigate(`/transaction/${response.transaction.id}`, { state: { from: "/my-tickets" } });
    } catch (err: any) {
      if (isPricingSnapshotExpiredError(err)) {
        setPurchaseError(t("buyTicket.pricesChanged"));
        await refreshBuyPageData();
      } else if (isListingUnavailableError(err)) {
        // Race condition: entry sold while user was in checkout (spec §16)
        setIsUnavailable(true);
      } else {
        const message = err?.message ?? String(err);
        const isTermsRequired =
          typeof message === "string" &&
          (message.toLowerCase().includes("terms") || message.toLowerCase().includes("conditions"));
        setPurchaseError(
          isTermsRequired
            ? t("buyTicket.acceptTermsRequired")
            : message || t("buyTicket.purchaseFailed")
        );
      }
    } finally {
      setIsPurchasing(false);
    }
  };

  const handleSubmitOffer = async () => {
    if (!listingId || !listing?.bestOfferConfig?.enabled || !user) return;
    if (!isAuthenticated) {
      navigate("/login", { state: { from: `/buy/${eventSlug}/${listingId}` } });
      return;
    }
    const minCents = listing.bestOfferConfig?.minimumPrice?.amount ?? 0;
    if (offerPriceCents < minCents) {
      // Spec: don't reveal minimum amount — just tell user it's below minimum
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
    } catch (err: any) {
      setOfferError(err?.message ?? t("buyTicket.offerSubmitFailed"));
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  const handleCancelOffer = async () => {
    if (!pendingOffer) return;
    try {
      // Use optional chaining — method name may vary by API implementation
      await ((offersService as any).cancel ?? (offersService as any).cancelOffer ?? (() => Promise.resolve()))(pendingOffer.id);
    } catch {
      // Optimistically update regardless
    }
    setPendingOffer(null);
    setOfferPriceCents(0);
  };

  // ── render guards ──

  if (isLoading) {
    return (
      <>
        <PageMeta title={t("seo.defaultTitle")} description={t("seo.defaultDescription")} />
        <style>{`
          @keyframes coSkShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .co-sk { background: linear-gradient(90deg, #ece9e6 25%, #f5f4f1 50%, #ece9e6 75%); background-size: 200% 100%; animation: coSkShimmer 1.4s ease-in-out infinite; border-radius: 6px; }
          .co-sk-layout { display: grid; grid-template-columns: 1fr 390px; column-gap: 24px; row-gap: 16px; max-width: 1020px; margin: 0 auto; padding: 0 20px 48px; }
          @media (max-width: 860px) { .co-sk-layout { grid-template-columns: 1fr; } }
        `}</style>
        {/* Back button placeholder */}
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "24px 20px 20px" }}>
          <div className="co-sk" style={{ height: 16, width: 110, borderRadius: 6 }} />
        </div>
        <div className="co-sk-layout">
          {/* ── Left column ── */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Event card */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW_CARD_SM }}>
              {/* Dark banner */}
              <div className="co-sk" style={{ height: 82, borderRadius: 0, background: "#d4d1ce" }} />
              <div style={{ padding: "18px 20px", display: "flex", flexDirection: "column", gap: 12 }}>
                <div className="co-sk" style={{ height: 13, width: "55%" }} />
                <div style={{ display: "flex", gap: 10, marginTop: 4 }}>
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="co-sk" style={{ flex: 1, height: 52, borderRadius: 10 }} />
                  ))}
                </div>
                <div className="co-sk" style={{ height: 13, width: "40%", marginTop: 4 }} />
              </div>
            </div>
            {/* Seller card */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW_CARD_SM, padding: "16px 20px" }}>
              <div className="co-sk" style={{ height: 12, width: 80, marginBottom: 14 }} />
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <div className="co-sk" style={{ width: 40, height: 40, borderRadius: "50%", flexShrink: 0 }} />
                <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                  <div className="co-sk" style={{ height: 13, width: "50%" }} />
                  <div className="co-sk" style={{ height: 11, width: "35%" }} />
                </div>
              </div>
            </div>
            {/* Order summary card */}
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW_CARD_SM, padding: "16px 20px" }}>
              <div className="co-sk" style={{ height: 12, width: 100, marginBottom: 16 }} />
              {[70, 55, 65].map((w, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                  <div className="co-sk" style={{ height: 12, width: `${w}%` }} />
                  <div className="co-sk" style={{ height: 12, width: "18%" }} />
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${BORDER}`, marginTop: 4, paddingTop: 14, display: "flex", justifyContent: "space-between" }}>
                <div className="co-sk" style={{ height: 16, width: "30%" }} />
                <div className="co-sk" style={{ height: 16, width: "22%" }} />
              </div>
            </div>
          </div>
          {/* ── Right column — payment form ── */}
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW_CARD_SM, padding: "20px 20px 24px" }}>
            <div className="co-sk" style={{ height: 14, width: "55%", marginBottom: 20 }} />
            {[1, 2, 3].map((n) => (
              <div key={n} style={{ marginBottom: 14 }}>
                <div className="co-sk" style={{ height: 11, width: "30%", marginBottom: 7 }} />
                <div className="co-sk" style={{ height: 42, width: "100%", borderRadius: 10 }} />
              </div>
            ))}
            <div className="co-sk" style={{ height: 50, width: "100%", borderRadius: 10, marginTop: 24 }} />
          </div>
        </div>
      </>
    );
  }

  if (error || !listing) {
    return (
      <>
        <PageMeta title={t("seo.defaultTitle")} description={t("seo.defaultDescription")} />
        <ErrorMessage
          title={error || t("buyTicket.ticketNotFound")}
          message={t("buyTicket.errorLoading")}
          fullScreen
        />
      </>
    );
  }

  // ── display values ──

  const eventDateFormatted = listing.eventDate ? (() => {
    const d = new Date(listing.eventDate);
    const date = d.toLocaleDateString("es-AR", { day: "numeric", month: "long", year: "numeric" });
    const time = d.toLocaleTimeString("es-AR", { hour: "2-digit", minute: "2-digit", hour12: false });
    return `${date} - ${time}`;
  })() : "";
  const seoDate = listing.eventDate ? new Date(listing.eventDate).toLocaleDateString("es-AR") : "";
  const seoPrice = formatCurrencyFromUnits((listing.pricePerTicket?.amount ?? 0) / 100, listingCurrency);
  const seoSectionName = listing.sectionName || "General";
  const sectorName = listing.sectionName || (listing.type === "Physical" ? "Physical Ticket" : "Digital Ticket");
  const seoCityPart = listing.city ? `, ${listing.city}` : "";

  // Primary CTA state
  const primaryBtnDisabled =
    isPurchasing ||
    isOwnListing ||
    cannotPurchaseDueToVerification ||
    (showBuyTermsBlock && !buyTermsAccepted) ||
    (!acceptedOffer && (availableCount === 0 || selectedQuantity === 0 || !pricingSnapshot));

  const primaryBtnLabel = acceptedOffer
    ? "Confirmar pago"
    : !canProceed
      ? isNumberedListing ? t("buyTicket.selectSeats") : t("buyTicket.quantity")
      : buyButtonBlockedByIdentity
        ? t("buyTicket.identityRequiredToPurchase")
        : showBuyTermsBlock && !buyTermsAccepted
          ? t("buyTicket.acceptTermsRequired")
          : pendingOffer
            ? "Comprar directo"
            : "Comprar con garantía";

  const primaryBtnVariant: "primary" | "warn" | "disabled" = canBuy ? "primary" : !canProceed || isOwnListing ? "disabled" : "warn";

  const formattedTotal =
    selectedQuantity > 0 && grandTotal > 0
      ? formatCurrencyFromUnits(grandTotal, listingCurrency)
      : null;

  // Reusable style fragments
  const card: React.CSSProperties = {
    background: CARD,
    border: `1px solid ${BORDER}`,
    borderRadius: 16,
    overflow: "hidden",
    boxShadow: SHADOW_CARD_SM,
  };
  const lbl: React.CSSProperties = {
    fontSize: 10.5,
    fontWeight: 700,
    color: MUTED,
    textTransform: "uppercase",
    letterSpacing: "0.06em",
    marginBottom: 10,
  };
  const hr: React.CSSProperties = { border: "none", borderTop: `1px solid ${BORDER}`, margin: "14px 0" };

  return (
    <div style={{ ...S, background: BG, color: DARK, minHeight: "100dvh" }}>
      <PageMeta
        title={t("seo.buyTicket.title", { eventName: listing.eventName })}
        description={t("seo.buyTicket.description", {
          eventName: listing.eventName,
          sectionName: seoSectionName,
          price: seoPrice,
          date: seoDate,
          venue: listing.venue ?? "",
          cityPart: seoCityPart,
        })}
        image={listing.bannerUrls?.rectangle ?? listing.bannerUrls?.square}
      />

      <style>{`
        .co-layout {
          display: grid;
          grid-template-columns: 1fr 390px;
          column-gap: 24px;
          row-gap: 16px;
          max-width: 1020px;
          margin: 0 auto;
          padding: 0 20px 36px;
        }
        @media (max-width: 860px) {
          .co-layout { grid-template-columns: 1fr; padding-bottom: 90px; }
          .co-sticky { position: static !important; }
        }
        .co-sticky { position: sticky; top: 24px; align-self: start; }

        /* Seat pills (numbered tickets) */
        .seat-btn {
          padding: 7px 13px; border-radius: 8px; border: 1.5px solid ${BORD2};
          background: ${CARD}; color: ${DARK}; font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: all 0.12s; font-family: 'Plus Jakarta Sans', sans-serif;
          white-space: nowrap;
        }
        .seat-btn:hover:not(.selected):not(:disabled) { border-color: ${V}; color: ${V}; background: ${VLIGHT}; }
        .seat-btn.selected { background: ${V}; border-color: ${V}; color: white; }
        .seat-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        /* Quantity +/- */
        .qty-btn {
          width: 34px; height: 34px; border-radius: 9px; border: 1.5px solid ${BORD2};
          background: ${CARD}; color: ${DARK}; display: flex; align-items: center;
          justify-content: center; cursor: pointer; transition: all 0.14s; flex-shrink: 0;
        }
        .qty-btn:hover:not(:disabled) { border-color: ${V}; color: ${V}; }
        .qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        /* Payment method radio rows */
        .pay-option {
          width: 100%; text-align: left; padding: 11px 13px; border-radius: 10px;
          border: 1.5px solid ${BORD2}; background: ${CARD}; cursor: pointer;
          display: flex; align-items: flex-start; gap: 10px; transition: all 0.14s;
          margin-bottom: 8px; font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .pay-option:last-child { margin-bottom: 0; }
        .pay-option.selected { border-color: ${V}; background: ${VLIGHT}; }
        .pay-option:hover:not(.selected) { border-color: ${HINT}; }

        /* Offer amount input */
        .offer-input {
          flex: 1; padding: 9px 12px; border: 1.5px solid ${BORD2}; border-radius: 8px;
          font-size: 13.5px; color: ${DARK}; background: ${BG};
          font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: border-color 0.15s;
        }
        .offer-input:focus { border-color: ${V}; box-shadow: ${V_FOCUS_RING}; }
        .offer-input.error { border-color: ${ERROR}; }

        /* Offer secondary CTA */
        .cta-offer-btn {
          width: 100%; padding: 11px 14px; border-radius: 10px; border: 1.5px solid ${VL_BORDER};
          background: transparent; color: ${V}; font-size: 13.5px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 7px; margin-top: 8px; transition: all 0.14s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .cta-offer-btn:hover { background: ${VLIGHT}; border-color: ${V}; }

        /* Offer panel (expanded) */
        .offer-panel {
          border: 1.5px solid ${VL_BORDER}; border-radius: 12px;
          padding: 14px 16px; background: rgba(109,40,217,0.025); margin-top: 10px;
        }

        /* Pending offer box */
        .pending-box { border: 1px solid ${BORDER}; border-radius: 12px; padding: 14px; margin-top: 10px; }

        /* Pending box action buttons */
        .ghost-btn {
          flex: 1; padding: 9px; background: transparent; color: ${MUTED};
          border: 1px solid ${BORD2}; border-radius: 8px; font-size: 12.5px; font-weight: 600;
          cursor: pointer; font-family: 'Plus Jakarta Sans', sans-serif; transition: all 0.12s;
        }
        .ghost-btn:hover { border-color: ${DARK}; color: ${DARK}; }
        .solid-sm-btn {
          flex: 1; padding: 9px; background: ${V}; color: white; border: none;
          border-radius: 8px; font-size: 12.5px; font-weight: 600; cursor: pointer;
          font-family: 'Plus Jakarta Sans', sans-serif; transition: background 0.14s;
        }
        .solid-sm-btn:hover { background: ${V_HOVER}; }
        .solid-sm-btn:disabled { opacity: 0.45; cursor: not-allowed; }

        /* Mobile sticky bar */
        .mobile-cta-bar { display: none; }
        @media (max-width: 860px) {
          .mobile-cta-bar {
            display: block; position: fixed; bottom: 0; left: 0; right: 0;
            padding: 10px 16px 20px; background: rgba(255,255,255,0.97);
            border-top: 1px solid ${BORDER}; z-index: 100;
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          }
        }

        /* Skeleton animation */
        @keyframes coShimmer { 0%,100% { opacity: 0.45; } 50% { opacity: 0.9; } }
        .co-skel { background: ${BORDER}; border-radius: 4px; animation: coShimmer 1.4s ease-in-out infinite; }

        /* Pending offer pulsing dot */
        @keyframes coPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .pulse-dot { animation: coPulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Back button row */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "24px 20px 20px" }}>
        <BackButton
          to={isOwnListing ? "/seller-dashboard" : `/event/${eventSlug}`}
          labelKey={isOwnListing ? "buyTicket.backToMyListings" : "buyTicket.backToEvent"}
          embedded
        />
      </div>

      <div className="co-layout">

        {/* ════════════════ LEFT COLUMN ════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Own listing warning */}
          {isOwnListing && (
            <div style={{ background: ABG, border: `1.5px solid ${ABORD}`, borderRadius: 14, padding: 18 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: AMBER, marginBottom: 4 }}>
                {t("buyTicket.ownListingPreview")}
              </p>
              <p style={{ fontSize: 13, color: AMBER_TEXT_DARK, lineHeight: 1.5 }}>
                {t("buyTicket.ownListingPreviewDescription")}
              </p>
            </div>
          )}

          {/* ── Event card ── */}
          <div style={card}>
            {/* Hero banner — blurred background + overlay, same technique as Event.jsx */}
            <div style={{ position: "relative", height: 120, overflow: "hidden" }}>
              {/* Blurred background image */}
              <div style={{
                position: "absolute", inset: 0, zIndex: 0,
                backgroundImage: `url(${listing.bannerUrls?.rectangle || listing.bannerUrls?.square})`,
                backgroundSize: "cover", backgroundPosition: "center",
                filter: "blur(12px) brightness(0.6) saturate(1.2)",
                transform: "scale(1.1)",
                backgroundColor: "#0f0f1a",
              }} />
              {/* Dark overlay */}
              <div style={{
                position: "absolute", inset: 0, zIndex: 1,
                background: "linear-gradient(to right, rgba(15,15,26,0.65) 0%, rgba(15,15,26,0.38) 45%, rgba(15,15,26,0.05) 100%)",
              }} />
              {/* Content */}
              <div style={{
                position: "relative", zIndex: 2,
                height: "100%", display: "flex", alignItems: "center", gap: 14, padding: "0 20px",
              }}>
                <div style={{
                  width: 100, height: 100, borderRadius: 10, background: V,
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 22, flexShrink: 0, overflow: "hidden",
                }}>
                  {listing.bannerUrls?.square ? (
                    <img
                      src={listing.bannerUrls.square}
                      alt=""
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  ) : "🎫"}
                </div>
                <div>
                  <p style={{ fontSize: 16, fontWeight: 700, color: "#fff" }}>{listing.eventName}</p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                    {listing.venue}
                  </p>
                  <p style={{ fontSize: 12, color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                    {eventDateFormatted}
                  </p>
                </div>
              </div>
            </div>

            <div style={{ padding: "18px 20px" }}>
              {/* Sector */}
              <div style={{ marginBottom: 14 }}>
                <p style={lbl}>Sector</p>
                <p style={{ fontSize: 14, fontWeight: 600, color: DARK }}>
                  {sectorName}
                </p>
              </div>
              <hr style={hr} />

              {/* Quantity selector (unnumbered) or seat grid (numbered) */}
              {isNumberedListing ? (
                <div>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                    <p style={lbl}>{t("buyTicket.selectSeats")}</p>
                    <span style={{ fontSize: 12, fontWeight: 600, color: selectedUnitIds.length > 0 ? V : MUTED }}>
                      {selectedUnitIds.length} / {availableCount}
                    </span>
                  </div>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {sortedNumberedUnits.map((unit) => {
                      const sel = selectedUnitIds.includes(unit.id);
                      const seatLabel = unit.seat
                        ? `${unit.seat.row}-${unit.seat.seatNumber}`
                        : unit.id;
                      const disabled = listing.sellTogether || !!acceptedOffer;
                      return (
                        <button
                          key={unit.id}
                          type="button"
                          className={`seat-btn${sel ? " selected" : ""}`}
                          onClick={() => !disabled && toggleSeatSelection(unit.id)}
                          disabled={disabled}
                        >
                          {sel && (
                            <Check
                              size={10}
                              style={{ display: "inline", marginRight: 4, verticalAlign: "middle" }}
                            />
                          )}
                          {seatLabel}
                        </button>
                      );
                    })}
                  </div>
                  {selectedUnitIds.length > 0 && (
                    <div style={{ marginTop: 10, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <p style={{ fontSize: 12, color: MUTED }}>
                        <strong style={{ color: DARK, fontWeight: 600 }}>
                          {selectedUnitIds.length} asiento{selectedUnitIds.length > 1 ? "s" : ""} seleccionado{selectedUnitIds.length > 1 ? "s" : ""}
                        </strong>
                      </p>
                      {!acceptedOffer && !listing.sellTogether && (
                        <button
                          type="button"
                          onClick={() => setSelectedUnitIds([])}
                          style={{
                            fontSize: 11.5, color: V, background: "none", border: "none",
                            cursor: "pointer", fontWeight: 600, padding: 0, ...S,
                          }}
                        >
                          Limpiar
                        </button>
                      )}
                    </div>
                  )}
                  {!acceptedOffer && !listing.sellTogether && (
                    <p style={{ fontSize: 11.5, color: HINT, marginTop: 6, lineHeight: 1.4 }}>
                      Podés elegir cualquier combinación. El precio se actualiza al seleccionar.
                    </p>
                  )}
                </div>
              ) : (
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <p style={lbl}>{t("buyTicket.quantity")}</p>
                    <p style={{ fontSize: 11.5, color: HINT }}>
                      {availableCount} {t("buyTicket.available")}
                    </p>
                  </div>
                  <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                      type="button"
                      className="qty-btn"
                      disabled={quantity <= 1 || !!acceptedOffer || listing.sellTogether}
                      onClick={() => setQuantity((q) => q - 1)}
                    >
                      <Minus size={13} />
                    </button>
                    <span style={{
                      fontSize: 17, fontWeight: 700, color: DARK,
                      minWidth: 36, textAlign: "center",
                    }}>
                      {quantity}
                    </span>
                    <button
                      type="button"
                      className="qty-btn"
                      disabled={quantity >= availableCount || !!acceptedOffer || listing.sellTogether}
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                </div>
              )}

              <hr style={hr} />

              {/* Delivery info row */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, fontSize: 12.5, color: MUTED, lineHeight: 1.4 }}>
                <div style={{
                  width: 30, height: 30, borderRadius: 8, background: GLIGHT,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <Mail size={13} style={{ color: GREEN }} />
                </div>
                <span>
                  {listing.type === "Physical" ? (
                    <>
                      <strong style={{ color: DARK, fontWeight: 600 }}>
                        Acordás con el vendedor
                      </strong>
                      {" "}la entrega de la entrada
                    </>
                  ) : (
                    <>
                      <strong style={{ color: DARK, fontWeight: 600 }}>
                        Recibís la entrada en tu app o por email
                      </strong>
                      {" "}una vez confirmado el pago
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* ── Seller card ── */}
          {seller && !isOwnListing && (
            <div style={card}>
              <div style={{ padding: "18px 20px" }}>
                <p style={lbl}>{t("buyTicket.seller")}</p>
                <Link
                  to={`/seller/${seller.id}`}
                  style={{ textDecoration: "none", color: "inherit", display: "flex", alignItems: "center", gap: 12 }}
                >
                  <UserAvatar name={seller.publicName} src={seller.pic?.src ?? undefined} className="h-[42px] w-[42px] shrink-0" />
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 4 }}>
                      <p style={{ fontSize: 14.5, fontWeight: 700, color: DARK }}>{seller.publicName}</p>
                      {isVerifiedSeller ? (
                        <span style={{
                          display: "inline-flex", alignItems: "center", gap: 4,
                          padding: "2px 8px", borderRadius: 20,
                          background: GLIGHT, color: GREEN, border: `1px solid ${GBORD}`,
                          fontSize: 10.5, fontWeight: 600,
                        }}>
                          <CheckCircle size={9} /> Verificado
                        </span>
                      ) : (
                        <span style={{
                          padding: "2px 8px", borderRadius: 20,
                          background: AMBER_BG_LIGHT, color: AMBER,
                          fontSize: 10.5, fontWeight: 600,
                        }}>
                          Nuevo
                        </span>
                      )}
                    </div>
                    <p style={{ fontSize: 12, color: MUTED }}>
                      {t("buyTicket.sellerMemberSince", { date: formatMonthYear(seller.memberSince, true) })}
                    </p>
                    {seller.totalSales > 0 && (
                      <p style={{ fontSize: 12, color: MUTED, marginTop: 1 }}>
                        {t("buyTicket.sellerTotalSales", { count: seller.totalSales })}
                        {seller.totalReviews > 0 && ` · ${Math.round(seller.percentPositiveReviews!)}% positivas`}
                      </p>
                    )}
                  </div>
                </Link>

                {/* Disclaimer for sellers with 0 sales */}
                {isNewSeller && (
                  <div style={{
                    marginTop: 14, background: GLIGHT,
                    border: `1px solid ${GBORD}`,
                    borderRadius: 10, padding: "11px 13px",
                    display: "flex", gap: 9, alignItems: "flex-start",
                  }}>
                    <div style={{
                      width: 28, height: 28, borderRadius: "50%", background: "#bbf7d0",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      flexShrink: 0, marginTop: 1,
                    }}>
                      <Shield size={14} color="#15803d" />
                    </div>
                    <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.5 }}>
                      <strong style={{ display: "block", marginBottom: 2 }}>
                        Vendedor nuevo. Igual, tu compra está protegida.
                      </strong>
                      Tu pago queda protegido hasta que entrás al evento.
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Payment methods card ── */}
          {paymentMethods.length > 0 && (
            <div style={card}>
              <div style={{ padding: "18px 20px" }}>
                <p style={lbl}>{t("buyTicket.paymentMethod")}</p>
                {paymentMethods.length === 1 ? (
                  /* Single method: no selector, just text */
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>{paymentMethods[0].name}</p>
                    <p style={{ fontSize: 12, color: MUTED, marginTop: 3 }}>
                      Único método disponible
                    </p>
                  </div>
                ) : (
                  /* Multiple methods: radio group with savings chips */
                  paymentMethods.map((method) => {
                    const isSelected = selectedPaymentMethod?.id === method.id;
                    const isAvailable = method.available !== false;
                    const isCheaper = method.serviceFeePercent < maxFeePercent;
                    const savings = selectedQuantity > 0
                      ? subtotal * ((maxFeePercent - method.serviceFeePercent) / 100)
                      : 0;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        className={`pay-option${isSelected ? " selected" : ""}`}
                        disabled={!isAvailable}
                        onClick={() => isAvailable && setSelectedPaymentMethod(method)}
                        style={{ opacity: isAvailable ? 1 : 0.4, cursor: isAvailable ? "pointer" : "not-allowed" }}
                      >
                        <div style={{
                          width: 16, height: 16, borderRadius: "50%",
                          border: `2px solid ${isSelected ? V : BORD2}`,
                          display: "flex", alignItems: "center", justifyContent: "center",
                          flexShrink: 0, marginTop: 2,
                        }}>
                          {isSelected && (
                            <div style={{ width: 7, height: 7, borderRadius: "50%", background: V }} />
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>
                              {method.name}
                            </span>
                            {!isAvailable && (
                              <span style={{ fontSize: 11, color: MUTED }}>No disponible</span>
                            )}
                            {isAvailable && isCheaper && (
                              <span style={{ display: "inline-flex", alignItems: "center", gap: 5 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: GREEN }}>
                                  -{maxFeePercent - method.serviceFeePercent}%
                                </span>
                                {savings > 0 && (
                                  <span style={{
                                    fontSize: 10.5, fontWeight: 600,
                                    background: GLIGHT, color: GREEN, border: `1px solid ${GBORD}`,
                                    padding: "2px 8px", borderRadius: 20,
                                  }}>
                                    Ahorrás {formatCurrencyFromUnits(savings, listingCurrency)}
                                  </span>
                                )}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          )}

          {/* Verification warning */}
          {isAuthenticated && (missingV2 || missingV3) && (
            <div style={{ background: ABG, border: `1.5px solid ${ABORD}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 9, background: AMBER_BG_LIGHT,
                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                }}>
                  <AlertCircle size={18} style={{ color: AMBER }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: AMBER, marginBottom: 4 }}>
                    {t("buyTicket.verificationRequiredTitle")}
                  </p>
                  <p style={{ fontSize: 13, color: AMBER_TEXT_DARK, lineHeight: 1.55, marginBottom: 14 }}>
                    {t("buyTicket.verificationRequiredIntro")}{" "}
                    {[
                      missingV1 && t("buyTicket.missingEmail"),
                      missingV2 && t("buyTicket.missingPhone"),
                      missingV3 && t("buyTicket.missingIdentity"),
                    ]
                      .filter(Boolean)
                      .join(", ")}
                    .
                  </p>
                  <Link
                    to="/verify-user"
                    state={{
                      verifyPhone: missingV2,
                      verifyIdentity: missingV3,
                      returnTo: `/buy/${eventSlug}/${listingId}`,
                    }}
                    style={{
                      display: "inline-block", padding: "10px 20px", borderRadius: 12,
                      background: AMBER, color: "white", fontSize: 13, fontWeight: 700,
                      textDecoration: "none", ...S,
                    }}
                  >
                    {t("buyTicket.completeVerification")}
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ════════════════ RIGHT COLUMN (sticky) ════════════════ */}
        <div className="co-sticky">
          <div style={{ ...card, borderRadius: 20 }}>

            {showUnavailable ? (
              /* ── UNAVAILABLE STATE (race condition or expired+sold) ── */
              <div style={{ padding: "28px 22px", textAlign: "center" }}>
                <div style={{
                  width: 44, height: 44, borderRadius: "50%",
                  background: BADGE_DEMAND_BG, display: "flex", alignItems: "center",
                  justifyContent: "center", margin: "0 auto 12px",
                }}>
                  <X size={20} style={{ color: ERROR }} />
                </div>
                <p style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 8 }}>
                  Esta entrada ya no está disponible
                </p>
                <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 22 }}>
                  {isUnavailable
                    ? "Otro comprador se adelantó justo antes de que confirmaras."
                    : offerExpiredReason === "buyer_no_purchase"
                      ? "No confirmaste el pago a tiempo y la entrada fue vendida mientras tanto."
                      : "El vendedor no respondió a tiempo y la entrada fue vendida mientras tanto."}
                  {" "}Buscá otras opciones para este evento.
                </p>
                <Link
                  to={`/event/${eventSlug}`}
                  style={{
                    display: "block", padding: "12px 16px", borderRadius: 12,
                    border: `1.5px solid ${VL_BORDER}`, color: V,
                    fontSize: 13.5, fontWeight: 700, textDecoration: "none", textAlign: "center",
                  }}
                >
                  Ver otras entradas para {listing.eventName}
                </Link>
              </div>
            ) : (
              <>
                {/* ── ACCEPTED OFFER BANNER ── */}
                {acceptedOffer && (
                  <div style={{
                    margin: "18px 18px 0", padding: "12px 14px",
                    background: GLIGHT, border: `1px solid ${GBORD}`, borderRadius: 12,
                  }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: "#bbf7d0", display: "flex", alignItems: "center",
                        justifyContent: "center", flexShrink: 0, marginTop: 1,
                        fontSize: 10, color: "#14532d",
                      }}>✓</div>
                      <div style={{ fontSize: 12, color: "#166534", lineHeight: 1.5 }}>
                        <strong style={{ display: "block", marginBottom: 3, fontSize: 13 }}>
                          El vendedor aceptó tu oferta
                        </strong>
                        Confirmá el pago antes de que expire el tiempo.
                        {acceptedOffer.acceptedExpiresAt && (
                          <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                            <span style={{ fontSize: 11.5, color: "#166534" }}>
                              Tiempo para completar la compra
                            </span>
                            <span style={{
                              display: "inline-flex", alignItems: "center", gap: 5,
                              fontSize: 12.5, fontWeight: 700,
                              color: acceptedOfferSecsLeft < 3600 ? ERROR_DARK : AMBER_TEXT_DARK,
                              background: acceptedOfferSecsLeft < 3600 ? BADGE_DEMAND_BG : AMBER_BG_LIGHT,
                              border: `1px solid ${acceptedOfferSecsLeft < 3600 ? BADGE_DEMAND_BORDER : ABORD}`,
                              padding: "3px 10px", borderRadius: 20,
                            }}>
                              <Clock size={11} />
                              <Countdown
                                targetDate={acceptedOffer.acceptedExpiresAt}
                                onSecondsChange={setAcceptedOfferSecsLeft}
                              />
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── EXPIRED OFFER BANNER (entry still available) ── */}
                {expiredOffer && !acceptedOffer && availableCount > 0 && (
                  <div style={{
                    margin: "18px 18px 0", padding: "12px 14px",
                    background: offerExpiredReason === "buyer_no_purchase" ? ABG : (GRAY_BG ?? "#f1efe8"),
                    border: `1px solid ${offerExpiredReason === "buyer_no_purchase" ? ABORD : (GRAY_BORDER ?? "#d3d1c7")}`,
                    borderRadius: 12,
                  }}>
                    <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                      <div style={{
                        width: 22, height: 22, borderRadius: "50%",
                        background: offerExpiredReason === "buyer_no_purchase" ? "#fde68a" : "#d3d1c7",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        flexShrink: 0, marginTop: 1, fontSize: 10,
                        color: offerExpiredReason === "buyer_no_purchase" ? AMBER_TEXT_DARK : "#5f5e5a",
                      }}>
                        <Clock size={10} />
                      </div>
                      <div style={{
                        fontSize: 12, lineHeight: 1.5,
                        color: offerExpiredReason === "buyer_no_purchase" ? AMBER_TEXT_DARK : (GRAY_TEXT ?? "#5c5c58"),
                      }}>
                        <strong style={{ display: "block", marginBottom: 2 }}>
                          {offerExpiredReason === "buyer_no_purchase"
                            ? "No confirmaste el pago a tiempo"
                            : "Tu oferta expiró"}
                        </strong>
                        {offerExpiredReason === "buyer_no_purchase"
                          ? "Tu oferta fue aceptada pero el tiempo para pagar venció. La entrada todavía está disponible."
                          : "El vendedor no respondió a tiempo. La entrada todavía está disponible."}
                      </div>
                    </div>
                  </div>
                )}

                {/* ── PAYMENT SUMMARY HEADER ── */}
                <div style={{ padding: "20px 22px 14px", borderBottom: `1px solid ${BORDER}` }}>
                  <p style={{ ...E, fontSize: 18, color: DARK, marginBottom: 4, lineHeight: 1.2 }}>
                    Resumen de Pago
                  </p>
                  <p style={{ ...S, fontSize: 13, color: MUTED, lineHeight: 1.4 }}>
                    {listing.eventName}
                    {sectorName ? ` · ${sectorName}` : ""}
                  </p>
                </div>

                {/* ── PRICE SUMMARY ── */}
                <div style={{ padding: "18px 22px 14px", borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
                    {selectedQuantity > 0 ? (
                      <>
                        <PriceLine
                          label={acceptedOffer ? "Tu oferta" : t("myTicket.ticketPriceTotal")}
                          sub={summarySubLabel}
                          value={formatCurrencyFromUnits(subtotal, listingCurrency)}
                        />
                        <PriceLine
                          label={t("myTicket.servicePrice")}
                          sub={maxFeePercent ? `${maxFeePercent}%` : null}
                          value={formatCurrencyFromUnits(servicePrice, listingCurrency)}
                        />
                        {hasDiscount && (
                          <PriceLine
                            label={`Descuento ${selectedPaymentMethod?.name ?? "método de pago"}`}
                            sub={`(−${maxFeePercent - selectedFeePercent}%)`}
                            value={`−${formatCurrencyFromUnits(feeDiscount, listingCurrency)}`}
                            isDiscount
                          />
                        )}
                      </>
                    ) : (
                      <>
                        <PriceLine
                          label={t("myTicket.ticketPriceTotal")}
                          sub="—"
                          value={formatCurrencyFromUnits(0, listingCurrency)}
                        />
                        <PriceLine
                          label={t("myTicket.servicePrice")}
                          sub={null}
                          value={formatCurrencyFromUnits(0, listingCurrency)}
                        />
                      </>
                    )}

                    {/* Total row */}
                    <div style={{
                      borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 2,
                      display: "flex", alignItems: "center", justifyContent: "space-between",
                    }}>
                      <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>
                        {t("buyTicket.total")}
                      </span>
                      <div style={{ textAlign: "right" }}>
                        <span style={{ fontSize: 22, fontWeight: 800, color: V }}>
                          {selectedQuantity > 0
                            ? formatCurrencyFromUnits(grandTotal, listingCurrency)
                            : formatCurrencyFromUnits(0, listingCurrency)}
                        </span>
                        {hasDiscount && selectedQuantity > 0 && (
                          <div style={{
                            textDecoration: "line-through", fontSize: 12, color: HINT, marginTop: 1,
                          }}>
                            {formatCurrencyFromUnits(subtotal + servicePrice, listingCurrency)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Accepted offer: original price note (spec §9.4) */}
                  {acceptedOffer && selectedQuantity > 0 && (
                    <div style={{
                      fontSize: 11, color: HINT, textAlign: "right", marginTop: 7, lineHeight: 1.5,
                    }}>
                      Precio original: {formatCurrencyFromUnits(listingPricePerTicketUnits * selectedQuantity, listingCurrency)}
                      {" · "}Tu oferta: {formatCurrencyFromUnits(pricePerTicket * selectedQuantity, listingCurrency)}
                      {totalSavings > 0 && (
                        <span style={{
                          marginLeft: 6, fontSize: 10.5, fontWeight: 600,
                          background: GLIGHT, color: GREEN, border: `1px solid ${GBORD}`,
                          padding: "1px 7px", borderRadius: 20,
                        }}>
                          Ahorraste {formatCurrencyFromUnits(totalSavings, listingCurrency)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* ── TERMS ── */}
                {showBuyTermsBlock && (
                  <div style={{ padding: "14px 22px", borderBottom: `1px solid ${BORDER}` }}>
                    <ClientTnC
                      termsVersionId={buyTermsVersionId}
                      termsLoading={buyTermsLoading}
                      checked={buyTermsAccepted}
                      onCheckedChange={setBuyTermsAccepted}
                      checkboxId="checkout-buy-terms"
                    />
                  </div>
                )}

                {/* ── CTAs ── */}
                <div style={{ padding: "14px 22px" }}>
                  {purchaseError && (
                    <ErrorAlert message={purchaseError} className="mb-3" />
                  )}

                  {pendingOffer ? (
                    /* ── PENDING OFFER BOX (replaces CTAs) ── */
                    <div className="pending-box">
                      <div style={{
                        display: "flex", alignItems: "center",
                        justifyContent: "space-between", marginBottom: 10,
                      }}>
                        <div style={{
                          display: "flex", alignItems: "center", gap: 7,
                          fontSize: 13, fontWeight: 600, color: DARK,
                        }}>
                          <span className="pulse-dot" style={{
                            width: 8, height: 8, borderRadius: "50%",
                            background: WARN_SOLID, display: "inline-block",
                          }} />
                          Oferta enviada
                        </div>
                        {pendingOffer.expiresAt && (
                          <span style={{
                            fontSize: 11.5, fontWeight: 600,
                            background: AMBER_BG_LIGHT, color: AMBER_TEXT_DARK,
                            padding: "3px 9px", borderRadius: 20,
                          }}>
                            Expira en{" "}
                            <Countdown targetDate={pendingOffer.expiresAt} />
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: 19, fontWeight: 800, color: V, marginBottom: 2 }}>
                        {formatCurrencyFromUnits(
                          (pendingOffer.offeredPrice?.amount ?? 0) / 100,
                          listingCurrency
                        )}
                      </p>
                      <p style={{ fontSize: 12, color: HINT }}>
                        El vendedor tiene hasta que expire el tiempo para responder.
                      </p>
                      <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                        <button type="button" className="ghost-btn" onClick={handleCancelOffer}>
                          Cancelar oferta
                        </button>
                        <button
                          type="button"
                          className="solid-sm-btn"
                          disabled={!canBuy || isPurchasing}
                          onClick={handlePurchase}
                        >
                          {isPurchasing
                            ? <Loader2 size={13} className="animate-spin" />
                            : `Comprar directo${formattedTotal ? ` · ${formattedTotal}` : ""}`}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <>
                      {/* Primary buy / confirm CTA */}
                      <BuyButton
                        label={primaryBtnLabel}
                        variant={primaryBtnVariant}
                        onClick={primaryBtnDisabled ? undefined : handlePurchase}
                        total={formattedTotal}
                        disabled={primaryBtnDisabled}
                        isLoading={isPurchasing}
                      />

                      {/* Offer secondary CTA + panel */}
                      {canMakeOffer && (
                        <>
                          <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "2px 0" }}>
                            <hr style={{ flex: 1, border: "none", borderTop: `1px solid ${BORDER}` }} />
                            <span style={{ fontSize: 12, color: MUTED }}>o</span>
                            <hr style={{ flex: 1, border: "none", borderTop: `1px solid ${BORDER}` }} />
                          </div>
                          <button
                            type="button"
                            className="cta-offer-btn"
                            onClick={() => {
                              if (!isAuthenticated) {
                                navigate("/login", { state: { from: `/buy/${eventSlug}/${listingId}` } });
                                return;
                              }
                              setOfferOpen((o) => !o);
                              setOfferError(null);
                            }}
                          >
                            <RotateCcw size={13} />
                            {offerOpen
                              ? "Cancelar oferta"
                              : expiredOffer
                                ? "Hacer una nueva oferta"
                                : "Hacer una oferta"}
                          </button>

                          {!offerOpen && (
                            <p style={{
                              fontSize: 11.5, color: HINT, textAlign: "center", marginTop: 6,
                            }}>
                              Si el vendedor acepta, vos decidís si pagar.
                            </p>
                          )}

                          {offerOpen && (
                            <div className="offer-panel">
                              <p style={{ fontSize: 13, fontWeight: 600, color: V, marginBottom: 4 }}>
                                Proponer un precio al vendedor
                              </p>
                              <p style={{ fontSize: 12, color: MUTED, marginBottom: 10, lineHeight: 1.5 }}>
                                Si el vendedor acepta, te avisamos y{" "}
                                <strong style={{ color: DARK }}>vos decidís si confirmar el pago</strong>.
                                No se te cobra nada hasta entonces.
                              </p>
                              <div style={{ display: "flex", gap: 8 }}>
                                <input
                                  type="number"
                                  className={`offer-input${offerError ? " error" : ""}`}
                                  placeholder="Tu oferta en ARS..."
                                  value={offerPriceCents ? Math.floor(offerPriceCents / 100) : ""}
                                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
                                    setOfferPriceCents(Math.max(0, Number(e.target.value) * 100));
                                    setOfferError(null);
                                  }}
                                />
                                <button
                                  type="button"
                                  disabled={isSubmittingOffer || !offerPriceCents}
                                  onClick={handleSubmitOffer}
                                  style={{
                                    padding: "9px 16px", background: V, color: "white",
                                    border: "none", borderRadius: 8, fontSize: 13, fontWeight: 700,
                                    cursor: isSubmittingOffer || !offerPriceCents ? "not-allowed" : "pointer",
                                    opacity: isSubmittingOffer || !offerPriceCents ? 0.55 : 1,
                                    display: "flex", alignItems: "center", gap: 6, ...S,
                                    flexShrink: 0,
                                  }}
                                >
                                  {isSubmittingOffer ? (
                                    <Loader2 size={13} className="animate-spin" />
                                  ) : null}
                                  Enviar
                                </button>
                              </div>

                              {offerError && (
                                <div style={{
                                  marginTop: 8, padding: "8px 10px",
                                  background: "#fef2f2", border: `1px solid ${BADGE_DEMAND_BORDER}`,
                                  borderRadius: 8, display: "flex", gap: 7, alignItems: "flex-start",
                                }}>
                                  <div style={{
                                    width: 15, height: 15, borderRadius: "50%", background: "#fca5a5",
                                    display: "flex", alignItems: "center", justifyContent: "center",
                                    fontSize: 8, color: "#7f1d1d", flexShrink: 0, marginTop: 1,
                                  }}>✕</div>
                                  <div style={{ fontSize: 12, color: ERROR_DARK, lineHeight: 1.4 }}>
                                    {offerError}
                                    <button
                                      type="button"
                                      onClick={() => { setOfferError(null); setOfferPriceCents(0); }}
                                      style={{
                                        display: "block", marginTop: 4, fontSize: 11.5, color: V,
                                        background: "none", border: "none", cursor: "pointer",
                                        padding: 0, fontWeight: 600, textDecoration: "underline", ...S,
                                      }}
                                    >
                                      Intentar con otro monto
                                    </button>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* ── TRUST SIGNALS ── */}
                <TrustSignals />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY CTA (spec §11, §15) ── */}
      <div className="mobile-cta-bar">
        {/* Countdown appears above button only for accepted offer */}
        {acceptedOffer?.acceptedExpiresAt && (
          <div style={{ textAlign: "center", marginBottom: 7 }}>
            <span style={{
              fontSize: 12.5, fontWeight: 700, color: ERROR_DARK,
              display: "inline-flex", alignItems: "center", gap: 5,
            }}>
              <Clock size={11} />
              <Countdown targetDate={acceptedOffer.acceptedExpiresAt} />
            </span>
          </div>
        )}
        {!showUnavailable && (
          <button
            type="button"
            disabled={primaryBtnDisabled}
            onClick={primaryBtnDisabled ? undefined : handlePurchase}
            style={{
              width: "100%", padding: "13px 16px", borderRadius: 12, border: "none",
              fontSize: 14, fontWeight: 700,
              background: primaryBtnDisabled ? BORD2 : V,
              color: primaryBtnDisabled ? MUTED : "white",
              cursor: primaryBtnDisabled ? "not-allowed" : "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", gap: 8,
              transition: "all 0.18s", ...S,
            }}
          >
            {isPurchasing ? (
              <Loader2 size={15} className="animate-spin" />
            ) : (
              <Shield size={15} />
            )}
            {acceptedOffer
              ? `Confirmar pago${formattedTotal ? ` · ${formattedTotal}` : ""}`
              : pendingOffer
                ? `Comprar directo${formattedTotal ? ` · ${formattedTotal}` : ""}`
                : `Comprar con garantía${formattedTotal ? ` · ${formattedTotal}` : ""}`}
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────────────────────────

interface PriceLineProps {
  label: string;
  sub: string | null | undefined;
  value: string;
  isDiscount?: boolean;
}

function PriceLine({ label, sub, value, isDiscount }: PriceLineProps) {
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

interface BuyButtonProps {
  label: string;
  variant: "primary" | "warn" | "disabled";
  onClick: (() => void) | undefined;
  total: string | null;
  disabled: boolean;
  isLoading: boolean;
}

function BuyButton({ label, variant, onClick, total, disabled, isLoading }: BuyButtonProps) {
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

function TrustSignals() {
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
