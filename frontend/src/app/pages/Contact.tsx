import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, FileText, MessageSquare, CheckCircle, Clock, MessageCircle, ArrowRight } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { supportService } from '@/api/services/support.service';
import { SupportCategory, SupportTicketSource } from '@/api/types/support';
import { PageMeta } from '@/app/components/PageMeta';
import { PageHeader } from '@/app/components/PageHeader';
import { PageContentMaxWidth } from '@/app/components/PageContentMaxWidth';
import { useIsMobile } from '@/app/components/ui/use-mobile';
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
  GREEN,
  GLIGHT,
  GBORD,
  S,
} from '@/lib/design-tokens';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  border: `1.5px solid ${BORDER}`, borderRadius: 10,
  fontSize: 14, color: DARK, background: CARD,
  outline: 'none', transition: 'border-color 0.15s',
  boxSizing: 'border-box', ...S,
};

const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  fontSize: 13.5, fontWeight: 600, color: DARK,
  marginBottom: 6, ...S,
};

// ─── Right panel ──────────────────────────────────────────────────────────────
function RightPanel({ success, isAuthenticated, t }: {
  success: boolean;
  isAuthenticated: boolean;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  if (success) {
    return (
      <div style={{
        background: GLIGHT, border: `1px solid ${GBORD}`,
        borderRadius: 20, padding: '28px 24px',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <CheckCircle size={24} style={{ color: GREEN }} />
        </div>
        <div>
          <p style={{ fontSize: 17, fontWeight: 800, color: GREEN, marginBottom: 6, ...S }}>
            {t('contact.successTitle')}
          </p>
          <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.6, ...S }}>
            {t('contact.successMessage')}
          </p>
        </div>
        {isAuthenticated && (
          <Link to="/support" style={{ textDecoration: 'none' }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 7,
              padding: '10px 16px', borderRadius: 12,
              background: CARD, border: `1px solid ${GBORD}`,
              fontSize: 13.5, fontWeight: 700, color: GREEN, cursor: 'pointer', ...S,
            }}>
              {t('contact.viewCases', { defaultValue: 'Ver mis consultas' })}
              <ArrowRight size={14} />
            </div>
          </Link>
        )}
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, padding: '22px' }}>
        <div style={{ width: 40, height: 40, borderRadius: 12, background: VLIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 14 }}>
          <MessageCircle size={20} style={{ color: V }} />
        </div>
        <p style={{ fontSize: 15, fontWeight: 700, color: DARK, marginBottom: 6, ...S }}>
          {t('contact.rightPanelTitle', { defaultValue: 'Te respondemos lo antes posible' })}
        </p>
        <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, ...S }}>
          {t('contact.rightPanelDesc', { defaultValue: 'Nuestro equipo revisa cada consulta y te responde por email. Generalmente en menos de 24 horas.' })}
        </p>
      </div>

      <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, padding: '14px 18px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{ width: 34, height: 34, borderRadius: 10, background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Clock size={16} style={{ color: MUTED }} />
        </div>
        <div>
          <p style={{ fontSize: 12, color: HINT, marginBottom: 1, ...S }}>
            {t('contact.responseTimeLabel', { defaultValue: 'Tiempo de respuesta' })}
          </p>
          <p style={{ fontSize: 13.5, fontWeight: 700, color: DARK, ...S }}>
            {t('contact.responseTime', { defaultValue: 'Menos de 24 horas' })}
          </p>
        </div>
      </div>

      {isAuthenticated && (
        <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, padding: '14px 18px' }}>
          <p style={{ fontSize: 12, color: HINT, marginBottom: 6, ...S }}>
            {t('contact.existingCasesLabel', { defaultValue: '¿Ya enviaste una consulta?' })}
          </p>
          <Link to="/support" style={{ textDecoration: 'none' }}>
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 13.5, fontWeight: 700, color: V, ...S }}>
              {t('contact.viewCases', { defaultValue: 'Ver mis consultas' })}
              <ArrowRight size={13} />
            </div>
          </Link>
        </div>
      )}
    </div>
  );
}

