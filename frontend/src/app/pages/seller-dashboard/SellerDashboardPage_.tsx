import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Ticket, MessageCircle, AlertCircle, Clock, CheckCircle, X } from 'lucide-react';
import { ticketsService } from '@/api/services/tickets.service';
import { offersService }  from '@/api/services/offers.service';
import { useUser }        from '@/app/contexts/UserContext';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorAlert }     from '@/app/components/ErrorMessage';
import { SellerUnverifiedModalTrigger } from '@/app/components/SellerUnverifiedModalTrigger';
import { PageContentMaxWidth } from '@/app/components/PageContentMaxWidth';
import type { TransactionWithDetails, TicketListingWithEvent, OfferWithReceivedContext } from '@/api/types';

import { TransactionCard } from '@/app/pages/my-tickets/TransactionCard';
import { ListingCard } from './ListingCard';
import { ReceivedOfferCard } from './ReceivedOfferCard';
import {
  isUserRequiredActor,
  TERMINAL_STATUSES,
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
  S,
} from '@/app/pages/my-tickets/transactionUtils';

type Tab = 'listed' | 'sold' | 'received';
function isValidTab(v: string | null): v is Tab { return v === 'listed' || v === 'sold' || v === 'received'; }

// ─── Shared primitives ────────────────────────────────────────────────────────
function SectionLabel({ icon, label, color = HINT }: { icon: React.ReactNode; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color, marginBottom: 10, ...S }}>
      {icon}<span>{label}</span>
    </div>
  );
}

