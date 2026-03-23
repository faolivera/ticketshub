import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Ticket } from 'lucide-react';
import type { OfferWithListingSummary } from '@/api/types';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate }     from '@/lib/format-date';
import { getOfferStatusInfo } from './transactionUtils';
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
  PENDING,
  SUCCESS,
  DESTRUCTIVE,
  S,
  R_CARD,
  R_BUTTON,
} from '@/lib/design-tokens';

export interface OfferCardProps {
  offer: OfferWithListingSummary;
}

function Thumb({ size, summary, grayscale }: {
  size: number;
  summary: OfferWithListingSummary['listingSummary'];
  grayscale?: boolean;
}) {
  const url = summary.bannerUrls?.square || summary.bannerUrls?.rectangle;
  return (
    <div style={{
      width: size, minHeight: size, flexShrink: 0,
      background: url ? 'transparent' : VLIGHT,
      overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url ? (
        <img src={url} alt={summary.eventName}
          style={{
            width: '100%', height: '100%', objectFit: 'cover',
            display: 'block', position: 'absolute', inset: 0,
            filter: grayscale ? 'grayscale(1)' : 'none',
          }} />
      ) : (
        <Ticket size={size * 0.35} style={{ color: V, opacity: 0.4 }} />
      )}
    </div>
  );
}

export function OfferCard({ offer }: OfferCardProps) {
  const { t }         = useTranslation();
  const [hov, setHov] = useState(false);
  const summary       = offer.listingSummary;
  const statusInfo    = getOfferStatusInfo(offer.status, t);
  const offeredPrice  = formatCurrency(offer.offeredPrice.amount, offer.offeredPrice.currency);
  const eventDate     = new Date(summary.eventDate);

  const ticketLabel = offer.tickets.type === 'numbered'
    ? `${offer.tickets.seats.length} ${offer.tickets.seats.length === 1 ? t('boughtTickets.seat') : t('boughtTickets.seats')}`
    : `${offer.tickets.count} ${offer.tickets.count === 1 ? t('boughtTickets.ticket') : t('boughtTickets.tickets')}`;

  const to = offer.status === 'accepted'
    ? `/buy/${summary.eventSlug}/${offer.listingId}?offerId=${offer.id}`
    : `/buy/${summary.eventSlug}/${offer.listingId}`;

  // ── ACCEPTED — prominent CTA, single destination ─────────────────────────
  if (offer.status === 'accepted') {
    return (
      <Link to={to} style={{ textDecoration: 'none' }}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        <div style={{
          display: 'flex', background: CARD, borderRadius: R_CARD,
          border: `1.5px solid ${V}`, overflow: 'hidden',
          boxShadow: hov ? '0 4px 16px rgba(109,40,217,0.12)' : 'none',
          transition: 'box-shadow 0.15s',
        }}>
          <Thumb size={88} summary={summary} />
          <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: 6, minWidth: 0 }}>
            <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, background: VLIGHT, color: V, border: '1px solid #ddd6fe', alignSelf: 'flex-start', ...S }}>
              {t('boughtTickets.offerStatusAccepted')}
            </span>
            <div style={{ minWidth: 0 }}>
              <p style={{ fontSize: 14.5, fontWeight: 800, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 3, ...S }}>
                {summary.eventName}
              </p>
              <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 3, ...S }}>
                {formatDate(eventDate)} · {ticketLabel}
              </p>
              <p style={{ fontSize: 13, color: MUTED, ...S }}>
                {t('boughtTickets.yourOffer', { defaultValue: 'Tu oferta' })}{' '}
                <strong style={{ color: V, fontWeight: 800 }}>{offeredPrice}</strong>
                {' '}{t('boughtTickets.perTicket')}
              </p>
            </div>
            <div style={{
              padding: '8px 14px', borderRadius: R_BUTTON,
              background: V, color: 'white',
              fontSize: 13, fontWeight: 700, textAlign: 'center', ...S,
            }}>
              {t('boughtTickets.completePurchase')} →
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── PENDING — waiting row ─────────────────────────────────────────────────
  if (offer.status === 'pending') {
    return (
      <Link to={to} state={{ from: '/my-tickets?tab=offers' }} style={{ textDecoration: 'none' }}
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>
        <div style={{
          display: 'flex', background: CARD, borderRadius: R_CARD,
          border: `1px solid ${hov ? BORD2 : BORDER}`, overflow: 'hidden',
          transition: 'border-color 0.14s',
        }}>
          <Thumb size={66} summary={summary} />
          <div style={{ flex: 1, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 14, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2, ...S }}>
                {summary.eventName}
              </p>
              <p style={{ fontSize: 12.5, color: MUTED, ...S }}>
                {formatDate(eventDate)} · {ticketLabel}
                {' · '}<span style={{ fontWeight: 700, color: DARK }}>{offeredPrice}</span>
              </p>
            </div>
            <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: HINT, ...S }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: PENDING }} />
              <span style={{ whiteSpace: 'nowrap' }}>{t('boughtTickets.offerStatusPending')}</span>
            </div>
          </div>
        </div>
      </Link>
    );
  }

  // ── TERMINAL (rejected / converted / cancelled) — muted history row ──────
  const terminalColor =
    offer.status === 'rejected'  ? DESTRUCTIVE :
    offer.status === 'converted' ? SUCCESS :
    offer.status === 'expired'   ? PENDING : HINT;

  return (
    <Link to={to} state={{ from: '/my-tickets?tab=offers' }} style={{ textDecoration: 'none' }}>
      <div style={{
        display: 'flex', background: CARD, borderRadius: R_CARD,
        border: `1px solid #f0f0ee`, overflow: 'hidden', opacity: 0.65,
      }}>
        <Thumb size={52} summary={summary} grayscale />
        <div style={{ flex: 1, padding: '9px 13px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, minWidth: 0 }}>
          <div style={{ minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: MUTED, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1, ...S }}>
              {summary.eventName}
            </p>
            <p style={{ fontSize: 12, color: HINT, ...S }}>
              {formatDate(eventDate)} · {offeredPrice}
            </p>
          </div>
          <span style={{ fontSize: 11.5, fontWeight: 700, color: terminalColor, flexShrink: 0, ...S }}>
            {statusInfo.label}
          </span>
        </div>
      </div>
    </Link>
  );
}
