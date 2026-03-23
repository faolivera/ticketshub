/**
 * TransactionActionRequiredCard
 *
 * Unified "requires action" card for transactions.
 * Used by both MyTicketsPage (variant="buyer") and SellerDashboardPage (variant="seller").
 *
 * Layout:
 *   [3px accent bar] [image — stretch full height, 1:1 on desktop] [content + CTA]
 *
 * Mobile:  image width = clamp(80px, 26vw, 100px), fixed
 * Desktop: image width = auto driven by aspectRatio: '1' → square
 */
import { Link } from 'react-router-dom';
import { ArrowRight, Clock } from 'lucide-react';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { formatDate } from '@/lib/format-date';
import { formatCurrencyDisplay } from '@/lib/format-currency';
import { getTransactionStatusInfo } from '@/app/pages/my-tickets/transactionUtils';
import type { TransactionWithDetails } from '@/api/types';
import { Ticket } from 'lucide-react';
import {
  V,
  VLIGHT,
  DARK,
  MUTED,
  HINT,
  CARD,
  BORDER,
  BORD2,
  WARN_SOLID,
  ABG,
  S,
  R_CARD,
} from '@/lib/design-tokens';

interface TransactionActionRequiredCardProps {
  tx: TransactionWithDetails;
  variant: 'buyer' | 'seller';
  t: (k: string, o?: Record<string, string | number>) => string;
  linkFrom: string;
}

export function TransactionActionRequiredCard({
  tx, variant, t, linkFrom,
}: TransactionActionRequiredCardProps) {
  const isMobile   = useIsMobile();
  const isSeller   = variant === 'seller';
  const statusInfo = getTransactionStatusInfo(tx.status, t, isSeller);

  const price = tx.pricePerTicket
    ? formatCurrencyDisplay(tx.pricePerTicket.amount, tx.pricePerTicket.currency)
    : null;

  // Counterparty name — field names depend on your TransactionWithDetails type.
  // Adjust field path to match your actual API type.
  const counterpartyName: string | null =
    isSeller
      ? ((tx as any).buyerPublicName ?? (tx as any).buyerName ?? null)
      : ((tx as any).sellerPublicName ?? (tx as any).sellerName ?? null);

  const counterpartyLabel = isSeller
    ? t('sellerDashboard.labelBuyer', { defaultValue: 'Comprador' })
    : t('boughtTickets.labelSeller', { defaultValue: 'Vendedor' });

  // Sector / section name
  const sectionName: string | null =
    (tx as any).sectionName ?? (tx as any).ticketSectionName ?? null;

  const accentColor = isSeller ? WARN_SOLID : V;

  const bannerUrl = tx.bannerUrls?.square ?? tx.bannerUrls?.rectangle;

  // ── Image ─────────────────────────────────────────────────────────────────
  const imageStyle: React.CSSProperties = isMobile
    ? {
        width: 'clamp(80px, 26vw, 100px)',
        flexShrink: 0,
        alignSelf: 'stretch',
        background: VLIGHT,
        overflow: 'hidden',
        position: 'relative',
      }
    : {
        // Desktop: aspect-ratio 1:1 → width = card height → true square
        aspectRatio: '1',
        flexShrink: 0,
        alignSelf: 'stretch',
        background: VLIGHT,
        overflow: 'hidden',
        position: 'relative',
        minWidth: 100,    // floor so it never collapses
        maxWidth: 160,    // ceiling
      };

  return (
    <Link
      to={`/transaction/${tx.id}`}
      state={{ from: linkFrom }}
      style={{ textDecoration: 'none', display: 'block' }}
    >
      <div style={{
        background: CARD,
        borderRadius: R_CARD,
        border: `1px solid ${BORDER}`,
        overflow: 'hidden',
        transition: 'border-color 0.13s, box-shadow 0.13s',
      }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = BORD2;
          (e.currentTarget as HTMLDivElement).style.boxShadow = '0 2px 10px rgba(0,0,0,0.06)';
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLDivElement).style.borderColor = BORDER;
          (e.currentTarget as HTMLDivElement).style.boxShadow = 'none';
        }}
      >
        <div style={{ display: 'flex' }}>

          {/* Accent bar */}
          <div style={{ width: 3, flexShrink: 0, background: accentColor, alignSelf: 'stretch' }} />

          {/* Image — 1:1 on desktop, fixed width on mobile */}
          <div style={imageStyle}>
            {bannerUrl
              ? <img src={bannerUrl} alt={tx.eventName}
                  style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
              : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ticket size={28} style={{ color: V, opacity: 0.3 }} />
                </div>
            }
          </div>

          {/* Content */}
          <div style={{ flex: 1, padding: '11px 13px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>

            {/* Event name */}
            <p style={{ fontSize: 14, fontWeight: 800, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>
              {tx.eventName}
            </p>

            {/* Date · sector */}
            <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.4, ...S }}>
              {formatDate(new Date(tx.eventDate))}
              {sectionName && <span style={{ color: HINT }}> · {sectionName}</span>}
            </p>

            {/* Counterparty */}
            {counterpartyName && (
              <p style={{ fontSize: 12, color: MUTED, ...S }}>
                <span style={{ color: HINT }}>{counterpartyLabel}</span>
                {' · '}
                <span style={{ fontWeight: 700, color: DARK }}>{counterpartyName}</span>
              </p>
            )}

            {/* Price */}
            {price && (
              <p style={{ fontSize: 14, fontWeight: 800, color: DARK, ...S }}>
                {price}
                <span style={{ fontSize: 11, fontWeight: 500, color: MUTED, marginLeft: 4 }}>/ {t('boughtTickets.perTicket', { defaultValue: 'entrada' })}</span>
              </p>
            )}

            {/* Action label */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: accentColor, flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: isSeller ? WARN_SOLID : V, fontWeight: 600, lineHeight: 1.4, ...S }}>
                {statusInfo.label}
              </span>
            </div>

          </div>
        </div>

        {/* CTA footer */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
          padding: '9px 14px',
          borderTop: `1px solid ${BORDER}`,
          background: isSeller ? ABG : VLIGHT,
          fontSize: 13, fontWeight: 700,
          color: isSeller ? WARN_SOLID : V,
          cursor: 'pointer',
          ...S,
        }}>
          {t('boughtTickets.viewTransaction', { defaultValue: 'Ver transacción' })}
          <ArrowRight size={13} />
        </div>
      </div>
    </Link>
  );
}
