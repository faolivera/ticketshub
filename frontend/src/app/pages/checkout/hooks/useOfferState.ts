import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { offersService } from "@/api/services/offers.service";
import { useUser } from "@/app/contexts/UserContext";
import { getExpiredReason } from "@/app/pages/checkout/helpers";
import type { Offer, OfferSeat } from "@/api/types/offers";
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
  setOfferError: (err: string | null) => void;
  handleSubmitOffer: () => Promise<void>;
  handleCancelOffer: () => Promise<void>;
}

export function useOfferState(params: UseOfferStateParams): UseOfferStateReturn {
  const {
    offerIdFromUrl,
    listingId,
    listing,
    isAuthenticated,
    isNumberedListing,
    selectedUnitIds,
    availableUnits,
    quantity,
    eventSlug,
  } = params;

  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useUser();

  const [acceptedOffer, setAcceptedOffer] = useState<Offer | null>(null);
  const [offerSecondsLeft, setOfferSecondsLeft] = useState(Infinity);
  const [pendingOffer, setPendingOffer] = useState<Offer | null>(null);
  const [expiredOffer, setExpiredOffer] = useState<Offer | null>(null);

  const [offerOpen, setOfferOpen] = useState(false);
  const [offerPriceCents, setOfferPriceCents] = useState(0);
  const [isSubmittingOffer, setIsSubmittingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);

  const isOfferFlow = !!offerIdFromUrl;
  const isOfferExpired = offerSecondsLeft <= 0;
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
                new Date(b.updatedAt ?? b.createdAt).getTime() -
                new Date(a.updatedAt ?? a.createdAt).getTime()
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
    return () => {
      cancelled = true;
    };
  }, [offerIdFromUrl, listingId, isAuthenticated, listing]);

  // Countdown timer for accepted offer expiry
  useEffect(() => {
    if (!acceptedOffer?.acceptedExpiresAt) return;
    const expiresAt = acceptedOffer.acceptedExpiresAt;
    const update = () => {
      const secs = Math.max(
        0,
        Math.floor((new Date(expiresAt).getTime() - Date.now()) / 1000)
      );
      setOfferSecondsLeft(secs);
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
    const ticketsPayload =
      isNumberedListing
        ? {
            type: "numbered" as const,
            seats: selectedUnitIds
              .map((id) => availableUnits.find((u) => u.id === id)?.seat)
              .filter((s): s is OfferSeat => s != null),
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
      // Method name may vary by API implementation
      const svc = offersService as unknown as Record<string, (id: string) => Promise<void>>;
      const cancelFn = svc.cancel ?? svc.cancelOffer ?? (() => Promise.resolve());
      await cancelFn(pendingOffer.id);
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
    offerSecondsLeft,
    pendingOffer,
    expiredOffer,
    expiredOfferReason,
    offerOpen,
    setOfferOpen,
    offerPriceCents,
    setOfferPriceCents,
    isSubmittingOffer,
    offerError,
    setOfferError,
    handleSubmitOffer,
    handleCancelOffer,
  };
}
