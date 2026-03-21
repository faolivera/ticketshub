import { useState, useEffect } from "react";
import { termsService } from "@/api/services/terms.service";
import { TermsUserType } from "@/api/types/terms";
import type { GetTermsStatusResponse } from "@/api/types";

export interface UseTermsGateReturn {
  needsTerms: boolean;
  termsAccepted: boolean;
  setTermsAccepted: (v: boolean) => void;
  termsVersion: string | null; // null until second API call resolves
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

  const needsTerms =
    isAuthenticated && termsStatus?.buyer != null && !termsStatus.buyer.isCompliant;

  // Step 1: check compliance
  useEffect(() => {
    if (!isAuthenticated) {
      setTermsStatus(null);
      return;
    }
    let cancelled = false;
    setTermsStatusLoading(true);
    termsService
      .getTermsStatus()
      .then((s) => {
        if (!cancelled) setTermsStatus(s);
      })
      .catch(() => {
        if (!cancelled) setTermsStatus(null);
      })
      .finally(() => {
        if (!cancelled) setTermsStatusLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  // Step 2: fetch terms version only when non-compliant
  useEffect(() => {
    if (!needsTerms) {
      setBuyTermsVersionId(null);
      setBuyTermsLoading(false);
      return;
    }
    let cancelled = false;
    setBuyTermsLoading(true);
    termsService
      .getCurrentTerms(TermsUserType.Buyer)
      .then((terms) => {
        if (!cancelled) setBuyTermsVersionId(terms.id);
      })
      .catch(() => {
        if (!cancelled) setBuyTermsVersionId(null);
      })
      .finally(() => {
        if (!cancelled) setBuyTermsLoading(false);
      });
    return () => {
      cancelled = true;
    };
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
