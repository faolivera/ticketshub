import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  Lock,
  Upload,
  X,
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
  VLIGHT,
  MUTED,
  BORDER,
  BORD2,
  BG,
  HINT,
  SURFACE,
  GBORD,
  GLIGHT,
  GREEN,
  SUCCESS,
  DESTRUCTIVE,
  DARK,
  S,
  R_INPUT,
} from '@/lib/design-tokens';
import type { SellerActionBlockProps } from './types';

export function SellerActionBlock(props: SellerActionBlockProps) {
  const { t } = useTranslation();
  const {
    effectiveStatus,
    transaction,
    canOpenDispute,
    onOpenDispute,
    onOpenTransferModal,
    isSellerUnverifiedGate,
    transferProofFile,
    transferProofPreview,
    isUploadingTransferProof,
    transferProofError,
    onTransferProofSelect,
    onTransferProofRemove,
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
    transaction.sellerReceives!.amount,
    transaction.sellerReceives!.currency
  );
  const priceFormatted = formatCurrency(
    transaction.ticketPrice.amount,
    transaction.ticketPrice.currency
  );
  const commissionFormatted = formatCurrency(
    transaction.sellerPlatformFee!.amount,
    transaction.sellerPlatformFee!.currency
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
            className="mb-4 space-y-1 rounded-card border p-3 text-sm"
            style={{ borderColor: ABORD, background: ABG }}
          >
            <p className="font-semibold" style={{ color: AMBER }}>
              {t('myTicket.buyerDisclaimerTitle')}
            </p>
            <p style={{ color: DARK }}>{t('myTicket.buyerDisclaimerName', { name: transaction.buyerName })}</p>
            {transaction.buyerDeliveryEmail && (
              <p style={{ color: DARK }}>{t('myTicket.buyerDisclaimerEmail', { email: transaction.buyerDeliveryEmail })}</p>
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
            className="mt-4 w-full rounded-button py-3.5 text-sm font-bold text-white"
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
          <div className="mt-4 rounded-card border p-4" style={{ borderColor: BORDER }}>
            <p style={{ fontSize: 11.5, fontWeight: 700, color: HINT, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }}>
              {t('myTicket.attachTransferProofAfterTransfer')}
            </p>
            {transaction.transferProofStorageKey ? (
              <p style={{ marginTop: 8, fontSize: 14, color: SUCCESS }}>{t('myTicket.transferProofUploaded')}</p>
            ) : (
              <>
                {transferProofFile ? (
                  <div style={{ position: 'relative', marginBottom: 8 }}>
                    {transferProofPreview ? (
                      <img
                        src={transferProofPreview}
                        alt=""
                        style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: R_INPUT, border: `1px solid ${BORDER}`, display: 'block' }}
                      />
                    ) : (
                      <div style={{ height: 120, borderRadius: R_INPUT, border: `1px solid ${BORDER}`, background: BG, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 6 }}>
                        <Upload size={20} style={{ color: HINT }} />
                        <p style={{ fontSize: 13, color: DARK, maxWidth: '80%', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{transferProofFile.name}</p>
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={onTransferProofRemove}
                      style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: '#dc2626', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={13} color="white" />
                    </button>
                  </div>
                ) : (
                  <label
                    className="mb-2 flex h-28 cursor-pointer flex-col items-center justify-center rounded-input border-2 border-dashed transition-all"
                    style={{ borderColor: BORD2, background: BG }}
                    onMouseEnter={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = V; (e.currentTarget as HTMLLabelElement).style.background = VLIGHT; }}
                    onMouseLeave={e => { (e.currentTarget as HTMLLabelElement).style.borderColor = BORD2; (e.currentTarget as HTMLLabelElement).style.background = BG; }}
                  >
                    <Upload size={20} style={{ color: HINT, marginBottom: 7 }} />
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK, marginBottom: 2 }}>{t('myTicket.uploadFile')}</p>
                    <p style={{ fontSize: 11.5, color: HINT }}>JPG, PNG, PDF</p>
                    <input
                      ref={fileInputTransferRef}
                      type="file"
                      accept="image/*,application/pdf"
                      className="hidden"
                      onChange={onTransferProofSelect}
                    />
                  </label>
                )}
                {transferProofError && <p className="mb-2 text-xs text-red-600">{transferProofError}</p>}
                {transferProofFile && (
                  <button
                    type="button"
                    disabled={isUploadingTransferProof}
                    onClick={onUploadTransferProof}
                    className="mt-2 w-full rounded-button py-2.5 text-sm font-bold text-white disabled:opacity-50"
                    style={{ background: V }}
                  >
                    {isUploadingTransferProof ? t('myTicket.confirmingTransfer') : t('myTicket.uploadTransferProof')}
                  </button>
                )}
              </>
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
              className="mt-4 rounded-card border p-3 text-sm"
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
          variant="green"
          icon={<CheckCircle className="h-5 w-5" />}
          title={t('transaction.hero.sellerFundsReleasedTitle')}
          subtitle={t('transaction.hero.sellerFundsReleasedSubtitle', { amount: netFormatted })}
        >
          <div
            className="mt-4 space-y-2 rounded-card border p-4 text-sm"
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
        </ActionHero>
      )}

      {effectiveStatus === TransactionStatus.Completed && (
        <ActionHero
          variant="green"
          icon={<CheckCircle className="h-5 w-5" />}
          title={t('transaction.hero.sellerCompletedTitle')}
          subtitle={t('transaction.hero.sellerCompletedSubtitle')}
        />
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
