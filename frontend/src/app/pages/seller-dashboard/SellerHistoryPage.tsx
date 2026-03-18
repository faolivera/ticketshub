import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Ticket, CheckCircle, X, ChevronDown } from 'lucide-react';
import { ticketsService } from '@/api/services/tickets.service';
import { offersService }  from '@/api/services/offers.service';
import { useUser }        from '@/app/contexts/UserContext';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorAlert }     from '@/app/components/ErrorMessage';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate }     from '@/lib/format-date';
import type { TransactionWithDetails, OfferWithReceivedContext } from '@/api/types';
import {
  TERMINAL_STATUSES,
  getTransactionStatusInfo,
  getOfferStatusInfo,
  V, VLIGHT, DARK, MUTED, HINT, BG, CARD, BORDER, BORD2, GREEN, GLIGHT, GBORD, S,
} from '@/app/pages/my-tickets/transactionUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(amount: number, currency: string) {
  return formatCurrency(amount, currency).replace(/[,.]00$/, '');
}

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
function CompletedSaleRow({ tx, t }: {
  tx: TransactionWithDetails;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const [hov, setHov]   = useState(false);
  const status          = getTransactionStatusInfo(tx.status, t, true);
  const price           = tx.pricePerTicket ? fmt(tx.pricePerTicket.amount, tx.pricePerTicket.currency) : null;
  const isCompleted     = tx.status === 'Completed';

  return (
    <Link to={`/transaction/${tx.id}`} state={{ from: '/seller-dashboard/historial' }} style={{ textDecoration: 'none' }}>
      <div
        onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', background: CARD, borderRadius: 13,
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
function ClosedOfferRow({ offer, t }: {
  offer: OfferWithReceivedContext;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const [hov, setHov] = useState(false);
  const ctx           = offer.receivedContext;
  const statusInfo    = getOfferStatusInfo(offer.status, t);
  const offered       = fmt(offer.offeredPrice.amount, offer.offeredPrice.currency);
  const listing       = fmt(ctx.listingPrice.amount, ctx.listingPrice.currency);
  const isAccepted    = offer.status === 'accepted';

  const ticketLabel = offer.tickets.type === 'numbered'
    ? `${offer.tickets.seats.length} ${offer.tickets.seats.length === 1 ? t('boughtTickets.seat', { defaultValue: 'entrada' }) : t('boughtTickets.seats', { defaultValue: 'entradas' })}`
    : `${offer.tickets.count} ${offer.tickets.count === 1 ? t('boughtTickets.ticket', { defaultValue: 'entrada' }) : t('boughtTickets.tickets', { defaultValue: 'entradas' })}`;

  return (
    <div
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        display: 'flex', background: CARD, borderRadius: 13,
        border: `1px solid ${hov ? BORD2 : BORDER}`, overflow: 'hidden',
        transition: 'border-color 0.13s', opacity: isAccepted ? 1 : 0.75,
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

// ─── Section block ────────────────────────────────────────────────────────────
function HistorySection({ title, count, children, defaultOpen = true }: {
  title: string; count: number; children: React.ReactNode; defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div style={{ marginBottom: 28 }}>
      <button type="button" onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, marginBottom: open ? 10 : 0,
          background: 'none', border: 'none', cursor: 'pointer', padding: 0, width: '100%',
        }}
      >
        <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: MUTED, ...S }}>
          {title}
        </span>
        <span style={{
          minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
          fontSize: 10.5, fontWeight: 700, background: BG, color: MUTED,
          border: `1px solid ${BORD2}`,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {count}
        </span>
        <ChevronDown size={13} style={{ color: HINT, marginLeft: 'auto', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 0.14s' }} />
      </button>
      {open && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {children}
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function SellerHistoryPage() {
  const { t }                              = useTranslation();
  const { isAuthenticated, canSell }       = useUser();

  const [sold,           setSold]           = useState<TransactionWithDetails[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<OfferWithReceivedContext[]>([]);
  const [isLoading,      setIsLoading]      = useState(true);
  const [error,          setError]          = useState<string | null>(null);

  useEffect(() => {
    if (!isAuthenticated || !canSell()) return;
    setIsLoading(true); setError(null);
    Promise.all([
      ticketsService.getMyTickets(),
      offersService.listReceivedOffers(),
    ])
      .then(([tickets, offers]) => {
        setSold(tickets.sold);
        setReceivedOffers(Array.isArray(offers) ? offers : []);
      })
      .catch(() => setError(t('common.errorLoading')))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, canSell, t]);

  const completedSales = useMemo(() =>
    sold
      .filter(tx => TERMINAL_STATUSES.includes(tx.status))
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()),
  [sold]);

  const closedOffers = useMemo(() =>
    receivedOffers.filter(o => ['accepted', 'rejected', 'cancelled'].includes(o.status)),
  [receivedOffers]);

  // ── Split completed sales by status ──────────────────────────────────────
  const salesCompleted  = useMemo(() => completedSales.filter(tx => tx.status === 'Completed'), [completedSales]);
  const salesTerminated = useMemo(() => completedSales.filter(tx => tx.status !== 'Completed'), [completedSales]);

  // ── Split closed offers by status ────────────────────────────────────────
  const offersAccepted  = useMemo(() => closedOffers.filter(o => o.status === 'accepted'),  [closedOffers]);
  const offersRejected  = useMemo(() => closedOffers.filter(o => o.status !== 'accepted'),  [closedOffers]);

  const hasAnything = completedSales.length + closedOffers.length > 0;

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '24px 16px 56px', ...S }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>

      <div style={{ maxWidth: 640, margin: '0 auto' }}>

        {/* Back link + title */}
        <Link to="/seller-dashboard" style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 5, marginBottom: 16, fontSize: 13.5, fontWeight: 600, color: MUTED, ...S }}>
          <ArrowLeft size={14} /> {t('sellerDashboard.title')}
        </Link>

        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(22px,3vw,28px)', fontWeight: 400, color: DARK, letterSpacing: '-0.4px', marginBottom: 24 }}>
          {t('sellerDashboard.history', { defaultValue: 'Historial' })}
        </h1>

        {isLoading && <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />}
        {error     && <ErrorAlert message={error} className="mb-6" />}

        {!isLoading && !error && !hasAnything && (
          <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, padding: '52px 24px', textAlign: 'center' }}>
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

        {!isLoading && !error && hasAnything && (
          <>
            {/* ── Completed sales ──────────────────────────────────────── */}
            {completedSales.length > 0 && (
              <>
                {salesCompleted.length > 0 && (
                  <HistorySection
                    title={t('boughtTickets.completedTickets')}
                    count={salesCompleted.length}
                  >
                    {salesCompleted.map(tx => <CompletedSaleRow key={tx.id} tx={tx} t={t} />)}
                  </HistorySection>
                )}

                {salesTerminated.length > 0 && (
                  <HistorySection
                    title={t('sellerDashboard.cancelledRefunded', { defaultValue: 'Canceladas y reembolsadas' })}
                    count={salesTerminated.length}
                    defaultOpen={false}
                  >
                    {salesTerminated.map(tx => <CompletedSaleRow key={tx.id} tx={tx} t={t} />)}
                  </HistorySection>
                )}
              </>
            )}

            {/* ── Divider ──────────────────────────────────────────────── */}
            {completedSales.length > 0 && closedOffers.length > 0 && (
              <div style={{ height: 1, background: BORDER, margin: '4px 0 28px' }} />
            )}

            {/* ── Closed offers ────────────────────────────────────────── */}
            {closedOffers.length > 0 && (
              <>
                {offersAccepted.length > 0 && (
                  <HistorySection
                    title={t('sellerDashboard.acceptedOffers', { defaultValue: 'Ofertas aceptadas' })}
                    count={offersAccepted.length}
                  >
                    {offersAccepted.map(o => <ClosedOfferRow key={o.id} offer={o} t={t} />)}
                  </HistorySection>
                )}

                {offersRejected.length > 0 && (
                  <HistorySection
                    title={t('sellerDashboard.closedOffers', { defaultValue: 'Rechazadas y canceladas' })}
                    count={offersRejected.length}
                    defaultOpen={false}
                  >
                    {offersRejected.map(o => <ClosedOfferRow key={o.id} offer={o} t={t} />)}
                  </HistorySection>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
