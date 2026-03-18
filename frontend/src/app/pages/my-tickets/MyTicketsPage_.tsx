import { useState, useEffect, useMemo } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Ticket, AlertCircle, Clock, CheckCircle, X } from 'lucide-react';
import { ticketsService } from '@/api/services/tickets.service';
import { offersService }  from '@/api/services/offers.service';
import { useUser }        from '@/app/contexts/UserContext';
import { LoadingSpinner } from '@/app/components/LoadingSpinner';
import { ErrorAlert }     from '@/app/components/ErrorMessage';
import { PageContentMaxWidth } from '@/app/components/PageContentMaxWidth';
import type { TransactionWithDetails, OfferWithListingSummary } from '@/api/types';

import { TransactionCard } from './TransactionCard';
import { OfferCard }       from './OfferCard';
import {
  isUserRequiredActor, TERMINAL_STATUSES,
  V, VLIGHT, DARK, MUTED, HINT, BG, CARD, BORDER, BORD2, S,
} from './transactionUtils';

type Tab = 'tickets' | 'offers';
function isValidTab(v: string | null): v is Tab { return v === 'tickets' || v === 'offers'; }

function SectionLabel({ icon, label, color = HINT }: { icon: React.ReactNode; label: string; color?: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color, marginBottom: 10, ...S }}>
      {icon}<span>{label}</span>
    </div>
  );
}

function EmptyTab({ icon, title, subtitle, ctaLabel, ctaTo }: { icon: React.ReactNode; title: string; subtitle: string; ctaLabel?: string; ctaTo?: string }) {
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

function TicketsTab({ grouped, userId, t }: {
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
        subtitle={t('boughtTickets.purchasedTicketsWillAppear')}
        ctaLabel={t('landing.upcomingEvents')}
        ctaTo="/"
      />
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 28 }}>
      {pendingMyAction.length > 0 && (
        <div>
          <SectionLabel icon={<AlertCircle size={13} />} label={t('boughtTickets.pendingAwaitingMyAction')} color={V} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingMyAction.map(tx => <TransactionCard key={tx.id} transaction={tx} userId={userId} role="buyer" variant="action" fromUrl="/my-tickets" />)}
          </div>
        </div>
      )}
      {pendingOtherAction.length > 0 && (
        <div>
          <SectionLabel icon={<Clock size={12} />} label={t('boughtTickets.pendingAwaitingOtherAction')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pendingOtherAction.map(tx => <TransactionCard key={tx.id} transaction={tx} userId={userId} role="buyer" variant="waiting" fromUrl="/my-tickets" />)}
          </div>
        </div>
      )}
      {completed.length > 0 && (
        <div>
          <SectionLabel icon={<CheckCircle size={12} />} label={t('boughtTickets.completedTickets')} color={V === '#6d28d9' ? '#15803d' : V} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 10 }}>
            {completed.map(tx => <TransactionCard key={tx.id} transaction={tx} userId={userId} role="buyer" variant="completed" fromUrl="/my-tickets" />)}
          </div>
        </div>
      )}
    </div>
  );
}

