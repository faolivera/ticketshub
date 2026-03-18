import { useState, useEffect } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import {
  MapPin, Calendar, Shield, Lock,
  CheckCircle, AlertCircle, ChevronDown, ChevronUp,
  Minus, Plus, Check, CreditCard, MessageCircle, Loader2
} from "lucide-react";
import { useTranslation } from "react-i18next";
import { ticketsService } from "@/api/services/tickets.service";
import { transactionsService } from "@/api/services/transactions.service";
import { termsService } from "@/api/services/terms.service";
import { offersService } from "@/api/services/offers.service";
import { TermsUserType, AcceptanceMethod } from "@/api/types/terms";
import { formatDateTime, formatMonthYear } from "@/lib/format-date";
import { formatCurrencyFromUnits } from "@/lib/format-currency";
import { useUser } from "@/app/contexts/UserContext";
import {
  V, VLIGHT, BLUE, DARK, MUTED, HINT, BG, CARD, SURFACE, BORDER, BORD2,
  GREEN, GLIGHT, GBORD, AMBER, ABG, ABORD, S, E
} from "@/lib/design-tokens";
import { LoadingSpinner } from "@/app/components/LoadingSpinner";
import { ErrorMessage, ErrorAlert } from "@/app/components/ErrorMessage";
import { ClientTnC } from "@/app/components/ClientTnC";
import { PageMeta } from "@/app/components/PageMeta";
import { BackButton } from "@/app/components/BackButton";
import { SeatingType, TicketUnitStatus } from "@/api/types";

const STEPS = ["Selección", "Confirmar", "Pago"];