function EmptyTab({ icon, title, subtitle, ctaLabel, ctaTo }: {
  icon: React.ReactNode; title: string; subtitle: string; ctaLabel?: string; ctaTo?: string;
}) {
  return (
    <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, padding: '48px 24px', textAlign: 'center' }}>
      <div style={{ width: 52, height: 52, borderRadius: '50%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>{icon}</div>
      <p style={{ fontSize: 16, fontWeight: 800, color: DARK, marginBottom: 6, ...S }}>{title}</p>
      <p style={{ fontSize: 13.5, color: MUTED, marginBottom: ctaLabel ? 20 : 0, lineHeight: 1.55, ...S }}>{subtitle}</p>
      {ctaLabel && ctaTo && (
        <Link to={ctaTo} style={{ textDecoration: 'none' }}>
          <button style={{ padding: '10px 22px', borderRadius: 10, border: 'none', background: V, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', ...S }}>{ctaLabel}</button>
        </Link>
      )}
    </div>
  );
}

// ─── Listed tab ───────────────────────────────────────────────────────────────
function ListedTab({ active, past, copiedListingId, onCopyLink, receivedOffers, t }: {
  active: TicketListingWithEvent[];
  past:   TicketListingWithEvent[];
  copiedListingId: string | null;
  onCopyLink: (l: TicketListingWithEvent) => void;
  receivedOffers: OfferWithReceivedContext[];
  t: (key: string, opts?: Record<string, string>) => string;
}) {
  // Build a map of listingId → pending offer count so each card knows its badge
  const pendingOffersByListing = useMemo(() => {
    const map = new Map<string, number>();
    for (const offer of receivedOffers) {
      if (offer.status === 'pending') {
        map.set(offer.listingId, (map.get(offer.listingId) ?? 0) + 1);
      }
    }
    return map;
  }, [receivedOffers]);

  if (active.length + past.length === 0) {
    return (
      <EmptyTab
        icon={<Ticket size={24} style={{ color: BORD2 }} />}
        title={t('boughtTickets.noListingsYet')}
        subtitle={t('boughtTickets.listedTicketsWillAppear')}
        ctaLabel={t('boughtTickets.startSelling')}
        ctaTo="/sell-ticket"
      />
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {active.length > 0 && (
        <div>
          <SectionLabel icon={<CheckCircle size={12} />} label={t('boughtTickets.activeListings')} color={GREEN} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {active.map(l => (
              <ListingCard
                key={l.id}
                listing={l}
                isPast={false}
                copiedListingId={copiedListingId}
                onCopyLink={onCopyLink}
                pendingOfferCount={pendingOffersByListing.get(l.id) ?? 0}
              />
            ))}
          </div>
        </div>
      )}
      {past.length > 0 && (
        <div>
          <SectionLabel icon={null} label={t('boughtTickets.pastListings')} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {past.map(l => (
              <ListingCard key={l.id} listing={l} isPast copiedListingId={copiedListingId} onCopyLink={onCopyLink} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Sold tab ─────────────────────────────────────────────────────────────────
function SoldTab({ grouped, userId, t }: {
  grouped: { pendingMyAction: TransactionWithDetails[]; pendingOtherAction: TransactionWithDetails[]; completed: TransactionWithDetails[] };
  userId: string | undefined;
  t: (key: string, opts?: Record<string, string>) => string;
}) {
  const { pendingMyAction, pendingOtherAction, completed } = grouped;
  if (pendingMyAction.length + pendingOtherAction.length + completed.length === 0) {
    return (
      <EmptyTab
        icon={<Ticket size={24} style={{ color: BORD2 }} />}
        title={t('boughtTickets.noTicketsYet')}
        subtitle={t('boughtTickets.soldTicketsWillAppear')}
      />
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {pendingMyAction.length > 0 && (
        <div>
          <SectionLabel icon={<AlertCircle size={13} />} label={t('boughtTickets.pendingAwaitingMyAction')} color={V} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingMyAction.map(tx => (
              <TransactionCard key={tx.id} transaction={tx} userId={userId} role="seller" variant="action" fromUrl="/seller-dashboard?tab=sold" />
            ))}
          </div>
        </div>
      )}
      {pendingOtherAction.length > 0 && (
        <div>
          <SectionLabel icon={<Clock size={12} />} label={t('boughtTickets.pendingAwaitingOtherAction')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingOtherAction.map(tx => (
              <TransactionCard key={tx.id} transaction={tx} userId={userId} role="seller" variant="waiting" fromUrl="/seller-dashboard?tab=sold" />
            ))}
          </div>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <SectionLabel icon={<CheckCircle size={12} />} label={t('boughtTickets.completedTickets')} color="#15803d" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {completed.map(tx => (
              <TransactionCard key={tx.id} transaction={tx} userId={userId} role="seller" variant="completed" fromUrl="/seller-dashboard?tab=sold" />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Received offers tab ──────────────────────────────────────────────────────
function ReceivedTab({ offers, loading, offerIdFilter, onClearFilter, onAccept, onReject, processingOfferId, t }: {
  offers: OfferWithReceivedContext[];
  loading: boolean;
  offerIdFilter: string | null;
  onClearFilter: () => void;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  processingOfferId: string | null;
  t: (key: string, opts?: Record<string, string>) => string;
}) {
  if (loading && offers.length === 0) return <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />;

  if (offers.length === 0) {
    return (
      <EmptyTab
        icon={<MessageCircle size={24} style={{ color: BORD2 }} />}
        title={t('sellerDashboard.noReceivedOffers')}
        subtitle={t('sellerDashboard.receivedOffersWillAppear')}
        ctaLabel={t('boughtTickets.ticketsListed')}
        ctaTo="/seller-dashboard?tab=listed"
      />
    );
  }

  const pending  = offers.filter(o => o.status === 'pending');
  const accepted = offers.filter(o => o.status === 'accepted');
  const terminal = offers.filter(o => ['rejected', 'cancelled'].includes(o.status));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {offerIdFilter && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 100, background: VLIGHT, color: V, border: '1px solid #ddd6fe', alignSelf: 'flex-start', ...S }}>
          {t('sellerDashboard.filterByOffer')}
          <button type="button" onClick={onClearFilter} style={{ background: 'none', border: 'none', cursor: 'pointer', color: V, padding: 0, display: 'flex' }} aria-label={t('common.clearFilter')}>
            <X size={13} />
          </button>
        </span>
      )}

      {pending.length > 0 && (
        <div>
          <SectionLabel icon={<AlertCircle size={13} />} label={t('sellerDashboard.pendingOffers', { defaultValue: 'Esperando tu respuesta' })} color={V} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {pending.map(o => (
              <ReceivedOfferCard key={o.id} offer={o} onAccept={onAccept} onReject={onReject} isProcessing={processingOfferId === o.id} />
            ))}
          </div>
        </div>
      )}

      {accepted.length > 0 && (
        <div>
          <SectionLabel icon={<CheckCircle size={12} />} label={t('sellerDashboard.acceptedOffers', { defaultValue: 'Aceptadas — esperando pago' })} color="#15803d" />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }}>
            {accepted.map(o => (
              <ReceivedOfferCard key={o.id} offer={o} onAccept={onAccept} onReject={onReject} isProcessing={processingOfferId === o.id} />
            ))}
          </div>
        </div>
      )}

      {terminal.length > 0 && (
        <div>
          <SectionLabel icon={null} label={t('sellerDashboard.closedOffers', { defaultValue: 'Historial' })} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12, opacity: 0.65 }}>
            {terminal.map(o => (
              <ReceivedOfferCard key={o.id} offer={o} onAccept={onAccept} onReject={onReject} isProcessing={processingOfferId === o.id} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function SellerDashboardPage() {
  const { t }                                   = useTranslation();
  const { user, isAuthenticated, canSell }      = useUser();
  const [searchParams, setSearchParams]         = useSearchParams();

  const [listed,         setListed]         = useState<TicketListingWithEvent[]>([]);
  const [sold,           setSold]           = useState<TransactionWithDetails[]>([]);
  const [receivedOffers, setReceivedOffers] = useState<OfferWithReceivedContext[]>([]);
  const [offersLoading,  setOffersLoading]  = useState(false);
  const [isLoading,      setIsLoading]      = useState(true);
  const [error,          setError]          = useState<string | null>(null);
  const [copiedListingId, setCopiedListingId] = useState<string | null>(null);
  const [processingOfferId, setProcessingOfferId] = useState<string | null>(null);

  // ── URL / tab (preserved logic) ───────────────────────────────────────────
  const tabFromUrl     = searchParams.get('tab');
  const offerIdFromUrl = searchParams.get('offerId');
  const activeTab: Tab = offerIdFromUrl ? 'received' : (isValidTab(tabFromUrl) ? tabFromUrl : 'listed');

  useEffect(() => {
    const tab = searchParams.get('tab');
    if (isValidTab(tab)) setSearchParams(p => { const n = new URLSearchParams(p); n.set('tab', tab); return n; }, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (offerIdFromUrl && tabFromUrl !== 'received') {
      setSearchParams(p => { const n = new URLSearchParams(p); n.set('tab', 'received'); if (p.get('offerId')) n.set('offerId', p.get('offerId')!); return n; }, { replace: true });
    }
  }, [offerIdFromUrl, tabFromUrl, setSearchParams]);

  const setTab = (tab: Tab) => setSearchParams(p => { const n = new URLSearchParams(p); n.set('tab', tab); if (tab !== 'received') n.delete('offerId'); return n; });
  const clearOfferIdFilter = () => setSearchParams(p => { const n = new URLSearchParams(p); n.delete('offerId'); return n; }, { replace: true });

  // ── Data fetching (preserved logic) ──────────────────────────────────────
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
    setOffersLoading(true);
    offersService.listReceivedOffers()
      .then(res => setReceivedOffers(Array.isArray(res) ? res : []))
      .catch(() => setReceivedOffers([]))
      .finally(() => setOffersLoading(false));
  }, [isAuthenticated, canSell]);

  // ── Handlers (preserved logic) ───────────────────────────────────────────
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
      setReceivedOffers(Array.isArray(await offersService.listReceivedOffers()) ? await offersService.listReceivedOffers() : []);
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

  // ── Derived data (preserved logic) ───────────────────────────────────────
  const groupedSold = useMemo(() => {
    const pendingMyAction: TransactionWithDetails[]    = [];
    const pendingOtherAction: TransactionWithDetails[] = [];
    const completed: TransactionWithDetails[]          = [];
    for (const tx of sold) {
      if (TERMINAL_STATUSES.includes(tx.status))            completed.push(tx);
      else if (isUserRequiredActor(tx, user?.id, 'seller')) pendingMyAction.push(tx);
      else                                                    pendingOtherAction.push(tx);
    }
    return { pendingMyAction, pendingOtherAction, completed };
  }, [sold, user?.id]);

  const activeListings = useMemo(() => listed.filter(l => l.status === 'Active'), [listed]);
  const pastListings   = useMemo(() => listed.filter(l => l.status !== 'Active'), [listed]);

  const receivedOffersFiltered = useMemo(() =>
    offerIdFromUrl ? receivedOffers.filter(o => o.id === offerIdFromUrl) : receivedOffers,
  [receivedOffers, offerIdFromUrl]);

  // ── Guards ────────────────────────────────────────────────────────────────
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
            <button style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: V, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', ...S }}>{t('header.login')}</button>
          </Link>
        </div>
      </div>
    );
  }

  if (!canSell()) {
    return (
      <div style={{ minHeight: '100vh', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, padding: '40px 32px', maxWidth: 360, textAlign: 'center' }}>
          <div style={{ width: 56, height: 56, borderRadius: '50%', background: VLIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px' }}>
            <Ticket size={24} style={{ color: V }} />
          </div>
          <p style={{ fontSize: 18, fontWeight: 800, color: DARK, marginBottom: 8, ...S }}>{t('sellerDashboard.title')}</p>
          <p style={{ fontSize: 14, color: MUTED, marginBottom: 24, lineHeight: 1.55, ...S }}>{t('boughtTickets.listedTicketsWillAppear')}</p>
          <Link to="/become-seller" style={{ textDecoration: 'none' }}>
            <button style={{ padding: '11px 24px', borderRadius: 10, border: 'none', background: V, color: 'white', fontSize: 14, fontWeight: 700, cursor: 'pointer', ...S }}>{t('boughtTickets.startSelling')}</button>
          </Link>
        </div>
      </div>
    );
  }

  // ── Tab badge counts ──────────────────────────────────────────────────────
  const tabBadges: Record<Tab, number> = {
    listed:   activeListings.length,
    sold:     groupedSold.pendingMyAction.length,
    received: receivedOffersFiltered.filter(o => o.status === 'pending').length,
  };

  const tabLabels: Record<Tab, string> = {
    listed:   t('sellerDashboard.tabListed'),
    sold:     t('sellerDashboard.tabSold'),
    received: t('sellerDashboard.tabReceived'),
  };

  return (
    <div style={{ minHeight: '100vh', background: BG, ...S }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
      `}</style>
      <PageContentMaxWidth style={{ paddingTop: 24, paddingBottom: 48 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(22px,3vw,28px)', fontWeight: 400, color: DARK, letterSpacing: '-0.4px', marginBottom: 20 }}>
          {t('sellerDashboard.title')}
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
          {(['listed', 'sold', 'received'] as Tab[]).map(tab => {
            const isActive = activeTab === tab;
            const badge    = tabBadges[tab];
            return (
              <button key={tab} type="button" onClick={() => setTab(tab)} style={{
                padding: '10px 0', marginRight: 24, border: 'none',
                borderBottom: `2px solid ${isActive ? V : 'transparent'}`,
                background: 'transparent', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: isActive ? V : MUTED,
                transition: 'all 0.14s', display: 'flex', alignItems: 'center', gap: 7,
                whiteSpace: 'nowrap', ...S,
              }}>
                {tabLabels[tab]}
                {badge > 0 && (
                  <span style={{ minWidth: 18, height: 18, borderRadius: 9, background: V, color: 'white', fontSize: 10.5, fontWeight: 700, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '0 5px' }}>
                    {badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {isLoading && <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />}
        {error     && <ErrorAlert message={error} className="mb-6" />}

        {!isLoading && !error && (
          <>
            {activeTab === 'listed' && (
              <ListedTab
                active={activeListings}
                past={pastListings}
                copiedListingId={copiedListingId}
                onCopyLink={handleCopyLink}
                receivedOffers={receivedOffers}
                t={t}
              />
            )}
            {activeTab === 'sold' && (
              <SoldTab grouped={groupedSold} userId={user?.id} t={t} />
            )}
            {activeTab === 'received' && (
              <ReceivedTab
                offers={receivedOffersFiltered}
                loading={offersLoading}
                offerIdFilter={offerIdFromUrl}
                onClearFilter={clearOfferIdFilter}
                onAccept={handleAcceptOffer}
                onReject={handleRejectOffer}
                processingOfferId={processingOfferId}
                t={t}
              />
            )}
          </>
        )}
      </PageContentMaxWidth>
      <SellerUnverifiedModalTrigger showWhen={activeTab === 'sold' && sold.length > 0} />
    </div>
  );
}
