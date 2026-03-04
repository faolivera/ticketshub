import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/app/components/ui/dialog';
import { Button } from '@/app/components/ui/button';

export const SELLER_UNVERIFIED_MODAL_DISMISSED_KEY = 'sellerUnverifiedModalDismissed';

/** Dismissed state expires after 8 hours */
const DISMISSED_TTL_MS = 8 * 60 * 60 * 1000;

function getExpiryFromStorage(): number | null {
  if (typeof sessionStorage === 'undefined') return null;
  const raw = sessionStorage.getItem(SELLER_UNVERIFIED_MODAL_DISMISSED_KEY);
  if (raw === null) return null;
  const expiry = Number(raw);
  return Number.isFinite(expiry) ? expiry : null;
}

/** Returns true if the modal was dismissed and the 8h TTL has not elapsed. */
export function isSellerUnverifiedModalDismissed(): boolean {
  const expiry = getExpiryFromStorage();
  if (expiry === null) return false;
  if (Date.now() >= expiry) {
    try {
      sessionStorage.removeItem(SELLER_UNVERIFIED_MODAL_DISMISSED_KEY);
    } catch {
      // ignore
    }
    return false;
  }
  return true;
}

function setDismissedWithExpiry(): void {
  try {
    sessionStorage.setItem(
      SELLER_UNVERIFIED_MODAL_DISMISSED_KEY,
      String(Date.now() + DISMISSED_TTL_MS)
    );
  } catch {
    // ignore if sessionStorage unavailable
  }
}

export interface SellerUnverifiedModalProps {
  open: boolean;
  onClose: () => void;
}

/**
 * Returns true when the user is a seller (Seller or VerifiedSeller) and does not
 * have both identity (DNI) and bank account verified — i.e. we need their data to pay them.
 */
export function isSellerUnverified(user: {
  level: string;
  identityVerification?: { status: string };
  bankAccount?: { verified?: boolean };
} | null): boolean {
  if (!user) return false;
  const isSeller =
    user.level === 'Seller' || user.level === 'VerifiedSeller';
  if (!isSeller) return false;
  const identityApproved = user.identityVerification?.status === 'approved';
  const hasVerifiedBank =
    user.bankAccount && user.bankAccount.verified === true;
  return !identityApproved || !hasVerifiedBank;
}

export function SellerUnverifiedModal({ open, onClose }: SellerUnverifiedModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleClose = () => {
    setDismissedWithExpiry();
    onClose();
  };

  const handleVerify = () => {
    setDismissedWithExpiry();
    onClose();
    navigate('/seller-verification');
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="fixed left-1/2 top-1/2 flex w-[min(90vw,22rem)] min-h-[22rem] max-w-[22rem] -translate-x-1/2 -translate-y-1/2 flex-col gap-6 rounded-lg border-2 border-blue-500 bg-blue-50/95 p-8 shadow-xl backdrop-blur-sm [&>button]:right-4 [&>button]:top-4 [&>button]:text-blue-700 [&>button]:hover:bg-blue-100 [&>button]:hover:text-blue-900"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="min-h-0 flex-1 flex flex-col gap-4 overflow-hidden pt-8 pb-2 text-center sm:text-left">
          <DialogTitle className="text-blue-900 text-xl font-semibold leading-tight sm:text-2xl">
            {t('sellerUnverifiedModal.title')}
          </DialogTitle>
          <DialogDescription className="text-blue-800/90 min-h-0 flex-1 overflow-y-auto text-sm leading-relaxed sm:text-base">
            {t('sellerUnverifiedModal.message')}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex shrink-0 justify-center pt-4 pb-2">
          <Button
            type="button"
            className="bg-blue-600 text-white hover:bg-blue-700 font-semibold px-6"
            onClick={handleVerify}
          >
            {t('sellerUnverifiedModal.verifyAccount')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
