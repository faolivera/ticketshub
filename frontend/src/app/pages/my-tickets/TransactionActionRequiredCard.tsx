import { Link } from 'react-router-dom';
import { AlertCircle, Ticket } from 'lucide-react';
import { formatDate } from '@/lib/format-date';
import { formatCurrency } from '@/lib/format-currency';
import type { TransactionWithDetails } from '@/api/types';
import { V, CARD, DARK, MUTED, HINT, S } from './transactionUtils';

function fmt(amount: number, currency: string) {
  return formatCurrency(amount, currency).replace(/[,.]00$/, '');
}

function Thumb({ url, name, size }: { url?: string | null; name: string; size: number }) {
  return (
    <div
      style={{
        width: size,
        flexShrink: 0,
        alignSelf: 'stretch',
        background: '#f5f3ff',
        overflow: 'hidden',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      {url ? (
        <img
          src={url}
          alt={name}
          style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
        />
      ) : (
        <Ticket size={size * 0.32} style={{ color: V, opacity: 0.4 }} />
      )}
    </div>
  );
}

function sectorLabel(sectionName: string, t: (k: string, o?: Record<string, string>) => string) {
  if (!sectionName || sectionName === 'General') {
    return t('boughtTickets.generalAdmission', { defaultValue: 'General' });
  }
  return sectionName;
}

export type TransactionActionRequiredVariant = 'buyer' | 'seller';

export interface TransactionActionRequiredCardProps {
  tx: TransactionWithDetails;
  variant: TransactionActionRequiredVariant;
  t: (k: string, o?: Record<string, string>) => string;
  linkFrom: string;
}

/**
 * Large action-required card shared between buyer (Mis entradas) and seller dashboard.
 * Same layout: accent bar, thumb, detail rows, full-width CTA.
 */
export function TransactionActionRequiredCard({ tx, variant, t, linkFrom }: TransactionActionRequiredCardProps) {
  const isBuyer = variant === 'buyer';
  const barColor = isBuyer ? V : '#f59e0b';
  const borderColor = isBuyer ? '#ddd6fe' : '#ddd6fe';
  const alertColor = isBuyer ? V : '#f59e0b';

  const buyerActions: Record<string, string> = {
    TicketTransferred: t('boughtTickets.action.confirmReceipt', { defaultValue: 'Confirmá que recibiste la entrada' }),
    PendingPayment: t('boughtTickets.action.completePayment', { defaultValue: 'Completá el pago para continuar' }),
    PaymentPendingVerification: t('boughtTickets.action.paymentVerifying', { defaultValue: 'Tu pago está siendo verificado' }),
    Disputed: t('boughtTickets.action.disputed', { defaultValue: 'Hay una disputa abierta' }),
  };
  const sellerActions: Record<string, string> = {
    TicketTransferred: t('sellerDashboard.action.waitingBuyerConfirm', { defaultValue: 'El comprador debe confirmar la recepción' }),
    PaymentReceived: t('sellerDashboard.action.transferTicket', { defaultValue: 'Tenés que transferir la entrada' }),
    PendingPayment: t('sellerDashboard.action.waitingPayment', { defaultValue: 'Esperando pago del comprador' }),
    PaymentPendingVerification: t('sellerDashboard.action.paymentPendingVerification', { defaultValue: 'Pago en verificación' }),
    DepositHold: t('sellerDashboard.action.depositHold', { defaultValue: 'Fondos protegidos — revisá la transacción' }),
    TransferringFund: t('sellerDashboard.action.transferringFund', { defaultValue: 'Liberando fondos — revisá la transacción' }),
    Disputed: t('sellerDashboard.action.disputed', { defaultValue: 'Hay una disputa abierta' }),
  };
  const what = isBuyer
    ? (buyerActions[tx.status as string] ?? t('boughtTickets.action.viewDetails', { defaultValue: 'Revisá la transacción' }))
    : (sellerActions[tx.status as string] ?? t('sellerDashboard.action.viewDetails', { defaultValue: 'Revisá la transacción' }));

  const qty = Math.max(1, tx.quantity || 1);
  const perTicket = fmt(Math.round(tx.ticketPrice.amount / qty), tx.ticketPrice.currency);
  const sector = sectorLabel(tx.sectionName ?? '', t);
  const counterpartyLabel = isBuyer
    ? t('boughtTickets.labelSeller', { defaultValue: 'Vendedor' })
    : t('sellerDashboard.labelBuyer', { defaultValue: 'Buyer' });
  const counterpartyName = isBuyer ? tx.sellerName : tx.buyerName;

  return (
    <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${borderColor}`, overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>
        <div style={{ display: 'flex', flexShrink: 0 }}>
          <div style={{ width: 3, alignSelf: 'stretch', background: barColor, flexShrink: 0 }} />
          <Thumb url={tx.bannerUrls?.square ?? tx.bannerUrls?.rectangle} name={tx.eventName} size={64} />
        </div>
        <div style={{ flex: 1, padding: '9px 12px', minWidth: 0 }}>
          <p
            style={{
              fontSize: 13.5,
              fontWeight: 800,
              color: DARK,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              marginBottom: 6,
              ...S,
            }}
          >
            {tx.eventName}
          </p>
          <p style={{ fontSize: 11.5, color: MUTED, marginBottom: 3, ...S }}>
            <span style={{ fontWeight: 600, color: HINT }}>{t('sellerDashboard.labelEventDate', { defaultValue: 'Event date' })}</span>
            {' · '}
            {formatDate(new Date(tx.eventDate))}
          </p>
          <p style={{ fontSize: 11.5, color: MUTED, marginBottom: 3, ...S }}>
            <span style={{ fontWeight: 600, color: HINT }}>{t('sellerDashboard.labelSector', { defaultValue: 'Sector' })}</span>
            {' · '}
            {sector}
          </p>
          <p style={{ fontSize: 11.5, color: MUTED, marginBottom: 3, ...S }}>
            <span style={{ fontWeight: 600, color: HINT }}>{t('sellerDashboard.labelTicketValue', { defaultValue: 'Ticket price' })}</span>
            {' · '}
            <span style={{ fontWeight: 700, color: DARK }}>{perTicket}</span>
            <span style={{ color: HINT }}>
              {' '}
              {t('sellerDashboard.perTicketAbbr', { defaultValue: '/ ticket' })}
            </span>
          </p>
          <p style={{ fontSize: 11.5, color: MUTED, marginBottom: 6, ...S }}>
            <span style={{ fontWeight: 600, color: HINT }}>{counterpartyLabel}</span>
            {' · '}
            <span style={{ fontWeight: 700, color: DARK }}>{counterpartyName}</span>
          </p>
          <p style={{ fontSize: 12, color: MUTED, display: 'flex', alignItems: 'flex-start', gap: 5, ...S }}>
            <AlertCircle size={12} style={{ color: alertColor, flexShrink: 0, marginTop: 1 }} />
            {what}
          </p>
        </div>
      </div>
      <Link to={`/transaction/${tx.id}`} state={{ from: linkFrom }} style={{ textDecoration: 'none' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 6,
            padding: '10px 11px',
            borderTop: '1px solid #f0ebff',
            background: V,
            color: CARD,
            fontSize: 13,
            fontWeight: 700,
            ...S,
          }}
        >
          {t('sellerDashboard.viewTransaction', { defaultValue: 'View transaction' })} →
        </div>
      </Link>
    </div>
  );
}
