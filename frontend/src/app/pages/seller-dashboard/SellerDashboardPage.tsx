import { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Ticket, AlertCircle, Clock, CheckCircle,
  Edit, Eye, Link as LinkIcon, Check, Plus, Loader2, X,
} from 'lucide-react';
import { ticketsService } from '@/api/services/tickets.service';
import { offersService }  from '@/api/services/offers.service';
import { useUser }        from '@/app/contexts/UserContext';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorAlert }     from '@/app/components/ErrorMessage';
import { PageContentMaxWidth } from '@/app/components/PageContentMaxWidth';
import { SellerUnverifiedModalTrigger } from '@/app/components/SellerUnverifiedModalTrigger';
import { formatCurrencyDisplay } from '@/lib/format-currency';
import { formatDate }     from '@/lib/format-date';
import type {
  TransactionWithDetails, TicketListingWithEvent, OfferWithReceivedContext,
} from '@/api/types';
import type { ActivityHistoryItem } from '@/api/types/bff';
import { CompletedSaleRow, ClosedOfferRow } from '@/app/pages/seller-dashboard/SellerHistoryPage';
import { TicketUnitStatus } from '@/api/types';
import {
  isUserRequiredActor,
  TERMINAL_STATUSES,
  getTransactionStatusInfo,
  getWaitingForLabel,
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
} from '@/lib/design-tokens';
import { TransactionActionRequiredCard } from '@/app/pages/my-tickets/TransactionActionRequiredCard';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { PageHeader } from '../../components/PageHeader';

// ─── SubLabel — section title inside a panel ──────────────────────────────────
function SubLabel({ icon, label, color = HINT, count }: {
  icon: React.ReactNode; label: string; color?: string; count?: number;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 5, marginBottom: 9 }}>
      <span style={{ color: HINT }}>{icon}</span>
      <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, ...S }}>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span style={{
          minWidth: 16, height: 16, borderRadius: 8, padding: '0 4px',
          fontSize: 10, fontWeight: 700,
          background: VLIGHT, color: V, border: '1px solid #ddd6fe',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {count}
        </span>
      )}
    </div>
  );
}

