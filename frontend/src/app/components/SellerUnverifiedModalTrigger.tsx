import { useState, useEffect } from 'react';
import { useUser } from '@/app/contexts/UserContext';
import {
  SellerUnverifiedModal,
  isSellerUnverified,
  isSellerUnverifiedModalDismissed,
} from '@/app/components/SellerUnverifiedModal';

export interface SellerUnverifiedModalTriggerProps {
  /**
   * When true, the modal may show (if user is unverified seller and not dismissed).
   * Use this to show only on specific routes, e.g. seller-dashboard?tab=sold or transaction as seller.
   * Defaults to true for backward compatibility.
   */
  showWhen?: boolean;
}

/**
 * Renders the seller unverified modal when the current user is a seller
 * without verified DNI and bank account. Shows once per session until dismissed
 * or until they navigate to verify. Only shows when showWhen is true (e.g. on relevant page).
 */
export function SellerUnverifiedModalTrigger({ showWhen = true }: SellerUnverifiedModalTriggerProps) {
  const { user, isLoading } = useUser();
  const [dismissed, setDismissed] = useState(() => isSellerUnverifiedModalDismissed());

  useEffect(() => {
    setDismissed(isSellerUnverifiedModalDismissed());
  }, [user?.id]);

  const shouldShow =
    showWhen &&
    !isLoading &&
    user &&
    isSellerUnverified(user) &&
    !dismissed;

  const handleClose = () => setDismissed(true);

  if (!shouldShow) return null;

  return <SellerUnverifiedModal open onClose={handleClose} />;
}
