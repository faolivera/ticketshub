import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Ticket } from 'lucide-react';
import { PageMeta } from '@/app/components/PageMeta';
import { V, VLIGHT, VL_BORDER, DARK, MUTED, HINT, BG, BORDER, S, E, R_BUTTON } from '@/lib/design-tokens';

const DS = { ...E, fontWeight: 400 };

export function NotFound() {
  const { t } = useTranslation();

  return (
    <div style={{ minHeight: '70vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', background: BG }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');`}</style>
      <PageMeta title={t('seo.notFound.title')} description={t('seo.notFound.description')} />

      <div style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>

        {/* Icon */}
        <div style={{ position: 'relative', marginBottom: 28, display: 'inline-block' }}>
          <span style={{ fontSize: 'clamp(80px,15vw,120px)', fontWeight: 800, color: BORDER, letterSpacing: '-4px', lineHeight: 1, userSelect: 'none', display: 'block' }} aria-hidden>
            404
          </span>
          <div style={{
            position: 'absolute', inset: 0,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{ width: 64, height: 64, borderRadius: 18, background: VLIGHT, border: `1px solid ${VL_BORDER}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Ticket size={28} style={{ color: V }} />
            </div>
          </div>
        </div>

        <h1 style={{ ...DS, fontSize: 'clamp(22px,4vw,30px)', color: DARK, marginBottom: 10, lineHeight: 1.2 }}>
          {t('notFound.title')}
        </h1>
        <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, marginBottom: 28, maxWidth: 320, margin: '0 auto 28px', ...S }}>
          {t('notFound.description')}
        </p>

        <Link to="/" style={{ textDecoration: 'none' }}>
          <button style={{
            padding: '12px 28px', borderRadius: R_BUTTON,
            background: V, color: 'white', border: 'none',
            fontSize: 14, fontWeight: 700, cursor: 'pointer',
            display: 'inline-flex', alignItems: 'center', gap: 8,
            boxShadow: '0 2px 12px rgba(105,45,212,0.22)',
            ...S,
          }}>
            <Ticket size={16} />
            {t('notFound.browseEvents')}
          </button>
        </Link>

        <p style={{ marginTop: 20, fontSize: 13, color: HINT, ...S }}>
          {t('notFound.hint')}
        </p>
      </div>
    </div>
  );
}
