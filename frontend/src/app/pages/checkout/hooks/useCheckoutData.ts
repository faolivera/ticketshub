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
  buyPageData: BuyPageData | null;
  listing: BuyPageData["listing"] | null;
  seller: BuyPageData["seller"] | null;
  paymentMethods: BuyPagePaymentMethodOption[];
  pricingSnapshot: BuyPageData["pricingSnapshot"] | null;
  initialCheckoutRisk: CheckoutRisk | null; // from buyPageData; seeds risk before first re-fetch
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
  errorCode: string | null;
  // re-fetch (call after snapshot-expired error, alongside risk.reset())
  refresh: () => Promise<void>;
}

export function useCheckoutData(listingId: string | undefined): UseCheckoutDataReturn {
  const { t } = useTranslation();
  const { user } = useUser();

  const [buyPageData, setBuyPageData] = useState<BuyPageData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const [quantity, setQuantity] = useState(1);
  const [selectedUnitIds, setSelectedUnitIds] = useState<string[]>([]);
  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    useState<BuyPagePaymentMethodOption | null>(null);

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
  const isVerifiedSeller =
    seller?.badges?.some((b) => String(b).toLowerCase().includes("verif")) ?? false;
  const isNewSeller = (seller?.totalSales ?? 0) === 0;

  const availableIdsStr = availableUnits.map((u) => u.id).join(",");

  const loadBuyPage = useCallback(
    async (id: string, cancelled: { current: boolean }) => {
      setIsLoading(true);
      setError(null);
      setErrorCode(null);
      try {
        const data = await ticketsService.getBuyPage(id);
        if (!cancelled.current) {
          setBuyPageData(data);
          const firstAvailable = data.paymentMethods?.find((m) => m.available !== false);
          if (firstAvailable) setSelectedPaymentMethod(firstAvailable);
        }
      } catch (err: unknown) {
        if (!cancelled.current) {
          const code = String((err as Record<string, unknown>)?.code ?? "");
          setErrorCode(code || null);
          setError(code === "EVENT_DATE_EXPIRED" ? t("buyTicket.eventDateExpired") : t("buyTicket.errorLoading"));
        }
      } finally {
        if (!cancelled.current) setIsLoading(false);
      }
    },
    [t]
  );

  // Initial fetch
  useEffect(() => {
    if (!listingId) return;
    const cancelled = { current: false };
    void loadBuyPage(listingId, cancelled);
    return () => {
      cancelled.current = true;
    };
  }, [listingId, loadBuyPage]);

  // Sync selection when listing loads or availability changes
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
    setSelectedUnitIds(availableCount === 1 && ids[0] ? [ids[0]] : []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listing?.id, listing?.sellTogether, isNumberedListing, availableCount, availableIdsStr]);

  const refresh = useCallback(async () => {
    if (!listingId) return;
    const cancelled = { current: false };
    await loadBuyPage(listingId, cancelled);
  }, [listingId, loadBuyPage]);

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
    errorCode,
    refresh,
  };
}
