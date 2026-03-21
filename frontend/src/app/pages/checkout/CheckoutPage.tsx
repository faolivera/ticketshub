import { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Shield, Loader2, Clock } from "lucide-react";
import { useTranslation } from "react-i18next";
import { transactionsService } from "@/api/services/transactions.service";
import { termsService } from "@/api/services/terms.service";
import { AcceptanceMethod } from "@/api/types/terms";
import { formatCurrencyFromUnits } from "@/lib/format-currency";
import { useUser } from "@/app/contexts/UserContext";
import {
  V, VLIGHT, V_HOVER, VL_BORDER,
  DARK, MUTED, HINT, BG, CARD, BORDER, BORD2,
  AMBER, ABG, ABORD,
  ERROR, ERROR_DARK,
  S, E, V_FOCUS_RING,
  SHADOW_CARD_SM,
  WARN_SOLID,
} from "@/lib/design-tokens";
import { ErrorMessage } from "@/app/components/ErrorMessage";
import { PageMeta } from "@/app/components/PageMeta";
import { BackButton } from "@/app/components/BackButton";
import { isPricingSnapshotExpiredError, isListingUnavailableError } from "./helpers";

// Hooks
import { useCheckoutData } from "./hooks/useCheckoutData";
import { useOfferState } from "./hooks/useOfferState";
import { useCheckoutRisk } from "./hooks/useCheckoutRisk";
import { useTermsGate } from "./hooks/useTermsGate";

// Components
import { Countdown } from "./components/Countdown";
import { TrustSignals } from "./components/TrustSignals";
import { BuyButton } from "./components/BuyButton";
import { OfferBanner } from "./components/OfferBanner";
import { UnavailableOverlay } from "./components/UnavailableOverlay";
import { VerificationGate } from "./components/VerificationGate";
import { TermsCheckbox } from "./components/TermsCheckbox";
import { CheckoutSummary } from "./components/CheckoutSummary";
import { MakeOfferPanel } from "./components/MakeOfferPanel";
import { EventCard } from "./components/EventCard";
import { SellerCard } from "./components/SellerCard";
import { PaymentMethodsCard } from "./components/PaymentMethodsCard";