function getInitials(name) {
  if (!name || !name.trim()) return "??";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

function isPricingSnapshotExpiredError(err) {
  const code = err?.code;
  const message = err?.message;
  return (
    (code && String(code).startsWith("PRICING_SNAPSHOT_")) ||
    (code === "BAD_REQUEST" && typeof message === "string" && message.includes("Pricing snapshot has expired"))
  );
}

export default function Checkout() {
  const { t } = useTranslation();
  const { eventSlug, listingId } = useParams();
  const [searchParams] = useSearchParams();
  const offerIdFromUrl = searchParams.get("offerId");
  const navigate = useNavigate();
  const { isAuthenticated, user } = useUser();

  const [buyPageData, setBuyPageData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [quantity, setQuantity] = useState(1);
  const [selectedUnitIds, setSelectedUnitIds] = useState([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(null);
  const [acceptedOffer, setAcceptedOffer] = useState(null);
  const [pendingOffer, setPendingOffer] = useState(null);
  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPriceCents, setOfferPriceCents] = useState(0);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState(null);
  const [isPurchasing, setIsPurchasing] = useState(false);
  const [purchaseError, setPurchaseError] = useState(null);
  const [localCheckoutRisk, setLocalCheckoutRisk] = useState(null);
  const [termsStatus, setTermsStatus] = useState(null);
  const [termsStatusLoading, setTermsStatusLoading] = useState(false);
  const [buyTermsVersionId, setBuyTermsVersionId] = useState(null);
  const [buyTermsLoading, setBuyTermsLoading] = useState(false);
  const [buyTermsAccepted, setBuyTermsAccepted] = useState(false);

  const listing = buyPageData?.listing ?? null;
  const seller = buyPageData?.seller ?? null;
  const paymentMethods = buyPageData?.paymentMethods ?? [];
  const pricingSnapshot = buyPageData?.pricingSnapshot ?? null;
  const effectiveCheckoutRisk = localCheckoutRisk ?? buyPageData?.checkoutRisk;

  const missingV1 = effectiveCheckoutRisk?.missingV1 ?? (effectiveCheckoutRisk?.requireV1 && !user?.emailVerified);
  const missingV2 = effectiveCheckoutRisk?.missingV2 ?? (effectiveCheckoutRisk?.requireV2 && !user?.phoneVerified);
  const missingV3 = effectiveCheckoutRisk?.missingV3 ?? (effectiveCheckoutRisk?.requireV3 && !user?.identityVerified);
  const cannotPurchaseDueToVerification = isAuthenticated && (missingV1 || missingV2 || missingV3);
  /** Guests are not blocked by buy-button copy; they go to login on purchase. */
  const buyButtonBlockedByIdentity = isAuthenticated && (missingV2 || missingV3);

  const showBuyTermsBlock =
    isAuthenticated &&
    termsStatus?.buyer != null &&
    !termsStatus.buyer.isCompliant;

  const availableUnits =
    listing?.ticketUnits?.filter((u) => u.status === TicketUnitStatus.Available) ?? [];
  const availableIdsStr = availableUnits.map((u) => u.id).join(",");
  const numberedUnits = availableUnits.filter((u) => u.seat);
  const isNumberedListing = listing?.seatingType === SeatingType.Numbered;
  const availableCount = availableUnits.length;
  const isOwnListing = user?.id === listing?.sellerId;

  const selectedQuantity = acceptedOffer
    ? (acceptedOffer.tickets?.type === "numbered"
      ? (acceptedOffer.tickets?.seats?.length ?? 0)
      : acceptedOffer.tickets?.count ?? 0)
    : listing?.sellTogether
      ? availableCount
      : isNumberedListing
        ? selectedUnitIds.length
        : quantity;

  const listingCurrency = listing?.pricePerTicket?.currency ?? "ARS";
  const listingPricePerTicketUnits = (listing?.pricePerTicket?.amount ?? 0) / 100;
  const pricePerTicket = (acceptedOffer
    ? (acceptedOffer.offeredPrice?.amount ?? listing?.pricePerTicket?.amount ?? 0)
    : (listing?.pricePerTicket?.amount ?? 0)) / 100;
  const serviceFeePercent = selectedPaymentMethod?.serviceFeePercent ?? 0;
  const subtotal = pricePerTicket * selectedQuantity;
  const servicePrice = subtotal * (serviceFeePercent / 100);
  const grandTotal = subtotal + servicePrice;

  const canProceed =
    listing?.sellTogether ||
    (isNumberedListing ? selectedUnitIds.length > 0 : quantity > 0);
  const canBuy =
    canProceed &&
    (acceptedOffer ? true : !!pricingSnapshot) &&
    !isOwnListing &&
    !cannotPurchaseDueToVerification &&
    (!showBuyTermsBlock || buyTermsAccepted);

  // Fetch buy page
  useEffect(() => {
    if (!listingId) return;
    let cancelled = false;
    (async () => {
      setIsLoading(true);
      setError(null);
      try {
        const data = await ticketsService.getBuyPage(listingId);
        if (!cancelled) {
          setBuyPageData(data);
          setLocalCheckoutRisk(null);
          if (data.paymentMethods?.length > 0) {
            setSelectedPaymentMethod(data.paymentMethods[0]);
          } else {
            setSelectedPaymentMethod(null);
          }
        }
      } catch (err) {
        console.error("Failed to fetch buy page:", err);
        if (!cancelled) setError(t("buyTicket.errorLoading"));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId, t]);

  // Preselect units when listing loads
  useEffect(() => {
    if (!listing) return;
    const ids = availableUnits.map((u) => u.id);
    if (listing.sellTogether) {
      setSelectedUnitIds(ids);
      return;
    }
    if (!isNumberedListing) {
      setSelectedUnitIds([]);
      setQuantity((q) => Math.min(Math.max(q, 1), Math.max(availableCount, 1)));
      return;
    }
    if (availableCount === 1 && ids[0]) {
      setSelectedUnitIds([ids[0]]);
    } else {
      setSelectedUnitIds([]);
    }
  }, [listing?.id, listing?.sellTogether, isNumberedListing, availableCount, availableIdsStr]);

  // Resolve accepted/pending offer
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
        if (!cancelled) {
          setAcceptedOffer(accepted ?? null);
          setPendingOffer(pending ?? null);
        }
      } catch {
        if (!cancelled) {
          setAcceptedOffer(null);
          setPendingOffer(null);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [offerIdFromUrl, listingId, isAuthenticated, listing?.id]);

  // Terms status
  useEffect(() => {
    if (!isAuthenticated) {
      setTermsStatus(null);
      return;
    }
    let cancelled = false;
    setTermsStatusLoading(true);
    termsService
      .getTermsStatus()
      .then((status) => { if (!cancelled) setTermsStatus(status); })
      .catch(() => { if (!cancelled) setTermsStatus(null); })
      .finally(() => { if (!cancelled) setTermsStatusLoading(false); });
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  // Buy terms version when showing T&C block
  useEffect(() => {
    if (!showBuyTermsBlock) {
      setBuyTermsVersionId(null);
      setBuyTermsLoading(false);
      return;
    }
    let cancelled = false;
    setBuyTermsLoading(true);
    termsService
      .getCurrentTerms(TermsUserType.Buyer)
      .then((terms) => { if (!cancelled) setBuyTermsVersionId(terms.id); })
      .catch(() => { if (!cancelled) setBuyTermsVersionId(null); })
      .finally(() => { if (!cancelled) setBuyTermsLoading(false); });
    return () => { cancelled = true; };
  }, [showBuyTermsBlock]);

  // Sync accepted offer to quantity/selectedUnitIds
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
        .filter(Boolean);
      setSelectedUnitIds(ids);
    }
  }, [acceptedOffer?.id, listing?.id]);

  // Checkout risk when quantity/payment changes
  const riskQuantity = acceptedOffer
    ? (acceptedOffer.tickets?.type === "numbered"
      ? (acceptedOffer.tickets?.seats?.length ?? 0)
      : acceptedOffer.tickets?.count ?? 0)
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
        const data = await ticketsService.getCheckoutRisk(
          listingId,
          riskQuantity,
          selectedPaymentMethod.id
        );
        if (!cancelled) setLocalCheckoutRisk(data.checkoutRisk);
      } catch {
        if (!cancelled) setLocalCheckoutRisk(null);
      }
    })();
    return () => { cancelled = true; };
  }, [listingId, isAuthenticated, listing?.id, selectedPaymentMethod?.id, riskQuantity]);

  const toggleSeatSelection = (unitId) => {
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
      if (data.paymentMethods?.length > 0) setSelectedPaymentMethod(data.paymentMethods[0]);
    } catch (err) {
      console.error("Failed to refresh buy page:", err);
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
          offerId: acceptedOffer.id,
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
        pricingSnapshotId: pricingSnapshot.id,
      });
      navigate(`/transaction/${response.transaction.id}`, { state: { from: "/my-tickets" } });
    } catch (err) {
      console.error("Purchase failed:", err);
      if (isPricingSnapshotExpiredError(err)) {
        setPurchaseError(t("buyTicket.pricesChanged"));
        await refreshBuyPageData();
      } else {
        const message = err?.message ?? String(err);
        const isTermsRequired =
          typeof message === "string" &&
          (message.toLowerCase().includes("terms") || message.toLowerCase().includes("conditions"));
        setPurchaseError(
          isTermsRequired ? t("buyTicket.acceptTermsRequired") : (message || t("buyTicket.purchaseFailed"))
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
      setOfferError(t("buyTicket.offerBelowMinimum"));
      return;
    }
    const ticketsPayload = listing.seatingType === SeatingType.Numbered
      ? {
          type: "numbered",
          seats: selectedUnitIds
            .map((id) => availableUnits.find((u) => u.id === id)?.seat)
            .filter((s) => s != null),
        }
      : { type: "unnumbered", count: quantity };
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
    } catch (err) {
      setOfferError(err?.message ?? t("buyTicket.offerSubmitFailed"));
    } finally {
      setIsSubmittingOffer(false);
    }
  };

  useEffect(() => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap";
    document.head.appendChild(link);
    return () => { try { document.head.removeChild(link); } catch (e) {} };
  }, []);

  if (isLoading) {
    return (
      <>
        <PageMeta title={t("seo.defaultTitle")} description={t("seo.defaultDescription")} />
        <LoadingSpinner size="lg" text={t("common.loading")} fullScreen />
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

  const eventDateFormatted = listing.eventDate ? formatDateTime(listing.eventDate) : "";
  const sectorName = listing.sectionName || (listing.type === "Physical" ? "Physical Ticket" : "Digital Ticket");
  const seatsMax = isNumberedListing ? availableCount : 0;
  const sortedNumberedUnits = [...numberedUnits].sort((a, b) => {
    const rowCmp = (a.seat?.row ?? "").localeCompare(b.seat?.row ?? "");
    if (rowCmp !== 0) return rowCmp;
    return (a.seat?.seatNumber ?? "").localeCompare(b.seat?.seatNumber ?? "", undefined, { numeric: true });
  });

  const btnLabel = !canProceed
    ? (isNumberedListing ? t("buyTicket.selectSeats") : t("buyTicket.quantity"))
    : buyButtonBlockedByIdentity
      ? t("buyTicket.identityRequiredToPurchase")
      : showBuyTermsBlock && !buyTermsAccepted
        ? t("buyTicket.acceptTermsRequired")
        : t("buyTicket.completePurchase");

  const btnAction = !canProceed
    ? null
    : buyButtonBlockedByIdentity
      ? null
      : showBuyTermsBlock && !buyTermsAccepted
        ? null
        : handlePurchase;

  const btnVariant = canBuy ? "primary" : !canProceed ? "disabled" : "warn";

  return (
    <div style={{ ...S, background: BG, color: DARK, minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <PageMeta
        title={t("seo.buyTicket.title", { eventName: listing.eventName })}
        description={t("seo.buyTicket.description", { eventName: listing.eventName })}
        image={listing.bannerUrls?.rectangle ?? listing.bannerUrls?.square}
      />

      <style>{`
        .co-layout { display: grid; grid-template-columns: 1fr 400px; gap: 20px; max-width: 1000px; margin: 0 auto; padding: 24px; }
        .co-back { grid-column: 1 / -1; }
        @media(max-width: 860px) { .co-layout { grid-template-columns: 1fr; } .co-sticky { position: static !important; } }
        .co-sticky { position: sticky; top: 24px; align-self: start; }
        .seat-btn { padding: 8px 16px; border-radius: 8px; border: 1.5px solid ${BORD2}; background: white; color: ${DARK}; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.14s; font-family: 'Plus Jakarta Sans', sans-serif; }
        .seat-btn:hover:not(.selected):not(.full) { border-color: ${V}; color: ${V}; background: ${VLIGHT}; }
        .seat-btn.selected { background: ${V}; border-color: ${V}; color: white; }
        .seat-btn.full { opacity: 0.4; cursor: not-allowed; }
        .qty-btn { width: 32px; height: 32px; border-radius: 8px; border: 1.5px solid ${BORD2}; background: white; color: ${DARK}; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: all 0.14s; flex-shrink: 0; }
        .qty-btn:hover:not(:disabled) { border-color: ${V}; color: ${V}; }
        .qty-btn:disabled { opacity: 0.35; cursor: not-allowed; }
        .pay-option { padding: 13px 16px; border-radius: 10px; border: 1.5px solid ${BORD2}; background: white; cursor: pointer; display: flex; align-items: center; justify-content: space-between; transition: all 0.14s; }
        .pay-option.selected { border-color: ${V}; background: ${VLIGHT}; }
        .pay-option:hover:not(.selected) { border-color: #9ca3af; }
        .offer-input { width: 100%; padding: 10px 14px; border: 1.5px solid ${BORD2}; border-radius: 10px; font-size: 14px; color: ${DARK}; background: ${BG}; font-family: 'Plus Jakarta Sans', sans-serif; outline: none; transition: border-color 0.15s; }
        .offer-input:focus { border-color: ${V}; box-shadow: 0 0 0 3px rgba(109,40,217,0.1); }
        .checkbox-custom { width: 18px; height: 18px; border-radius: 5px; border: 2px solid ${BORD2}; background: white; display: flex; align-items: center; justify-content: center; cursor: pointer; flex-shrink: 0; transition: all 0.14s; }
        .checkbox-custom.checked { background: ${V}; border-color: ${V}; }
      `}</style>


      <div className="co-layout" style={{ flex: 1 }}>
        <div className="co-back">
          <BackButton
            to={isOwnListing ? "/seller-dashboard?tab=listed" : `/event/${eventSlug}`}
            labelKey={isOwnListing ? "buyTicket.backToMyListings" : "buyTicket.backToEvent"}
            embedded
          />
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Own listing warning */}
          {isOwnListing && (
            <div style={{ background: ABG, border: `1.5px solid ${ABORD}`, borderRadius: 14, padding: 18 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: AMBER, marginBottom: 4 }}>{t("buyTicket.ownListingPreview")}</p>
              <p style={{ fontSize: 13, color: "#78350f", lineHeight: 1.5 }}>{t("buyTicket.ownListingPreviewDescription")}</p>
            </div>
          )}

          <Section title={t("buyTicket.ticketDetails")}>
            <div style={{ padding: "14px 16px", background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}`, marginBottom: 20 }}>
              <p style={{ fontSize: 12, color: MUTED, marginBottom: 2 }}>{t("buyTicket.event")}</p>
              <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 10 }}>{listing.eventName}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                <MetaRow icon={<Calendar size={13} style={{ color: BLUE }} />} text={eventDateFormatted} />
                <MetaRow icon={<MapPin size={13} style={{ color: BLUE }} />} text={listing.venue} />
              </div>
            </div>
            <div style={{ marginBottom: 20 }}>
              <p style={{ fontSize: 11.5, color: MUTED, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{t("buyTicket.ticketType")}</p>
              <p style={{ fontSize: 17, fontWeight: 700, color: DARK, marginBottom: 4 }}>{sectorName}</p>
            </div>

            {isNumberedListing ? (
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: DARK }}>{t("buyTicket.selectSeats")}</p>
                  <span style={{ fontSize: 12, fontWeight: 600, color: selectedQuantity > 0 ? V : MUTED }}>
                    {t("buyTicket.seatsSelected", { count: selectedQuantity })} / {seatsMax}
                  </span>
                </div>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                  {sortedNumberedUnits.map((unit) => {
                    const sel = selectedUnitIds.includes(unit.id);
                    const full = !sel && selectedUnitIds.length >= seatsMax;
                    const seatLabel = unit.seat ? `${unit.seat.row}-${unit.seat.seatNumber}` : unit.id;
                    const disabled = listing.sellTogether || !!acceptedOffer;
                    return (
                      <button
                        key={unit.id}
                        type="button"
                        className={`seat-btn${sel ? " selected" : ""}${full && !disabled ? " full" : ""}`}
                        onClick={() => !disabled && !full && toggleSeatSelection(unit.id)}
                        disabled={disabled}
                      >
                        {sel && <Check size={11} style={{ display: "inline", marginRight: 5, verticalAlign: "middle" }} />}
                        {seatLabel}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 10 }}>{t("buyTicket.quantity")}</p>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <button
                    type="button"
                    className="qty-btn"
                    disabled={quantity <= 1 || !!acceptedOffer}
                    onClick={() => setQuantity((q) => q - 1)}
                  >
                    <Minus size={14} />
                  </button>
                  <span style={{ fontSize: 18, fontWeight: 700, color: DARK, minWidth: 24, textAlign: "center" }}>{quantity}</span>
                  <button
                    type="button"
                    className="qty-btn"
                    disabled={quantity >= availableCount || !!acceptedOffer}
                    onClick={() => setQuantity((q) => q + 1)}
                  >
                    <Plus size={14} />
                  </button>
                  <span style={{ fontSize: 13, color: MUTED }}>{availableCount} {t("buyTicket.available")}</span>
                </div>
              </div>
            )}
          </Section>

          {/* Seller */}
          {seller && !isOwnListing && (
            <Section title={t("buyTicket.seller")}>
              <Link to={`/seller/${seller.id}`} style={{ textDecoration: "none", color: "inherit" }}>
                <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                  <div style={{ width: 44, height: 44, borderRadius: "50%", background: VLIGHT, color: V, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, fontWeight: 700, flexShrink: 0 }}>
                    {getInitials(seller.publicName)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                      <p style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{seller.publicName}</p>
                      {seller.badges?.some((b) => String(b).toLowerCase().includes("verif")) && (
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 4, padding: "2px 8px", borderRadius: 100, background: GLIGHT, color: GREEN, border: `1px solid ${GBORD}`, fontSize: 11, fontWeight: 600 }}>
                          <CheckCircle size={10} /> Verificado
                        </span>
                      )}
                    </div>
                    <div style={{ display: "flex", gap: 14, fontSize: 12.5, color: MUTED }}>
                      <span>{t("buyTicket.sellerTotalSales", { count: seller.totalSales ?? 0 })}</span>
                      <span>·</span>
                      <span>{t("buyTicket.sellerMemberSince", { date: formatMonthYear(seller.memberSince, true) })}</span>
                    </div>
                  </div>
                </div>
              </Link>

              {listing.bestOfferConfig?.enabled && (
                <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
                  {acceptedOffer ? (
                    <div style={{ padding: 12, background: GLIGHT, border: `1px solid ${GBORD}`, borderRadius: 12 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{t("buyTicket.acceptedOfferComplete")}</p>
                    </div>
                  ) : pendingOffer ? (
                    <div style={{ padding: 12, background: GLIGHT, border: `1px solid ${GBORD}`, borderRadius: 12 }}>
                      <p style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{t("buyTicket.offerSubmitted")}</p>
                      <Link to="/my-tickets?tab=offers" style={{ fontSize: 12, color: GREEN, marginTop: 4, display: "inline-block" }}>{t("buyTicket.viewMyOffers")}</Link>
                    </div>
                  ) : (
                    <>
                      <button
                        type="button"
                        onClick={() => setOfferOpen(!offerOpen)}
                        style={{ display: "flex", alignItems: "center", gap: 7, background: "none", border: "none", cursor: "pointer", color: MUTED, fontSize: 13, fontWeight: 600, padding: 0, ...S }}
                      >
                        <MessageCircle size={14} style={{ color: V }} />
                        <span style={{ color: V }}>{t("buyTicket.makeOffer")}</span>
                        {offerOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      {offerOpen && (
                        <div style={{ marginTop: 14, padding: 16, background: SURFACE, borderRadius: 12, border: `1px solid ${BORDER}` }}>
                          <p style={{ fontSize: 13, color: MUTED, marginBottom: 12, lineHeight: 1.5 }}>{t("buyTicket.makeOfferDescription")}</p>
                          <p style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6 }}>{t("buyTicket.yourOfferPrice")}</p>
                          <input
                            className="offer-input"
                            type="number"
                            placeholder="Ej: 170000"
                            value={offerPriceCents ? Math.floor(offerPriceCents / 100) : ""}
                            onChange={(e) => setOfferPriceCents(Math.max(0, Number(e.target.value) * 100))}
                            style={{ marginBottom: 10 }}
                          />
                          {offerError && <ErrorAlert message={offerError} className="mb-2" />}
                          <button
                            type="button"
                            disabled={isSubmittingOffer || !isAuthenticated}
                            onClick={handleSubmitOffer}
                            style={{ width: "100%", padding: "11px", borderRadius: 10, background: AMBER, border: "none", color: "white", fontSize: 14, fontWeight: 700, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 8, ...S }}
                          >
                            {isSubmittingOffer ? <Loader2 size={15} className="animate-spin" /> : <MessageCircle size={15} />}
                            {isSubmittingOffer ? t("common.loading") : t("buyTicket.submitOffer")}
                          </button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </Section>
          )}

          {/* Verification */}
          {isAuthenticated && (missingV2 || missingV3) && (
            <div style={{ background: ABG, border: `1.5px solid ${ABORD}`, borderRadius: 14, padding: 18 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                <div style={{ width: 36, height: 36, borderRadius: 9, background: "#fef3c7", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <AlertCircle size={18} style={{ color: AMBER }} />
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: 14, fontWeight: 700, color: AMBER, marginBottom: 4 }}>{t("buyTicket.verificationRequiredTitle")}</p>
                  <p style={{ fontSize: 13, color: "#78350f", lineHeight: 1.55, marginBottom: 14 }}>
                    {t("buyTicket.verificationRequiredIntro")} {[missingV1 && t("buyTicket.missingEmail"), missingV2 && t("buyTicket.missingPhone"), missingV3 && t("buyTicket.missingIdentity")].filter(Boolean).join(", ")}.
                  </p>
                  <Link
                    to="/verify-user"
                    state={{ verifyPhone: missingV2, verifyIdentity: missingV3, returnTo: `/buy/${eventSlug}/${listingId}` }}
                    style={{ display: "inline-block", padding: "10px 20px", borderRadius: 9, background: AMBER, border: "none", color: "white", fontSize: 13, fontWeight: 700, cursor: "pointer", textDecoration: "none", ...S }}
                  >
                    {t("buyTicket.completeVerification")}
                  </Link>
                </div>
              </div>
            </div>
          )}

          {isAuthenticated && !missingV2 && !missingV3 && (
            <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "12px 16px", background: GLIGHT, border: `1px solid ${GBORD}`, borderRadius: 12 }}>
              <CheckCircle size={16} style={{ color: GREEN, flexShrink: 0 }} />
              <p style={{ fontSize: 13, fontWeight: 600, color: GREEN }}>{t("buyTicket.identityVerified")}</p>
            </div>
          )}
        </div>

        {/* Right column */}
        <div className="co-sticky">
          <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 20, overflow: "hidden", boxShadow: "0 2px 12px rgba(0,0,0,0.06)" }}>
            <div style={{ padding: "20px 22px 16px", borderBottom: `1px solid ${BORDER}` }}>
              <h2 style={{ ...E, fontSize: 20, fontWeight: 400, color: DARK, letterSpacing: "-0.3px", marginBottom: 2 }}>{t("buyTicket.paymentSummary")}</h2>
              <p style={{ fontSize: 13, color: MUTED }}>{listing.eventName} · {sectorName}</p>
            </div>

            <div style={{ padding: "16px 22px", borderBottom: `1px solid ${BORDER}` }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                <PriceLine
                  label={t("myTicket.ticketPriceTotal")}
                  sub={
                    selectedQuantity <= 0
                      ? "—"
                      : acceptedOffer
                        ? (
                            <>
                              <div style={{ textDecoration: "line-through", color: MUTED, fontSize: 12.5 }}>
                                {formatCurrencyFromUnits(listingPricePerTicketUnits, listingCurrency)} × {selectedQuantity}
                              </div>
                              <div style={{ marginTop: 6 }}>
                                <span style={{ fontSize: 11, fontWeight: 700, color: DARK, display: "block", marginBottom: 2 }}>
                                  {t("buyTicket.offeredPrice")}
                                </span>
                                <span style={{ fontSize: 11.5, color: HINT }}>
                                  {formatCurrencyFromUnits((acceptedOffer.offeredPrice?.amount ?? 0) / 100, listingCurrency)} × {selectedQuantity}
                                </span>
                              </div>
                            </>
                          )
                        : `${formatCurrencyFromUnits(pricePerTicket, listingCurrency)} × ${selectedQuantity}`
                  }
                  value={selectedQuantity > 0 ? formatCurrencyFromUnits(subtotal, listingCurrency) : formatCurrencyFromUnits(0, listingCurrency)}
                />
                <PriceLine
                  label={t("myTicket.servicePrice")}
                  sub={serviceFeePercent ? `${serviceFeePercent}%` : null}
                  value={selectedQuantity > 0 ? formatCurrencyFromUnits(servicePrice, listingCurrency) : formatCurrencyFromUnits(0, listingCurrency)}
                />
                <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 12, marginTop: 2, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: DARK }}>{t("buyTicket.total")}</span>
                  <span style={{ fontSize: 22, fontWeight: 800, color: V }}>{selectedQuantity > 0 ? formatCurrencyFromUnits(grandTotal, listingCurrency) : formatCurrencyFromUnits(0, listingCurrency)}</span>
                </div>
              </div>
            </div>

            {paymentMethods.length > 0 && (
              <div style={{ padding: "16px 22px", borderBottom: `1px solid ${BORDER}` }}>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 10 }}>{t("buyTicket.paymentMethod")}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {paymentMethods.map((method) => {
                    const isSelected = selectedPaymentMethod?.id === method.id;
                    return (
                      <button
                        key={method.id}
                        type="button"
                        className={`pay-option${isSelected ? " selected" : ""}`}
                        style={{ width: "100%", textAlign: "left" }}
                        onClick={() => setSelectedPaymentMethod(method)}
                      >
                        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
                          <div style={{ width: 16, height: 16, borderRadius: "50%", border: `2px solid ${isSelected ? V : BORD2}`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                            {isSelected && <div style={{ width: 8, height: 8, borderRadius: "50%", background: V }} />}
                          </div>
                          <div>
                            <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK }}>{method.name}</p>
                            <p style={{ fontSize: 11.5, color: MUTED }}>{method.serviceFeePercent ? `${method.serviceFeePercent}%` : ""}</p>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

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

            <div style={{ padding: "12px 22px", borderBottom: `1px solid ${BORDER}`, background: SURFACE }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                {[
                  { icon: <Lock size={12} style={{ color: BLUE }} />, text: t("buyTicket.securePayment") },
                  { icon: <Shield size={12} style={{ color: BLUE }} />, text: t("landing.trustRefund") },
                  { icon: <CreditCard size={12} style={{ color: BLUE }} />, text: t("landing.trustSecurePayment") },
                ].map(({ icon, text }) => (
                  <div key={text} style={{ display: "flex", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ marginTop: 1, flexShrink: 0 }}>{icon}</div>
                    <p style={{ fontSize: 11.5, color: MUTED, lineHeight: 1.45 }}>{text}</p>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ padding: "16px 22px" }}>
              {purchaseError && <ErrorAlert message={purchaseError} className="mb-4" />}
              <BuyButton
                label={btnLabel}
                variant={btnVariant}
                onClick={btnAction}
                total={selectedQuantity > 0 && canBuy ? formatCurrencyFromUnits(grandTotal, listingCurrency) : null}
                disabled={isPurchasing || isOwnListing || (acceptedOffer ? !selectedPaymentMethod : (availableCount === 0 || selectedQuantity === 0 || !pricingSnapshot)) || cannotPurchaseDueToVerification || (showBuyTermsBlock && !buyTermsAccepted)}
                isLoading={isPurchasing}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "22px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
      <h2 style={{ ...E, fontSize: 20, fontWeight: 400, color: DARK, letterSpacing: "-0.3px", marginBottom: 18 }}>{title}</h2>
      {children}
    </div>
  );
}

function MetaRow({ icon, text }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: MUTED }}>
      {icon}
      <span>{text}</span>
    </div>
  );
}

function PriceLine({ label, sub, value }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
      <div>
        <p style={{ fontSize: 13.5, color: DARK, fontWeight: 500 }}>{label}</p>
        {sub != null && sub !== "" && (
          <div style={{ fontSize: 11.5, color: HINT, marginTop: 1 }}>{sub}</div>
        )}
      </div>
      <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK, whiteSpace: "nowrap" }}>{value}</span>
    </div>
  );
}

function BuyButton({ label, variant, onClick, total, disabled, isLoading }) {
  const styles = {
    primary: { background: V, color: "white", opacity: 1, cursor: "pointer" },
    warn: { background: "#f59e0b", color: "white", opacity: 1, cursor: "pointer" },
    disabled: { background: BORD2, color: MUTED, opacity: 0.8, cursor: "not-allowed" },
  };
  const st = styles[variant] || styles.disabled;

  return (
    <button
      type="button"
      onClick={disabled ? undefined : onClick}
      disabled={disabled}
      style={{
        width: "100%",
        padding: "13px 16px",
        borderRadius: 12,
        border: "none",
        fontSize: 14,
        fontWeight: 700,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 10,
        transition: "all 0.18s",
        fontFamily: "'Plus Jakarta Sans', sans-serif",
        ...st,
      }}
    >
      {isLoading ? <Loader2 size={15} className="animate-spin" /> : variant === "primary" && <Shield size={15} />}
      <span>{label}{total ? ` · ${total}` : ""}</span>
    </button>
  );
}
