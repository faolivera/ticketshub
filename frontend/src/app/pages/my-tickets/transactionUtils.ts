import { TransactionStatus, RequiredActor } from '@/api/types';
import type { TransactionWithDetails } from '@/api/types';
import { BRAND_NAME } from '@/constants/brand';
import {
  V,
  VLIGHT,
  BLUE,
  BLIGHT,
  BLUE_BORDER_LIGHT,
  VL_BORDER,
  DARK,
  MUTED,
  HINT,
  BG,
  CARD,
  BORDER,
  BORD2,
  GREEN,
  GLIGHT,
  GBORD,
  ABG,
  AMBER,
  ABORD,
  BADGE_DEMAND_BG,
  BADGE_DEMAND_BORDER,
  DESTRUCTIVE,
  SURFACE,
  S,
} from '@/lib/design-tokens';

// ─── Terminal statuses ────────────────────────────────────────────────────────
export const TERMINAL_STATUSES: TransactionStatus[] = [
  TransactionStatus.Completed,
  TransactionStatus.Cancelled,
  TransactionStatus.Refunded,
];

// ─── Transaction status → display info ───────────────────────────────────────
export function getTransactionStatusInfo(
  status: TransactionStatus,
  t: (key: string, opts?: Record<string, string>) => string,
  isSellerView = false,
) {
  switch (status) {
    case 'PendingPayment':
      return { label: t('boughtTickets.pendingPayment'), color: ABG, textColor: AMBER, border: ABORD };
    case 'PaymentPendingVerification':
      return { label: t(isSellerView ? 'myTicket.statusPaymentPendingVerificationSeller' : 'myTicket.statusPaymentPendingVerificationBuyer'), color: ABG, textColor: AMBER, border: ABORD };
    case 'PaymentReceived':
      return { label: t('boughtTickets.pending'), color: ABG, textColor: AMBER, border: ABORD };
    case 'TicketTransferred':
      return { label: t('boughtTickets.transferConfirmed'), color: BLIGHT, textColor: BLUE, border: BLUE_BORDER_LIGHT };
    case 'DepositHold':
      return { label: t('boughtTickets.depositHold', { defaultValue: 'Fondos protegidos' }), color: VLIGHT, textColor: V, border: VL_BORDER };
    case 'TransferringFund':
      return { label: t('boughtTickets.transferringFund', { defaultValue: 'Liberando fondos' }), color: VLIGHT, textColor: V, border: VL_BORDER };
    case 'Completed':
      return { label: t('boughtTickets.completed'), color: GLIGHT, textColor: GREEN, border: GBORD };
    case 'Disputed':
      return { label: t('boughtTickets.disputed'), color: BADGE_DEMAND_BG, textColor: DESTRUCTIVE, border: BADGE_DEMAND_BORDER };
    case 'Refunded':
      return { label: t('boughtTickets.refunded'), color: SURFACE, textColor: MUTED, border: BORDER };
    case 'Cancelled':
      return { label: t('boughtTickets.cancelled'), color: SURFACE, textColor: MUTED, border: BORDER };
    default:
      // Fallback for any raw API status not yet translated
      return { label: status, color: SURFACE, textColor: MUTED, border: BORDER };
  }
}

// ─── Offer status → display info ─────────────────────────────────────────────
export function getOfferStatusInfo(
  status: string,
  t: (key: string) => string,
) {
  switch (status) {
    case 'accepted':  return { label: t('boughtTickets.offerStatusAccepted'),  color: VLIGHT, textColor: V, border: VL_BORDER };
    case 'pending':   return { label: t('boughtTickets.offerStatusPending'),   color: ABG, textColor: AMBER, border: ABORD };
    case 'rejected':  return { label: t('boughtTickets.offerStatusRejected'),  color: BADGE_DEMAND_BG, textColor: DESTRUCTIVE, border: BADGE_DEMAND_BORDER };
    case 'converted': return { label: t('boughtTickets.offerStatusConverted'), color: GLIGHT, textColor: GREEN, border: GBORD };
    case 'cancelled': return { label: t('boughtTickets.offerStatusCancelled'), color: SURFACE, textColor: MUTED, border: BORDER };
    default:          return { label: status,                                  color: SURFACE, textColor: MUTED, border: BORDER };
  }
}

// ─── Waiting-for label ────────────────────────────────────────────────────────
export function getWaitingForLabel(
  requiredActor: RequiredActor,
  t: (key: string, opts?: Record<string, string>) => string,
): string {
  switch (requiredActor) {
    case RequiredActor.Buyer:    return t('boughtTickets.waitingForBuyer');
    case RequiredActor.Seller:   return t('boughtTickets.waitingForSeller');
    case RequiredActor.Platform: return t('boughtTickets.waitingForPlatform', { brand: BRAND_NAME });
    default: return '';
  }
}

// ─── Required actor check ─────────────────────────────────────────────────────
export function isUserRequiredActor(
  transaction: TransactionWithDetails,
  userId: string | undefined,
  role: 'buyer' | 'seller',
): boolean {
  if (!userId) return false;
  switch (transaction.requiredActor) {
    case RequiredActor.Buyer:  return role === 'buyer'  && transaction.buyerId  === userId;
    case RequiredActor.Seller: return role === 'seller' && transaction.sellerId === userId;
    default: return false;
  }
}
