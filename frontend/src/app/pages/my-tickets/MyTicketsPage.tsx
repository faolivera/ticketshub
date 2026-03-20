import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Ticket, AlertCircle, Clock } from 'lucide-react';
import { ticketsService } from '@/api/services/tickets.service';
import { offersService }  from '@/api/services/offers.service';
import { useUser }        from '@/app/contexts/UserContext';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorAlert }     from '@/app/components/ErrorMessage';
import { PageContentMaxWidth } from '@/app/components/PageContentMaxWidth';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { formatCurrencyDisplay } from '@/lib/format-currency';
import { formatDate }     from '@/lib/format-date';
import type { TransactionWithDetails, OfferWithListingSummary } from '@/api/types';
import type { ActivityHistoryItem } from '@/api/types/bff';
import {
  isUserRequiredActor,
  TERMINAL_STATUSES,
  getTransactionStatusInfo,
  getWaitingForLabel,
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
  GBORD,
  S,
} from '@/lib/design-tokens';
import { TransactionActionRequiredCard } from './TransactionActionRequiredCard';
import { PageHeader } from '../../components/PageHeader';

// ─── Thumb (mirrors SellerDashboardPage) ──────────────────────────────────────
function Thumb({ url, name, size, square }: { url?: string | null; name: string; size: number; square?: boolean }) {
  return (
    <div style={{
      width: size,
      height: square ? size : undefined,
      flexShrink: 0,
      alignSelf: square ? 'flex-start' : 'stretch',
      minHeight: square ? undefined : size,
      background: VLIGHT, overflow: 'hidden', position: 'relative',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
    }}>
      {url
        ? <img src={url} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }} />
        : <Ticket size={size * 0.32} style={{ color: V, opacity: 0.4 }} />
      }
    </div>
  );
}

// ─── SubLabel (mirrors SellerDashboardPage) ───────────────────────────────────
function SubLabel({ icon, label, color = HINT }: {
  icon: React.ReactNode; label: string; color?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 9 }}>
      <span style={{ color: HINT }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, ...S }}>
        {label}
      </span>
    </div>
  );
}

