import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Edit, Eye, Link as LinkIcon, Check, Ticket } from 'lucide-react';
import type { TicketListingWithEvent } from '@/api/types';
import { TicketUnitStatus } from '@/api/types';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate } from '@/lib/format-date';
import {
  V, VLIGHT, DARK, MUTED, HINT, BG, CARD, BORDER, BORD2, GREEN, GLIGHT, GBORD, S,
} from '@/app/pages/my-tickets/transactionUtils';

export interface ListingCardProps {
  listing: TicketListingWithEvent;
  isPast?: boolean;
  copiedListingId: string | null;
  onCopyLink: (listing: TicketListingWithEvent) => void;
  /** Pending offers on this listing — badge shown when > 0 */
  pendingOfferCount?: number;
}

function getListingStatusInfo(status: string, t: (k: string) => string) {
  switch (status) {
    case 'Active':    return { label: t('boughtTickets.activeListing'), color: GLIGHT,    textColor: GREEN,     border: GBORD     };
    case 'Sold':      return { label: t('boughtTickets.sold'),          color: BG,        textColor: MUTED,     border: BORD2     };
    case 'Cancelled': return { label: t('boughtTickets.cancelled'),     color: BG,        textColor: MUTED,     border: BORD2     };
    case 'Expired':   return { label: t('boughtTickets.expired'),       color: '#fffbeb', textColor: '#92400e', border: '#fde68a' };
    default:          return { label: status,                           color: BG,        textColor: MUTED,     border: BORD2     };
  }
}

/** Strip trailing ,00 cents — ARS prices never need them */
function formatPrice(amount: number, currency: string): string {
  return formatCurrency(amount, currency).replace(/[,.]00$/, '');
}

function Thumb({ url, name, size, grayscale }: {
  url?: string | null; name: string; size: number; grayscale?: boolean;
}) {
  return (
    <div style={{
      width: size, flexShrink: 0, alignSelf: 'stretch',
      background: url ? 'transparent' : VLIGHT,
      overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url ? (
        <img src={url} alt={name} style={{
          width: '100%', height: '100%', objectFit: 'cover',
          display: 'block', position: 'absolute', inset: 0,
          filter: grayscale ? 'grayscale(0.5)' : 'none',
          opacity: grayscale ? 0.75 : 1,
        }} />
      ) : (
        <Ticket size={size * 0.35} style={{ color: V, opacity: 0.4 }} />
      )}
    </div>
  );
}

function IconBtn({ onClick, title, children, isCopied = false }: {
  onClick?: () => void;
  title: string;
  children: React.ReactNode;
  isCopied?: boolean;
}) {
  const [hov, setHov] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      title={title}
      aria-label={title}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
      style={{
        width: 38, height: 38, borderRadius: 9, flexShrink: 0,
        background: isCopied ? GLIGHT  : hov ? VLIGHT  : BG,
        color:      isCopied ? GREEN   : hov ? V       : MUTED,
        border:     `1px solid ${isCopied ? GBORD : hov ? '#ddd6fe' : BORDER}`,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.14s',
      }}
    >
      {children}
    </button>
  );
}

