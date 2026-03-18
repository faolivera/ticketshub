import { TransactionStatus, RequiredActor } from '@/api/types';
import type { TransactionWithDetails } from '@/api/types';
import { BRAND_NAME } from '@/constants/brand';

// ─── Design tokens ────────────────────────────────────────────────────────────
export const V      = '#6d28d9';
export const VLIGHT = '#f0ebff';
export const BLUE   = '#1e3a5f';
export const BLIGHT = '#e4edf7';
export const DARK   = '#0f0f1a';
export const MUTED  = '#6b7280';
export const HINT   = '#9ca3af';
export const BG     = '#f3f3f0';
export const CARD   = '#ffffff';
export const BORDER = '#e5e7eb';
export const BORD2  = '#d1d5db';
export const GREEN  = '#15803d';
export const GLIGHT = '#f0fdf4';
export const GBORD  = '#bbf7d0';
export const S      = { fontFamily: "'Plus Jakarta Sans', sans-serif" };

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
      return { label: t('boughtTickets.pendingPayment'), color: '#fffbeb', textColor: '#92400e', border: '#fde68a' };
    case 'PaymentPendingVerification':
      return { label: t(isSellerView ? 'myTicket.statusPaymentPendingVerificationSeller' : 'myTicket.statusPaymentPendingVerificationBuyer'), color: '#fffbeb', textColor: '#92400e', border: '#fde68a' };
    case 'PaymentReceived':
      return { label: t('boughtTickets.pending'), color: '#fffbeb', textColor: '#92400e', border: '#fde68a' };
    case 'TicketTransferred':
      return { label: t('boughtTickets.transferConfirmed'), color: '#e4edf7', textColor: '#1e3a5f', border: '#bfd3ea' };
    case 'DepositHold':
      return { label: t('boughtTickets.depositHold', { defaultValue: 'Fondos en escrow' }), color: '#f0ebff', textColor: '#6d28d9', border: '#ddd6fe' };
    case 'TransferringFund':
      return { label: t('boughtTickets.transferringFund', { defaultValue: 'Liberando fondos' }), color: '#f0ebff', textColor: '#6d28d9', border: '#ddd6fe' };
    case 'Completed':
      return { label: t('boughtTickets.completed'), color: '#f0fdf4', textColor: '#15803d', border: '#bbf7d0' };
    case 'Disputed':
      return { label: t('boughtTickets.disputed'), color: '#fef2f2', textColor: '#dc2626', border: '#fca5a5' };
    case 'Refunded':
      return { label: t('boughtTickets.refunded'), color: '#f9fafb', textColor: '#6b7280', border: '#e5e7eb' };
    case 'Cancelled':
      return { label: t('boughtTickets.cancelled'), color: '#f9fafb', textColor: '#6b7280', border: '#e5e7eb' };
    default:
      // Fallback for any raw API status not yet translated
      return { label: status, color: '#f9fafb', textColor: '#6b7280', border: '#e5e7eb' };
  }
}

// ─── Offer status → display info ─────────────────────────────────────────────
export function getOfferStatusInfo(
  status: string,
  t: (key: string) => string,
) {
  switch (status) {
    case 'accepted':  return { label: t('boughtTickets.offerStatusAccepted'),  color: '#f0ebff', textColor: '#6d28d9', border: '#ddd6fe' };
    case 'pending':   return { label: t('boughtTickets.offerStatusPending'),   color: '#fffbeb', textColor: '#92400e', border: '#fde68a' };
    case 'rejected':  return { label: t('boughtTickets.offerStatusRejected'),  color: '#fef2f2', textColor: '#dc2626', border: '#fca5a5' };
    case 'converted': return { label: t('boughtTickets.offerStatusConverted'), color: '#f0fdf4', textColor: '#15803d', border: '#bbf7d0' };
    case 'cancelled': return { label: t('boughtTickets.offerStatusCancelled'), color: '#f9fafb', textColor: '#6b7280', border: '#e5e7eb' };
    default:          return { label: status,                                  color: '#f9fafb', textColor: '#6b7280', border: '#e5e7eb' };
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