export default function CheckoutPage() {
  const { t } = useTranslation();
  const { eventSlug, listingId } = useParams<{ eventSlug: string; listingId: string }>();
  const [searchParams] = useSearchParams();
  const offerIdFromUrl = searchParams.get("offerId");
  const navigate = useNavigate();
  const { isAuthenticated, user } = useUser();

  // ── purchase ──
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState<string | null>(null);
  const [isUnavailable, setIsUnavailable] = useState(false);

  // ── hooks ──
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
  const risk = useCheckoutRisk(
    listingId,
    isAuthenticated,
    data.listing != null,
    selectedQuantity(),
    data.selectedPaymentMethod?.id
  );
  const terms = useTermsGate(isAuthenticated);

  // ── computed: selectedQuantity (shared by risk hook and derived values) ──
  function selectedQuantity(): number {
    if (offer.acceptedOffer) {
      const tickets = offer.acceptedOffer.tickets;
      if (!tickets) return 0;
      return tickets.type === "numbered"
        ? (tickets.seats?.length ?? 0)
        : (tickets.count ?? 0);
    }
    if (data.listing?.sellTogether) return data.availableCount;
    if (data.isNumberedListing) return data.selectedUnitIds.length;
    return data.quantity;
  }

  const qty = selectedQuantity();

  // ── cross-hook effect: sync selection when accepted offer is set ──
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

  // ── font preload ──
  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href =
      "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
    return () => {
      try { document.head.removeChild(link); } catch (e) {}
    };
  }, []);

  // ── derived values ──
  const effectiveCheckoutRisk = risk.localCheckoutRisk ?? data.initialCheckoutRisk;

  const missingV1 =
    effectiveCheckoutRisk?.missingV1 ??
    (effectiveCheckoutRisk?.requireV1 && !user?.emailVerified);
  const missingV2 =
    effectiveCheckoutRisk?.missingV2 ??
    (effectiveCheckoutRisk?.requireV2 && !user?.phoneVerified);
  const missingV3 =
    effectiveCheckoutRisk?.missingV3 ??
    (effectiveCheckoutRisk?.requireV3 && !user?.identityVerified);
  const cannotPurchaseDueToVerification =
    isAuthenticated && (missingV1 || missingV2 || missingV3);
  const buyButtonBlockedByIdentity = isAuthenticated && (missingV2 || missingV3);

  const { listing, seller, paymentMethods, pricingSnapshot } = data;
  const { acceptedOffer, pendingOffer, expiredOffer } = offer;

  const listingCurrency = listing?.pricePerTicket?.currency ?? "ARS";
  const listingPricePerTicketUnits = (listing?.pricePerTicket?.amount ?? 0) / 100;
  const pricePerTicket =
    (acceptedOffer
      ? (acceptedOffer.offeredPrice?.amount ?? listing?.pricePerTicket?.amount ?? 0)
      : (listing?.pricePerTicket?.amount ?? 0)) / 100;

  const maxFeePercent =
    paymentMethods.length > 0
      ? Math.max(...paymentMethods.map((m) => m.serviceFeePercent ?? 0))
      : (data.selectedPaymentMethod?.serviceFeePercent ?? 0);
  const selectedFeePercent =
    data.selectedPaymentMethod?.serviceFeePercent ?? maxFeePercent;
  const subtotal = pricePerTicket * qty;
  const servicePrice = subtotal * (maxFeePercent / 100);
  const feeDiscount = subtotal * ((maxFeePercent - selectedFeePercent) / 100);
  const grandTotal = subtotal + servicePrice - feeDiscount;
  const hasDiscount = feeDiscount > 0;

  const canProceed =
    listing?.sellTogether ||
    (data.isNumberedListing ? data.selectedUnitIds.length > 0 : data.quantity > 0);
  const canBuy =
    canProceed &&
    (acceptedOffer ? true : !!pricingSnapshot) &&
    !data.isOwnListing &&
    !cannotPurchaseDueToVerification &&
    (!terms.needsTerms || terms.termsAccepted);

  const offerEnabled = listing?.bestOfferConfig?.enabled ?? false;
  const canMakeOffer =
    offerEnabled && !acceptedOffer && canProceed && !data.isOwnListing;

  const offerTicketSavings = acceptedOffer
    ? (listingPricePerTicketUnits - pricePerTicket) * qty
    : 0;
  const totalSavings = offerTicketSavings + feeDiscount;

  const isExpiredOfferSoldOut =
    !!expiredOffer &&
    data.availableCount === 0 &&
    !acceptedOffer &&
    !pendingOffer;
  const showUnavailable = isUnavailable || isExpiredOfferSoldOut;

  const numberedUnits = data.availableUnits.filter((u) => u.seat);
  const sortedNumberedUnits = [...numberedUnits].sort((a, b) => {
    const rowCmp = (a.seat?.row ?? "").localeCompare(b.seat?.row ?? "");
    if (rowCmp !== 0) return rowCmp;
    return (a.seat?.seatNumber ?? "").localeCompare(b.seat?.seatNumber ?? "", undefined, {
      numeric: true,
    });
  });

  const summarySubLabel = (() => {
    if (acceptedOffer) {
      if (acceptedOffer.tickets?.type === "numbered") {
        return (
          acceptedOffer.tickets.seats
            ?.map((s) => `${s.row}-${s.seatNumber}`)
            .join(", ") ||
          `${formatCurrencyFromUnits(pricePerTicket, listingCurrency)} × ${qty}`
        );
      }
      return `${formatCurrencyFromUnits(pricePerTicket, listingCurrency)} × ${qty}`;
    }
    if (data.isNumberedListing && data.selectedUnitIds.length > 0) {
      return sortedNumberedUnits
        .filter((u) => data.selectedUnitIds.includes(u.id))
        .map((u) => (u.seat ? `${u.seat.row}-${u.seat.seatNumber}` : u.id))
        .join(", ");
    }
    return `${formatCurrencyFromUnits(pricePerTicket, listingCurrency)} × ${qty}`;
  })();

  // ── handlers ──

  const toggleSeatSelection = (unitId: string) => {
    if (listing?.sellTogether || acceptedOffer) return;
    data.setSelectedUnitIds((prev) =>
      prev.includes(unitId)
        ? prev.filter((id) => id !== unitId)
        : [...prev, unitId]
    );
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
    if (terms.needsTerms && (!terms.termsAccepted || !terms.termsVersion)) {
      setPurchaseError(t("buyTicket.acceptTermsRequired"));
      return;
    }
    setIsPurchasing(true);
    setPurchaseError(null);
    try {
      if (terms.needsTerms && terms.termsVersion) {
        await termsService.acceptTerms(terms.termsVersion, AcceptanceMethod.Checkbox);
        const updated = await termsService.getTermsStatus();
        terms.setTermsStatus(updated);
        terms.setTermsAccepted(false);
        // termsVersion resets automatically via useTermsGate's effect when needsTerms→false
      }
      if (useOffer) {
        const response = await transactionsService.initiatePurchase({
          listingId,
          paymentMethodId: data.selectedPaymentMethod?.id ?? "payway",
          offerId: acceptedOffer!.id,
        });
        navigate(`/transaction/${response.transaction.id}`, {
          state: { from: "/my-tickets" },
        });
        return;
      }
      const unitsToPurchase = listing.sellTogether
        ? data.availableUnits.map((u) => u.id)
        : data.isNumberedListing
          ? data.selectedUnitIds
          : data.availableUnits.slice(0, data.quantity).map((u) => u.id);
      if (!unitsToPurchase.length) {
        setPurchaseError(t("buyTicket.selectAtLeastOneSeat"));
        setIsPurchasing(false);
        return;
      }
      const response = await transactionsService.initiatePurchase({
        listingId,
        ticketUnitIds: unitsToPurchase,
        paymentMethodId: data.selectedPaymentMethod?.id ?? "payway",
        pricingSnapshotId: pricingSnapshot!.id,
      });
      navigate(`/transaction/${response.transaction.id}`, {
        state: { from: "/my-tickets" },
      });
    } catch (err: any) {
      if (isPricingSnapshotExpiredError(err)) {
        setPurchaseError(t("buyTicket.pricesChanged"));
        await data.refresh();
        risk.reset();
      } else if (isListingUnavailableError(err)) {
        setIsUnavailable(true);
      } else {
        const message = err?.message ?? String(err);
        const isTermsRequired =
          typeof message === "string" &&
          (message.toLowerCase().includes("terms") ||
            message.toLowerCase().includes("conditions"));
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

  // ── render guards ──

  if (data.isLoading) {
    return (
      <>
        <PageMeta title={t("seo.defaultTitle")} description={t("seo.defaultDescription")} />
        <style>{`
          @keyframes coSkShimmer { 0% { background-position: -200% 0; } 100% { background-position: 200% 0; } }
          .co-sk { background: linear-gradient(90deg, #ece9e6 25%, #f5f4f1 50%, #ece9e6 75%); background-size: 200% 100%; animation: coSkShimmer 1.4s ease-in-out infinite; border-radius: 6px; }
          .co-sk-layout { display: grid; grid-template-columns: 1fr 390px; column-gap: 24px; row-gap: 16px; max-width: 1020px; margin: 0 auto; padding: 0 20px 48px; }
          @media (max-width: 860px) { .co-sk-layout { grid-template-columns: 1fr; } }
        `}</style>
        <div style={{ maxWidth: 1060, margin: "0 auto", padding: "24px 20px 20px" }}>
          <div className="co-sk" style={{ height: 16, width: 110, borderRadius: 6 }} />
        </div>
        <div className="co-sk-layout">
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden", boxShadow: SHADOW_CARD_SM }}>
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

  if (data.error || !listing) {
    return (
      <>
        <PageMeta title={t("seo.defaultTitle")} description={t("seo.defaultDescription")} />
        <ErrorMessage
          title={data.error || t("buyTicket.ticketNotFound")}
          message={t("buyTicket.errorLoading")}
          fullScreen
        />
      </>
    );
  }

  // ── display values ──

  const eventDateFormatted = listing.eventDate
    ? (() => {
        const d = new Date(listing.eventDate);
        const date = d.toLocaleDateString("es-AR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
        const time = d.toLocaleTimeString("es-AR", {
          hour: "2-digit",
          minute: "2-digit",
          hour12: false,
        });
        return `${date} - ${time}`;
      })()
    : "";
  const seoDate = listing.eventDate
    ? new Date(listing.eventDate).toLocaleDateString("es-AR")
    : "";
  const seoPrice = formatCurrencyFromUnits(
    (listing.pricePerTicket?.amount ?? 0) / 100,
    listingCurrency
  );
  const seoSectionName = listing.sectionName || "General";
  const sectorName =
    listing.sectionName ||
    (listing.type === "Physical" ? "Physical Ticket" : "Digital Ticket");
  const seoCityPart = listing.city ? `, ${listing.city}` : "";

  const primaryBtnDisabled =
    isPurchasing ||
    data.isOwnListing ||
    cannotPurchaseDueToVerification ||
    (terms.needsTerms && !terms.termsAccepted) ||
    (!acceptedOffer && (data.availableCount === 0 || qty === 0 || !pricingSnapshot));

  const primaryBtnLabel = acceptedOffer
    ? "Confirmar pago"
    : !canProceed
      ? data.isNumberedListing
        ? t("buyTicket.selectSeats")
        : t("buyTicket.quantity")
      : buyButtonBlockedByIdentity
        ? t("buyTicket.identityRequiredToPurchase")
        : terms.needsTerms && !terms.termsAccepted
          ? t("buyTicket.acceptTermsRequired")
          : pendingOffer
            ? "Comprar directo"
            : "Comprar con garantía";

  const primaryBtnVariant: "primary" | "warn" | "disabled" = canBuy
    ? "primary"
    : !canProceed || data.isOwnListing
      ? "disabled"
      : "warn";

  const formattedTotal =
    qty > 0 && grandTotal > 0
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
  const hr: React.CSSProperties = {
    border: "none",
    borderTop: `1px solid ${BORDER}`,
    margin: "14px 0",
  };

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

        .seat-btn {
          padding: 7px 13px; border-radius: 8px; border: 1.5px solid ${BORD2};
          background: ${CARD}; color: ${DARK}; font-size: 12.5px; font-weight: 600;
          cursor: pointer; transition: all 0.12s; font-family: 'Plus Jakarta Sans', sans-serif;
          white-space: nowrap;
        }
        .seat-btn:hover:not(.selected):not(:disabled) { border-color: ${V}; color: ${V}; background: ${VLIGHT}; }
        .seat-btn.selected { background: ${V}; border-color: ${V}; color: white; }
        .seat-btn:disabled { opacity: 0.4; cursor: not-allowed; }

        .qty-btn {
          width: 34px; height: 34px; border-radius: 9px; border: 1.5px solid ${BORD2};
          background: ${CARD}; color: ${DARK}; display: flex; align-items: center;
          justify-content: center; cursor: pointer; transition: all 0.14s; flex-shrink: 0;
        }
        .qty-btn:hover:not(:disabled) { border-color: ${V}; color: ${V}; }
        .qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }

        .pay-option {
          width: 100%; text-align: left; padding: 11px 13px; border-radius: 10px;
          border: 1.5px solid ${BORD2}; background: ${CARD}; cursor: pointer;
          display: flex; align-items: flex-start; gap: 10px; transition: all 0.14s;
          margin-bottom: 8px; font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .pay-option:last-child { margin-bottom: 0; }
        .pay-option.selected { border-color: ${V}; background: ${VLIGHT}; }
        .pay-option:hover:not(.selected) { border-color: ${HINT}; }

        .offer-input {
          flex: 1; padding: 9px 12px; border: 1.5px solid ${BORD2}; border-radius: 8px;
          font-size: 13.5px; color: ${DARK}; background: ${BG};
          font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: border-color 0.15s;
        }
        .offer-input:focus { border-color: ${V}; box-shadow: ${V_FOCUS_RING}; }
        .offer-input.error { border-color: ${ERROR}; }

        .cta-offer-btn {
          width: 100%; padding: 11px 14px; border-radius: 10px; border: 1.5px solid ${VL_BORDER};
          background: transparent; color: ${V}; font-size: 13.5px; font-weight: 600;
          cursor: pointer; display: flex; align-items: center; justify-content: center;
          gap: 7px; margin-top: 8px; transition: all 0.14s;
          font-family: 'Plus Jakarta Sans', sans-serif;
        }
        .cta-offer-btn:hover { background: ${VLIGHT}; border-color: ${V}; }

        .offer-panel {
          border: 1.5px solid ${VL_BORDER}; border-radius: 12px;
          padding: 14px 16px; background: rgba(109,40,217,0.025); margin-top: 10px;
        }

        .pending-box { border: 1px solid ${BORDER}; border-radius: 12px; padding: 14px; margin-top: 10px; }

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

        .mobile-cta-bar { display: none; }
        @media (max-width: 860px) {
          .mobile-cta-bar {
            display: block; position: fixed; bottom: 0; left: 0; right: 0;
            padding: 10px 16px 20px; background: rgba(255,255,255,0.97);
            border-top: 1px solid ${BORDER}; z-index: 100;
            backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          }
        }

        @keyframes coShimmer { 0%,100% { opacity: 0.45; } 50% { opacity: 0.9; } }
        .co-skel { background: ${BORDER}; border-radius: 4px; animation: coShimmer 1.4s ease-in-out infinite; }

        @keyframes coPulse { 0%,100% { opacity: 1; } 50% { opacity: 0.3; } }
        .pulse-dot { animation: coPulse 1.5s ease-in-out infinite; }
      `}</style>

      {/* Back button row */}
      <div style={{ maxWidth: 1060, margin: "0 auto", padding: "24px 20px 20px" }}>
        <BackButton
          to={data.isOwnListing ? "/seller-dashboard" : `/event/${eventSlug}`}
          labelKey={
            data.isOwnListing ? "buyTicket.backToMyListings" : "buyTicket.backToEvent"
          }
          embedded
        />
      </div>

      <div className="co-layout">

        {/* ════════════════ LEFT COLUMN ════════════════ */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

          {/* Own listing warning */}
          {data.isOwnListing && (
            <div
              style={{
                background: ABG,
                border: `1.5px solid ${ABORD}`,
                borderRadius: 14,
                padding: 18,
              }}
            >
              <p style={{ fontSize: 14, fontWeight: 700, color: AMBER, marginBottom: 4 }}>
                {t("buyTicket.ownListingPreview")}
              </p>
              <p style={{ fontSize: 13, color: AMBER_TEXT_DARK, lineHeight: 1.5 }}>
                {t("buyTicket.ownListingPreviewDescription")}
              </p>
            </div>
          )}

          <EventCard
            listing={listing}
            sectorName={sectorName}
            eventDateFormatted={eventDateFormatted}
            isNumberedListing={data.isNumberedListing}
            sortedNumberedUnits={sortedNumberedUnits}
            selectedUnitIds={data.selectedUnitIds}
            availableCount={data.availableCount}
            hasAcceptedOffer={!!acceptedOffer}
            quantity={data.quantity}
            onToggleSeat={toggleSeatSelection}
            onClearSeats={() => data.setSelectedUnitIds([])}
            onQuantityDecrease={() => data.setQuantity((q) => q - 1)}
            onQuantityIncrease={() => data.setQuantity((q) => q + 1)}
          />

          {seller && !data.isOwnListing && (
            <SellerCard
              seller={seller}
              isVerifiedSeller={data.isVerifiedSeller}
              isNewSeller={data.isNewSeller}
            />
          )}

          {paymentMethods.length > 0 && (
            <PaymentMethodsCard
              paymentMethods={paymentMethods}
              selectedPaymentMethod={data.selectedPaymentMethod}
              maxFeePercent={maxFeePercent}
              subtotal={subtotal}
              qty={qty}
              listingCurrency={listingCurrency}
              onSelect={data.setSelectedPaymentMethod}
            />
          )}

          {/* Verification warning */}
          <VerificationGate
            isAuthenticated={isAuthenticated}
            missingV1={missingV1}
            missingV2={missingV2}
            missingV3={missingV3}
            eventSlug={eventSlug}
            listingId={listingId}
          />
        </div>

        {/* ════════════════ RIGHT COLUMN (sticky) ════════════════ */}
        <div className="co-sticky">
          <div style={{ ...card, borderRadius: 20 }}>

            {showUnavailable ? (
              <UnavailableOverlay
                isUnavailable={isUnavailable}
                isExpiredOfferSoldOut={isExpiredOfferSoldOut}
                expiredOfferReason={offer.expiredOfferReason}
                eventSlug={eventSlug}
                eventName={listing.eventName}
              />
            ) : (
              <>
                <OfferBanner
                  acceptedOffer={acceptedOffer}
                  isOfferFlow={offer.isOfferFlow}
                  secondsLeft={offer.offerSecondsLeft}
                  expiredOffer={expiredOffer}
                  expiredOfferReason={offer.expiredOfferReason}
                  availableCount={data.availableCount}
                />

                {/* ── PAYMENT SUMMARY HEADER ── */}
                <div
                  style={{
                    padding: "20px 22px 14px",
                    borderBottom: `1px solid ${BORDER}`,
                  }}
                >
                  <p
                    style={{
                      ...E,
                      fontSize: 18,
                      color: DARK,
                      marginBottom: 4,
                      lineHeight: 1.2,
                    }}
                  >
                    Resumen de Pago
                  </p>
                  <p style={{ ...S, fontSize: 13, color: MUTED, lineHeight: 1.4 }}>
                    {listing.eventName}
                    {sectorName ? ` · ${sectorName}` : ""}
                  </p>
                </div>

                <CheckoutSummary
                  selectedQuantity={qty}
                  subtotal={subtotal}
                  servicePrice={servicePrice}
                  grandTotal={grandTotal}
                  listingCurrency={listingCurrency}
                  summarySubLabel={summarySubLabel}
                  acceptedOffer={acceptedOffer}
                  hasDiscount={hasDiscount}
                  maxFeePercent={maxFeePercent}
                  selectedFeePercent={selectedFeePercent}
                  feeDiscount={feeDiscount}
                  selectedPaymentMethodName={data.selectedPaymentMethod?.name}
                  listingPricePerTicketUnits={listingPricePerTicketUnits}
                  pricePerTicket={pricePerTicket}
                  totalSavings={totalSavings}
                />

                <TermsCheckbox
                  needsTerms={terms.needsTerms}
                  termsVersion={terms.termsVersion}
                  isLoading={terms.isLoading}
                  accepted={terms.termsAccepted}
                  onChange={terms.setTermsAccepted}
                />

                <MakeOfferPanel
                  purchaseError={purchaseError}
                  pendingOffer={pendingOffer}
                  canBuy={canBuy}
                  isPurchasing={isPurchasing}
                  onPurchase={handlePurchase}
                  formattedTotal={formattedTotal}
                  primaryBtnLabel={primaryBtnLabel}
                  primaryBtnVariant={primaryBtnVariant}
                  primaryBtnDisabled={primaryBtnDisabled}
                  canMakeOffer={canMakeOffer}
                  isAuthenticated={isAuthenticated}
                  eventSlug={eventSlug}
                  listingId={listingId}
                  offerOpen={offer.offerOpen}
                  onOfferOpenToggle={() => offer.setOfferOpen(!offer.offerOpen)}
                  offerError={offer.offerError}
                  setOfferError={offer.setOfferError}
                  expiredOffer={expiredOffer}
                  offerPriceCents={offer.offerPriceCents}
                  setOfferPriceCents={offer.setOfferPriceCents}
                  isSubmittingOffer={offer.isSubmittingOffer}
                  onSubmitOffer={offer.handleSubmitOffer}
                  onCancelOffer={offer.handleCancelOffer}
                  listingCurrency={listingCurrency}
                />

                <TrustSignals />
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── MOBILE STICKY CTA ── */}
      <div className="mobile-cta-bar">
        {acceptedOffer?.acceptedExpiresAt && (
          <div style={{ textAlign: "center", marginBottom: 7 }}>
            <span
              style={{
                fontSize: 12.5,
                fontWeight: 700,
                color: ERROR_DARK,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
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
              width: "100%",
              padding: "13px 16px",
              borderRadius: 12,
              border: "none",
              fontSize: 14,
              fontWeight: 700,
              background: primaryBtnDisabled ? BORD2 : V,
              color: primaryBtnDisabled ? MUTED : "white",
              cursor: primaryBtnDisabled ? "not-allowed" : "pointer",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              transition: "all 0.18s",
              ...S,
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
