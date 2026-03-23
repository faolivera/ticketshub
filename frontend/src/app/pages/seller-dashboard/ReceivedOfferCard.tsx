import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Ticket, Check, X } from 'lucide-react';
import type { OfferWithReceivedContext } from '@/api/types';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate }     from '@/lib/format-date';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { getOfferStatusInfo } from '@/app/pages/my-tickets/transactionUtils';
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
  S,
  R_CARD,
  R_BUTTON,
} from '@/lib/design-tokens';

export interface ReceivedOfferCardProps {
  offer:        OfferWithReceivedContext;
  onAccept:     (offerId: string) => void;
  onReject:     (offerId: string) => void;
  isProcessing: boolean;
}

function DesktopThumb({ ctx, size }: { ctx: OfferWithReceivedContext['receivedContext']; size: number }) {
  const url = ctx.bannerUrls?.square || ctx.bannerUrls?.rectangle;
  return (
    <div style={{
      width: size,
      height: size,
      flexShrink: 0,
      alignSelf: 'flex-start',
      background: url ? 'transparent' : VLIGHT,
      overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url ? (
        <img src={url} alt={ctx.eventName}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', position: 'absolute', inset: 0 }} />
      ) : (
        <Ticket size={size * 0.35} style={{ color: V, opacity: 0.4 }} />
      )}
    </div>
  );
}

export function ReceivedOfferCard({ offer, onAccept, onReject, isProcessing }: ReceivedOfferCardProps) {
  const { t }         = useTranslation();
  const isMobile      = useIsMobile();
  const thumbSize     = 112;
  const [hov, setHov] = useState(false);
  const ctx           = offer.receivedContext;
  const statusInfo    = getOfferStatusInfo(offer.status, t);
  const isPending     = offer.status === 'pending';
  const bannerUrl     = ctx.bannerUrls?.square || ctx.bannerUrls?.rectangle;
  const barColor      = isPending ? V : BORD2;

  const ticketLabel = offer.tickets.type === 'numbered'
    ? `${offer.tickets.seats.length} ${offer.tickets.seats.length === 1 ? t('boughtTickets.seat') : t('boughtTickets.seats')}`
    : `${offer.tickets.count} ${offer.tickets.count === 1 ? t('boughtTickets.ticket') : t('boughtTickets.tickets')}`;

  const listingPrice = formatCurrency(ctx.listingPrice.amount, ctx.listingPrice.currency);
  const offeredPrice = formatCurrency(offer.offeredPrice.amount, offer.offeredPrice.currency);

  // Percentage discount
  const discount = ctx.listingPrice.amount > 0
    ? Math.round((1 - offer.offeredPrice.amount / ctx.listingPrice.amount) * 100)
    : 0;

  return (
    <div
      style={{
        background: CARD, borderRadius: R_CARD,
        border: `1px solid ${isPending ? '#ddd6fe' : BORDER}`,
        overflow: 'hidden',
        boxShadow: hov && isPending ? '0 4px 16px rgba(109,40,217,0.08)' : 'none',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Header: same pattern as TransactionActionRequiredCard / Mis entradas offers */}
      <div style={{ display: 'flex', alignItems: isMobile ? 'stretch' : 'flex-start' }}>
        {isMobile ? (
          <div
            style={{
              display: 'flex',
              flexDirection: 'row',
              flexShrink: 0,
              alignSelf: 'stretch',
              minHeight: 0,
            }}
          >
            <div style={{ width: 3, alignSelf: 'stretch', background: barColor, flexShrink: 0 }} />
            <div
              style={{
                width: 'clamp(72px, 26vw, 100px)',
                flexShrink: 0,
                alignSelf: 'stretch',
                background: VLIGHT,
                overflow: 'hidden',
                position: 'relative',
              }}
            >
              {bannerUrl ? (
                <img
                  src={bannerUrl}
                  alt={ctx.eventName}
                  style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', position: 'absolute', inset: 0 }}
                />
              ) : (
                <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ticket size={28} style={{ color: V, opacity: 0.4 }} />
                </div>
              )}
            </div>
          </div>
        ) : (
          <>
            <div style={{ width: 3, alignSelf: 'stretch', background: barColor, flexShrink: 0 }} />
            <DesktopThumb ctx={ctx} size={thumbSize} />
          </>
        )}
        <div style={{ flex: 1, padding: '11px 14px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>
              {ctx.eventName}
            </p>
            <span style={{
              fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, flexShrink: 0,
              background: statusInfo.color, color: statusInfo.textColor, border: `1px solid ${statusInfo.border}`, ...S,
            }}>
              {statusInfo.label}
            </span>
          </div>
          <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 2, ...S }}>
            {formatDate(new Date(ctx.eventDate))} · {ticketLabel}
          </p>
          <p style={{ fontSize: 12.5, color: MUTED, ...S }}>
            {t('sellerDashboard.fromBuyer')}{' '}
            <span style={{ fontWeight: 700, color: DARK }}>{ctx.buyerName}</span>
          </p>
        </div>
      </div>

      {/* Price comparison */}
      <div style={{ padding: '10px 14px', borderTop: `1px solid ${BORDER}`, background: BG, display: 'flex', alignItems: 'center', gap: 16 }}>
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, ...S }}>
            {t('sellerDashboard.listingPrice')}
          </p>
          <p style={{ fontSize: 14, fontWeight: 700, color: DARK, ...S }}>{listingPrice}</p>
        </div>
        <div style={{ width: 1, height: 32, background: BORDER }} />
        <div>
          <p style={{ fontSize: 10.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2, ...S }}>
            {t('sellerDashboard.offeredPrice')}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <p style={{ fontSize: 14, fontWeight: 800, color: V, ...S }}>{offeredPrice}</p>
            {discount > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '1px 6px', borderRadius: 100, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', ...S }}>
                −{discount}%
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Accept / Reject — only when pending */}
      {isPending && (
        <div style={{ padding: '10px 14px', display: 'flex', gap: 8 }}>
          <button
            type="button"
            onClick={() => onAccept(offer.id)}
            disabled={isProcessing}
            style={{
              flex: 1, padding: '10px 0', borderRadius: R_BUTTON, border: 'none',
              background: isProcessing ? BORD2 : V, color: 'white',
              fontSize: 13.5, fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'background 0.14s', ...S,
            }}
          >
            {isProcessing ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Check size={14} />}
            {t('boughtTickets.acceptOffer')}
          </button>
          <button
            type="button"
            onClick={() => onReject(offer.id)}
            disabled={isProcessing}
            style={{
              flex: 1, padding: '10px 0', borderRadius: R_BUTTON,
              background: CARD, color: MUTED,
              border: `1px solid ${BORD2}`,
              fontSize: 13.5, fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              transition: 'all 0.14s', ...S,
            }}
          >
            <X size={14} />
            {t('boughtTickets.rejectOffer')}
          </button>
        </div>
      )}
    </div>
  );
}
