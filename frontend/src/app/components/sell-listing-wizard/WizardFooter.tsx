import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, ArrowLeft, ArrowRight } from 'lucide-react';
import { V, VLIGHT, VL_BORDER, DARK, MUTED, BORDER, CARD, BG, S } from '@/lib/design-tokens';

interface WizardFooterProps {
  onBack: () => void;
  onNext: () => void;
  showPublish: boolean;
  canGoNext: boolean;
  isPublishing: boolean;
  isNextLoading?: boolean;
  isMobile: boolean;
  backLabel?: string;
  nextLabel?: string;
}

export const WizardFooter: FC<WizardFooterProps> = ({
  onBack,
  onNext,
  showPublish,
  canGoNext,
  isPublishing,
  isNextLoading = false,
  isMobile,
  backLabel,
  nextLabel,
}) => {
  const { t } = useTranslation();

  const isNextDisabled = !canGoNext || isPublishing || isNextLoading;
  const isBusy = isPublishing || isNextLoading;

  const content = (
    <div style={{ display: 'flex', gap: 10, width: '100%' }}>

      {/* Back — ghost pill */}
      <button
        type="button"
        onClick={onBack}
        style={{
          flexShrink: 0,
          padding: '11px 22px',
          borderRadius: 100,
          background: 'transparent',
          border: `1.5px solid ${BORDER}`,
          color: MUTED,
          fontSize: 14,
          fontWeight: 600,
          cursor: 'pointer',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          transition: 'border-color 0.14s, color 0.14s',
          ...S,
        }}
        aria-label={backLabel ?? t('sellListingWizard.back')}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = MUTED;
          (e.currentTarget as HTMLButtonElement).style.color = DARK;
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.borderColor = BORDER;
          (e.currentTarget as HTMLButtonElement).style.color = MUTED;
        }}
      >
        <ArrowLeft size={15} />
        {backLabel ?? t('sellListingWizard.back')}
      </button>

      {/* Next / Publish — violet pill, fills remaining space */}
      <button
        type="button"
        onClick={onNext}
        disabled={isNextDisabled}
        aria-busy={isBusy}
        aria-label={showPublish ? t('sellListingWizard.publish') : (nextLabel ?? t('sellListingWizard.next'))}
        style={{
          flex: 1,
          padding: '11px 24px',
          borderRadius: 100,
          background: isNextDisabled ? VL_BORDER : V,
          border: 'none',
          color: isNextDisabled ? '#a78bfa' : 'white',
          fontSize: 14,
          fontWeight: 700,
          cursor: isNextDisabled ? 'not-allowed' : 'pointer',
          minHeight: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 7,
          boxShadow: isNextDisabled ? 'none' : '0 2px 12px rgba(105,45,212,0.22)',
          transition: 'background 0.14s, box-shadow 0.14s',
          ...S,
        }}
      >
        {isBusy ? (
          <>
            <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
            {showPublish ? t('sellListingWizard.publishing') : t('sellListingWizard.next')}
          </>
        ) : showPublish ? (
          t('sellListingWizard.publish')
        ) : (
          <>
            {nextLabel ?? t('sellListingWizard.next')}
            <ArrowRight size={15} />
          </>
        )}
      </button>

    </div>
  );

  // ── Mobile: sticky bottom bar ─────────────────────────────────────────────
  if (isMobile) {
    return (
      <div
        role="group"
        aria-label={t('sellListingWizard.navigation', { defaultValue: 'Navegación del wizard' })}
        style={{
          position: 'sticky',
          bottom: 0, left: 0, right: 0,
          zIndex: 10,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          borderTop: `1px solid ${BORDER}`,
          padding: '12px 16px',
          paddingBottom: 'max(12px, env(safe-area-inset-bottom))',
          boxShadow: '0 -2px 12px rgba(0,0,0,0.06)',
        }}
      >
        {content}
      </div>
    );
  }

  // ── Desktop: inline ───────────────────────────────────────────────────────
  return (
    <div style={{ display: 'flex', gap: 10, paddingTop: 24 }}>
      {content}
    </div>
  );
};