function OffersTab({ offers, offersLoading, offerIdFilter, onClearFilter, t }: {
  offers: OfferWithListingSummary[];
  offersLoading: boolean;
  offerIdFilter: string | null;
  onClearFilter: () => void;
  t: (key: string, opts?: Record<string, string>) => string;
}) {
  if (offersLoading && offers.length === 0) return <LoadingSpinner size="lg" text={t('common.loading')} className="py-12" />;

  const accepted = offers.filter(o => o.status === 'accepted');
  const pending  = offers.filter(o => o.status === 'pending');
  const terminal = offers.filter(o => ['rejected', 'converted', 'cancelled'].includes(o.status));

  if (accepted.length + pending.length + terminal.length === 0) {
    return (
      <EmptyTab
        icon={<Ticket size={24} style={{ color: BORD2 }} />}
        title={t('boughtTickets.noOffersYet', { defaultValue: 'Todavía no hiciste ofertas' })}
        subtitle={t('boughtTickets.offersWillAppear', { defaultValue: 'Cuando hagas una oferta a un vendedor, aparecerá acá.' })}
        ctaLabel={t('landing.upcomingEvents')}
        ctaTo="/"
      />
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      {offerIdFilter && (
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12.5, fontWeight: 600, padding: '5px 12px', borderRadius: 100, background: VLIGHT, color: V, border: '1px solid #ddd6fe', alignSelf: 'flex-start', ...S }}>
          {t('boughtTickets.filterByOffer')}
          <button type="button" onClick={onClearFilter} style={{ background: 'none', border: 'none', cursor: 'pointer', color: V, padding: 0, display: 'flex' }} aria-label={t('common.clearFilter')}>
            <X size={13} />
          </button>
        </span>
      )}
      {accepted.length > 0 && (
        <div>
          <SectionLabel icon={<AlertCircle size={13} />} label={t('boughtTickets.offersRequireAction', { defaultValue: 'Oferta aceptada — completá la compra' })} color={V} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {accepted.map(o => <OfferCard key={o.id} offer={o} />)}
          </div>
        </div>
      )}
      {pending.length > 0 && (
        <div>
          <SectionLabel icon={<Clock size={12} />} label={t('boughtTickets.offersWaiting', { defaultValue: 'Esperando respuesta' })} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(o => <OfferCard key={o.id} offer={o} />)}
          </div>
        </div>
      )}
      {terminal.length > 0 && (
        <div>
          <SectionLabel icon={null} label={t('boughtTickets.expiredCancelledOffers')} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {terminal.map(o => <OfferCard key={o.id} offer={o} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function MyTicketsPage() {
  const { t }                         = useTranslation();
  const { user, isAuthenticated }     = useUser();
  const [searchParams, setSearchParams] = useSearchParams();

  const [bought,        setBought]        = useState<TransactionWithDetails[]>([]);
  const [myOffers,      setMyOffers]      = useState<OfferWithListingSummary[]>([]);
  const [offersLoading, setOffersLoading] = useState(false);
  const [isLoading,     setIsLoading]     = useState(true);
  const [error,         setError]         = useState<string | null>(null);

  const tabFromUrl     = searchParams.get('tab');
  const offerIdFromUrl = searchParams.get('offerId');
  const activeTab: Tab = offerIdFromUrl ? 'offers' : (isValidTab(tabFromUrl) ? tabFromUrl : 'tickets');

  // Preserved URL normalization logic
  useEffect(() => {
    const tab = searchParams.get('tab');
    if (tab === 'offers' || tab === 'my-offers') setSearchParams(p => { const n = new URLSearchParams(p); n.set('tab','offers'); return n; }, { replace: true });
    else if (tab === 'bought') setSearchParams(p => { const n = new URLSearchParams(p); n.set('tab','tickets'); return n; }, { replace: true });
  }, [searchParams, setSearchParams]);

  useEffect(() => {
    if (offerIdFromUrl && tabFromUrl !== 'offers') setSearchParams(p => { const n = new URLSearchParams(p); n.set('tab','offers'); if (p.get('offerId')) n.set('offerId', p.get('offerId')!); return n; }, { replace: true });
  }, [offerIdFromUrl, tabFromUrl, setSearchParams]);

  const setTab = (tab: Tab) => setSearchParams(p => { const n = new URLSearchParams(p); n.set('tab', tab); if (tab !== 'offers') n.delete('offerId'); return n; });
  const clearOfferIdFilter = () => setSearchParams(p => { const n = new URLSearchParams(p); n.delete('offerId'); return n; }, { replace: true });

  // Preserved data fetching
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
    setOffersLoading(true);
    offersService.listMyOffers()
      .then(res => setMyOffers(Array.isArray(res) ? res : []))
      .catch(() => setMyOffers([]))
      .finally(() => setOffersLoading(false));
  }, [isAuthenticated]);

  // Preserved grouping logic
  const groupedBought = useMemo(() => {
    const pendingMyAction: TransactionWithDetails[]    = [];
    const pendingOtherAction: TransactionWithDetails[] = [];
    const completed: TransactionWithDetails[]          = [];
    for (const tx of bought) {
      if (TERMINAL_STATUSES.includes(tx.status))          completed.push(tx);
      else if (isUserRequiredActor(tx, user?.id, 'buyer')) pendingMyAction.push(tx);
      else                                                  pendingOtherAction.push(tx);
    }
    return { pendingMyAction, pendingOtherAction, completed };
  }, [bought, user?.id]);

  const offersFiltered = useMemo(() =>
    offerIdFromUrl ? myOffers.filter(o => o.id === offerIdFromUrl) : myOffers,
  [myOffers, offerIdFromUrl]);

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

  return (
    <div style={{ minHeight: '100vh', background: BG, ...S }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');`}</style>
      <PageContentMaxWidth style={{ paddingTop: 24, paddingBottom: 48 }}>
        <h1 style={{ fontFamily: "'DM Serif Display', serif", fontSize: 'clamp(22px,3vw,28px)', fontWeight: 400, color: DARK, letterSpacing: '-0.4px', marginBottom: 20 }}>
          {t('boughtTickets.title')}
        </h1>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: `1px solid ${BORDER}`, marginBottom: 24 }}>
          {(['tickets', 'offers'] as Tab[]).map(tab => {
            const labels: Record<Tab, string> = { tickets: t('boughtTickets.myTicketsTabTickets'), offers: t('boughtTickets.myTicketsTabOffers') };
            const isActive = activeTab === tab;
            const badge = tab === 'tickets' ? groupedBought.pendingMyAction.length : offersFiltered.filter(o => o.status === 'accepted').length;
            return (
              <button key={tab} type="button" onClick={() => setTab(tab)} style={{
                padding: '10px 0', marginRight: 28, border: 'none',
                borderBottom: `2px solid ${isActive ? V : 'transparent'}`,
                background: 'transparent', cursor: 'pointer',
                fontSize: 14, fontWeight: 600, color: isActive ? V : MUTED,
                transition: 'all 0.14s', display: 'flex', alignItems: 'center', gap: 7, ...S,
              }}>
                {labels[tab]}
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
          activeTab === 'tickets'
            ? <TicketsTab grouped={groupedBought} userId={user?.id} t={t} />
            : <OffersTab offers={offersFiltered} offersLoading={offersLoading} offerIdFilter={offerIdFromUrl} onClearFilter={clearOfferIdFilter} t={t} />
        )}
      </PageContentMaxWidth>
    </div>
  );
}
