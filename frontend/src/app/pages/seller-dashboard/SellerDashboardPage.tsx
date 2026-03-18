import { useState, useEffect, useMemo } from 'react';
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
import { SellerUnverifiedModalTrigger } from '@/app/components/SellerUnverifiedModalTrigger';
import { formatCurrency } from '@/lib/format-currency';
import { formatDate }     from '@/lib/format-date';
import type {
  TransactionWithDetails, TicketListingWithEvent, OfferWithReceivedContext,
} from '@/api/types';
import { TicketUnitStatus } from '@/api/types';
import {
  isUserRequiredActor, TERMINAL_STATUSES,
  getTransactionStatusInfo, getWaitingForLabel,
  V, VLIGHT, DARK, MUTED, HINT, BG, CARD, BORDER, BORD2, GREEN, GLIGHT, GBORD, S,
} from '@/app/pages/my-tickets/transactionUtils';

// ─── Helpers ─────────────────────────────────────────────────────────────────
function fmt(amount: number, currency: string) {
  return formatCurrency(amount, currency).replace(/[,.]00$/, '');
}

// ─── SectionHeader ────────────────────────────────────────────────────────────
function SectionHeader({ icon, label, color = MUTED, count, countBg, countColor }: {
  icon: React.ReactNode; label: string; color?: string;
  count?: number; countBg?: string; countColor?: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 10 }}>
      {icon}
      <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color, ...S }}>
        {label}
      </span>
      {count !== undefined && count > 0 && (
        <span style={{
          minWidth: 18, height: 18, borderRadius: 9, padding: '0 5px',
          fontSize: 10.5, fontWeight: 700,
          background: countBg ?? BORD2, color: countColor ?? CARD,
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

// ─── ACTION REQUIRED card ─────────────────────────────────────────────────────
function ActionRequiredCard({ tx, t }: {
  tx: TransactionWithDetails;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const [hov, setHov] = useState(false);
  const status = getTransactionStatusInfo(tx.status, t, true);
  const price  = tx.pricePerTicket ? fmt(tx.pricePerTicket.amount, tx.pricePerTicket.currency) : null;

  return (
    <Link to={`/transaction/${tx.id}`} state={{ from: '/seller-dashboard' }} style={{ textDecoration: 'none' }}>
      <div onMouseEnter={() => setHov(true)} onMouseLeave={() => setHov(false)}
        style={{
          display: 'flex', background: CARD, borderRadius: 14,
          border: `1.5px solid ${V}`, overflow: 'hidden',
          boxShadow: hov ? '0 4px 14px rgba(109,40,217,0.12)' : 'none',
          transition: 'box-shadow 0.14s',
        }}>
        <Thumb url={tx.bannerUrls?.square ?? tx.bannerUrls?.rectangle} name={tx.eventName} size={72} />
        <div style={{ flex: 1, padding: '10px 13px', minWidth: 0, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 4 }}>
          <div>
            <p style={{ fontSize: 14, fontWeight: 800, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2, ...S }}>
              {tx.eventName}
            </p>
            <p style={{ fontSize: 12, color: MUTED, ...S }}>
              {formatDate(new Date(tx.eventDate))}
              {tx.ticketType && ` · ${tx.ticketType}`}
              {price && <span style={{ fontWeight: 700, color: DARK }}> · {price}</span>}
            </p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: V, display: 'flex', alignItems: 'center', gap: 4, ...S }}>
              <AlertCircle size={11} />{status.label}
            </span>
            <span style={{ padding: '6px 14px', borderRadius: 8, background: V, color: CARD, fontSize: 12, fontWeight: 700, flexShrink: 0, ...S }}>
              {t('boughtTickets.viewTransaction', { defaultValue: 'Ver' })} →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

// ─── OFFER RECEIVED card ──────────────────────────────────────────────────────
function ReceivedOfferCard({ offer, onAccept, onReject, isProcessing, t }: {
  offer: OfferWithReceivedContext;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  isProcessing: boolean;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  const ctx     = offer.receivedContext;
  const offered = fmt(offer.offeredPrice.amount, offer.offeredPrice.currency);
  const listing = fmt(ctx.listingPrice.amount, ctx.listingPrice.currency);
  const discount = ctx.listingPrice.amount > 0
    ? Math.round((1 - offer.offeredPrice.amount / ctx.listingPrice.amount) * 100)
    : 0;
  const ticketLabel = offer.tickets.type === 'numbered'
    ? `${offer.tickets.seats.length} ${offer.tickets.seats.length === 1 ? t('boughtTickets.seat', { defaultValue: 'entrada' }) : t('boughtTickets.seats', { defaultValue: 'entradas' })}`
    : `${offer.tickets.count} ${offer.tickets.count === 1 ? t('boughtTickets.ticket', { defaultValue: 'entrada' }) : t('boughtTickets.tickets', { defaultValue: 'entradas' })}`;

  return (
    <div style={{ background: CARD, borderRadius: 14, border: '1px solid #ddd6fe', overflow: 'hidden' }}>
      <div style={{ display: 'flex' }}>
        <Thumb url={ctx.bannerUrls?.square ?? ctx.bannerUrls?.rectangle} name={ctx.eventName} size={64} />
        <div style={{ flex: 1, padding: '9px 12px', minWidth: 0 }}>
          <p style={{ fontSize: 13.5, fontWeight: 800, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 2, ...S }}>
            {ctx.eventName}
          </p>
          <p style={{ fontSize: 12, color: MUTED, marginBottom: 4, ...S }}>
            {ticketLabel} · de <span style={{ fontWeight: 700, color: DARK }}>{ctx.buyerName}</span>
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            <span style={{ fontSize: 12, color: HINT, textDecoration: 'line-through', ...S }}>{listing}</span>
            <span style={{ fontSize: 14, fontWeight: 800, color: V, ...S }}>{offered}</span>
            {discount > 0 && (
              <span style={{ fontSize: 10.5, fontWeight: 700, padding: '1px 6px', borderRadius: 100, background: '#fef2f2', color: '#dc2626', border: '1px solid #fca5a5', ...S }}>
                −{discount}%
              </span>
            )}
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: 7, padding: '8px 11px', borderTop: '1px solid #f0ebff' }}>
        <button type="button" onClick={() => onAccept(offer.id)} disabled={isProcessing}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8, border: 'none',
            background: isProcessing ? BORD2 : V, color: CARD,
            fontSize: 13, fontWeight: 700, cursor: isProcessing ? 'not-allowed' : 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5,
            transition: 'background 0.14s', ...S,
          }}>
          {isProcessing ? <Loader2 size={13} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Check size={13} />}
          {t('boughtTickets.acceptOffer')}
        </button>
        <button type="button" onClick={() => onReject(offer.id)} disabled={isProcessing}
          style={{
            flex: 1, padding: '8px 0', borderRadius: 8,
            background: CARD, color: MUTED, border: `1px solid ${BORD2}`,
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
  const price   = tx.pricePerTicket ? fmt(tx.pricePerTicket.amount, tx.pricePerTicket.currency) : null;

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
  const price     = fmt(listing.pricePerTicket.amount, listing.pricePerTicket.currency);
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
    receivedOffers.filter(o => ['accepted', 'rejected', 'cancelled'].includes(o.status)),
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

  // ── Left column: attention items ──────────────────────────────────────────
  const attentionCol = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {actionRequired.length > 0 && (
        <div>
          <SectionHeader
            icon={<AlertCircle size={13} />}
            label={t('boughtTickets.pendingAwaitingMyAction')}
            color={V} count={actionRequired.length} countBg={V} countColor={CARD}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {actionRequired.map(tx => <ActionRequiredCard key={tx.id} tx={tx} t={t} />)}
          </div>
        </div>
      )}

      {pendingOffers.length > 0 && (
        <div>
          <SectionHeader
            icon={<AlertCircle size={12} />}
            label={t('sellerDashboard.tabReceived')}
            color={MUTED} count={pendingOffers.length} countBg={VLIGHT} countColor={V}
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

      {salesInProgress.length > 0 && (
        <div>
          <SectionHeader
            icon={<Clock size={12} />}
            label={t('boughtTickets.pendingAwaitingOtherAction')}
            color={HINT}
          />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {salesInProgress.map(tx => <SaleWaitingRow key={tx.id} tx={tx} t={t} />)}
          </div>
        </div>
      )}

      {/* Empty attention state */}
      {actionRequired.length === 0 && pendingOffers.length === 0 && salesInProgress.length === 0 && (
        <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: '20px 18px', textAlign: 'center' }}>
          <p style={{ fontSize: 13, color: HINT, ...S }}>
            {t('sellerDashboard.noAttentionItems', { defaultValue: 'Todo al día. Sin ofertas ni ventas pendientes.' })}
          </p>
        </div>
      )}

      {/* History preview — last 3 completed sales + closed offers */}
      {(completedSales.length > 0 || closedOffers.length > 0) && (
        <div>
          <button type="button" onClick={() => setShowHistory(v => !v)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: HINT, ...S }}>
              {t('sellerDashboard.history', { defaultValue: 'Historial' })}
            </span>
            <span style={{ fontSize: 10, color: HINT }}>{showHistory ? '▲' : '▼'}</span>
          </button>
          {showHistory && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 7, opacity: 0.75 }}>
              {/* Last 3 completed sales */}
              {completedSales.slice(0, 3).map(tx => {
                const price = tx.pricePerTicket ? fmt(tx.pricePerTicket.amount, tx.pricePerTicket.currency) : null;
                const url   = tx.bannerUrls?.square ?? tx.bannerUrls?.rectangle;
                const isCompleted = tx.status === 'Completed';
                return (
                  <Link key={tx.id} to={`/transaction/${tx.id}`} state={{ from: '/seller-dashboard' }} style={{ textDecoration: 'none' }}>
                    <div style={{ display: 'flex', background: CARD, borderRadius: 11, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                      <div style={{ width: 48, flexShrink: 0, alignSelf: 'stretch', background: VLIGHT, position: 'relative', overflow: 'hidden' }}>
                        {url && <img src={url} alt={tx.eventName} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, filter: 'grayscale(0.3)' }} />}
                      </div>
                      <div style={{ flex: 1, padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontSize: 13, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1, ...S }}>
                            {tx.eventName}
                          </p>
                          <p style={{ fontSize: 11.5, color: MUTED, ...S }}>
                            {formatDate(new Date(tx.eventDate))}{price && ` · ${price}`}
                          </p>
                        </div>
                        <span style={{
                          fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 100, flexShrink: 0,
                          background: isCompleted ? GLIGHT : BG,
                          color: isCompleted ? GREEN : MUTED,
                          border: `1px solid ${isCompleted ? GBORD : BORD2}`, ...S,
                        }}>
                          {isCompleted ? t('boughtTickets.completed') : t('boughtTickets.cancelled')}
                        </span>
                      </div>
                    </div>
                  </Link>
                );
              })}
              {/* Last 3 closed offers */}
              {closedOffers.slice(0, 3).map(o => {
                const ctx    = o.receivedContext;
                const offered = fmt(o.offeredPrice.amount, o.offeredPrice.currency);
                const url     = ctx.bannerUrls?.square ?? ctx.bannerUrls?.rectangle;
                const isAccepted = o.status === 'accepted';
                return (
                  <div key={o.id} style={{ display: 'flex', background: CARD, borderRadius: 11, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                    <div style={{ width: 48, flexShrink: 0, alignSelf: 'stretch', background: VLIGHT, position: 'relative', overflow: 'hidden' }}>
                      {url && <img src={url} alt={ctx.eventName} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, filter: 'grayscale(0.5)' }} />}
                    </div>
                    <div style={{ flex: 1, padding: '8px 11px', display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={{ fontSize: 13, fontWeight: 700, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 1, ...S }}>
                          {ctx.eventName}
                        </p>
                        <p style={{ fontSize: 11.5, color: MUTED, ...S }}>
                          {t('sellerDashboard.fromBuyer', { defaultValue: 'De' })} {ctx.buyerName} · {offered}
                        </p>
                      </div>
                      <span style={{
                        fontSize: 10.5, fontWeight: 700, padding: '2px 7px', borderRadius: 100, flexShrink: 0,
                        background: isAccepted ? GLIGHT : BG,
                        color: isAccepted ? GREEN : MUTED,
                        border: `1px solid ${isAccepted ? GBORD : BORD2}`, ...S,
                      }}>
                        {isAccepted ? t('boughtTickets.offerStatusAccepted') : t('boughtTickets.offerStatusRejected')}
                      </span>
                    </div>
                  </div>
                );
              })}
              {/* Link to full history */}
              <Link to="/seller-dashboard/historial" style={{ textDecoration: 'none' }}>
                <div style={{
                  padding: '10px 14px', borderRadius: 11,
                  background: BG, border: `1px solid ${BORDER}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  fontSize: 13, fontWeight: 700, color: V, cursor: 'pointer', ...S,
                }}>
                  {t('sellerDashboard.viewFullHistory', { defaultValue: 'Ver historial completo' })} →
                </div>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // ── Right column: listings ────────────────────────────────────────────────
  const listingsCol = (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <div>
        <SectionHeader
          icon={<CheckCircle size={12} />}
          label={t('boughtTickets.activeListings')}
          color={GREEN} count={activeListings.length} countBg={GLIGHT} countColor={GREEN}
        />
        {activeListings.length === 0 ? (
          <div style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, padding: '28px 20px', textAlign: 'center' }}>
            <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 14, ...S }}>
              {t('boughtTickets.listedTicketsWillAppear')}
            </p>
            <Link to="/sell-ticket" style={{ textDecoration: 'none' }}>
              <button style={{
                padding: '8px 18px', borderRadius: 9, border: 'none',
                background: V, color: CARD, fontSize: 13, fontWeight: 700,
                cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 5, ...S,
              }}>
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
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', cursor: 'pointer', padding: 0, marginBottom: 10 }}>
            <span style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: HINT, ...S }}>
              {t('boughtTickets.pastListings')} ({pastListings.length})
            </span>
            <span style={{ fontSize: 10, color: HINT }}>{showPast ? '▲' : '▼'}</span>
          </button>
          {showPast && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 8, opacity: 0.75 }}>
              {pastListings.map(l => {
                const url    = l.bannerUrls?.rectangle ?? l.bannerUrls?.square;
                const sector = l.sectionName || l.type || 'General';
                const price  = fmt(l.pricePerTicket.amount, l.pricePerTicket.currency);
                return (
                  <div key={l.id} style={{ background: CARD, borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                    <div style={{ height: 64, background: VLIGHT, position: 'relative', overflow: 'hidden' }}>
                      {url && <img src={url} alt={l.eventName} style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0, filter: 'grayscale(0.4)', opacity: 0.75 }} />}
                    </div>
                    <div style={{ padding: '8px 10px' }}>
                      <p style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>{sector}</p>
                      <p style={{ fontSize: 11.5, color: MUTED, marginBottom: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>{l.eventName}</p>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontSize: 12.5, fontWeight: 700, color: DARK, ...S }}>{price}</span>
                        <span style={{ fontSize: 10.5, fontWeight: 700, padding: '2px 6px', borderRadius: 100, background: BG, color: MUTED, border: `1px solid ${BORD2}`, ...S }}>
                          {l.status}
                        </span>
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
  );

  return (
    <div style={{ minHeight: '100vh', background: BG, padding: '24px 16px 56px', ...S }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
        .sd-grid { display: flex; flex-direction: column; gap: 28px; }
        @media (min-width: 768px) {
          .sd-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; align-items: start; }
        }
      `}</style>

      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 22 }}>
          <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(22px,3vw,28px)', fontWeight: 400, color: DARK, letterSpacing: '-0.4px' }}>
            {t('sellerDashboard.title')}
          </h1>
          <Link to="/sell-ticket" style={{ textDecoration: 'none' }}>
            <button style={{
              padding: '9px 18px', borderRadius: 10, border: 'none',
              background: V, color: CARD, fontSize: 13.5, fontWeight: 700,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, ...S,
            }}>
              <Plus size={14} />
              {t('sellerDashboard.newListing', { defaultValue: 'Publicar entrada' })}
            </button>
          </Link>
        </div>

        {isLoading && <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />}
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
      </div>

      <SellerUnverifiedModalTrigger showWhen={salesInProgress.length > 0} />
    </div>
  );
}
