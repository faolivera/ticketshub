import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, Send, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { supportService } from '@/api/services';
import type { SupportTicketWithMessages, SupportMessage } from '@/api/types';
import { SUPPORT_MESSAGE_KEY_DISPUTE_VERIFY_IDENTITY } from '@/api/types/support';
import { formatDateTimeMedium } from '@/lib/format-date';
import { PageContentMaxWidth } from '@/app/components/PageContentMaxWidth';
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
  SUCCESS,
  S,
  E,
  R_CARD,
  R_BUTTON,
} from '@/lib/design-tokens';

const DS = { ...E, fontWeight: 400 };

const STATUS_CONFIG: Record<string, { bg: string; color: string; border: string; labelKey: string }> = {
  open:                 { bg: VLIGHT,          color: V,           border: VL_BORDER,           labelKey: 'support.statusOpen' },
  inProgress:           { bg: ABG,             color: AMBER,       border: ABORD,               labelKey: 'support.statusInProgress' },
  waitingForCustomer:   { bg: BADGE_DEMAND_BG, color: DESTRUCTIVE, border: BADGE_DEMAND_BORDER, labelKey: 'support.waitingForYou' },
  resolved:             { bg: GLIGHT,          color: GREEN,       border: GBORD,               labelKey: 'support.statusResolved' },
  closed:               { bg: BG,              color: MUTED,       border: BORD2,               labelKey: 'support.statusClosed' },
};