// ─── ACCEPTED OFFER BANNER — most urgent, full CTA ───────────────────────────
function AcceptedOfferBanner({ offer, highlighted, t, thumbSize, isMobile }: {
  offer: OfferWithListingSummary;
  highlighted: boolean;
  t: (k: string, o?: Record<string, string>) => string;
  thumbSize: number;
  isMobile: boolean;
}) {
  const ref          = useRef<HTMLDivElement>(null);
  const summary      = offer.listingSummary;
  const offeredPrice = formatCurrencyDisplay(offer.offeredPrice.amount, offer.offeredPrice.currency);
  const listingPrice = (summary as any).listingPrice
    ? formatCurrencyDisplay((summary as any).listingPrice.amount, (summary as any).listingPrice.currency)
    : null;

  const ticketLabel = offer.tickets.type === 'numbered'
    ? `${offer.tickets.seats.length} ${offer.tickets.seats.length === 1 ? t('boughtTickets.seat', { defaultValue: 'entrada' }) : t('boughtTickets.seats', { defaultValue: 'entradas' })}`
    : `${offer.tickets.count} ${offer.tickets.count === 1 ? t('boughtTickets.ticket', { defaultValue: 'entrada' }) : t('boughtTickets.tickets', { defaultValue: 'entradas' })}`;

  useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted]);

  const to = `/buy/${summary.eventSlug}/${offer.listingId}?offerId=${offer.id}`;

  const bannerUrl = summary.bannerUrls?.square ?? summary.bannerUrls?.rectangle;

  const offerBody = (
    <div style={{ flex: 1, padding: '11px 13px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 5, alignSelf: 'stretch' }}>
      <span style={{
        alignSelf: 'flex-start', fontSize: 10.5, fontWeight: 700,
        padding: '2px 8px', borderRadius: 100,
        background: '#fff0f0', color: '#dc2626', border: '1px solid #fca5a5', ...S,
      }}>
        ⏱ {t('boughtTickets.offerAcceptedUrgent', { defaultValue: 'Tiempo limitado para pagar' })}
      </span>
      <p style={{ fontSize: 14.5, fontWeight: 800, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>
        {summary.eventName}
      </p>
      <p style={{ fontSize: 12.5, color: MUTED, ...S }}>
        {ticketLabel} · {formatDate(new Date(summary.eventDate))}
      </p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {listingPrice && (
          <span style={{ fontSize: 12, color: BORD2, textDecoration: 'line-through', ...S }}>{listingPrice}</span>
        )}
        <span style={{ fontSize: 16, fontWeight: 800, color: V, ...S }}>{offeredPrice}</span>
        <span style={{ fontSize: 11, color: MUTED, ...S }}>
          {t('boughtTickets.yourOffer', { defaultValue: 'tu oferta' })}
        </span>
      </div>
    </div>
  );

  const rowAlign = isMobile ? ('stretch' as const) : ('flex-start' as const);

  return (
    <div ref={ref} style={{
      background: CARD, borderRadius: 16,
      border: `1.5px solid ${V}`, overflow: 'hidden',
      boxShadow: highlighted ? `0 0 0 3px ${VLIGHT}` : 'none',
    }}>
      <div style={{ display: 'flex', alignItems: rowAlign }}>
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
            <div style={{ width: 3, alignSelf: 'stretch', background: V, flexShrink: 0 }} />
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
                  alt={summary.eventName}
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
          <Thumb url={bannerUrl} name={summary.eventName} size={thumbSize} square />
        )}
        {offerBody}
      </div>
      <Link to={to} style={{ textDecoration: 'none' }}>
        <div style={{
          padding: '11px 16px', borderTop: '1px solid #f0ebff',
          background: V, color: CARD,
          fontSize: 13.5, fontWeight: 700, textAlign: 'center', cursor: 'pointer', ...S,
        }}>
          {t('boughtTickets.completePurchase')} →
        </div>
      </Link>
    </div>
  );
}

// ─── BUYER WAITING ROW — in-progress, no action needed ───────────────────────
function BuyerWaitingRow({ tx, t }: {
  tx: TransactionWithDetails;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const [hov, setHov] = useState(false);
  const waiting = getWaitingForLabel(tx.requiredActor, t);
  const status  = getTransactionStatusInfo(tx.status, t, false);

  return (
    <Link to={`/transaction/${tx.id}`} state={{ from: '/my-tickets' }} style={{ textDecoration: 'none' }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)} style={{
        display: 'flex', background: CARD, borderRadius: 12,
        border: `1px solid ${hov ? BORD2 : BORDER}`, overflow: 'hidden',
        transition: 'border-color 0.13s',
      }}>
        <Thumb url={tx.bannerUrls?.square ?? tx.bannerUrls?.rectangle} name={tx.eventName} size={52} />
        <div style={{ flex: 1, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1, ...S }}>
              {tx.eventName}
            </p>
            <p style={{ fontSize: 12, color: MUTED, ...S }}>{formatDate(new Date(tx.eventDate))}</p>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: HINT, ...S }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ whiteSpace: 'nowrap' }}>{waiting || status.label}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── PENDING OFFER ROW — buyer waiting for seller's response ─────────────────
