import { useTranslation } from 'react-i18next';
import { TransactionStatus } from '@/api/types';
import type { TransferTimelineProps, TimelineItemState } from './types';
import { TimelineItem } from './TimelineItem';

// ─── State derivation ───────────────────────────────────────────────────────

const SELLER_HAS_TRANSFERRED: TransactionStatus[] = [
  TransactionStatus.TicketTransferred,
  TransactionStatus.DepositHold,
  TransactionStatus.TransferringFund,
  TransactionStatus.Completed,
];

const BUYER_HAS_CONFIRMED: TransactionStatus[] = [
  TransactionStatus.DepositHold,
  TransactionStatus.TransferringFund,
  TransactionStatus.Completed,
];

// ─── Main component ─────────────────────────────────────────────────────────

export function TransferTimeline({ role, effectiveStatus, buyerName, deliveryMethod }: TransferTimelineProps) {
  const { t } = useTranslation();

  const sellerHasTransferred = SELLER_HAS_TRANSFERRED.includes(effectiveStatus);
  const buyerHasConfirmed    = BUYER_HAS_CONFIRMED.includes(effectiveStatus);

  if (role === 'seller') {
    const sentState: TimelineItemState = sellerHasTransferred ? 'done' : 'current';
    const receivedState: TimelineItemState = buyerHasConfirmed
      ? 'done'
      : sellerHasTransferred
        ? 'waiting'
        : 'pending';

    const sentSub = sellerHasTransferred
      ? (deliveryMethod
          ? t('transaction.transferTimeline.sentSub.sellerDone', { method: deliveryMethod })
          : undefined)
      : t('transaction.transferTimeline.sentSub.sellerNotYet');

    const receivedSub = (sellerHasTransferred && !buyerHasConfirmed && buyerName)
      ? t('transaction.transferTimeline.receivedSub.waiting', { name: buyerName })
      : undefined;

    return (
      <div style={{ marginTop: 16 }}>
        <TimelineItem state={sentState}     label={t('transaction.transferTimeline.sent')}     sub={sentSub} />
        <TimelineItem state={receivedState} label={t('transaction.transferTimeline.received')} sub={receivedSub} isLast />
      </div>
    );
  }

  // Buyer view
  const sentState: TimelineItemState = sellerHasTransferred ? 'done' : 'waiting';
  const receiptState: TimelineItemState = buyerHasConfirmed
    ? 'done'
    : sellerHasTransferred
      ? 'current'
      : 'pending';

  const sentSub = sellerHasTransferred
    ? t('transaction.transferTimeline.sentSub.buyerDone')
    : t('transaction.transferTimeline.sentSub.buyerWaiting');

  const receiptLabel = (sellerHasTransferred && !buyerHasConfirmed)
    ? t('transaction.transferTimeline.confirmReceipt')
    : t('transaction.transferTimeline.received');

  const receiptSub = (sellerHasTransferred && !buyerHasConfirmed)
    ? t('transaction.transferTimeline.confirmReceiptSub')
    : undefined;

  return (
    <div style={{ marginTop: 16 }}>
      <TimelineItem state={sentState}    label={t('transaction.transferTimeline.sent')} sub={sentSub} />
      <TimelineItem state={receiptState} label={receiptLabel}                            sub={receiptSub} isLast />
    </div>
  );
}
