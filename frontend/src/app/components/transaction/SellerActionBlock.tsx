import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Lock,
  Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { TransactionStatus } from '@/api/types';
import { ActionHero } from './ActionHero';
import { EscrowTimeline } from './EscrowTimeline';
import { TransferTimeline } from './TransferTimeline';
import {
  ABORD,
  ABG,
  AMBER,
  V,
  MUTED,
  BORDER,
  SURFACE,
  GBORD,
  GLIGHT,
  GREEN,
  DESTRUCTIVE,
  DARK,
  S,
} from '@/lib/design-tokens';
import type { SellerActionBlockProps } from './types';

export function SellerActionBlock(props: SellerActionBlockProps) {
  const { t } = useTranslation();
  const {
    effectiveStatus,
    transaction,
    counterpartyEmail,
    canOpenDispute,
    onOpenDispute,
    onOpenTransferModal,
    isSellerUnverifiedGate,
    reviewData,
    selectedRating,
    onRatingSelect,
    reviewComment,
    onReviewCommentChange,
    onSubmitReview,
    isSubmittingReview,
    reviewError,
    getRatingIcon,
    getRatingColor,
    transferProofFile,
    isUploadingTransferProof,
    transferProofError,
    onTransferProofSelect,
    fileInputTransferRef,
    onUploadTransferProof,
    disputeId,
  } = props;

  const eventDateLabel = formatDate(transaction.eventDate);
  const depositLabel = transaction.depositReleaseAt
    ? formatDateTime(transaction.depositReleaseAt)
    : null;

  const payloadLabel =
    transaction.sellerSentPayloadType === 'ticketera'
      ? t('myTicket.sentAsTicketera')
      : transaction.sellerSentPayloadType === 'pdf_or_image'
        ? t('myTicket.sentAsPdfOrImage')
        : transaction.sellerSentPayloadType === 'other'
          ? transaction.sellerSentPayloadTypeOtherText?.trim() || t('myTicket.sentAsOther')
          : '';

  const netFormatted = formatCurrency(
    transaction.sellerReceives.amount,
    transaction.sellerReceives.currency
  );
  const priceFormatted = formatCurrency(
    transaction.ticketPrice.amount,
    transaction.ticketPrice.currency
  );
  const commissionFormatted = formatCurrency(
    transaction.sellerPlatformFee.amount,
    transaction.sellerPlatformFee.currency
  );

  if (isSellerUnverifiedGate) {
    return null;
  }

  return (
    <div className="space-y-4" style={S}>
      {effectiveStatus === TransactionStatus.PendingPayment && (
        <ActionHero
          variant="amber"
          icon={<Clock className="h-5 w-5" />}
          title={t('transaction.hero.sellerAwaitPaymentTitle')}
          subtitle={t('transaction.hero.sellerAwaitPaymentSubtitle')}
        />
      )}

      {effectiveStatus === TransactionStatus.PaymentPendingVerification && (
        <ActionHero
          variant="amber"
          icon={<Clock className="h-5 w-5" />}
          title={t('transaction.hero.sellerVerifyingTitle')}
          subtitle={t('transaction.hero.sellerVerifyingSubtitle')}
        />
      )}

      {effectiveStatus === TransactionStatus.PaymentReceived && (
        <ActionHero
          variant="amber"
          icon={<Zap className="h-5 w-5" />}
          title={t('transaction.hero.sellerTransferTitle')}
          subtitle={t('transaction.hero.sellerTransferSubtitle', {
            name: transaction.buyerName,
          })}
        >
          <div
            className="mb-4 space-y-1 rounded-xl border p-3 text-sm"
            style={{ borderColor: ABORD, background: ABG }}
          >
            <p className="font-semibold" style={{ color: AMBER }}>
              {t('myTicket.buyerDisclaimerTitle')}
            </p>
            <p style={{ color: DARK }}>{t('myTicket.buyerDisclaimerName', { name: transaction.buyerName })}</p>
            {counterpartyEmail && (
              <p style={{ color: DARK }}>
                {t('myTicket.buyerDisclaimerEmail', { email: counterpartyEmail })}
              </p>
            )}
          </div>
          <TransferTimeline
            role="seller"
            effectiveStatus={effectiveStatus}
            buyerName={transaction.buyerName}
            deliveryMethod={payloadLabel || undefined}
          />
          <button
            type="button"
            onClick={onOpenTransferModal}
            className="mt-4 w-full rounded-[10px] py-3.5 text-sm font-bold text-white"
            style={{ background: V }}
          >
            {t('myTicket.confirmTicketTransferred')}
          </button>
          {canOpenDispute && (
            <button
              type="button"
              onClick={onOpenDispute}
              className="mt-3 w-full text-center text-xs font-semibold underline"
              style={{ color: MUTED }}
            >
              {t('myTicket.reportProblem')}
            </button>
          )}
        </ActionHero>
      )}

      {effectiveStatus === TransactionStatus.TicketTransferred && (
        <ActionHero
          variant="violet"
          icon={<Clock className="h-5 w-5" />}
          title={t('transaction.hero.sellerAwaitConfirmTitle')}
          subtitle={t('transaction.hero.sellerAwaitConfirmSubtitle', {
            name: transaction.buyerName,
          })}
          badge={t('transaction.hero.badgeWaiting')}
        >
          <TransferTimeline
            role="seller"
            effectiveStatus={effectiveStatus}
            buyerName={transaction.buyerName}
            deliveryMethod={payloadLabel || undefined}
          />
          <div className="mt-4 rounded-xl border p-4" style={{ borderColor: BORDER }}>
            <label className="mb-2 block text-sm font-medium">{t('myTicket.attachTransferProofAfterTransfer')}</label>
            <input
              ref={fileInputTransferRef}
              type="file"
              accept="image/*,application/pdf"
              onChange={onTransferProofSelect}
              className="w-full text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-violet-50 file:px-4 file:py-2 file:text-violet-700"
            />
            {transferProofFile && (
              <p className="mt-1 text-xs" style={{ color: MUTED }}>
                {transferProofFile.name}
              </p>
            )}
            {transferProofError && <p className="mt-1 text-xs text-red-600">{transferProofError}</p>}
            {transaction.transferProofStorageKey && (
              <p className="mt-2 text-sm text-green-700">{t('myTicket.transferProofUploaded')}</p>
            )}
            {transferProofFile && (
              <button
                type="button"
                disabled={isUploadingTransferProof}
                onClick={onUploadTransferProof}
                className="mt-2 w-full rounded-[10px] py-2.5 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: V }}
              >
                {isUploadingTransferProof ? t('myTicket.confirmingTransfer') : t('myTicket.uploadTransferProof')}
              </button>
            )}
          </div>
          {canOpenDispute && (
            <button
              type="button"
              onClick={onOpenDispute}
              className="mt-4 text-sm font-semibold underline"
              style={{ color: V }}
            >
              {t('myTicket.reportProblem')}
            </button>
          )}
        </ActionHero>
      )}

      {effectiveStatus === TransactionStatus.DepositHold && (
        <ActionHero
          variant="violet"
          icon={<Lock className="h-5 w-5" />}
          title={t('transaction.hero.sellerEscrowHoldTitle')}
          subtitle={t('transaction.hero.sellerAwaitConfirmSubtitle', {
            name: transaction.buyerName,
          })}
          badge={t('transaction.hero.badgeProtected')}
        >
          <EscrowTimeline
            role="seller"
            eventDateLabel={eventDateLabel}
            depositReleaseAtLabel={depositLabel}
          />
          {payloadLabel && (
            <p
              className="mt-4 rounded-lg border p-3 text-sm"
              style={{ borderColor: BORDER, background: SURFACE }}
            >
              <span className="font-semibold">{t('transaction.hero.sentAsLabel')} </span>
              {payloadLabel}
            </p>
          )}
          {canOpenDispute && (
            <button
              type="button"
              onClick={onOpenDispute}
              className="mt-4 text-sm font-semibold underline"
              style={{ color: V }}
            >
              {t('myTicket.reportProblem')}
            </button>
          )}
        </ActionHero>
      )}

      {effectiveStatus === TransactionStatus.TransferringFund && (
        <ActionHero
          variant="violet"
          icon={<Clock className="h-5 w-5" />}
          title={t('transaction.hero.sellerReleasingTitle')}
          subtitle={t('transaction.hero.sellerReleasingSubtitle')}
        />
      )}

      {effectiveStatus === TransactionStatus.Completed && (
        <ActionHero
          variant="green"
          icon={<CheckCircle className="h-5 w-5" />}
          title={t('transaction.hero.sellerFundsReleasedTitle')}
          subtitle={t('transaction.hero.sellerFundsReleasedSubtitle', { amount: netFormatted })}
        >
          <div
            className="mt-4 space-y-2 rounded-xl border p-4 text-sm"
            style={{ borderColor: GBORD, background: GLIGHT }}
          >
            <div className="flex justify-between">
              <span style={{ color: MUTED }}>{t('myTicket.ticketPriceTotal')}</span>
              <span className="font-medium">{priceFormatted}</span>
            </div>
            <div className="flex justify-between">
              <span style={{ color: MUTED }}>{t('myTicket.sellerPlatformFee')}</span>
              <span className="font-medium text-red-600">-{commissionFormatted}</span>
            </div>
            <div className="flex justify-between border-t pt-2 font-bold" style={{ borderColor: GBORD }}>
              <span>{t('myTicket.youReceive')}</span>
              <span style={{ color: GREEN }}>{netFormatted}</span>
            </div>
          </div>
          {reviewData?.canReview && !reviewData.sellerReview && (
            <div className="mt-4 space-y-3 rounded-xl border p-4" style={{ borderColor: BORDER }}>
              <p className="text-sm" style={{ color: MUTED }}>
                {t('reviews.leaveReviewDesc')}
              </p>
              <div className="flex gap-2">
                {(['positive', 'neutral', 'negative'] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => onRatingSelect(r)}
                    className={`flex flex-1 flex-col items-center gap-1 rounded-lg border-2 p-2 text-xs ${getRatingColor(r, selectedRating === r)}`}
                  >
                    {getRatingIcon(r)}
                    {t(`reviews.${r}`)}
                  </button>
                ))}
              </div>
              <textarea
                value={reviewComment}
                onChange={(e) => onReviewCommentChange(e.target.value)}
                placeholder={t('reviews.commentPlaceholder')}
                className="w-full rounded-lg border p-2 text-sm"
                rows={2}
                style={{ borderColor: BORDER }}
              />
              {reviewError && <p className="text-xs text-red-600">{reviewError}</p>}
              <button
                type="button"
                onClick={onSubmitReview}
                disabled={!selectedRating || isSubmittingReview}
                className="w-full rounded-[10px] py-3 text-sm font-bold text-white disabled:opacity-50"
                style={{ background: V }}
              >
                {isSubmittingReview ? t('reviews.submitting') : t('reviews.submitReview')}
              </button>
            </div>
          )}
        </ActionHero>
      )}

      {effectiveStatus === TransactionStatus.Disputed && disputeId && (
        <ActionHero
          variant="red"
          icon={<AlertCircle className="h-5 w-5" />}
          title={t('myTicket.statusDisputed')}
          subtitle={t('myTicket.statusDisputedDesc')}
        >
          <Link
            to={`/support/${disputeId}`}
            className="mt-3 inline-block text-sm font-bold underline"
            style={{ color: DESTRUCTIVE }}
          >
            {t('myTicket.viewSupportCase')}
          </Link>
        </ActionHero>
      )}

      {effectiveStatus === TransactionStatus.Refunded && (
        <ActionHero
          variant="muted"
          icon={<CheckCircle className="h-5 w-5" />}
          title={t('transaction.hero.refundedTitle')}
          subtitle={t('transaction.hero.refundedSubtitleSeller')}
        />
      )}

      {effectiveStatus === TransactionStatus.Cancelled && (
        <ActionHero
          variant="muted"
          icon={<AlertCircle className="h-5 w-5" />}
          title={t('transaction.hero.sellerCancelledTitle')}
          subtitle={t('transaction.hero.sellerCancelledSubtitle')}
        />
      )}
    </div>
  );
}