function PendingOfferRow({ offer, highlighted, t }: {
  offer: OfferWithListingSummary;
  highlighted: boolean;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const divRef       = useRef<HTMLDivElement>(null);
  const summary      = offer.listingSummary;
  const offeredPrice = formatCurrencyDisplay(offer.offeredPrice.amount, offer.offeredPrice.currency);

  useEffect(() => {
    if (highlighted) divRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlighted]);

  return (
    <Link to={`/buy/${summary.eventSlug}/${offer.listingId}`} state={{ from: '/my-tickets' }} style={{ textDecoration: 'none' }}>
      <div ref={divRef} style={{
        display: 'flex', background: highlighted ? '#fdfcff' : CARD, borderRadius: 12,
        border: `1px solid ${highlighted ? '#ddd6fe' : BORDER}`, overflow: 'hidden',
        transition: 'border-color 0.13s',
      }}>
        <Thumb url={summary.bannerUrls?.square ?? summary.bannerUrls?.rectangle} name={summary.eventName} size={52} />
        <div style={{ flex: 1, padding: '9px 12px', display: 'flex', alignItems: 'center', gap: 10, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
              <p style={{ fontSize: 13, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>
                {summary.eventName}
              </p>
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 100, flexShrink: 0,
                background: VLIGHT, color: V, border: '1px solid #ddd6fe', ...S,
              }}>
                {t('boughtTickets.offerLabel', { defaultValue: 'Oferta' })}
              </span>
            </div>
            <p style={{ fontSize: 12, color: MUTED, ...S }}>
              {formatDate(new Date(summary.eventDate))}
              {' · '}
              <span style={{ fontWeight: 700, color: V }}>{offeredPrice}</span>
              {' '}
              <span style={{ color: HINT }}>{t('boughtTickets.yourOffer', { defaultValue: 'tu oferta' })}</span>
            </p>
          </div>
          <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: HINT, ...S }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#9ca3af' }} />
            <span style={{ whiteSpace: 'nowrap' }}>{t('boughtTickets.offerStatusPending')}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── HISTORY rows — compact, muted ───────────────────────────────────────────
function HistoryTxRow({ tx, t }: { tx: TransactionWithDetails; t: (k: string, o?: Record<string, string>) => string }) {
  const status = getTransactionStatusInfo(tx.status, t, false);
  return (
    <Link to={`/transaction/${tx.id}`} state={{ from: '/my-tickets' }} style={{ textDecoration: 'none' }}>
      <div style={{ display: 'flex', background: BG, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden', opacity: 0.8 }}>
        <div style={{ width: 44, flexShrink: 0, alignSelf: 'stretch', background: VLIGHT, position: 'relative', overflow: 'hidden' }}>
          {(tx.bannerUrls?.square ?? tx.bannerUrls?.rectangle) && (
            <img src={tx.bannerUrls?.square ?? tx.bannerUrls?.rectangle!} alt={tx.eventName}
              style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, filter: 'grayscale(0.3)' }} />
          )}
        </div>
        <div style={{ flex: 1, padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1, ...S }}>{tx.eventName}</p>
            <p style={{ fontSize: 11.5, color: MUTED, ...S }}>{formatDate(new Date(tx.eventDate))}</p>
          </div>
          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 100, flexShrink: 0, background: status.color, color: status.textColor, border: `1px solid ${status.border}`, ...S }}>
            {status.label}
          </span>
        </div>
      </div>
    </Link>
  );
}

function HistoryOfferRow({ offer, t }: { offer: OfferWithListingSummary; t: (k: string, o?: Record<string, string>) => string }) {
  const summary      = offer.listingSummary;
  const offeredPrice = formatCurrencyDisplay(offer.offeredPrice.amount, offer.offeredPrice.currency);
  const isConverted  = offer.status === 'converted';
  const isExpired    = offer.status === 'expired';
  const badgeBg     = isConverted ? GLIGHT : isExpired ? '#fffbeb' : BG;
  const badgeColor  = isConverted ? GREEN  : isExpired ? '#b45309' : MUTED;
  const badgeBorder = isConverted ? GBORD  : isExpired ? '#fde68a' : BORD2;
  const label = isConverted
    ? t('boughtTickets.offerStatusConverted')
    : offer.status === 'rejected'
      ? t('boughtTickets.offerStatusRejected')
      : isExpired
        ? t('boughtTickets.offerStatusExpired')
        : t('boughtTickets.offerStatusCancelled');

  return (
    <div style={{ display: 'flex', background: BG, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden', opacity: 0.75 }}>
      <div style={{ width: 44, flexShrink: 0, alignSelf: 'stretch', background: VLIGHT, position: 'relative', overflow: 'hidden' }}>
        {(summary.bannerUrls?.square ?? summary.bannerUrls?.rectangle) && (
          <img src={summary.bannerUrls?.square ?? summary.bannerUrls?.rectangle!} alt={summary.eventName}
            style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, filter: 'grayscale(0.5)' }} />
        )}
      </div>
      <div style={{ flex: 1, padding: '7px 11px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 1 }}>
            <p style={{ fontSize: 12.5, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>{summary.eventName}</p>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 100, flexShrink: 0, background: VLIGHT, color: V, border: '1px solid #ddd6fe', ...S }}>
              {t('boughtTickets.offerLabel', { defaultValue: 'Oferta' })}
            </span>
          </div>
          <p style={{ fontSize: 11.5, color: MUTED, ...S }}>{offeredPrice} · {formatDate(new Date(summary.eventDate))}</p>
        </div>
        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 100, flexShrink: 0, background: badgeBg, color: badgeColor, border: `1px solid ${badgeBorder}`, ...S }}>{label}</span>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function MyTicketsPage() {
  const { t }                     = useTranslation();
  const { user, isAuthenticated } = useUser();
  const [searchParams]            = useSearchParams();
  const isMobile                  = useIsMobile();
  const offerBannerThumbSize      = isMobile ? 88 : 156;

  const [bought,        setBought]        = useState<TransactionWithDetails[]>([]);
  const [myOffers,      setMyOffers]      = useState<OfferWithListingSummary[]>([]);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);
  const [historyItems,   setHistoryItems]   = useState<ActivityHistoryItem[]>([]);
  const [historyHasMore, setHistoryHasMore] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError,   setHistoryError]   = useState<string | null>(null);
  const [historyFetched, setHistoryFetched] = useState(false);
  const historyCursorRef = useRef<string | null>(null);
  // Deep-link from notifications: ?offerId=xxx highlights + scrolls to that offer
  const offerIdFromUrl = searchParams.get('offerId');

  // ── Fetching ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated) return;
    setIsLoading(true); setError(null);
    ticketsService.getMyTickets()
      .then(data => setBought(data.bought))
      .catch(() => setError(t('common.errorLoading')))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, t]);

  useEffect(() => {
    if (!isAuthenticated) return;
    offersService.listMyOffers()
      .then(res => setMyOffers(Array.isArray(res) ? res : []))
      .catch(() => setMyOffers([]));
  }, [isAuthenticated]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const actionRequired = useMemo(() =>
    bought.filter(tx => !TERMINAL_STATUSES.includes(tx.status) && isUserRequiredActor(tx, user?.id, 'buyer')),
  [bought, user?.id]);

  const waitingTx = useMemo(() =>
    bought.filter(tx => !TERMINAL_STATUSES.includes(tx.status) && !isUserRequiredActor(tx, user?.id, 'buyer')),
  [bought, user?.id]);

  const acceptedOffers = useMemo(() => myOffers.filter(o => o.status === 'accepted'),  [myOffers]);
  const pendingOffers  = useMemo(() => myOffers.filter(o => o.status === 'pending'),   [myOffers]);

  const attentionCount = acceptedOffers.length + actionRequired.length;
  const hasActive      = attentionCount > 0 || waitingTx.length > 0 || pendingOffers.length > 0;
  const dotColor       = attentionCount > 0 ? V : hasActive ? '#f59e0b' : GREEN;
  const hasAnything    = bought.length + myOffers.length > 0;

  const loadHistoryPage = useCallback(async (append: boolean) => {
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      const cursor = append ? historyCursorRef.current : null;
      const res    = await ticketsService.getActivityHistory('buyer', cursor, 15);
      historyCursorRef.current = res.nextCursor;
      setHistoryItems(prev => (append ? [...prev, ...res.items] : res.items));
      setHistoryHasMore(res.hasMore);
    } catch {
      setHistoryError(t('common.errorLoading'));
    } finally {
      setHistoryLoading(false);
      setHistoryFetched(true);
    }
  }, [t]);

  useEffect(() => {
    if (!isAuthenticated || isLoading || !hasAnything) return;
    historyCursorRef.current = null;
    setHistoryItems([]);
    setHistoryFetched(false);
    void loadHistoryPage(false);
  }, [isAuthenticated, isLoading, hasAnything, loadHistoryPage]);

  // ── Guard ─────────────────────────────────────────────────────────────────
  if (!isAuthenticated) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, padding: '40px 32px', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: VLIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Ticket size={24} style={{ color: V }} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 8, ...S }}>{t('boughtTickets.loginRequired')}</p>
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 1.55, ...S }}>{t('boughtTickets.loginToView')}</p>
          <Link to="/register" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: V, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', ...S }}>
              {t('header.login')}
            </button>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, ...S }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        .mt-buyer-grid { display: flex; flex-direction: column; gap: 24px; }
        @media (min-width: 768px) {
          .mt-buyer-grid { display: grid; grid-template-columns: minmax(0, 1fr) minmax(280px, 340px); gap: 24px; align-items: start; }
          .mt-history-scroll { max-height: min(55vh, 440px) !important; }
        }
        @keyframes mtSkShimmer {
          from { background-position: -500px 0; }
          to   { background-position:  500px 0; }
        }
        .mt-sk {
          background: linear-gradient(90deg, #e8e8e5 25%, #f0f0ed 50%, #e8e8e5 75%);
          background-size: 500px 100%;
          animation: mtSkShimmer 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>
      <PageContentMaxWidth style={{ paddingTop: 24, paddingBottom: 48 }}>

        <PageHeader
          title={t('boughtTickets.title')}
          backTo={{ labelKey: 'common.back' }}
        />

        {isLoading && (
          <div className="mt-buyer-grid">
            {/* Left panel — Mis compras */}
            <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="mt-sk" style={{ width: 8, height: 8, borderRadius: '50%' }} />
                <div className="mt-sk" style={{ height: 13, width: 100 }} />
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {/* 3 transaction row skeletons */}
                {[72, 88, 72].map((w, i) => (
                  <div key={i} style={{ display: 'flex', background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                    <div className="mt-sk" style={{ width: 52, flexShrink: 0, alignSelf: 'stretch', minHeight: 52, borderRadius: 0 }} />
                    <div style={{ flex: 1, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div className="mt-sk" style={{ height: 12, width: `${w}%`, marginBottom: 6 }} />
                        <div className="mt-sk" style={{ height: 10, width: '55%' }} />
                      </div>
                      <div className="mt-sk" style={{ height: 20, width: 68, borderRadius: 100, flexShrink: 0 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel — Historial */}
            <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="mt-sk" style={{ width: 14, height: 14, borderRadius: 4 }} />
                <div className="mt-sk" style={{ height: 13, width: 70 }} />
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[80, 65, 75, 70].map((w, i) => (
                  <div key={i} style={{ display: 'flex', background: BG, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                    <div className="mt-sk" style={{ width: 44, flexShrink: 0, alignSelf: 'stretch', minHeight: 44, borderRadius: 0 }} />
                    <div style={{ flex: 1, padding: '7px 11px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                      <div style={{ flex: 1 }}>
                        <div className="mt-sk" style={{ height: 11, width: `${w}%`, marginBottom: 5 }} />
                        <div className="mt-sk" style={{ height: 10, width: '50%' }} />
                      </div>
                      <div className="mt-sk" style={{ height: 18, width: 56, borderRadius: 100, flexShrink: 0 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {error     && <ErrorAlert message={error} className="mb-6" />}

        {/* Empty state */}
        {!isLoading && !error && !hasAnything && (
          <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, padding: '52px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <Ticket size={24} style={{ color: BORD2 }} />
            </div>
            <p style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 6, ...S }}>{t('boughtTickets.noTicketsYet')}</p>
            <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 22, lineHeight: 1.55, ...S }}>{t('boughtTickets.purchasedTicketsWillAppear')}</p>
            <Link to="/" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: V, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', ...S }}>
                {t('landing.upcomingEvents')}
              </button>
            </Link>
          </div>
        )}

        {/* Mis compras (left / top) + Historial (right on desktop, bottom on mobile) */}
        {!isLoading && !error && hasAnything && (
          <div className="mt-buyer-grid">
            <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, overflow: 'hidden', minWidth: 0 }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: dotColor, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: DARK, ...S }}>
                  {t('boughtTickets.myPurchases', { defaultValue: 'Mis compras' })}
                </span>
                {attentionCount > 0 && (
                  <span style={{ minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px', fontSize: 10.5, fontWeight: 700, background: V, color: CARD, display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
                    {attentionCount}
                  </span>
                )}
                {attentionCount > 0 && (
                  <span style={{ marginLeft: 'auto', fontSize: 11, color: HINT, ...S }}>
                    {t('sellerDashboard.requiresAttention', { defaultValue: 'Requiere atención' })}
                  </span>
                )}
              </div>

              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 20 }}>
                {acceptedOffers.length > 0 && (
                  <div>
                    <SubLabel
                      icon={<AlertCircle size={11} />}
                      label={t('boughtTickets.offersRequireAction', { defaultValue: 'Oferta aceptada — completá la compra' })}
                      color={V}
                    />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {acceptedOffers.map(o => (
                        <AcceptedOfferBanner key={o.id} offer={o} t={t} highlighted={o.id === offerIdFromUrl} thumbSize={offerBannerThumbSize} isMobile={isMobile} />
                      ))}
                    </div>
                  </div>
                )}

                {actionRequired.length > 0 && (
                  <div>
                    <SubLabel icon={<AlertCircle size={11} />} label={t('boughtTickets.pendingAwaitingMyAction')} color={V} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {actionRequired.map(tx => (
                        <TransactionActionRequiredCard key={tx.id} tx={tx} variant="buyer" t={t} linkFrom="/my-tickets" />
                      ))}
                    </div>
                  </div>
                )}

                {(waitingTx.length > 0 || pendingOffers.length > 0) && (
                  <div>
                    <SubLabel icon={<Clock size={11} />} label={t('boughtTickets.pendingAwaitingOtherAction')} />
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {waitingTx.map(tx => <BuyerWaitingRow key={tx.id} tx={tx} t={t} />)}
                      {pendingOffers.map(o => (
                        <PendingOfferRow key={o.id} offer={o} t={t} highlighted={o.id === offerIdFromUrl} />
                      ))}
                    </div>
                  </div>
                )}

                {attentionCount === 0 && waitingTx.length === 0 && pendingOffers.length === 0 && (
                  <p style={{ fontSize: 13, color: HINT, textAlign: 'center', padding: '8px 0', ...S }}>
                    {t('boughtTickets.allClear', { defaultValue: 'Todo al día. Sin compras pendientes.' })}
                  </p>
                )}
              </div>
            </div>

            <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, minWidth: 0, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <Clock size={14} style={{ color: HINT, flexShrink: 0 }} />
                <span style={{ fontSize: 14, fontWeight: 800, color: DARK, ...S }}>
                  {t('sellerDashboard.history', { defaultValue: 'Historial' })}
                </span>
              </div>
              {/* List scrolls here; "Cargar más" stays fixed below so it is never clipped */}
              <div
                className="mt-history-scroll"
                style={{
                  maxHeight: 'min(45vh, 340px)',
                  minHeight: 0,
                  overflowY: 'auto',
                  overflowX: 'hidden',
                  WebkitOverflowScrolling: 'touch',
                  overscrollBehavior: 'contain',
                  padding: 14,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                }}
              >
                {historyError && (
                  <ErrorAlert message={historyError} className="mb-2" />
                )}
                {historyLoading && historyItems.length === 0 && (
                  <LoadingSpinner size="md" text={t('common.loading')} className="py-6" />
                )}
                {historyFetched && !historyLoading && historyItems.length === 0 && !historyError && (
                  <div style={{ padding: '20px 12px', textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: DARK, marginBottom: 6, ...S }}>
                      {t('boughtTickets.noHistoryYet', { defaultValue: 'Aún no tenés historial' })}
                    </p>
                    <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5, ...S }}>
                      {t('boughtTickets.completedPurchasesAppearHere', { defaultValue: 'Las compras completadas y ofertas cerradas aparecerán aquí.' })}
                    </p>
                  </div>
                )}
                {historyItems.map((item) =>
                  item.type === 'transaction'
                    ? <HistoryTxRow key={`tx-${item.transaction.id}`} tx={item.transaction} t={t} />
                    : (
                        <HistoryOfferRow
                          key={`of-${(item.offer as OfferWithListingSummary).id}`}
                          offer={item.offer as OfferWithListingSummary}
                          t={t}
                        />
                      ),
                )}
              </div>
              {historyHasMore && (
                <div style={{ padding: '10px 14px 14px', borderTop: '1px solid #f0f0ee', background: CARD }}>
                  <button
                    type="button"
                    disabled={historyLoading}
                    onClick={() => void loadHistoryPage(true)}
                    style={{
                      padding: '10px 14px',
                      borderRadius: 10,
                      background: BG,
                      border: `1px solid ${BORDER}`,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 6,
                      fontSize: 13,
                      fontWeight: 700,
                      color: V,
                      cursor: historyLoading ? 'wait' : 'pointer',
                      ...S,
                      width: '100%',
                    }}
                  >
                    {historyLoading ? t('common.loading') : t('boughtTickets.loadMoreHistory', { defaultValue: 'Cargar más' })}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </PageContentMaxWidth>
    </div>
  );
}
