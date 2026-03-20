import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { FileText, CheckCircle } from 'lucide-react';
import { termsService } from '@/api/services/terms.service';
import { TermsUserType, AcceptanceMethod } from '@/api/types/terms';
import { useUser } from '@/app/contexts/UserContext';
import { TermsModal } from '@/app/components/TermsModal';
import { Loader2 } from 'lucide-react';
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
  AMBER,
  ABG,
  ABORD,
  VL_BORDER,
  ERROR_BG,
  BADGE_DEMAND_BORDER,
  DESTRUCTIVE,
  SURFACE,
  V_HOVER,
  S,
} from '@/lib/design-tokens';

export interface StepTermsProps {
  onComplete: () => void;
}

function PrimaryBtn({ label, loading, disabled }: { label: string; loading?: boolean; disabled?: boolean }) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;
  return (
    <button type="submit" disabled={isDisabled}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', padding: '13px', borderRadius: 11, border: 'none',
        background: isDisabled ? BORD2 : hovered ? V_HOVER : V,
        color: 'white', fontSize: 14.5, fontWeight: 700,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: isDisabled ? 'none' : '0 4px 18px rgba(109,40,217,0.28)',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...S,
      }}>
      {loading && <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />}
      {label}
    </button>
  );
}

export function StepTerms({ onComplete }: StepTermsProps) {
  const { t } = useTranslation();
  const { upgradeToLevel1 } = useUser();

  const [termsAccepted,  setTermsAccepted]  = useState(false);
  const [termsVersionId, setTermsVersionId] = useState<string | null>(null);
  const [loading,        setLoading]        = useState(false);
  const [done,           setDone]           = useState(false);
  const [error,          setError]          = useState<string | null>(null);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [chkHovered,     setChkHovered]     = useState(false);

  useEffect(() => {
    let cancelled = false;
    termsService.getCurrentTerms(TermsUserType.Seller)
      .then(terms => { if (!cancelled) setTermsVersionId(terms.id); })
      .catch(err  => { if (!cancelled) console.error('Failed to fetch seller terms:', err); });
    return () => { cancelled = true; };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!termsAccepted || !termsVersionId) { setError(t('becomeSeller.step2.pleaseAcceptTerms')); return; }
    setLoading(true); setError(null);
    try {
      await termsService.acceptTerms(termsVersionId, AcceptanceMethod.Checkbox);
      await upgradeToLevel1();
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start selling');
    } finally {
      setLoading(false);
    }
  };

  // ── Done state ────────────────────────────────────────────────────────────
  if (done) {
    return (
      <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
        <div style={{ background: GLIGHT, borderBottom: `1px solid ${GBORD}`, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: GLIGHT, border: `1.5px solid ${GBORD}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <CheckCircle size={22} style={{ color: GREEN }} />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 3, ...S }}>{t('becomeSeller.step2.successTitle')}</p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, ...S }}>{t('becomeSeller.step2.successMessage')}</p>
          </div>
        </div>
        <div style={{ padding: '16px 20px' }}>
          <button type="button" onClick={onComplete}
            style={{ width: '100%', padding: '13px', borderRadius: 11, border: 'none', background: V, color: 'white', fontSize: 14.5, fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 18px rgba(109,40,217,0.28)', ...S }}>
            {t('becomeSeller.step2.continue')}
          </button>
        </div>
      </div>
    );
  }

  // ── Form ──────────────────────────────────────────────────────────────────
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: VLIGHT, borderBottom: `1px solid ${VL_BORDER}`, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: V, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <FileText size={20} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 3, ...S }}>{t('becomeSeller.step2.title')}</p>
          </div>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

          <div style={{ padding: '14px 16px', borderRadius: 12, background: SURFACE, border: `1px solid ${BORDER}` }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12, ...S }}>
              {t('becomeSeller.step2.whatYouCanDo')}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {/* Can do now */}
              {[
                { title: t('becomeSeller.step2.canList'),  sub: t('becomeSeller.step2.canListSub',  { defaultValue: 'Publicá tus entradas y gestioná ventas desde la app.' }) },
              ].map(item => (
                <div key={item.title} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                  <div style={{ width: 6, height: 6, borderRadius: '50%', background: V, flexShrink: 0, marginTop: 7 }} />
                  <div>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK, marginBottom: 1, ...S }}>{item.title}</p>
                    <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.45, ...S }}>{item.sub}</p>
                  </div>
                </div>
              ))}
              {/* Unlocked after verification */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0', borderBottom: `1px solid ${BORDER}` }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: BORD2, flexShrink: 0, marginTop: 7 }} />
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: MUTED, marginBottom: 1, ...S }}>
                    {t('becomeSeller.step2.canReceivePayments', { defaultValue: 'Recibir pagos de tus ventas' })}
                  </p>
                  <p style={{ fontSize: 12.5, color: HINT, lineHeight: 1.45, ...S }}>
                    {t('becomeSeller.step2.canReceivePaymentsSub', { defaultValue: 'Requiere verificar tu identidad (DNI) y tu cuenta bancaria — los próximos pasos del wizard.' })}
                  </p>
                </div>
              </div>
              {/* Can sell */}
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 0' }}>
                <div style={{ width: 6, height: 6, borderRadius: '50%', background: BORD2, flexShrink: 0, marginTop: 7 }} />
                <div>
                  <p style={{ fontSize: 13.5, fontWeight: 600, color: MUTED, marginBottom: 1, ...S }}>
                    {t('becomeSeller.step2.canSell', { defaultValue: 'Límites ampliados de publicaciones' })}
                  </p>
                  <p style={{ fontSize: 12.5, color: HINT, lineHeight: 1.45, ...S }}>
                    {t('becomeSeller.step2.canSellSub', { defaultValue: 'También se desbloquean al completar la verificación.' })}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Accept terms form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ padding: '14px 16px', borderRadius: 12, background: BG, border: `1px solid ${BORDER}`, display: 'flex', alignItems: 'flex-start', gap: 12 }}>
              {/* Custom checkbox */}
              <div
                onClick={() => setTermsAccepted(!termsAccepted)}
                onMouseEnter={() => setChkHovered(true)}
                onMouseLeave={() => setChkHovered(false)}
                style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0, marginTop: 1,
                  background: termsAccepted ? V : CARD,
                  border: `2px solid ${termsAccepted ? V : chkHovered ? V : BORD2}`,
                  cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.14s',
                }}
              >
                {termsAccepted && (
                  <svg width="11" height="11" viewBox="0 0 12 12" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round">
                    <polyline points="2 6 5 9 10 3" />
                  </svg>
                )}
              </div>
              <label style={{ fontSize: 13.5, color: DARK, lineHeight: 1.55, cursor: 'pointer', ...S }}>
                {t('becomeSeller.step2.agreeToTerms')}{' '}
                <button type="button"
                  onClick={() => termsVersionId && setShowTermsModal(true)}
                  disabled={!termsVersionId}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13.5, fontWeight: 700, color: V, textDecoration: 'underline', padding: 0, ...S }}>
                  {t('becomeSeller.step2.sellerTermsLink')}
                </button>
              </label>
            </div>

            {error && (
              <div style={{ padding: '11px 14px', borderRadius: 11, background: ERROR_BG, border: `1px solid ${BADGE_DEMAND_BORDER}`, fontSize: 13.5, color: DESTRUCTIVE, ...S }}>
                {error}
              </div>
            )}

            <PrimaryBtn
              label={t('becomeSeller.step2.startSelling')}
              loading={loading}
              disabled={!termsAccepted || !termsVersionId}
            />
          </form>
        </div>
      </div>

      {showTermsModal && termsVersionId && (
        <TermsModal
          termsVersionId={termsVersionId}
          title={t('becomeSeller.step2.sellerTermsLink')}
          onClose={() => setShowTermsModal(false)}
        />
      )}
    </>
  );
}
