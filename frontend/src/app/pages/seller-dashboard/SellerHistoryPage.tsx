import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Ticket, CheckCircle, X } from 'lucide-react';
import { ticketsService } from '@/api/services/tickets.service';
import { useUser }        from '@/app/contexts/UserContext';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorAlert }     from '@/app/components/ErrorMessage';
import { formatCurrencyDisplay } from '@/lib/format-currency';
import { formatDate }     from '@/lib/format-date';
import type { TransactionWithDetails, OfferWithReceivedContext } from '@/api/types';
import type { ActivityHistoryItem } from '@/api/types/bff';
import {
  getTransactionStatusInfo,
  getOfferStatusInfo,
} from '@/app/pages/my-tickets/transactionUtils';
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
  GBORD,
  S,
  E,
  R_CARD,
  R_BUTTON,
} from '@/lib/design-tokens';

function Thumb({ url, name, size }: { url?: string | null; name: string; size: number }) {
  return (
    <div style={{
      width: size, flexShrink: 0, alignSelf: 'stretch',
      background: VLIGHT, overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, filter: 'grayscale(0.2)' }} />
        : <Ticket size={size * 0.32} style={{ color: V, opacity: 0.3 }} />
      }
    </div>
  );
}

// ─── Completed sale row ───────────────────────────────────────────────────────
export function CompletedSaleRow({ tx, t }: {
  tx: TransactionWithDetails;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const [hov, setHov]   = useState(false);
  const status          = getTransactionStatusInfo(tx.status, t, true);
  const price           = tx.pricePerTicket ? formatCurrencyDisplay(tx.pricePerTicket.amount, tx.pricePerTicket.currency) : null;
  const isCompleted     = tx.status === 'Completed';

  return (
    <Link to={`/transaction/${tx.id}`} state={{ from: '/seller-dashboard/historial' }} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', background: CARD, borderRadius: R_CARD,
          border: `1px solid ${hov ? BORD2 : BORDER}`, overflow: 'hidden',
          transition: 'border-color 0.13s',
          opacity: isCompleted ? 1 : 0.8,
        }}
      >
        <Thumb url={tx.bannerUrls?.square ?? tx.bannerUrls?.rectangle} name={tx.eventName} size={60} />
        <div style={{ flex: 1, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13.5, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2, ...S }}>
              {tx.eventName}
            </p>
            <p style={{ fontSize: 12, color: MUTED, ...S }}>
              {formatDate(new Date(tx.eventDate))}
              {tx.ticketType && ` · ${tx.ticketType}`}
              {price && <span style={{ fontWeight: 700, color: DARK }}> · {price}</span>}
            </p>
          </div>
          <span style={{
            fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100, flexShrink: 0,
            background: status.color, color: status.textColor, border: `1px solid ${status.border}`, ...S,
          }}>
            {status.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

// ─── Closed offer row ─────────────────────────────────────────────────────────
export function ClosedOfferRow({ offer, t }: {
  offer: OfferWithReceivedContext;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const [hov, setHov] = useState(false);
  const ctx           = offer.receivedContext;
  const statusInfo    = getOfferStatusInfo(offer.status, t);
  const offered       = formatCurrencyDisplay(offer.offeredPrice.amount, offer.offeredPrice.currency);
  const listing       = formatCurrencyDisplay(ctx.listingPrice.amount, ctx.listingPrice.currency);
  const isAccepted    = offer.status === 'accepted' || offer.status === 'converted';

  const ticketLabel = offer.tickets.type === 'numbered'
    ? `${offer.tickets.seats.length} ${offer.tickets.seats.length === 1 ? t('boughtTickets.seat', { defaultValue: 'entrada' }) : t('boughtTickets.seats', { defaultValue: 'entradas' })}`
    : `${offer.tickets.count} ${offer.tickets.count === 1 ? t('boughtTickets.ticket', { defaultValue: 'entrada' }) : t('boughtTickets.tickets', { defaultValue: 'entradas' })}`;

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', background: CARD, borderRadius: R_CARD,
        border: `1px solid ${hov ? BORD2 : BORDER}`, overflow: 'hidden',
        transition: 'border-color 0.13s',
        opacity: offer.status === 'rejected' || offer.status === 'cancelled' ? 0.75 : 1,
      }}
    >
      <Thumb url={ctx.bannerUrls?.square ?? ctx.bannerUrls?.rectangle} name={ctx.eventName} size={60} />
      <div style={{ flex: 1, padding: '10px 13px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2, ...S }}>
            {ctx.eventName}
          </p>
          <p style={{ fontSize: 12, color: MUTED, ...S }}>
            {ticketLabel} · {t('sellerDashboard.fromBuyer', { defaultValue: 'De' })} <span style={{ fontWeight: 700, color: DARK }}>{ctx.buyerName}</span>
            {' · '}<span style={{ textDecoration: 'line-through' }}>{listing}</span>
            {' → '}<span style={{ fontWeight: 700, color: isAccepted ? GREEN : DARK }}>{offered}</span>
          </p>
        </div>
        <span style={{
          fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 100, flexShrink: 0,
          background: statusInfo.color, color: statusInfo.textColor, border: `1px solid ${statusInfo.border}`, ...S,
        }}>
          {statusInfo.label}
        </span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function SellerHistoryPage() {
  const { t }                        = useTranslation();
  const { isAuthenticated, canSell } = useUser();

  const [items,       setItems]       = useState<ActivityHistoryItem[]>([]);
  const [hasMore,     setHasMore]     = useState(false);
  const [loading,     setLoading]     = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error,       setError]       = useState<string | null>(null);
  const cursorRef     = useRef<string | null>(null);

  const loadPage = useCallback(async (append: boolean) => {
    if (append) setLoadingMore(true);
    else { setLoading(true); setError(null); }
    try {
      const res = await ticketsService.getActivityHistory('seller', append ? cursorRef.current : null, 20);
      cursorRef.current = res.nextCursor;
      setItems(prev => (append ? [...prev, ...res.items] : res.items));
      setHasMore(res.hasMore);
    } catch {
      setError(t('common.errorLoading'));
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated || !canSell()) return;
    cursorRef.current = null;
    void loadPage(false);
  }, [isAuthenticated, canSell, loadPage]);

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '24px 16px 56px', ...S }}>

      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        <Link to="/seller-dashboard" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 16, fontSize: 13.5, fontWeight: 600, color: MUTED, ...S }}>
          <ArrowLeft size={14} /> {t('sellerDashboard.title')}
        </Link>

        <h1 style={{ ...E, fontSize: 'clamp(22px,3vw,28px)', fontWeight: 400, color: DARK, letterSpacing: '-0.4px', marginBottom: 24 }}>
          {t('sellerDashboard.history', { defaultValue: 'Historial' })}
        </h1>

        {loading && items.length === 0 && <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />}
        {error && <ErrorAlert message={error} className="mb-6" />}

        {!loading && !error && items.length === 0 && (
          <div style={{ background: CARD, borderRadius: R_CARD, border: `1px solid ${BORDER}`, padding: '52px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Ticket size={22} style={{ color: BORD2 }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 6, ...S }}>
              {t('sellerDashboard.noHistory', { defaultValue: 'Sin historial todavía' })}
            </p>
            <p style={{ fontSize: 13.5, color: MUTED, ...S }}>
              {t('sellerDashboard.noHistorySubtitle', { defaultValue: 'Tus ventas completadas y ofertas cerradas aparecerán acá.' })}
            </p>
          </div>
        )}

        {items.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {items.map(item =>
              item.type === 'transaction'
                ? <CompletedSaleRow key={`tx-${item.transaction.id}`} tx={item.transaction} t={t} />
                : (
                    <ClosedOfferRow
                      key={`of-${(item.offer as OfferWithReceivedContext).id}`}
                      offer={item.offer as OfferWithReceivedContext}
                      t={t}
                    />
                  ),
            )}
            {hasMore && (
              <button
                type="button"
                disabled={loadingMore}
                onClick={() => void loadPage(true)}
                style={{
                  padding: '12px 16px', borderRadius: R_BUTTON, border: `1px solid ${BORDER}`,
                  background: BG, fontSize: 14, fontWeight: 700, color: V, cursor: loadingMore ? 'wait' : 'pointer', ...S,
                }}
              >
                {loadingMore ? t('common.loading') : t('boughtTickets.loadMoreHistory', { defaultValue: 'Cargar más' })}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
