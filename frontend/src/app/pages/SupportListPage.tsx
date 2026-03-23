import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Loader2, ChevronRight, HelpCircle, MessageCircle } from 'lucide-react';
import { supportService } from '@/api/services';
import type { SupportTicket, SupportTicketStatus } from '@/api/types';
import { formatDateTimeShort } from '@/lib/format-date';
import { PageContentMaxWidth } from '@/app/components/PageContentMaxWidth';
import { PageHeader } from '../components/PageHeader';
import {
  V,
  VLIGHT,
  VL_BORDER,
  DARK,
  MUTED,
  HINT,
  BG,
  CARD,
  BORDER,
  BORD2,
  ABG,
  AMBER,
  ABORD,
  BADGE_DEMAND_BG,
  BADGE_DEMAND_BORDER,
  DESTRUCTIVE,
  GLIGHT,
  GREEN,
  GBORD,
  S,
  E,
  R_CARD,
  R_BUTTON,
  R_INPUT,
} from '@/lib/design-tokens';

const DS = { ...E, fontWeight: 400 };

// ─── Status display config ───────────────────────────────────────────────────
const STATUS_CONFIG: Record<SupportTicketStatus, { bg: string; color: string; border: string; labelKey: string }> = {
  open:                 { bg: VLIGHT,          color: V,           border: VL_BORDER,           labelKey: 'support.statusOpen' },
  inProgress:           { bg: ABG,             color: AMBER,       border: ABORD,               labelKey: 'support.statusInProgress' },
  waitingForCustomer:   { bg: BADGE_DEMAND_BG, color: DESTRUCTIVE, border: BADGE_DEMAND_BORDER, labelKey: 'support.waitingForYou' },
  resolved:             { bg: GLIGHT,          color: GREEN,       border: GBORD,               labelKey: 'support.statusResolved' },
  closed:               { bg: BG,              color: MUTED,       border: BORD2,               labelKey: 'support.statusClosed' },
};

const STATUS_OPTIONS: { value: '' | SupportTicketStatus; labelKey: string }[] = [
  { value: '',                   labelKey: 'support.filterAllStatuses' },
  { value: 'open',               labelKey: 'support.statusOpen' },
  { value: 'inProgress',         labelKey: 'support.statusInProgress' },
  { value: 'waitingForCustomer', labelKey: 'support.statusWaitingForCustomer' },
  { value: 'resolved',           labelKey: 'support.statusResolved' },
  { value: 'closed',             labelKey: 'support.statusClosed' },
];

function sourceLabelKey(source?: string): string {
  switch (source) {
    case 'Dispute':                  return 'support.sourceDispute';
    case 'ContactFromTransaction':   return 'support.sourceContactTransaction';
    default:                         return 'support.sourceContactForm';
  }
}

export function SupportListPage() {
  const { t } = useTranslation();
  const [tickets,      setTickets]      = useState<SupportTicket[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');

  const fetchTickets = useCallback(async () => {
    try {
      setLoading(true); setError(null);
      const list = await supportService.listTickets({ status: statusFilter || undefined });
      setTickets(list);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('support.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, t]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <Loader2 size={32} style={{ color: V, animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG, ...S }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        .th-select{padding:9px 14px;border-radius:10px;border:1.5px solid ${BORDER};background:${CARD};font-size:13.5px;color:${DARK};outline:none;cursor:pointer;font-family:'Plus Jakarta Sans',sans-serif;appearance:none;min-height:40px;padding-right:32px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236b7280' stroke-width='2.5' stroke-linecap='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 10px center}
        .th-select:focus{border-color:${V}}
        .ticket-row:hover{border-color:${BORD2}!important;background:${BG}!important}
      `}</style>

      <PageContentMaxWidth style={{ paddingTop: 24, paddingBottom: 80 }}>

        {/* Header */}

        <PageHeader
          title={t('support.title')}
          subtitle={t('support.description')}
          backTo={{ labelKey: 'common.back' }}
          action={{
            label: `${t('support.newCase')}`,
            to: '/contact',
            icon: <HelpCircle size={15} />
          }}
        />

        {/* Filter */}
        <div style={{ marginBottom: 18 }}>
          <select
            className="th-select"
            value={statusFilter || '__all__'}
            onChange={e => setStatusFilter(e.target.value === '__all__' ? '' : e.target.value)}
          >
            {STATUS_OPTIONS.map(opt => (
              <option key={opt.value || 'all'} value={opt.value || '__all__'}>
                {t(opt.labelKey)}
              </option>
            ))}
          </select>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: R_INPUT, padding: '12px 16px', marginBottom: 16 }}>
            <p style={{ fontSize: 13.5, color: '#dc2626', ...S }}>{error}</p>
          </div>
        )}

        {/* Empty state */}
        {!error && tickets.length === 0 && (
          <div style={{ background: CARD, borderRadius: 18, border: `1.5px dashed ${BORD2}`, padding: '48px 24px', textAlign: 'center' }}>
            <div style={{ width: 52, height: 52, borderRadius: '50%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
              <MessageCircle size={22} style={{ color: BORD2 }} />
            </div>
            <p style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 6, ...S }}>{t('support.emptyTitle')}</p>
            <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 18, lineHeight: 1.55, ...S }}>{t('support.emptyDescription')}</p>
            <Link to="/contact" style={{ textDecoration: 'none' }}>
              <button style={{ padding: '10px 22px', borderRadius: R_BUTTON, border: 'none', background: V, color: 'white', fontSize: 13.5, fontWeight: 700, cursor: 'pointer', ...S }}>
                {t('support.newCase')}
              </button>
            </Link>
          </div>
        )}

        {/* Ticket list */}
        {!error && tickets.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {tickets.map(ticket => {
              const cfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;
              const isUrgent = ticket.status === 'waitingForCustomer';
              return (
                <Link key={ticket.id} to={`/support/${ticket.id}`} style={{ textDecoration: 'none' }}>
                  <div
                    className="ticket-row"
                    style={{
                      background: CARD,
                      borderRadius: R_CARD,
                      border: `1px solid ${isUrgent ? '#fca5a5' : BORDER}`,
                      padding: '14px 16px',
                      display: 'flex', alignItems: 'center', gap: 12,
                      transition: 'border-color 0.13s, background 0.13s',
                    }}
                  >
                    {/* Urgent dot */}
                    {isUrgent && (
                      <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626', flexShrink: 0 }} />
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexWrap: 'wrap' }}>
                        <p style={{ fontWeight: 700, color: DARK, fontSize: 14, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', ...S }}>
                          {ticket.subject}
                        </p>
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 100, flexShrink: 0,
                          background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}`, ...S,
                        }}>
                          {t(cfg.labelKey)}
                        </span>
                      </div>
                      <p style={{ fontSize: 12.5, color: MUTED, ...S }}>
                        {t('support.lastUpdated')}: {formatDateTimeShort(ticket.updatedAt)}
                        {ticket.source && (
                          <span style={{ color: HINT }}> · {t(sourceLabelKey(ticket.source))}</span>
                        )}
                      </p>
                    </div>

                    <ChevronRight size={16} style={{ color: HINT, flexShrink: 0 }} />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </PageContentMaxWidth>
    </div>
  );
}
