import { useState, useEffect, useCallback } from "react";
import { ticketsService } from "@/api/services/tickets.service";
import type { CheckoutRisk } from "@/api/types";

export interface UseCheckoutRiskReturn {
  localCheckoutRisk: CheckoutRisk | null; // null until first fetch or after reset()
  isLoading: boolean;
  reset: () => void; // call after data.refresh() to clear stale risk
}

export function useCheckoutRisk(
  listingId: string | undefined,
  isAuthenticated: boolean,
  listingLoaded: boolean,
  effectiveQuantity: number,
  paymentMethodId: string | undefined
): UseCheckoutRiskReturn {
  const [localCheckoutRisk, setLocalCheckoutRisk] = useState<CheckoutRisk | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (
      !listingId ||
      !isAuthenticated ||
      !listingLoaded ||
      !paymentMethodId ||
      effectiveQuantity < 1
    )
      return;
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      try {
        const data = await ticketsService.getCheckoutRisk(
          listingId,
          effectiveQuantity,
          paymentMethodId
        );
        if (!cancelled) setLocalCheckoutRisk(data.checkoutRisk);
      } catch {
        if (!cancelled) setLocalCheckoutRisk(null); // silent fail — don't block purchase
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [listingId, isAuthenticated, listingLoaded, paymentMethodId, effectiveQuantity]);

  const reset = useCallback(() => {
    setLocalCheckoutRisk(null);
  }, []);

  return { localCheckoutRisk, isLoading, reset };
}
