import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { PageMeta } from '@/app/components/PageMeta';
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
  E,
  R_CARD,
  R_BUTTON,
  R_INPUT,
} from '@/lib/design-tokens';

const DS = { ...E, fontWeight: 400 };

// ─── Step card ────────────────────────────────────────────────────────────────
function StepCard({ step, index, isLast, stepLabel }: {
  step: {
    title: string;
    body: string;
    detail: string;
    icon: React.ReactNode;
    accent: string;
    accentBorder: string;
    highlight?: boolean;
  };
  index: number;
  isLast: boolean;
  stepLabel: string;
}) {
  return (
    <div style={{ display: 'flex', gap: 16, position: 'relative' }}>
      {/* Connector line */}
      {!isLast && (
        <div style={{
          position: 'absolute', left: 19, top: 48, width: 2, bottom: -20,
          background: `linear-gradient(to bottom, ${BORD2}, transparent)`,
        }} />
      )}

      {/* Number circle */}
      <div style={{
        width: 40, height: 40, borderRadius: '50%', flexShrink: 0,
        background: step.highlight ? V : CARD,
        border: `2px solid ${step.highlight ? V : BORD2}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 13, fontWeight: 800,
        color: step.highlight ? 'white' : MUTED,
        zIndex: 1, ...S,
      }}>
        {index + 1}
      </div>

      {/* Card */}
      <div style={{
        flex: 1, background: CARD, borderRadius: R_CARD,
        border: `1px solid ${step.highlight ? '#ddd6fe' : BORDER}`,
        padding: '16px 18px', marginBottom: 20,
        boxShadow: step.highlight ? '0 4px 20px rgba(105,45,212,0.08)' : 'none',
      }}>
        {/* Icon + title */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, marginBottom: 10 }}>
          <div style={{
            width: 44, height: 44, borderRadius: R_INPUT, flexShrink: 0,
            background: step.accent, border: `1px solid ${step.accentBorder}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            {step.icon}
          </div>
          <div>
            <p style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: HINT, marginBottom: 3, ...S }}>
              {stepLabel}
            </p>
            <p style={{ fontSize: 15, fontWeight: 800, color: DARK, lineHeight: 1.3, ...S }}>
              {step.title}
            </p>
          </div>
        </div>

        <p style={{ fontSize: 13.5, color: MUTED, lineHeight: 1.6, marginBottom: 10, ...S }}>
          {step.body}
        </p>

        {/* Detail pill */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 5,
          fontSize: 12, fontWeight: 600, color: step.highlight ? V : GREEN,
          padding: '4px 10px', borderRadius: 100,
          background: step.highlight ? VLIGHT : GLIGHT,
          border: `1px solid ${step.highlight ? '#ddd6fe' : GBORD}`,
          ...S,
        }}>
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <polyline points="20 6 9 17 4 12"/>
          </svg>
          {step.detail}
        </div>
      </div>
    </div>
  );
}

