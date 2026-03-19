import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Mail, User, FileText, MessageSquare, CheckCircle } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { supportService } from '@/api/services/support.service';
import { SupportCategory, SupportTicketSource } from '@/api/types/support';
import { PageMeta } from '@/app/components/PageMeta';
import { PageHeader } from '@/app/components/PageHeader';
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
  GREEN,
  GLIGHT,
  GBORD,
  S,
  E,
} from '@/lib/design-tokens';

const DS = { ...E, fontWeight: 400 };

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '10px 14px',
  border: `1.5px solid ${BORDER}`, borderRadius: 10,
  fontSize: 14, color: DARK, background: CARD,
  outline: 'none', transition: 'border-color 0.15s',
  boxSizing: 'border-box',
  ...S,
};

const labelStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 6,
  fontSize: 13.5, fontWeight: 600, color: DARK,
  marginBottom: 6, ...S,
};

export function Contact() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const transactionId = searchParams.get('transactionId') ?? undefined;
  const { user, isAuthenticated, isLoading: userLoading } = useUser();

  const [name,    setName]    = useState('');
  const [email,   setEmail]   = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error,   setError]   = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const lockedNameEmail = isAuthenticated && !!user;

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

        {/* Header — outside card, aligned left with the rest of the app */}
        <PageHeader
          title={t('contact.title')}
          subtitle={t('contact.intro')}
          backTo={{ to: '/', labelKey: 'contact.backHome' }}
        />

        {/* Form card — max 560px, left-aligned */}
        <div style={{
          maxWidth: 560,
          background: CARD, borderRadius: 20,
          border: `1px solid ${BORDER}`, overflow: 'hidden',
        }}>
        <div style={{ padding: '24px 28px' }}>

            {/* Success state — inline, not full page */}
            {success && (
              <div style={{ background: GLIGHT, border: `1px solid ${GBORD}`, borderRadius: 14, padding: '20px 22px', display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 24 }}>
                <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <CheckCircle size={20} style={{ color: GREEN }} />
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
                      {t('contact.viewCases', { defaultValue: 'Ver mis consultas →' })}
                    </Link>
                  )}
                </div>
              </div>
            )}

            {/* Error */}
            {error && (
              <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10, padding: '12px 16px', marginBottom: 20 }}>
                <p style={{ fontSize: 13.5, color: '#dc2626', ...S }}>{error}</p>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

              <div>
                <label style={labelStyle}>
                  <User size={14} style={{ color: MUTED }} />
                  {t('contact.name')}
                </label>
                <input
                  type="text" value={name} onChange={e => setName(e.target.value)}
                  readOnly={lockedNameEmail} required
                  className="th-input" style={inputStyle}
                  placeholder={t('contact.namePlaceholder')} autoComplete="name"
                />
              </div>

              <div>
                <label style={labelStyle}>
                  <Mail size={14} style={{ color: MUTED }} />
                  {t('contact.email')}
                </label>
                <input
                  type="email" value={email} onChange={e => setEmail(e.target.value)}
                  readOnly={lockedNameEmail} required
                  className="th-input" style={inputStyle}
                  placeholder={t('contact.emailPlaceholder')} autoComplete="email"
                />
              </div>

              {transactionId && (
                <div>
                  <label style={{ ...labelStyle }}>{t('contact.purchaseId')}</label>
                  <input
                    type="text" value={transactionId} readOnly
                    className="th-input" style={{ ...inputStyle, fontFamily: 'monospace', fontSize: 13, background: BG, color: MUTED }}
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

              <button
                type="submit" disabled={isSubmitting}
                style={{
                  width: '100%', padding: '13px 0', borderRadius: 12,
                  background: isSubmitting ? VL_BORDER : V,
                  color: isSubmitting ? '#a78bfa' : 'white',
                  border: 'none', fontSize: 14, fontWeight: 700,
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                  boxShadow: isSubmitting ? 'none' : '0 2px 12px rgba(109,40,217,0.22)',
                  transition: 'background 0.14s',
                  ...S,
                }}
              >
                {isSubmitting ? t('contact.submitting') : t('contact.submit')}
              </button>

            </form>
        </div>
        </div>
      </PageContentMaxWidth>
    </div>
  );
}
