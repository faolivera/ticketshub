import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { S } from '@/lib/design-tokens';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from '@/app/components/ui/dialog';

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
  /** Current user (for showing which items need verification); from useUser(). */
  user?: {
    identityVerificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
    bankAccountStatus?: 'none' | 'pending' | 'approved';
  } | null;
}

/**
 * Returns true when the user has accepted seller terms but cannot receive payout yet
 * (missing V3 and/or V4 — identity and bank account verification).
 * Only shows when at least one verification needs user action (not submitted or rejected).
 * If both are pending or approved, returns false (don't show modal).
 * Uses identityVerificationStatus and bankAccountStatus from GET /me when present.
 */
export function isSellerUnverified(user: {
  acceptedSellerTermsAt?: Date | null;
  identityVerified?: boolean;
  bankDetailsVerified?: boolean;
  identityVerificationStatus?: 'none' | 'pending' | 'approved' | 'rejected';
  bankAccountStatus?: 'none' | 'pending' | 'approved';
} | null): boolean {
  if (!user) return false;
  const isSeller = user.acceptedSellerTermsAt != null;
  if (!isSeller) return false;
  const idStatus = user.identityVerificationStatus;
  const bankStatus = user.bankAccountStatus;
  if (idStatus !== undefined && bankStatus !== undefined) {
    const needsIdentityAction = idStatus === 'none' || idStatus === 'rejected';
    const needsBankAction = bankStatus === 'none';
    return needsIdentityAction || needsBankAction;
  }
  const hasV3 = user.identityVerified === true;
  const hasV4 = user.bankDetailsVerified === true;
  return !hasV3 || !hasV4;
}

export function SellerUnverifiedModal({ open, onClose, user }: SellerUnverifiedModalProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const handleClose = () => {
    setDismissedWithExpiry();
    onClose();
  };

  const handleGoToProfile = () => {
    setDismissedWithExpiry();
    onClose();
    navigate('/user-profile');
  };

  const needsDni =
    user &&
    (user.identityVerificationStatus === 'none' || user.identityVerificationStatus === 'rejected');
  const needsBank = user && user.bankAccountStatus === 'none';
  const hasStatus = user && user.identityVerificationStatus !== undefined && user.bankAccountStatus !== undefined;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && handleClose()}>
      <DialogContent
        className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(90vw,22rem)] max-w-[22rem] rounded-2xl p-0 overflow-hidden border shadow-xl [&>button]:right-4 [&>button]:top-4"
        style={{ background: '#ffffff', borderColor: '#ddd6fe' }}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        {/* Violet accent strip */}
        <div style={{ height: 4, background: '#6d28d9', width: '100%' }} />

        <div style={{ padding: '24px 24px 20px', ...S }}>

          {/* Icon */}
          <div style={{
            width: 44, height: 44, borderRadius: 12,
            background: '#f0ebff', display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 16,
          }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#6d28d9" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            </svg>
          </div>

          <DialogTitle style={{ fontSize: 18, fontWeight: 800, color: '#0f0f1a', marginBottom: 10, lineHeight: 1.3 }}>
            {t('sellerUnverifiedModal.title')}
          </DialogTitle>

          <DialogDescription asChild>
            <div style={{ fontSize: 13.5, color: '#6b7280', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: 10 }}>
              <p>{t('sellerUnverifiedModal.message')}</p>

              {hasStatus && (needsDni || needsBank) && (
                <div style={{ background: '#f3f3f0', borderRadius: 10, padding: '10px 14px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {needsDni && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f0f1a', fontWeight: 600 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6d28d9', flexShrink: 0 }} />
                      {t('sellerUnverifiedModal.itemDni')}
                    </div>
                  )}
                  {needsBank && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#0f0f1a', fontWeight: 600 }}>
                      <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#6d28d9', flexShrink: 0 }} />
                      {t('sellerUnverifiedModal.itemBank')}
                    </div>
                  )}
                </div>
              )}

              <p>
                {t('sellerUnverifiedModal.goToProfile')}{' '}
                <button
                  type="button"
                  onClick={handleGoToProfile}
                  style={{ color: '#6d28d9', fontWeight: 700, textDecoration: 'underline', background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 'inherit', padding: 0 }}
                >
                  {t('sellerUnverifiedModal.linkProfile')}
                </button>{' '}
                {t('sellerUnverifiedModal.goToProfileSuffix')}
              </p>
            </div>
          </DialogDescription>

          {/* CTA */}
          <button
            type="button"
            onClick={handleGoToProfile}
            style={{
              width: '100%', marginTop: 20, padding: '12px 0',
              borderRadius: 12, border: 'none',
              background: '#6d28d9', color: 'white',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
              ...S,
              boxShadow: '0 2px 12px rgba(109,40,217,0.22)',
            }}
          >
            {t('sellerUnverifiedModal.verifyAccount')}
          </button>

          {/* Dismiss link */}
          <button
            type="button"
            onClick={handleClose}
            style={{
              width: '100%', marginTop: 10, padding: '8px 0',
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: '#9ca3af',
              ...S,
            }}
          >
            {t('sellerUnverifiedModal.dismiss', { defaultValue: 'Ahora no' })}
          </button>

        </div>
      </DialogContent>
    </Dialog>
  );
}