import { Link } from 'react-router-dom';
import {
  AlertCircle,
  CheckCircle,
  Clock,
  CreditCard,
  Eye,
  Lock,
  SendHorizontal,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { PaymentCountdown } from '@/app/components/PaymentCountdown';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/app/components/ui/alert-dialog';
import { formatDate, formatDateTime } from '@/lib/format-date';
import { formatCurrency } from '@/lib/format-currency';
import { TransactionStatus } from '@/api/types';
import { ActionHero } from './ActionHero';
import { BankDetailsBlock } from './BankDetailsBlock';
import { EscrowTimeline } from './EscrowTimeline';
import { TransferTimeline } from './TransferTimeline';
import {
  BORDER,
  SURFACE,
  V,
  MUTED,
  AMBER,
  DESTRUCTIVE,
  S,
} from '@/lib/design-tokens';
import type { BuyerActionBlockProps } from './types';

export function BuyerActionBlock(props: BuyerActionBlockProps) {
  const { t } = useTranslation();
  const {
    effectiveStatus,
    effectiveCancellationReason,
    isManualPayment,
    paymentConfirmation,
    transaction,
    bankTransferConfig,
    isPaymentExpiredLocally,
    isUploading,
    uploadError,
    fileInputRef,
    onFileSelect,
    onTriggerUpload,
    onOpenPreview,
    isCancelling,
    onCancelTransaction,
    canOpenDispute,
    onOpenDispute,
    onOpenConfirmReceipt,
    copiedCbu,
    onCopyCbu,
    disputeId,
    onPaymentExpired,
  } = props;

  const isBankTransferPendingUpload = Boolean(
    bankTransferConfig &&
      !paymentConfirmation &&
      effectiveStatus === TransactionStatus.PendingPayment &&
      !isPaymentExpiredLocally
  );

  const payloadLabel =
    transaction.sellerSentPayloadType === 'ticketera'
      ? t('myTicket.sentAsTicketera')
      : transaction.sellerSentPayloadType === 'pdf_or_image'
        ? t('myTicket.sentAsPdfOrImage')
        : transaction.sellerSentPayloadType === 'other'
          ? transaction.sellerSentPayloadTypeOtherText?.trim() || t('myTicket.sentAsOther')
          : '';

  const depositLabel = transaction.depositReleaseAt
    ? formatDateTime(transaction.depositReleaseAt)
    : null;

  const eventDateLabel = formatDate(transaction.eventDate);

  const bankLabels = {
    bank: t('myTicket.bankName'),
    cbu: t('myTicket.cbu'),
    holder: t('myTicket.accountHolder'),
    cuit: t('myTicket.cuitCuil'),
    copy: t('myTicket.copy'),
    copied: t('myTicket.copied'),
  };

  const b2Verify =
    effectiveStatus === TransactionStatus.PaymentPendingVerification &&
    paymentConfirmation?.status === 'Pending';

  const b2Rejected = paymentConfirmation?.status === 'Rejected';

  return (
    <div className="space-y-4" style={S}>
      {isBankTransferPendingUpload && bankTransferConfig && (
        <ActionHero
          variant="blue"
          icon={<CreditCard className="h-5 w-5" />}
          title={t('transaction.hero.buyerBankTitle')}
          subtitle={t('transaction.hero.buyerBankSubtitle')}
        >
          <BankDetailsBlock
            bankName={bankTransferConfig.bankName}
            cbu={bankTransferConfig.cbu}
            holderName={bankTransferConfig.accountHolderName}
            cuit={bankTransferConfig.cuitCuil}
            copiedCbu={copiedCbu}
            onCopyCbu={onCopyCbu}
            labels={bankLabels}
          />
          <div className="mt-3 rounded-card border p-3" style={{ borderColor: BORDER, background: SURFACE }}>
            <p className="text-xs font-medium" style={{ color: MUTED }}>{t('transaction.hero.transferAmount')}</p>
            <p className="mt-0.5 text-lg font-bold" style={{ color: V }}>
              {formatCurrency(transaction.totalPaid.amount, transaction.totalPaid.currency)}
            </p>
          </div>
          <div className="mt-4 rounded-card border p-3" style={{ borderColor: BORDER, background: SURFACE }}>
            <PaymentCountdown
              expiresAt={transaction.paymentExpiresAt!}
              onExpired={onPaymentExpired}
            />
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,application/pdf"
            onChange={onFileSelect}
            className="hidden"
          />
          <button
            type="button"
            onClick={onTriggerUpload}
            disabled={isUploading}
            className="mt-4 w-full rounded-button py-3.5 text-sm font-bold text-white disabled:opacity-50"
            style={{ background: V }}
          >
            {isUploading ? (
              <span className="flex items-center justify-center gap-2">
                <LoadingSpinner size="sm" />
                {t('myTicket.uploading')}
              </span>
            ) : (
              t('myTicket.uploadPaymentConfirmation')
            )}
          </button>
          {uploadError && <p className="mt-2 text-xs font-medium text-red-600">{uploadError}</p>}
          <div className="mt-3 text-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className="text-xs font-semibold underline" style={{ color: MUTED }}>
                  {t('transaction.cancelButton')}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('transaction.cancelButton')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('transaction.cancelConfirm')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('myTicket.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      void onCancelTransaction();
                    }}
                    disabled={isCancelling}
                  >
                    {t('myTicket.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </ActionHero>
      )}

      {effectiveStatus === TransactionStatus.PendingPayment &&
        !isManualPayment &&
        !isPaymentExpiredLocally && (
          <ActionHero
            variant="blue"
            icon={<Clock className="h-5 w-5" />}
            title={t('transaction.hero.buyerGatewayTitle')}
            subtitle={t('transaction.hero.buyerGatewaySubtitle')}
          >
            {transaction.paymentExpiresAt && (
              <div className="mt-4 rounded-card border p-3" style={{ borderColor: BORDER }}>
                <PaymentCountdown
                  expiresAt={transaction.paymentExpiresAt}
                  onExpired={onPaymentExpired}
                />
              </div>
            )}
          </ActionHero>
        )}

      {b2Verify && (
        <ActionHero
          variant="amber"
          icon={<Clock className="h-5 w-5" />}
          title={t('transaction.hero.buyerVerifyingTitle')}
          subtitle={t('transaction.hero.buyerVerifyingSubtitle')}
          badge={t('transaction.hero.badgeWaiting')}
        >
          <p className="mt-2 text-sm" style={{ color: AMBER }}>
            {t('transaction.hero.proofSentStatus')}
          </p>
          <button
            type="button"
            onClick={onOpenPreview}
            className="mt-3 text-sm font-semibold underline"
            style={{ color: V }}
          >
            <span className="inline-flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {t('myTicket.viewConfirmation')}
            </span>
          </button>
          {paymentConfirmation?.originalFilename && (
            <p className="mt-1 text-xs" style={{ color: MUTED }}>
              {paymentConfirmation.originalFilename}
            </p>
          )}
          <div className="mt-4 text-center">
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <button type="button" className="text-xs font-semibold underline" style={{ color: DESTRUCTIVE }}>
                  {t('transaction.cancelButton')}
                </button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t('transaction.cancelButton')}</AlertDialogTitle>
                  <AlertDialogDescription>{t('transaction.cancelConfirm')}</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t('myTicket.cancel')}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => {
                      void onCancelTransaction();
                    }}
                    disabled={isCancelling}
                  >
                    {t('myTicket.confirm')}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </ActionHero>
      )}

      {b2Rejected && paymentConfirmation && (
        <ActionHero
          variant="red"
          icon={<AlertCircle className="h-5 w-5" />}
          title={t('myTicket.paymentConfirmationUploaded')}
          subtitle={paymentConfirmation.adminNotes || t('transaction.hero.paymentRejectedSubtitle')}
        />
      )}

      {effectiveStatus === TransactionStatus.PaymentReceived && (
        <ActionHero
          variant="blue"
          icon={<SendHorizontal className="h-5 w-5" />}
          title={t('transaction.hero.buyerPaymentReceivedTitle')}
          subtitle={t('transaction.hero.buyerPaymentReceivedSubtitle')}
        >
          <TransferTimeline role="buyer" effectiveStatus={effectiveStatus} />
          {canOpenDispute && (
            <button
              type="button"
              onClick={onOpenDispute}
              className="mt-4 w-full text-center text-xs font-semibold underline"
              style={{ color: MUTED }}
            >
              {t('myTicket.reportProblem')}
            </button>
          )}
        </ActionHero>
      )}

      {effectiveStatus === TransactionStatus.TicketTransferred && (
        <ActionHero
          variant="amber"
          icon={<AlertCircle className="h-5 w-5" />}
          title={t('transaction.hero.buyerConfirmReceiptTitle')}
          subtitle={t('transaction.hero.buyerConfirmReceiptSubtitle', {
            name: transaction.sellerName,
          })}
        >
          <TransferTimeline role="buyer" effectiveStatus={effectiveStatus} />
          {payloadLabel && (
            <p className="mt-4 rounded-card border p-3 text-sm" style={{ borderColor: BORDER, background: SURFACE }}>
              <span className="font-semibold">{t('myTicket.sentAs')}: </span>
              {payloadLabel}
            </p>
          )}
          <button
            type="button"
            onClick={onOpenConfirmReceipt}
            className="mt-4 w-full rounded-button py-3.5 text-sm font-bold text-white"
            style={{ background: V }}
          >
            {t('myTicket.confirmTicketReceived')}
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

      {effectiveStatus === TransactionStatus.DepositHold && (
        <ActionHero
          variant="violet"
          icon={<Lock className="h-5 w-5" />}
          title={t('transaction.hero.buyerEscrowTitle')}
          subtitle={t('transaction.hero.buyerEscrowSubtitle')}
          badge={t('transaction.hero.badgeProtected')}
        >
          <EscrowTimeline role="buyer" eventDateLabel={eventDateLabel} depositReleaseAtLabel={depositLabel} />
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

      {(effectiveStatus === TransactionStatus.Completed || effectiveStatus === TransactionStatus.TransferringFund) && (
        <ActionHero
          variant="green"
          icon={<CheckCircle className="h-5 w-5" />}
          title={t('transaction.hero.buyerCompletedTitle')}
          subtitle={t('transaction.hero.buyerCompletedSubtitle')}
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
          subtitle={t('transaction.hero.refundedSubtitleBuyer')}
        />
      )}

      {effectiveStatus === TransactionStatus.Cancelled && effectiveCancellationReason && (
        <ActionHero
          variant="muted"
          icon={<AlertCircle className="h-5 w-5" />}
          title={t('myTicket.statusCancelled')}
          subtitle={t(`transaction.cancelled.${effectiveCancellationReason}`)}
        />
      )}
    </div>
  );
}