// ─── Desktop step row ─────────────────────────────────────────────────────────
function DesktopStepRow({ buyerStep, sellerStep, index, guaranteeLabel }: {
  buyerStep: {
    title: string;
    body: string;
    detail: string;
    icon: React.ReactNode;
    accent: string;
    accentBorder: string;
    highlight?: boolean;
  };
  sellerStep: {
    title: string;
    body: string;
    detail: string;
    icon: React.ReactNode;
    accent: string;
    accentBorder: string;
    highlight?: boolean;
  };
  index: number;
  guaranteeLabel: string;
}) {
  const isHighlight = buyerStep.highlight;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, marginBottom: 20, alignItems: 'stretch' }}>
      {/* Buyer card */}
      <div style={{
        background: CARD, borderRadius: R_CARD, padding: '16px 18px',
        border: `1px solid ${isHighlight ? '#ddd6fe' : BORDER}`,
        boxShadow: isHighlight ? '0 4px 20px rgba(105,45,212,0.08)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 38, height: 38, borderRadius: R_INPUT, flexShrink: 0, background: buyerStep.accent, border: `1px solid ${buyerStep.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {buyerStep.icon}
          </div>
          <p style={{ fontSize: 14, fontWeight: 800, color: DARK, lineHeight: 1.3, ...S }}>{buyerStep.title}</p>
        </div>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 8, ...S }}>{buyerStep.body}</p>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: buyerStep.highlight ? V : GREEN, ...S }}>✓ {buyerStep.detail}</span>
      </div>

      {/* Center connector with step number */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4, width: 52 }}>
        <div style={{
          width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
          background: isHighlight ? V : CARD,
          border: `2px solid ${isHighlight ? V : BORD2}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 14, fontWeight: 800,
          color: isHighlight ? 'white' : MUTED, ...S,
        }}>
          {index + 1}
        </div>
        {isHighlight && (
          <div style={{
            fontSize: 9.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
            color: V, textAlign: 'center', lineHeight: 1.3, ...S,
          }}>
            {guaranteeLabel}
          </div>
        )}
      </div>

      {/* Seller card */}
      <div style={{
        background: CARD, borderRadius: R_CARD, padding: '16px 18px',
        border: `1px solid ${isHighlight ? '#ddd6fe' : BORDER}`,
        boxShadow: isHighlight ? '0 4px 20px rgba(105,45,212,0.08)' : 'none',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ width: 38, height: 38, borderRadius: R_INPUT, flexShrink: 0, background: sellerStep.accent, border: `1px solid ${sellerStep.accentBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {sellerStep.icon}
          </div>
          <p style={{ fontSize: 14, fontWeight: 800, color: DARK, lineHeight: 1.3, ...S }}>{sellerStep.title}</p>
        </div>
        <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.6, marginBottom: 8, ...S }}>{sellerStep.body}</p>
        <span style={{ fontSize: 11.5, fontWeight: 600, color: sellerStep.highlight ? V : GREEN, ...S }}>✓ {sellerStep.detail}</span>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export function HowItWorks() {
  const { t } = useTranslation();
  const [view, setView] = useState<'buyer' | 'seller'>('buyer');

  const BUYER_STEPS = [
    {
      n: '01',
      title: t('howItWorks.step1BuyerTitle'),
      body: t('howItWorks.step1BuyerBody'),
      detail: t('howItWorks.step1BuyerDetail'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
        </svg>
      ),
      accent: VLIGHT,
      accentBorder: '#ddd6fe',
    },
    {
      n: '02',
      title: t('howItWorks.step2BuyerTitle'),
      body: t('howItWorks.step2BuyerBody'),
      detail: t('howItWorks.step2BuyerDetail'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      ),
      accent: VLIGHT,
      accentBorder: '#ddd6fe',
      highlight: true,
    },
    {
      n: '03',
      title: t('howItWorks.step3BuyerTitle'),
      body: t('howItWorks.step3BuyerBody'),
      detail: t('howItWorks.step3BuyerDetail'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 9a3 3 0 010 6v2a2 2 0 002 2h16a2 2 0 002-2v-2a3 3 0 010-6V7a2 2 0 00-2-2H4a2 2 0 00-2 2v2z"/>
        </svg>
      ),
      accent: VLIGHT,
      accentBorder: '#ddd6fe',
    },
    {
      n: '04',
      title: t('howItWorks.step4BuyerTitle'),
      body: t('howItWorks.step4BuyerBody'),
      detail: t('howItWorks.step4BuyerDetail'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12"/>
        </svg>
      ),
      accent: GLIGHT,
      accentBorder: GBORD,
    },
  ];

  const SELLER_STEPS = [
    {
      n: '01',
      title: t('howItWorks.step1SellerTitle'),
      body: t('howItWorks.step1SellerBody'),
      detail: t('howItWorks.step1SellerDetail'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 5v14M5 12h14"/>
        </svg>
      ),
      accent: VLIGHT,
      accentBorder: '#ddd6fe',
    },
    {
      n: '02',
      title: t('howItWorks.step2SellerTitle'),
      body: t('howItWorks.step2SellerBody'),
      detail: t('howItWorks.step2SellerDetail'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      ),
      accent: VLIGHT,
      accentBorder: '#ddd6fe',
      highlight: true,
    },
    {
      n: '03',
      title: t('howItWorks.step3SellerTitle'),
      body: t('howItWorks.step3SellerBody'),
      detail: t('howItWorks.step3SellerDetail'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/>
        </svg>
      ),
      accent: VLIGHT,
      accentBorder: '#ddd6fe',
    },
    {
      n: '04',
      title: t('howItWorks.step4SellerTitle'),
      body: t('howItWorks.step4SellerBody'),
      detail: t('howItWorks.step4SellerDetail'),
      icon: (
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6"/>
        </svg>
      ),
      accent: GLIGHT,
      accentBorder: GBORD,
    },
  ];

  const GUARANTEES = [
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0110 0v4"/>
        </svg>
      ),
      title: t('howItWorks.guarantee1Title'),
      body: t('howItWorks.guarantee1Body'),
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
        </svg>
      ),
      title: t('howItWorks.guarantee2Title'),
      body: t('howItWorks.guarantee2Body'),
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"/>
        </svg>
      ),
      title: t('howItWorks.guarantee3Title'),
      body: t('howItWorks.guarantee3Body'),
    },
    {
      icon: (
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={V} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 102.13-9.36L1 10"/>
        </svg>
      ),
      title: t('howItWorks.guarantee4Title'),
      body: t('howItWorks.guarantee4Body'),
    },
  ];

  const steps = view === 'buyer' ? BUYER_STEPS : SELLER_STEPS;

  return (
    <>
      <PageMeta
        title={t('howItWorks.metaTitle')}
        description={t('howItWorks.metaDescription')}
      />
      <style>{`
        .hiw-mobile  { display: block; }
        .hiw-desktop { display: none; }
        @media (min-width: 768px) {
          .hiw-mobile  { display: none; }
          .hiw-desktop { display: block; }
        }
      `}</style>

      <div style={{ minHeight: '100vh', background: BG, ...S }}>

        {/* ── HERO ─────────────────────────────────────────────────────────── */}
        <div style={{
          background: DARK, color: 'white',
          padding: 'clamp(48px,8vw,80px) 24px clamp(40px,6vw,64px)',
          textAlign: 'center',
        }}>
          <div style={{ maxWidth: 640, margin: '0 auto' }}>
            <h1 style={{
              ...DS, fontSize: 'clamp(28px,5vw,48px)', fontWeight: 400,
              letterSpacing: '-0.5px', lineHeight: 1.15,
              marginBottom: 16, color: 'white',
            }}>
              {t('howItWorks.heroTitle')}<br />
              <em style={{ color: '#c4b5fd' }}>{t('howItWorks.heroTitleEm')}</em>
            </h1>
            <p style={{
              fontSize: 'clamp(14px,2vw,17px)', color: '#94a3b8',
              lineHeight: 1.65, maxWidth: 480, margin: '0 auto 28px', ...S,
            }}>
              {t('howItWorks.heroSubtitle')}
            </p>
          </div>
        </div>

        {/* ── MOBILE VIEW ──────────────────────────────────────────────────── */}
        <div className="hiw-mobile">
          <div style={{ maxWidth: 480, margin: '0 auto', padding: '32px 16px 56px' }}>

            {/* Toggle */}
            <div style={{
              display: 'flex', background: CARD, borderRadius: R_CARD,
              border: `1px solid ${BORDER}`, padding: 4, marginBottom: 28,
            }}>
              {(['buyer', 'seller'] as const).map(v => (
                <button key={v} type="button" onClick={() => setView(v)} style={{
                  flex: 1, padding: '10px 0', borderRadius: R_BUTTON, border: 'none',
                  background: view === v ? V : 'transparent',
                  color: view === v ? 'white' : MUTED,
                  fontSize: 14, fontWeight: 700, cursor: 'pointer',
                  transition: 'all 0.18s', ...S,
                }}>
                  {v === 'buyer' ? t('howItWorks.toggleBuyer') : t('howItWorks.toggleSeller')}
                </button>
              ))}
            </div>

            {/* Role headline */}
            <div style={{ marginBottom: 24 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: V, marginBottom: 6, ...S }}>
                {view === 'buyer' ? t('howItWorks.roleEyebrowBuyer') : t('howItWorks.roleEyebrowSeller')}
              </p>
              <h2 style={{ ...DS, fontSize: 22, fontWeight: 400, color: DARK, lineHeight: 1.3, marginBottom: 4 }}>
                {view === 'buyer'
                  ? t('howItWorks.roleHeadingBuyer')
                  : t('howItWorks.roleHeadingSeller')}
              </h2>
            </div>

            {/* Steps */}
            {steps.map((step, i) => (
              <StepCard
                key={i}
                step={step}
                index={i}
                isLast={i === steps.length - 1}
                stepLabel={t('howItWorks.stepLabel', { number: i + 1 })}
              />
            ))}
          </div>
        </div>

        {/* ── DESKTOP VIEW ─────────────────────────────────────────────────── */}
        <div className="hiw-desktop">
          <div style={{ maxWidth: 960, margin: '0 auto', padding: '48px 32px 72px' }}>

            {/* Column headers */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 1fr', gap: 24, marginBottom: 20, alignItems: 'end' }}>
              <div style={{ textAlign: 'right', paddingRight: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: V, marginBottom: 4, ...S }}>
                  {t('howItWorks.desktopBuyersLabel')}
                </p>
                <h2 style={{ ...DS, fontSize: 22, fontWeight: 400, color: DARK }}>
                  {t('howItWorks.roleHeadingBuyer')}
                </h2>
              </div>
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 2, height: 48, background: `linear-gradient(to bottom, transparent, ${BORD2})` }} />
              </div>
              <div style={{ paddingLeft: 8 }}>
                <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: V, marginBottom: 4, ...S }}>
                  {t('howItWorks.desktopSellersLabel')}
                </p>
                <h2 style={{ ...DS, fontSize: 22, fontWeight: 400, color: DARK }}>
                  {t('howItWorks.roleHeadingSeller')}
                </h2>
              </div>
            </div>

            {/* Escrow callout — spans full width, between step 1 and 2 visual */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 1fr', gap: 24, marginBottom: 6 }}>
              <div />
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{ width: 2, height: 20, background: BORD2 }} />
              </div>
              <div />
            </div>

            {/* Step rows */}
            {BUYER_STEPS.map((buyerStep, i) => (
              <div key={i}>
                {/* Connector between rows */}
                {i > 0 && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 52px 1fr', gap: 24, marginBottom: 0 }}>
                    <div />
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                      <div style={{ width: 2, height: 20, background: `linear-gradient(to bottom, ${BORD2}, ${i === 1 ? V : BORD2})` }} />
                    </div>
                    <div />
                  </div>
                )}
                <DesktopStepRow
                  buyerStep={buyerStep}
                  sellerStep={SELLER_STEPS[i]}
                  index={i}
                  guaranteeLabel={t('howItWorks.guaranteeLabel')}
                />
              </div>
            ))}

            {/* Escrow explanation strip */}
            <div style={{
              display: 'grid', gridTemplateColumns: '1fr 52px 1fr', gap: 24, marginTop: 8,
            }}>
              <div />
              <div />
              <div />
            </div>
          </div>
        </div>

        {/* ── GUARANTEES ───────────────────────────────────────────────────── */}
        <div style={{ background: DARK, padding: 'clamp(40px,6vw,64px) 24px' }}>
          <div style={{ maxWidth: 960, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 36 }}>
              <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: V, marginBottom: 8, ...S }}>
                {t('howItWorks.guaranteesSectionEyebrow')}
              </p>
              <h2 style={{ ...DS, fontSize: 'clamp(22px,3vw,30px)', fontWeight: 400, color: 'white', marginBottom: 0 }}>
                {t('howItWorks.guaranteesSectionTitle')}
              </h2>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 16,
            }}>
              {GUARANTEES.map((g, i) => (
                <div key={i} style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  borderRadius: R_CARD, padding: '20px 18px',
                }}>
                  <div style={{
                    width: 40, height: 40, borderRadius: R_INPUT,
                    background: VLIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    marginBottom: 14,
                  }}>
                    {g.icon}
                  </div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: 'white', marginBottom: 6, ...S }}>{g.title}</p>
                  <p style={{ fontSize: 13, color: '#94a3b8', lineHeight: 1.55, ...S }}>{g.body}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── CTA ──────────────────────────────────────────────────────────── */}
        <div style={{ background: BG, padding: 'clamp(48px,7vw,72px) 24px', textAlign: 'center' }}>
          <div style={{ maxWidth: 480, margin: '0 auto' }}>
            <h2 style={{ ...DS, fontSize: 'clamp(24px,3.5vw,34px)', fontWeight: 400, color: DARK, marginBottom: 12, lineHeight: 1.2 }}>
              {t('howItWorks.ctaTitle')}
            </h2>
            <p style={{ fontSize: 15, color: MUTED, lineHeight: 1.6, marginBottom: 28, ...S }}>
              {t('howItWorks.ctaSubtitle')}
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '13px 28px', borderRadius: R_BUTTON, border: 'none',
                  background: V, color: 'white',
                  fontSize: 15, fontWeight: 700, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7,
                  boxShadow: '0 4px 18px rgba(105,45,212,0.28)',
                  ...S,
                }}>
                  {t('howItWorks.ctaBrowseButton')} <ArrowRight size={16} />
                </button>
              </Link>
              <Link to="/sell-ticket" style={{ textDecoration: 'none' }}>
                <button style={{
                  padding: '13px 28px', borderRadius: R_BUTTON,
                  border: `1.5px solid ${BORD2}`, background: CARD,
                  color: DARK, fontSize: 15, fontWeight: 700, cursor: 'pointer', ...S,
                }}>
                  {t('howItWorks.ctaSellButton')}
                </button>
              </Link>
            </div>

            {/* Links to T&C */}
            <div style={{ marginTop: 28, display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap' }}>
              <Link to="/terms/buyer" style={{ fontSize: 12.5, color: HINT, textDecoration: 'none', ...S }}>
                {t('howItWorks.termsBuyerLink')}
              </Link>
              <Link to="/terms/seller" style={{ fontSize: 12.5, color: HINT, textDecoration: 'none', ...S }}>
                {t('howItWorks.termsSellerLink')}
              </Link>
            </div>
          </div>
        </div>

      </div>
    </>
  );
}