// ─── Success banner — mobile only ─────────────────────────────────────────────
function SuccessBannerMobile({ isAuthenticated, t }: {
  isAuthenticated: boolean;
  t: (k: string, o?: Record<string, string>) => string;
}) {
  return (
    <div style={{ background: GLIGHT, border: `1px solid ${GBORD}`, borderRadius: 14, padding: '18px 20px', display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 20 }}>
      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <CheckCircle size={18} style={{ color: GREEN }} />
      </div>
      <div>
        <p style={{ fontSize: 14, fontWeight: 700, color: GREEN, marginBottom: 3, ...S }}>
          {t('contact.successTitle')}
        </p>
        <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.5, ...S }}>
          {t('contact.successMessage')}
        </p>
        {isAuthenticated && (
          <Link to="/support" style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginTop: 10, fontSize: 13, fontWeight: 700, color: V, textDecoration: 'none', ...S }}>
            {t('contact.viewCases', { defaultValue: 'Ver mis consultas' })} →
          </Link>
        )}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function Contact() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId') ?? undefined;
  const { user, isAuthenticated, isLoading: userLoading } = useUser();
  const isMobile = useIsMobile();

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    if (user) {
      setName([user.firstName, user.lastName].filter(Boolean).join(' ') || user.publicName || user.email);
      setEmail(user.email);
    }
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      if (isAuthenticated && user) {
        await supportService.createTicket({
          category: SupportCategory.Other,
          source: transactionId ? SupportTicketSource.ContactFromTransaction : SupportTicketSource.ContactForm,
          subject: subject.trim(),
          description: message.trim(),
          transactionId,
        });
      } else {
        await supportService.createContactTicket({
          name: name.trim(), email: email.trim(),
          subject: subject.trim(), description: message.trim(),
          transactionId,
        });
      }
      setSuccess(true);
      setSubject('');
      setMessage('');
    } catch (err) {
      setError(err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : t('contact.error'));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (userLoading) {
    return (
      <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: BG }}>
        <PageMeta title={t('seo.contact.title')} description={t('seo.contact.description')} />
        <p style={{ fontSize: 14, color: MUTED, ...S }}>{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');
        .th-input:focus{border-color:${V}!important;box-shadow:0 0 0 3px ${VLIGHT}}
        .th-input:read-only{background:${BG}!important;color:${MUTED}!important;cursor:default}
      `}</style>
      <PageMeta title={t('seo.contact.title')} description={t('seo.contact.description')} />

      <PageContentMaxWidth style={{ paddingTop: 24, paddingBottom: 80 }}>

        <PageHeader
          title={t('contact.title')}
          backTo={{ to: '/', labelKey: 'contact.backHome' }}
        />

        {/* Two columns on desktop, stacked on mobile */}
        <div style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: 'column',
          gridTemplateColumns: '1fr 300px',
          gap: 20,
          alignItems: isMobile ? 'stretch' : 'start',
        }}>

          {/* ── Form card ─────────────────────────────────────────────── */}
          <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            <div style={{ padding: '24px 28px' }}>

              {/* Success — mobile only (desktop shows in right panel) */}
              {success && isMobile && (
                <SuccessBannerMobile isAuthenticated={isAuthenticated} t={t} />
              )}

              {/* Error */}
              {error && (
                <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                  <p style={{ fontSize: 13.5, color: '#dc2626', ...S }}>{error}</p>
                </div>
              )}

              <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                {/* Guests: name + email fields. Authenticated: just show who's sending */}
                {!isAuthenticated ? (
                  <>
                    <div>
                      <label style={labelStyle}>{t('contact.name')}</label>
                      <input
                        type="text" value={name} onChange={e => setName(e.target.value)}
                        required className="th-input" style={inputStyle}
                        placeholder={t('contact.namePlaceholder')} autoComplete="name"
                      />
                    </div>
                    <div>
                      <label style={labelStyle}>{t('contact.email')}</label>
                      <input
                        type="email" value={email} onChange={e => setEmail(e.target.value)}
                        required className="th-input" style={inputStyle}
                        placeholder={t('contact.emailPlaceholder')} autoComplete="email"
                      />
                    </div>
                  </>
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 12px', background: BG, borderRadius: 10, border: `1px solid ${BORDER}` }}>
                    <Mail size={13} style={{ color: HINT, flexShrink: 0 }} />
                    <p style={{ fontSize: 13, color: MUTED, ...S }}>
                      {t('contact.sendingAs', { defaultValue: 'Enviando como' })}{' '}
                      <span style={{ fontWeight: 700, color: DARK }}>{user?.email}</span>
                    </p>
                  </div>
                )}

                {transactionId && (
                  <div>
                    <label style={labelStyle}>{t('contact.purchaseId')}</label>
                    <input
                      type="text" value={transactionId} readOnly
                      className="th-input"
                      style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13, background: BG, color: MUTED }}
                    />
                  </div>
                )}

                <div>
                  <label style={labelStyle}>
                    <FileText size={14} style={{ color: MUTED }} />
                    {t('contact.subject')}
                  </label>
                  <input
                    type="text" value={subject} onChange={e => setSubject(e.target.value)}
                    required className="th-input" style={inputStyle}
                    placeholder={t('contact.subjectPlaceholder')}
                  />
                </div>

                <div>
                  <label style={labelStyle}>
                    <MessageSquare size={14} style={{ color: MUTED }} />
                    {t('contact.message')}
                  </label>
                  <textarea
                    value={message} onChange={e => setMessage(e.target.value)}
                    required rows={5}
                    className="th-input"
                    style={{ ...inputStyle, resize: 'vertical', minHeight: 120 }}
                    placeholder={t('contact.messagePlaceholder')}
                  />
                </div>

                {/* Submit — right-aligned, not full-width */}
                <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                  <button
                    type="submit" disabled={isSubmitting}
                    style={{
                      padding: '11px 28px', borderRadius: 12,
                      background: isSubmitting ? VL_BORDER : V,
                      color: isSubmitting ? '#a78bfa' : 'white',
                      border: 'none', fontSize: 14, fontWeight: 700,
                      cursor: isSubmitting ? 'not-allowed' : 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 8,
                      boxShadow: isSubmitting ? 'none' : '0 2px 12px rgba(109,40,217,0.22)',
                      transition: 'background 0.14s', ...S,
                    }}
                  >
                    {isSubmitting ? t('contact.submitting') : t('contact.submit')}
                  </button>
                </div>

              </form>
            </div>
          </div>

          {/* ── Right panel (desktop only) ────────────────────────────── */}
          {!isMobile && (
            <RightPanel success={success} isAuthenticated={isAuthenticated} t={t} />
          )}

        </div>
      </PageContentMaxWidth>
    </div>
  );
}