// ─── Thumb ────────────────────────────────────────────────────────────────────
function Thumb({ url, name, size }: { url?: string | null; name: string; size: number }) {
  return (
    <div style={{
      width: size, flexShrink: 0, alignSelf: 'stretch',
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

// ─── IconBtn ──────────────────────────────────────────────────────────────────
function IconBtn({ href, onClick, title, children, active }: {
  href?: string; onClick?: () => void; title: string;
  children: React.ReactNode; active?: boolean;
}) {
  const [hov, setHov] = useState(false);
  const style: React.CSSProperties = {
    width: 34, height: 34, borderRadius: 8, border: `1px solid ${active ? GBORD : hov ? '#ddd6fe' : BORDER}`,
    background: active ? GLIGHT : hov ? VLIGHT : BG,
    color: active ? GREEN : hov ? V : MUTED,
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    transition: 'all 0.13s', flexShrink: 0, textDecoration: 'none',
  };
  if (href) return (
    <Link to={href} title={title} aria-label={title} style={{ textDecoration: 'none' }}>
      <div style={style} onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}>{children}</div>
    </Link>
  );
  return (
    <button type="button" title={title} aria-label={title} onClick={onClick}
      onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={style}>{children}
    </button>
  );
}

function sectorLabel(sectionName: string, t: (k: string, o?: Record<string, string>) => string) {
  if (!sectionName || sectionName === 'General') {
    return t('boughtTickets.generalAdmission', { defaultValue: 'General' });
  }
  return sectionName;
}

// ─── OFFER RECEIVED card ──────────────────────────────────────────────────────
function ReceivedOfferCard({ offer, onAccept, onReject, isProcessing, t }: {
  offer: OfferWithReceivedContext;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const isMobile = useIsMobile();
  const ctx      = offer.receivedContext;
  const offered  = formatCurrencyDisplay(offer.offeredPrice.amount, offer.offeredPrice.currency);
  const listing  = formatCurrencyDisplay(ctx.listingPrice.amount, ctx.listingPrice.currency);
  const discount = ctx.listingPrice.amount > 0
    ? Math.round((1 - offer.offeredPrice.amount / ctx.listingPrice.amount) * 100)
    : 0;

  const ticketLabel = offer.tickets.type === 'numbered'
    ? `${offer.tickets.seats.length} ${offer.tickets.seats.length === 1
        ? t('boughtTickets.seat', { defaultValue: 'entrada' })
        : t('boughtTickets.seats', { defaultValue: 'entradas' })}`
    : `${offer.tickets.count} ${offer.tickets.count === 1
        ? t('boughtTickets.ticket', { defaultValue: 'entrada' })
        : t('boughtTickets.tickets', { defaultValue: 'entradas' })}`;

  const sector   = sectorLabel(ctx.sectionName ?? '', t);
  const bannerUrl = ctx.bannerUrls?.square ?? ctx.bannerUrls?.rectangle;

  const imageStyle: React.CSSProperties = isMobile
    ? { width: 'clamp(80px, 26vw, 100px)', flexShrink: 0, alignSelf: 'stretch', background: VLIGHT, overflow: 'hidden', position: 'relative' }
    : { aspectRatio: '1', flexShrink: 0, alignSelf: 'stretch', background: VLIGHT, overflow: 'hidden', position: 'relative', minWidth: 100, maxWidth: 160 };

  return (
    <div style={{ background: CARD, borderRadius: 14, border: `1px solid #ddd6fe`, overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>

        {/* Accent bar */}
        <div style={{ width: 3, flexShrink: 0, background: V, alignSelf: 'stretch' }} />

        {/* Image */}
        <div style={imageStyle}>
          {bannerUrl
            ? <img src={bannerUrl} alt={ctx.eventName}
                style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center' }} />
            : <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Ticket size={26} style={{ color: V, opacity: 0.3 }} />
              </div>
          }
        </div>

        {/* Content */}
        <div style={{ flex: 1, padding: '11px 13px', minWidth: 0, display: 'flex', flexDirection: 'column', gap: 4 }}>

          {/* Event name */}
          <p style={{ fontSize: 14, fontWeight: 800, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>
            {ctx.eventName}
          </p>

          {/* Date · tickets · sector */}
          <p style={{ fontSize: 12, color: MUTED, lineHeight: 1.4, ...S }}>
            {formatDate(new Date(ctx.eventDate))}
            <span style={{ color: BORD2 }}>{' · '}</span>{ticketLabel}
            {sector && <><span style={{ color: BORD2 }}>{' · '}</span>{sector}</>}
          </p>

          {/* Buyer */}
          <p style={{ fontSize: 12, color: MUTED, ...S }}>
            <span style={{ color: HINT }}>{t('sellerDashboard.labelBuyer', { defaultValue: 'Comprador' })}</span>
            {' · '}
            <span style={{ fontWeight: 700, color: DARK }}>{ctx.buyerName}</span>
          </p>

          {/* Price row */}
          <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 6, marginTop: 2 }}>
            <span style={{ fontSize: 11.5, color: HINT, textDecoration: 'line-through', ...S }}>{listing}</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: V, ...S }}>{offered}</span>
            {discount > 0 && (
              <span style={{
                fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
                background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', ...S,
              }}>
                −{discount}%
              </span>
            )}
          </div>

        </div>
      </div>

      {/* Aceptar | Rechazar footer */}
      <div style={{ display: 'flex', gap: 8, padding: '9px 11px', borderTop: `1px solid #f0ebff` }}>
        <button
          type="button" onClick={() => onAccept(offer.id)} disabled={isProcessing}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 10, border: 'none',
            background: isProcessing ? BORD2 : V, color: CARD,
            fontSize: 13, fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'background 0.14s', ...S,
          }}>
          {isProcessing
            ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} />
            : <Check size={13} />
          }
          {t('boughtTickets.acceptOffer')}
        </button>
        <button
          type="button" onClick={() => onReject(offer.id)} disabled={isProcessing}
          style={{
            flex: 1, padding: '9px 0', borderRadius: 10,
            background: CARD, color: MUTED, border: `1.5px solid ${BORD2}`,
            fontSize: 13, fontWeight: 600, cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, ...S,
          }}>
          <X size={13} />
          {t('boughtTickets.rejectOffer')}
        </button>
      </div>
    </div>
  );
}

// ─── SALE IN PROGRESS row ─────────────────────────────────────────────────────
function SaleWaitingRow({ tx, t }: {
  tx: TransactionWithDetails;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const [hov, setHov] = useState(false);
  const waiting = getWaitingForLabel(tx.requiredActor, t);
  const status  = getTransactionStatusInfo(tx.status, t, true);
  const price   = tx.pricePerTicket ? formatCurrencyDisplay(tx.pricePerTicket.amount, tx.pricePerTicket.currency) : null;

  return (
    <Link to={`/transaction/${tx.id}`} state={{ from: '/seller-dashboard' }} style={{ textDecoration: 'none' }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
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
            <p style={{ fontSize: 12, color: MUTED, ...S }}>
              {formatDate(new Date(tx.eventDate))}
              {price && <span style={{ fontWeight: 700, color: DARK }}> · {price}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12, color: HINT, flexShrink: 0, ...S }}>
            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#f59e0b' }} />
            <span style={{ whiteSpace: 'nowrap' }}>{waiting || status.label}</span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── LISTING row ──────────────────────────────────────────────────────────────
function ListingRow({ listing, copiedListingId, onCopyLink, pendingOfferCount = 0, t }: {
  listing: TicketListingWithEvent;
  copiedListingId: string | null;
  onCopyLink: (l: TicketListingWithEvent) => void;
  pendingOfferCount?: number;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const [hov, setHov] = useState(false);
  const isCopied  = copiedListingId === listing.id;
  const price     = formatCurrencyDisplay(listing.pricePerTicket.amount, listing.pricePerTicket.currency);
  const available = listing.ticketUnits.filter(u => u.status === TicketUnitStatus.Available).length;
  const sector    = listing.sectionName || listing.type || t('boughtTickets.generalAdmission', { defaultValue: 'General' });

  return (
    <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
      style={{
        background: CARD, borderRadius: 14,
        border: `1px solid ${BORDER}`, overflow: 'hidden',
        boxShadow: hov ? '0 2px 10px rgba(0,0,0,0.05)' : 'none',
        transition: 'box-shadow 0.14s',
      }}>
      <div style={{ display: 'flex' }}>
        <Thumb url={listing.bannerUrls?.square ?? listing.bannerUrls?.rectangle} name={listing.eventName} size={72} />
        <div style={{ flex: 1, padding: '10px 13px', minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 15, fontWeight: 800, color: DARK, ...S }}>{sector}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: MUTED, ...S }}>× {available}</span>
            {pendingOfferCount > 0 && (
              <span style={{
                marginLeft: 'auto', fontSize: 11, fontWeight: 700,
                padding: '2px 8px', borderRadius: 100,
                background: VLIGHT, color: V, border: '1px solid #ddd6fe', ...S,
              }}>
                {pendingOfferCount} {pendingOfferCount === 1
                  ? t('sellerDashboard.offer',  { defaultValue: 'oferta'  })
                  : t('sellerDashboard.offers', { defaultValue: 'ofertas' })}
              </span>
            )}
          </div>
          <p style={{ fontSize: 12, color: MUTED, marginBottom: 5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>
            {listing.eventName} · {formatDate(new Date(listing.eventDate))}
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 14, fontWeight: 800, color: DARK, ...S }}>{price}</span>
            <span style={{ fontSize: 12, color: HINT, ...S }}>/ {t('boughtTickets.perTicket', { defaultValue: 'entrada' })}</span>
            <span style={{
              marginLeft: 'auto', fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 100,
              background: GLIGHT, color: GREEN, border: `1px solid ${GBORD}`, ...S,
            }}>
              {t('boughtTickets.activeListing')}
            </span>
          </div>
        </div>
      </div>
      <div style={{ borderTop: `1px solid ${BORDER}`, padding: '8px 12px', display: 'flex', gap: 6, alignItems: 'center' }}>
        <Link to={`/edit-listing/${listing.id}`} style={{ textDecoration: 'none', flex: 1 }}>
          <button style={{
            width: '100%', padding: '8px 0', borderRadius: 8,
            background: V, color: CARD, border: 'none',
            fontSize: 13, fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, ...S,
          }}>
            <Edit size={13} />{t('boughtTickets.editListing')}
          </button>
        </Link>
        <IconBtn href={`/buy/${listing.eventSlug}/${listing.id}`} title={t('boughtTickets.viewListing')}>
          <Eye size={14} />
        </IconBtn>
        <IconBtn
          title={isCopied ? t('boughtTickets.copied') : t('boughtTickets.copyLink')}
          onClick={() => onCopyLink(listing)}
          active={isCopied}
        >
          {isCopied ? <Check size={14} /> : <LinkIcon size={14} />}
        </IconBtn>
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function SellerDashboardPage() {
  const { t }                              = useTranslation();
  const { user, isAuthenticated, canSell } = useUser();

  const [listed,            setListed]            = useState<TicketListingWithEvent[]>([]);
  const [sold,              setSold]              = useState<TransactionWithDetails[]>([]);
  const [receivedOffers,    setReceivedOffers]    = useState<OfferWithReceivedContext[]>([]);
  const [isLoading,         setIsLoading]         = useState(true);
  const [error,             setError]             = useState<string | null>(null);
  const [copiedListingId,   setCopiedListingId]   = useState<string | null>(null);
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(null);
  const [showPast,          setShowPast]          = useState(false);
  const [showHistory,       setShowHistory]       = useState(false);
  const [sdHistItems,       setSdHistItems]       = useState<ActivityHistoryItem[]>([]);
  const [sdHistHasMore,     setSdHistHasMore]     = useState(false);
  const [sdHistLoading,     setSdHistLoading]     = useState(false);
  const sdHistCursorRef     = useRef<string | null>(null);
  const sdHistExpandedOnce  = useRef(false);

  const loadSellerHistoryPage = useCallback(async (append: boolean) => {
    setSdHistLoading(true);
    try {
      const res = await ticketsService.getActivityHistory(
        'seller',
        append ? sdHistCursorRef.current : null,
        12,
      );
      sdHistCursorRef.current = res.nextCursor;
      setSdHistItems(prev => (append ? [...prev, ...res.items] : res.items));
      setSdHistHasMore(res.hasMore);
    } catch { /* optional: toast */ }
    finally { setSdHistLoading(false); }
  }, []);

  // ── Fetching ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isAuthenticated || !canSell()) return;
    setIsLoading(true); setError(null);
    ticketsService.getMyTickets()
      .then(data => { setListed(data.listed); setSold(data.sold); })
      .catch(() => setError(t('common.errorLoading')))
      .finally(() => setIsLoading(false));
  }, [isAuthenticated, canSell, t]);

  useEffect(() => {
    if (!isAuthenticated || !canSell()) return;
    offersService.listReceivedOffers()
      .then(res => setReceivedOffers(Array.isArray(res) ? res : []))
      .catch(() => setReceivedOffers([]));
  }, [isAuthenticated, canSell]);

  useEffect(() => {
    if (!showHistory || sdHistExpandedOnce.current) return;
    sdHistExpandedOnce.current = true;
    sdHistCursorRef.current = null;
    void loadSellerHistoryPage(false);
  }, [showHistory, loadSellerHistoryPage]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const handleCopyLink = async (listing: TicketListingWithEvent) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/buy/${listing.eventSlug}/${listing.id}`);
      setCopiedListingId(listing.id);
      setTimeout(() => setCopiedListingId(null), 2000);
    } catch {}
  };

  const handleAcceptOffer = async (offerId: string) => {
    setProcessingOfferId(offerId);
    try {
      await offersService.accept(offerId);
      const next = await offersService.listReceivedOffers();
      setReceivedOffers(Array.isArray(next) ? next : []);
    } finally { setProcessingOfferId(null); }
  };

  const handleRejectOffer = async (offerId: string) => {
    setProcessingOfferId(offerId);
    try {
      await offersService.reject(offerId);
      const next = await offersService.listReceivedOffers();
      setReceivedOffers(Array.isArray(next) ? next : []);
    } finally { setProcessingOfferId(null); }
  };

  // ── Derived ───────────────────────────────────────────────────────────────
  const actionRequired  = useMemo(() =>
    sold.filter(tx => !TERMINAL_STATUSES.includes(tx.status) && isUserRequiredActor(tx, user?.id, 'seller')),
  [sold, user?.id]);

  const salesInProgress = useMemo(() =>
    sold.filter(tx => !TERMINAL_STATUSES.includes(tx.status) && !isUserRequiredActor(tx, user?.id, 'seller')),
  [sold, user?.id]);

  const pendingOffers  = useMemo(() => receivedOffers.filter(o => o.status === 'pending'), [receivedOffers]);
  const activeListings = useMemo(() => listed.filter(l => l.status === 'Active'), [listed]);
  const pastListings   = useMemo(() => listed.filter(l => l.status !== 'Active'), [listed]);

  const pendingByListing = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of pendingOffers) map.set(o.listingId, (map.get(o.listingId) ?? 0) + 1);
    return map;
  }, [pendingOffers]);

  // History: completed/cancelled sales + accepted/rejected offers
  const completedSales = useMemo(() =>
    sold.filter(tx => TERMINAL_STATUSES.includes(tx.status))
      .sort((a, b) => new Date(b.eventDate).getTime() - new Date(a.eventDate).getTime()),
  [sold]);

  const closedOffers = useMemo(() =>
    receivedOffers.filter(o => ['accepted', 'rejected', 'cancelled', 'expired'].includes(o.status)),
  [receivedOffers]);

  const hasAnything = activeListings.length + salesInProgress.length + actionRequired.length + pendingOffers.length > 0;

  // ── Guards ────────────────────────────────────────────────────────────────
  const guardCard = (title: string, body: string, ctaLabel: string, ctaTo: string) => (
    <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, padding: '40px 32px', maxWidth: 360, textAlign: 'center' }}>
        <div style={{ width: 56, height: 56, borderRadius: '50%', background: VLIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
          <Ticket size={24} style={{ color: V }} />
        </div>
        <p style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 8, ...S }}>{title}</p>
        <p style={{ fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 1.55, ...S }}>{body}</p>
        <Link to={ctaTo} style={{ textDecoration: 'none' }}>
          <button style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: V, color: CARD, fontSize: 14, fontWeight: 700, cursor: 'pointer', ...S }}>
            {ctaLabel}
          </button>
        </Link>
      </div>
    </div>
  );

  if (!isAuthenticated) return guardCard(t('boughtTickets.loginRequired'), t('boughtTickets.loginToView'), t('header.login'), '/register');
  if (!canSell())        return guardCard(t('sellerDashboard.title'), t('boughtTickets.listedTicketsWillAppear'), t('boughtTickets.startSelling'), '/become-seller');

  // ── Left column: Actividad panel ─────────────────────────────────────────
  const totalAttentionCount = actionRequired.length + pendingOffers.length;
  const attentionCol = (
    <div style={{
      background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`,
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '13px 16px', borderBottom: `1px solid #f0f0ee`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: V, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: DARK, ...S }}>
          {t('sellerDashboard.activityPanel', { defaultValue: 'Actividad' })}
        </span>
        {totalAttentionCount > 0 && (
          <span style={{
            minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
            fontSize: 10.5, fontWeight: 700, background: V, color: CARD,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {totalAttentionCount}
          </span>
        )}
        {totalAttentionCount > 0 && (
          <span style={{ marginLeft: 'auto', fontSize: 11, color: HINT, ...S }}>
            {t('sellerDashboard.requiresAttention', { defaultValue: 'Requiere atención' })}
          </span>
        )}
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Sub-section: action required */}
        {actionRequired.length > 0 && (
          <div>
            <SubLabel icon={<AlertCircle size={11} />} label={t('boughtTickets.pendingAwaitingMyAction')} color={V} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {actionRequired.map(tx => (
                <TransactionActionRequiredCard key={tx.id} tx={tx} variant="seller" t={t} linkFrom="/seller-dashboard" />
              ))}
            </div>
          </div>
        )}

        {/* Sub-section: pending offers */}
        {pendingOffers.length > 0 && (
          <div>
            <SubLabel
              icon={<AlertCircle size={11} />}
              label={t('sellerDashboard.tabReceived')}
              count={pendingOffers.length}
            />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {pendingOffers.map(o => (
                <ReceivedOfferCard
                  key={o.id} offer={o} t={t}
                  onAccept={handleAcceptOffer}
                  onReject={handleRejectOffer}
                  isProcessing={processingOfferId === o.id}
                />
              ))}
            </div>
          </div>
        )}

        {/* Sub-section: sales in progress (waiting) */}
        {salesInProgress.length > 0 && (
          <div>
            <SubLabel icon={<Clock size={11} />} label={t('boughtTickets.pendingAwaitingOtherAction')} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {salesInProgress.map(tx => <SaleWaitingRow key={tx.id} tx={tx} t={t} />)}
            </div>
          </div>
        )}

        {/* All clear */}
        {actionRequired.length === 0 && pendingOffers.length === 0 && salesInProgress.length === 0 && (
          <p style={{ fontSize: 13, color: HINT, textAlign: 'center', padding: '8px 0', ...S }}>
            {t('sellerDashboard.noAttentionItems', { defaultValue: 'Todo al día. Sin ofertas ni ventas pendientes.' })}
          </p>
        )}

        {/* History preview */}
        {(completedSales.length > 0 || closedOffers.length > 0) && (
          <div>
            <button type="button" onClick={() => setShowHistory(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showHistory ? 10 : 0, width: '100%' }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: HINT, ...S }}>
                {t('sellerDashboard.history', { defaultValue: 'Historial' })}
              </span>
              <span style={{ fontSize: 9, color: HINT }}>{showHistory ? '▲' : '▼'}</span>
              {!showHistory && (
                <span style={{ marginLeft: 'auto', fontSize: 11.5, color: V, fontWeight: 600, ...S }}>
                  {t('sellerDashboard.viewFullHistory', { defaultValue: 'Ver historial' })} →
                </span>
              )}
            </button>
            {showHistory && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, opacity: 0.92 }}>
                {sdHistLoading && sdHistItems.length === 0 && (
                  <p style={{ fontSize: 12.5, color: MUTED, textAlign: 'center', padding: 8, ...S }}>{t('common.loading')}</p>
                )}
                {!sdHistLoading && sdHistItems.length === 0 && (
                  <p style={{ fontSize: 12.5, color: MUTED, textAlign: 'center', padding: 8, ...S }}>
                    {t('sellerDashboard.noHistory', { defaultValue: 'Sin historial todavía' })}
                  </p>
                )}
                {sdHistItems.map(item =>
                  item.type === 'transaction'
                    ? <CompletedSaleRow key={`sd-tx-${item.transaction.id}`} tx={item.transaction} t={t} />
                    : (
                        <ClosedOfferRow
                          key={`sd-of-${(item.offer as OfferWithReceivedContext).id}`}
                          offer={item.offer as OfferWithReceivedContext}
                          t={t}
                        />
                      ),
                )}
                {sdHistHasMore && (
                  <button
                    type="button"
                    disabled={sdHistLoading}
                    onClick={() => void loadSellerHistoryPage(true)}
                    style={{
                      padding: '9px 14px', borderRadius: 10, background: BG, border: `1px solid ${BORDER}`,
                      fontSize: 13, fontWeight: 700, color: V, cursor: sdHistLoading ? 'wait' : 'pointer', ...S,
                    }}
                  >
                    {sdHistLoading ? t('common.loading') : t('boughtTickets.loadMoreHistory', { defaultValue: 'Cargar más' })}
                  </button>
                )}
                {sdHistItems.length > 0 && (
                  <Link to="/seller-dashboard/historial" style={{ textDecoration: 'none', alignSelf: 'center' }}>
                    <span style={{ fontSize: 12, fontWeight: 600, color: HINT, ...S }}>
                      {t('sellerDashboard.openFullHistory', { defaultValue: 'Abrir historial completo' })} →
                    </span>
                  </Link>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  // ── Right column: listings panel ─────────────────────────────────────────
  const listingsCol = (
    <div style={{
      background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`,
      overflow: 'hidden',
    }}>
      {/* Panel header */}
      <div style={{
        padding: '13px 16px', borderBottom: `1px solid #f0f0ee`,
        display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: GREEN, flexShrink: 0 }} />
        <span style={{ fontSize: 14, fontWeight: 800, color: DARK, ...S }}>
          {t('sellerDashboard.listingsPanel', { defaultValue: 'Mis publicaciones' })}
        </span>
        {activeListings.length > 0 && (
          <span style={{
            minWidth: 18, height: 18, borderRadius: 9, padding: '0 6px',
            fontSize: 10.5, fontWeight: 700, background: GLIGHT, color: GREEN,
            border: `1px solid ${GBORD}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', ...S,
          }}>
            {activeListings.length} {t('sellerDashboard.active', { defaultValue: 'activas' })}
          </span>
        )}
        <Link to="/sell-ticket" style={{ textDecoration: 'none', marginLeft: 'auto' }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: V, display: 'flex', alignItems: 'center', gap: 4, ...S }}>
            <Plus size={12} />{t('sellerDashboard.newListing', { defaultValue: 'Publicar' })}
          </span>
        </Link>
      </div>

      <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 20 }}>
        <div>
          {activeListings.length > 0 && (
            <SubLabel icon={<CheckCircle size={11} />} label={t('boughtTickets.activeListings')} color={GREEN} />
          )}
          {activeListings.length === 0 ? (
            <div style={{ borderRadius: 12, border: `1px solid ${BORDER}`, padding: '24px 20px', textAlign: 'center' }}>
              <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 14, ...S }}>
                {t('boughtTickets.listedTicketsWillAppear')}
              </p>
              <Link to="/sell-ticket" style={{ textDecoration: 'none' }}>
                <button style={{ padding: '8px 18px', borderRadius: 9, border: 'none', background: V, color: CARD, fontSize: 13, fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, ...S }}>
                  <Plus size={13} />{t('boughtTickets.startSelling')}
                </button>
              </Link>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
              {activeListings.map(l => (
                <ListingRow
                  key={l.id} listing={l} t={t}
                  copiedListingId={copiedListingId}
                  onCopyLink={handleCopyLink}
                  pendingOfferCount={pendingByListing.get(l.id) ?? 0}
                />
              ))}
            </div>
          )}
        </div>

        {pastListings.length > 0 && (
          <div>
            <button type="button" onClick={() => setShowPast(v => !v)}
              style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: showPast ? 10 : 0 }}>
              <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: HINT, ...S }}>
                {t('boughtTickets.pastListings')} ({pastListings.length})
              </span>
              <span style={{ fontSize: 9, color: HINT }}>{showPast ? '▲' : '▼'}</span>
            </button>
            {showPast && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8, opacity: 0.75 }}>
                {pastListings.map(l => {
                  const url    = l.bannerUrls?.rectangle ?? l.bannerUrls?.square;
                  const sector = l.sectionName || l.type || 'General';
                  const price  = formatCurrencyDisplay(l.pricePerTicket.amount, l.pricePerTicket.currency);
                  return (
                    <div key={l.id} style={{ background: BG, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                      <div style={{ height: 64, background: VLIGHT, position: 'relative', overflow: 'hidden' }}>
                        {url && <img src={url} alt={l.eventName} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, filter: 'grayscale(0.4)', opacity: 0.75 }} />}
                      </div>
                      <div style={{ padding: '8px 10px' }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>{sector}</p>
                        <p style={{ fontSize: 11.5, color: MUTED, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>{l.eventName}</p>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <span style={{ fontSize: 12.5, fontWeight: 700, color: DARK, ...S }}>{price}</span>
                          <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 100, background: BG, color: MUTED, border: `1px solid ${BORD2}`, ...S }}>{l.status}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, ...S }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        .sd-grid { display: flex; flex-direction: column; gap: 28px; }
        @media (min-width: 768px) {
          .sd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        }
        @keyframes sdSkShimmer {
          from { background-position: -500px 0; }
          to   { background-position:  500px 0; }
        }
        .sd-sk {
          background: linear-gradient(90deg, #e8e8e5 25%, #f0f0ed 50%, #e8e8e5 75%);
          background-size: 500px 100%;
          animation: sdSkShimmer 1.4s ease-in-out infinite;
          border-radius: 6px;
        }
      `}</style>

      <PageContentMaxWidth style={{ paddingTop: 24, paddingBottom: 56 }}>

        <PageHeader
          title={t('sellerDashboard.title')}
          backTo={{ labelKey: 'common.back' }}
          action={{
            label: `${t('boughtTickets.startSelling')}`,
            to: '/sell-ticket',
            icon: <Plus size={14} />,
          }}
        />

        {isLoading && (
          <div className="sd-grid">
            {/* Left panel — Actividad */}
            <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="sd-sk" style={{ width: 8, height: 8, borderRadius: '50%' }} />
                <div className="sd-sk" style={{ height: 13, width: 80 }} />
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
                {/* Received offer card skeleton */}
                <div style={{ background: CARD, borderRadius: 14, border: `1px solid #ddd6fe`, overflow: 'hidden' }}>
                  <div style={{ display: 'flex' }}>
                    <div style={{ width: 3, flexShrink: 0, background: '#ddd6fe', alignSelf: 'stretch' }} />
                    <div className="sd-sk" style={{ width: 90, flexShrink: 0, alignSelf: 'stretch', minHeight: 90, borderRadius: 0 }} />
                    <div style={{ flex: 1, padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 7 }}>
                      <div className="sd-sk" style={{ height: 13, width: '85%' }} />
                      <div className="sd-sk" style={{ height: 10, width: '65%' }} />
                      <div className="sd-sk" style={{ height: 10, width: '50%' }} />
                      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                        <div className="sd-sk" style={{ height: 10, width: 40 }} />
                        <div className="sd-sk" style={{ height: 18, width: 60 }} />
                      </div>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, padding: '9px 11px', borderTop: '1px solid #f0ebff' }}>
                    <div className="sd-sk" style={{ flex: 1, height: 34, borderRadius: 10 }} />
                    <div className="sd-sk" style={{ flex: 1, height: 34, borderRadius: 10 }} />
                  </div>
                </div>
                {/* 2 sale-in-progress row skeletons */}
                {[75, 85].map((w, i) => (
                  <div key={i} style={{ display: 'flex', background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                    <div className="sd-sk" style={{ width: 52, flexShrink: 0, alignSelf: 'stretch', minHeight: 52, borderRadius: 0 }} />
                    <div style={{ flex: 1, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                      <div style={{ flex: 1 }}>
                        <div className="sd-sk" style={{ height: 12, width: `${w}%`, marginBottom: 6 }} />
                        <div className="sd-sk" style={{ height: 10, width: '55%' }} />
                      </div>
                      <div className="sd-sk" style={{ height: 18, width: 72, borderRadius: 100, flexShrink: 0 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Right panel — Mis publicaciones */}
            <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
              <div style={{ padding: '13px 16px', borderBottom: '1px solid #f0f0ee', display: 'flex', alignItems: 'center', gap: 8 }}>
                <div className="sd-sk" style={{ width: 8, height: 8, borderRadius: '50%' }} />
                <div className="sd-sk" style={{ height: 13, width: 120 }} />
              </div>
              <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                {/* 2 listing card skeletons */}
                {[70, 80].map((w, i) => (
                  <div key={i} style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                    <div style={{ display: 'flex' }}>
                      <div className="sd-sk" style={{ width: 72, flexShrink: 0, alignSelf: 'stretch', minHeight: 72, borderRadius: 0 }} />
                      <div style={{ flex: 1, padding: '10px 13px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 6 }}>
                          <div className="sd-sk" style={{ height: 13, width: `${w}%` }} />
                        </div>
                        <div className="sd-sk" style={{ height: 10, width: '80%', marginBottom: 8 }} />
                        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                          <div className="sd-sk" style={{ height: 14, width: 55 }} />
                          <div className="sd-sk" style={{ height: 18, width: 56, borderRadius: 100, marginLeft: 'auto' }} />
                        </div>
                      </div>
                    </div>
                    <div style={{ borderTop: `1px solid ${BORDER}`, padding: '8px 12px', display: 'flex', gap: 6 }}>
                      <div className="sd-sk" style={{ flex: 1, height: 32, borderRadius: 8 }} />
                      <div className="sd-sk" style={{ width: 34, height: 32, borderRadius: 8 }} />
                      <div className="sd-sk" style={{ width: 34, height: 32, borderRadius: 8 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
        {error     && <ErrorAlert message={error} className="mb-6" />}

        {!isLoading && !error && (
          hasAnything ? (
            <div className="sd-grid">
              {attentionCol}
              {listingsCol}
            </div>
          ) : (
            <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, padding: '52px 24px', textAlign: 'center' }}>
              <div style={{ width: 56, height: 56, borderRadius: '50%', background: VLIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
                <Ticket size={24} style={{ color: V }} />
              </div>
              <p style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 6, ...S }}>{t('boughtTickets.noListingsYet')}</p>
              <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 22, lineHeight: 1.55, ...S }}>{t('boughtTickets.listedTicketsWillAppear')}</p>
              <Link to="/sell-ticket" style={{ textDecoration: 'none' }}>
                <button style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: V, color: CARD, fontSize: 14, fontWeight: 700, cursor: 'pointer', ...S }}>
                  {t('boughtTickets.startSelling')}
                </button>
              </Link>
            </div>
          )
        )}
      </PageContentMaxWidth>

      <SellerUnverifiedModalTrigger showWhen={salesInProgress.length > 0} />
    </div>
  );
}