// ─── ACTIVE LISTING ───────────────────────────────────────────────────────────
function ActiveListingCard({ listing, copiedListingId, onCopyLink, pendingOfferCount = 0 }: ListingCardProps) {
  const { t }         = useTranslation();
  const [hov, setHov] = useState(false);
  const status        = getListingStatusInfo(listing.status, t);
  const price         = formatPrice(listing.pricePerTicket.amount, listing.pricePerTicket.currency);
  const available     = listing.ticketUnits.filter(u => u.status === TicketUnitStatus.Available).length;
  const isCopied      = copiedListingId === listing.id;

  // UX KEY: sector/type is the PRIMARY identifier when multiple listings exist for the same event
  const sectorLabel = listing.sectionName || listing.type
    || t('boughtTickets.generalAdmission', { defaultValue: 'General' });
  const qtyLabel = `× ${available} ${available === 1
    ? t('boughtTickets.ticket',  { defaultValue: 'entrada'  })
    : t('boughtTickets.tickets', { defaultValue: 'entradas' })}`;

  return (
    <div
      style={{
        background: CARD, borderRadius: 16,
        border: `1px solid ${BORDER}`, overflow: 'hidden',
        boxShadow: hov ? '0 2px 12px rgba(0,0,0,0.06)' : 'none',
        transition: 'box-shadow 0.15s',
      }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      {/* Info row */}
      <div style={{ display: 'flex' }}>
        <Thumb
          url={listing.bannerUrls?.square || listing.bannerUrls?.rectangle}
          name={listing.eventName}
          size={80}
        />
        <div style={{ flex: 1, padding: '11px 13px', minWidth: 0 }}>

          {/* Sector + qty + optional offers badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 3, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 16, fontWeight: 800, color: DARK, ...S }}>{sectorLabel}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: MUTED, ...S }}>{qtyLabel}</span>
            {pendingOfferCount > 0 && (
              <span style={{
                marginLeft: 'auto', flexShrink: 0,
                fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100,
                background: VLIGHT, color: V, border: '1px solid #ddd6fe', ...S,
              }}>
                {pendingOfferCount} {pendingOfferCount === 1
                  ? t('sellerDashboard.offer',  { defaultValue: 'oferta'  })
                  : t('sellerDashboard.offers', { defaultValue: 'ofertas' })}
              </span>
            )}
          </div>

          {/* Event name + date — secondary context */}
          <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 6, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>
            {listing.eventName} · {formatDate(new Date(listing.eventDate))}
          </p>

          {/* Price + status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: DARK, ...S }}>{price}</span>
            <span style={{ fontSize: 12, color: HINT, ...S }}>
              / {t('boughtTickets.perTicket', { defaultValue: 'entrada' })}
            </span>
            <span style={{
              marginLeft: 'auto', fontSize: 11, fontWeight: 700, padding: '2px 7px',
              borderRadius: 100, background: status.color, color: status.textColor,
              border: `1px solid ${status.border}`, ...S,
            }}>
              {status.label}
            </span>
          </div>
        </div>
      </div>

      {/* Action row — Edit primary (full width), View + Copy as icon-only */}
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '9px 12px', display: 'flex', gap: 7, alignItems: 'center' }}>
        <Link to={`/edit-listing/${listing.id}`} style={{ textDecoration: 'none', flex: 1 }}>
          <button style={{
            width: '100%', padding: '9px 0', borderRadius: 9,
            background: V, color: 'white', border: 'none',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, ...S,
          }}>
            <Edit size={14} />
            {t('boughtTickets.editListing')}
          </button>
        </Link>

        <Link to={`/buy/${listing.eventSlug}/${listing.id}`} style={{ textDecoration: 'none' }}>
          <IconBtn title={t('boughtTickets.viewListing')}>
            <Eye size={15} />
          </IconBtn>
        </Link>

        <IconBtn
          title={isCopied ? t('boughtTickets.copied') : t('boughtTickets.copyLink')}
          onClick={() => onCopyLink(listing)}
          isCopied={isCopied}
        >
          {isCopied ? <Check size={15} /> : <LinkIcon size={15} />}
        </IconBtn>
      </div>
    </div>
  );
}

// ─── PAST LISTING — compact grid card ────────────────────────────────────────
function PastListingCard({ listing }: ListingCardProps) {
  const { t }         = useTranslation();
  const [hov, setHov] = useState(false);
  const status        = getListingStatusInfo(listing.status, t);
  const price         = formatPrice(listing.pricePerTicket.amount, listing.pricePerTicket.currency);
  const url           = listing.bannerUrls?.rectangle || listing.bannerUrls?.square;
  const sectorLabel   = listing.sectionName || listing.type
    || t('boughtTickets.generalAdmission', { defaultValue: 'General' });

  return (
    <div style={{
      background: CARD, borderRadius: 14,
      border: `1px solid ${hov ? BORD2 : BORDER}`,
      overflow: 'hidden', opacity: 0.8, transition: 'all 0.14s',
    }}
      onMouseEnter={() => setHov(true)}
      onMouseLeave={() => setHov(false)}
    >
      <div style={{ height: 76, background: VLIGHT, position: 'relative', overflow: 'hidden', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {url ? (
          <img src={url} alt={listing.eventName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', filter: 'grayscale(0.4)', opacity: 0.75 }} />
        ) : (
          <Ticket size={28} style={{ color: V, opacity: 0.3 }} />
        )}
      </div>
      <div style={{ padding: '9px 12px' }}>
        <p style={{ fontSize: 13.5, fontWeight: 700, color: DARK, marginBottom: 2, ...S }}>{sectorLabel}</p>
        <p style={{ fontSize: 12, color: MUTED, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>
          {listing.eventName}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 6 }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: DARK, ...S }}>{price}</span>
          <span style={{
            fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
            background: status.color, color: status.textColor, border: `1px solid ${status.border}`, ...S,
          }}>
            {status.label}
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Dispatcher ───────────────────────────────────────────────────────────────
export function ListingCard(props: ListingCardProps) {
  return props.isPast ? <PastListingCard {...props} /> : <ActiveListingCard {...props} />;
}
