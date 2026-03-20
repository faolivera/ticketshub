import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';
import { Ticket } from 'lucide-react';
import type { TransactionWithDetails } from '@/api/types';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate } from '@/lib/format-date';
import {
  getTransactionStatusInfo,
  getWaitingForLabel,
  TERMINAL_STATUSES,
} from './transactionUtils';
import {
  V,
  VLIGHT,
  DARK,
  MUTED,
  HINT,
  BG,
  CARD,
  BORDER,
  BORD2,
  GREEN,
  GLIGHT,
  PENDING,
  S,
} from '@/lib/design-tokens';

export type TransactionCardVariant = 'action' | 'waiting' | 'completed';

export interface TransactionCardProps {
  transaction: TransactionWithDetails;
  userId:      string | undefined;
  role:        'buyer' | 'seller';
  variant:     TransactionCardVariant;
  fromUrl:     string;
}

// ─── Thumbnail — renders bannerUrl or a violet fallback ───────────────────────
function Thumb({ size, tx }: { size: number; tx: TransactionWithDetails }) {
  const url = tx.bannerUrls?.square || tx.bannerUrls?.rectangle;
  return (
    <div style={{
      width: size, minHeight: size, flexShrink: 0,
      background: url ? 'transparent' : VLIGHT,
      overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url ? (
        <img
          src={url}
          alt={tx.eventName}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', inset: 0 }}
        />
      ) : (
        <Ticket size={size * 0.35} style={{ color: V, opacity: 0.5 }} />
      )}
    </div>
  );
}

// ─── ACTION — horizontal row, violet border, CTA visible ─────────────────────
function ActionCard({ transaction: tx, userId, role, fromUrl }: Omit<TransactionCardProps, 'variant'>) {
  const { t }        = useTranslation();
  const [hov, setHov]= useState(false);
  const status       = getTransactionStatusInfo(tx.status, t, role === 'seller');
  const waiting      = getWaitingForLabel(tx.requiredActor, t);
  const price        = tx.pricePerTicket ? formatCurrency(tx.pricePerTicket.amount, tx.pricePerTicket.currency) : null;

  return (
    <Link to={`/transaction/${tx.id}`} state={{ from: fromUrl }} style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        display: 'flex', background: CARD, borderRadius: 16,
        border: `1.5px solid ${V}`, overflow: 'hidden',
        boxShadow: hov ? '0 4px 16px rgba(109,40,217,0.12)' : 'none',
        transition: 'box-shadow 0.15s',
      }}>
        <Thumb size={88} tx={tx} />
        <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minWidth: 0 }}>
          <div>
            <p style={{ fontSize: 14.5, fontWeight: 800, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4, ...S }}>
              {tx.eventName}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 6 }}>
              <span style={{ fontSize: 12.5, color: MUTED, ...S }}>{formatDate(new Date(tx.eventDate))}</span>
              {tx.ticketType && (
                <span style={{ fontSize: 11.5, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: VLIGHT, color: V, border: '1px solid #ddd6fe', ...S }}>
                  {tx.ticketType}
                </span>
              )}
              {price && <span style={{ fontSize: 13, fontWeight: 800, color: V, ...S }}>{price}</span>}
            </div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5, fontWeight: 600, color: V, overflow: 'hidden', ...S }}>
              <Clock size={12} style={{ flexShrink: 0 }} />
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{status.label}</span>
            </div>
            <div style={{
              padding: '7px 14px', borderRadius: 9,
              background: V, color: 'white',
              fontSize: 12.5, fontWeight: 700, flexShrink: 0, ...S,
            }}>
              Ver →
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── WAITING — slim row, muted ────────────────────────────────────────────────
function WaitingCard({ transaction: tx, userId, role, fromUrl }: Omit<TransactionCardProps, 'variant'>) {
  const { t }        = useTranslation();
  const [hov, setHov]= useState(false);
  const status       = getTransactionStatusInfo(tx.status, t, role === 'seller');
  const waiting      = getWaitingForLabel(tx.requiredActor, t);
  const price        = tx.pricePerTicket ? formatCurrency(tx.pricePerTicket.amount, tx.pricePerTicket.currency) : null;

  return (
    <Link to={`/transaction/${tx.id}`} state={{ from: fromUrl }} style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        display: 'flex', background: CARD, borderRadius: 13,
        border: `1px solid ${hov ? BORD2 : BORDER}`, overflow: 'hidden',
        transition: 'border-color 0.14s',
      }}>
        <Thumb size={66} tx={tx} />
        <div style={{ flex: 1, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 14, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2, ...S }}>
              {tx.eventName}
            </p>
            <p style={{ fontSize: 12.5, color: MUTED, ...S }}>
              {formatDate(new Date(tx.eventDate))}
              {tx.ticketType && ` · ${tx.ticketType}`}
              {price && <span style={{ fontWeight: 700, color: DARK }}> · {price}</span>}
            </p>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: HINT, ...S }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: PENDING, flexShrink: 0 }} />
            <span style={{ whiteSpace: 'nowrap' }}>{waiting || status.label}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── COMPLETED — compact card for grid ───────────────────────────────────────
function CompletedCard({ transaction: tx, role, fromUrl }: Omit<TransactionCardProps, 'variant' | 'userId'>) {
  const { t }        = useTranslation();
  const [hov, setHov]= useState(false);
  const status       = getTransactionStatusInfo(tx.status, t, role === 'seller');
  const url          = tx.bannerUrls?.rectangle || tx.bannerUrls?.square;

  return (
    <Link to={`/transaction/${tx.id}`} state={{ from: fromUrl }} style={{ textDecoration: 'none' }}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
      <div style={{
        background: CARD, borderRadius: 14,
        border: `1px solid ${hov ? BORD2 : BORDER}`, overflow: 'hidden',
        transition: 'border-color 0.14s',
      }}>
        {/* Image */}
        <div style={{ height: 80, background: VLIGHT, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {url ? (
            <img src={url} alt={tx.eventName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block',
                filter: (tx.status === 'Completed' || (tx.status === 'TransferringFund' && role === 'buyer')) ? 'none' : 'grayscale(0.4)',
                opacity: (tx.status === 'Completed' || (tx.status === 'TransferringFund' && role === 'buyer')) ? 1 : 0.75,
              }} />
          ) : (
            <Ticket size={28} style={{ color: V, opacity: 0.4 }} />
          )}
        </div>
        {/* Body */}
        <div style={{ padding: '10px 12px' }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 5, ...S }}>
            {tx.eventName}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
            <span style={{ fontSize: 12, color: MUTED, ...S }}>{formatDate(new Date(tx.eventDate))}</span>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
              background: status.color, color: status.textColor, border: `1px solid ${status.border}`,
              whiteSpace: 'nowrap', flexShrink: 0, ...S,
            }}>
              {status.label}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export function TransactionCard(props: TransactionCardProps) {
  switch (props.variant) {
    case 'action':    return <ActionCard    {...props} />;
    case 'waiting':   return <WaitingCard   {...props} />;
    case 'completed': return <CompletedCard {...props} />;
  }
}