export function SupportCaseDetail() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const [ticket,       setTicket]       = useState<SupportTicketWithMessages | null>(null);
  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState<string | null>(null);
  const [replyText,    setReplyText]    = useState('');
  const [sendingReply, setSendingReply] = useState(false);
  const [replyError,   setReplyError]   = useState<string | null>(null);
  const [closing,      setClosing]      = useState(false);
  const [closeError,   setCloseError]   = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const fetchTicket = useCallback(async () => {
    if (!id) return;
    try {
      setLoading(true); setError(null);
      setTicket(await supportService.getTicket(id));
    } catch (err) {
      setError(err instanceof Error ? err.message : t('support.errorLoad'));
    } finally {
      setLoading(false);
    }
  }, [id, t]);

  useEffect(() => { fetchTicket(); }, [fetchTicket]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [ticket?.messages?.length]);

  const handleSendReply = async () => {
    if (!id || !replyText.trim()) return;
    setSendingReply(true); setReplyError(null);
    try {
      await supportService.addMessage(id, { message: replyText.trim() });
      setReplyText('');
      await fetchTicket();
    } catch (err) {
      setReplyError(err instanceof Error ? err.message : t('support.errorReply'));
    } finally { setSendingReply(false); }
  };

  const handleCloseTicket = async () => {
    if (!id) return;
    setClosing(true); setCloseError(null);
    try {
      await supportService.closeTicket(id);
      await fetchTicket();
    } catch (err) {
      setCloseError(err instanceof Error ? err.message : t('support.errorClose'));
    } finally { setClosing(false); }
  };

  const isOpen   = ticket?.status !== 'closed' && ticket?.status !== 'resolved';
  const canReply = isOpen && !!ticket;
  const isClosed = ticket?.status === 'closed' || ticket?.status === 'resolved';

  if (loading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <Loader2 size={32} style={{ color: V, animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  if (error || !ticket) {
    return (
      <div style={{ minHeight: '100vh', background: BG, ...S }}>
        <PageContentMaxWidth style={{ paddingTop: 24, paddingBottom: 80 }}>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <p style={{ fontSize: 13.5, color: '#dc2626', marginBottom: 12, ...S }}>{error ?? t('support.errorLoad')}</p>
            <Link to="/support" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 600, color: MUTED, textDecoration: 'none', ...S }}>
              <ArrowLeft size={14} /> {t('support.backToList')}
            </Link>
          </div>
        </PageContentMaxWidth>
      </div>
    );
  }

  const statusCfg = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open;

  return (
    <div style={{ minHeight: '100vh', background: BG, ...S }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        @keyframes spin{to{transform:rotate(360deg)}}
        .th-textarea{width:100%;padding:12px 14px;border-radius:10px;border:1.5px solid ${BORDER};background:${CARD};font-size:14px;color:${DARK};outline:none;resize:vertical;min-height:88px;font-family:'Plus Jakarta Sans',sans-serif;box-sizing:border-box;transition:border-color 0.15s;line-height:1.55}
        .th-textarea:focus{border-color:${V};box-shadow:0 0 0 3px ${VLIGHT}}
      `}</style>

      <PageContentMaxWidth style={{ paddingTop: 24, paddingBottom: 80 }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>

        {/* Back */}
        <Link to="/support" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 600, color: MUTED, textDecoration: 'none', marginBottom: 20, ...S }}>
          <ArrowLeft size={14} /> {t('support.backToList')}
        </Link>

        {/* Header card */}
        <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, padding: '20px 22px', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 0, flex: 1 }}>
              <h1 style={{ ...DS, fontSize: 'clamp(18px,2.5vw,22px)', color: DARK, marginBottom: 4, lineHeight: 1.2 }}>
                {ticket.subject}
              </h1>
              <p style={{ fontSize: 12, color: HINT, fontFamily: 'monospace' }}>{ticket.id}</p>
            </div>
            {/* Status badge */}
            <span style={{
              flexShrink: 0, fontSize: 12, fontWeight: 700, padding: '4px 10px', borderRadius: 100,
              background: statusCfg.bg, color: statusCfg.color, border: `1px solid ${statusCfg.border}`,
              ...S,
            }}>
              {t(statusCfg.labelKey)}
            </span>
          </div>

          <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 13, color: MUTED, marginBottom: 2, ...S }}>
              {t('support.lastUpdated')}: {formatDateTimeMedium(ticket.updatedAt)}
              {ticket.transactionId && (
                <span style={{ color: HINT }}> · {t('support.linkedTransaction')}: <span style={{ fontFamily: 'monospace' }}>{ticket.transactionId}</span></span>
              )}
            </p>
            <p style={{ fontSize: 13.5, color: DARK, lineHeight: 1.6, marginTop: 8, whiteSpace: 'pre-wrap', ...S }}>
              {ticket.description}
            </p>
          </div>
        </div>

        {/* Thread card */}
        <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>

          {/* Thread header */}
          <div style={{ padding: '14px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 13, fontWeight: 700, color: DARK, ...S }}>{t('support.messages')}</p>
          </div>

          {/* Messages */}
          <div style={{ padding: '16px 20px', maxHeight: '50vh', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12 }}>
            {(ticket.messages ?? []).length === 0 && (
              <p style={{ fontSize: 13.5, color: HINT, textAlign: 'center', padding: '24px 0', ...S }}>
                {t('support.noMessages', { defaultValue: 'Sin mensajes todavía.' })}
              </p>
            )}
            {(ticket.messages ?? []).map((msg: SupportMessage) => {
              const isSystem   = msg.message === SUPPORT_MESSAGE_KEY_DISPUTE_VERIFY_IDENTITY;
              const fromSupport = msg.isAdmin || isSystem;
              return (
                <div
                  key={msg.id}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: fromSupport ? 'flex-start' : 'flex-end',
                  }}
                >
                  {/* Sender label */}
                  <p style={{ fontSize: 11, fontWeight: 600, color: HINT, marginBottom: 4, paddingLeft: fromSupport ? 4 : 0, paddingRight: fromSupport ? 0 : 4, ...S }}>
                    {fromSupport ? t('support.fromSupport') : t('support.you')} · {formatDateTimeMedium(msg.createdAt)}
                  </p>
                  {/* Bubble */}
                  <div style={{
                    maxWidth: '85%', padding: '10px 14px', borderRadius: R_CARD,
                    borderBottomLeftRadius: fromSupport ? 4 : 14,
                    borderBottomRightRadius: fromSupport ? 14 : 4,
                    background: fromSupport ? VLIGHT : BG,
                    border: `1px solid ${fromSupport ? VL_BORDER : BORDER}`,
                  }}>
                    {isSystem ? (
                      <p style={{ fontSize: 13.5, color: DARK, lineHeight: 1.55, ...S }}>
                        {t('support.disputeVerifyIdentityMessage')}{' '}
                        <Link to="/become-seller" style={{ color: V, fontWeight: 700 }}>
                          {t('support.disputeVerifyIdentityLink')}
                        </Link>
                      </p>
                    ) : (
                      <p style={{ fontSize: 13.5, color: DARK, lineHeight: 1.55, whiteSpace: 'pre-wrap', ...S }}>
                        {msg.message}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Reply box */}
          {canReply && (
            <div style={{ padding: '14px 20px', borderTop: `1px solid ${BORDER}` }}>
              <textarea
                className="th-textarea"
                placeholder={t('support.replyPlaceholder')}
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                rows={3}
                onKeyDown={e => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendReply();
                }}
              />
              {replyError && <p style={{ fontSize: 13, color: '#dc2626', marginTop: 4, ...S }}>{replyError}</p>}
              <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                <button
                  onClick={handleSendReply}
                  disabled={!replyText.trim() || sendingReply}
                  style={{
                    padding: '10px 20px', borderRadius: R_BUTTON, border: 'none',
                    background: !replyText.trim() || sendingReply ? VL_BORDER : V,
                    color: !replyText.trim() || sendingReply ? '#a78bfa' : 'white',
                    fontSize: 13.5, fontWeight: 700,
                    cursor: !replyText.trim() || sendingReply ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    minHeight: 44, transition: 'background 0.14s',
                    ...S,
                  }}
                >
                  {sendingReply
                    ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                    : <Send size={14} />
                  }
                  {sendingReply ? t('support.sending') : t('support.send')}
                </button>

                <button
                  onClick={handleCloseTicket}
                  disabled={closing}
                  style={{
                    padding: '10px 20px', borderRadius: R_BUTTON,
                    border: `1.5px solid ${BORD2}`, background: 'transparent',
                    color: MUTED, fontSize: 13.5, fontWeight: 600,
                    cursor: closing ? 'not-allowed' : 'pointer',
                    display: 'inline-flex', alignItems: 'center', gap: 6,
                    minHeight: 44, ...S,
                  }}
                >
                  {closing
                    ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                    : <XCircle size={14} />
                  }
                  {t('support.closeCase')}
                </button>
              </div>
              {closeError && <p style={{ fontSize: 13, color: '#dc2626', marginTop: 6, ...S }}>{closeError}</p>}
              <p style={{ fontSize: 12, color: HINT, marginTop: 8, ...S }}>
                {t('support.replyHint', { defaultValue: 'Cmd+Enter para enviar' })}
              </p>
            </div>
          )}

          {/* Closed state */}
          {isClosed && (
            <div style={{ padding: '14px 20px', borderTop: `1px solid ${BORDER}`, display: 'flex', alignItems: 'center', gap: 8 }}>
              <CheckCircle size={15} style={{ color: SUCCESS, flexShrink: 0 }} />
              <p style={{ fontSize: 13.5, color: MUTED, ...S }}>{t('support.caseClosed')}</p>
            </div>
          )}
        </div>
      </div>
      </PageContentMaxWidth>
    </div>
  );
}
