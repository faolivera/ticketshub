import { Mail, Calendar, Phone, Camera, Shield, CreditCard, LogOut, ChevronRight, CheckCircle, Clock, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { useTranslation } from 'react-i18next';
import { SellerBadge } from '@/app/components/SellerBadge';
import { useState } from 'react';
import { VerificationHelper } from '@/lib/verification';
import { usersService } from '@/api/services';
import { UserAvatar } from '@/app/components/UserAvatar';
import AvatarCropModal from '@/app/components/Avatarcropmodal';
import { PageContentMaxWidth } from '@/app/components/PageContentMaxWidth';
import { formatMonthYear } from '@/lib/format-date';
import { PageHeader } from '../components/PageHeader';
import {
  V,
  VLIGHT,
  BLUE,
  BLIGHT,
  DARK,
  MUTED,
  BG,
  CARD,
  BORDER,
  BORD2,
  SUCCESS,
  SUCCESS_LIGHT,
  SUCCESS_BORDER,
  PENDING,
  PENDING_LIGHT,
  PENDING_BORDER,
  BADGE_DEMAND_BG,
  BADGE_DEMAND_BORDER,
  DESTRUCTIVE,
  SURFACE,
  S,
  R_HERO,
  R_CARD,
  R_BUTTON,
} from '@/lib/design-tokens';

// ─── Types ────────────────────────────────────────────────────────────────────
type VerifStatus = 'verified' | 'pending' | 'rejected' | 'none';

interface VerifRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  status: VerifStatus;
  verifyLabel: string;
  verifyTo?: string;
  verifyState?: object;
  showVerify: boolean;
}

// ─── Verification status badge ────────────────────────────────────────────────
function StatusBadge({ status }: { status: VerifStatus }) {
  const cfg: Record<VerifStatus, { bg: string; color: string; border: string; icon: React.ReactNode; text: string }> = {
    verified: {
      bg: SUCCESS_LIGHT, color: SUCCESS, border: `1px solid ${SUCCESS_BORDER}`,
      icon: <CheckCircle size={11} />,
      text: 'Verificado',
    },
    pending: {
      bg: PENDING_LIGHT, color: PENDING, border: `1px solid ${PENDING_BORDER}`,
      icon: <Clock size={11} />,
      text: 'Verificando',
    },
    rejected: {
      bg: BADGE_DEMAND_BG, color: DESTRUCTIVE, border: `1px solid ${BADGE_DEMAND_BORDER}`,
      icon: <AlertCircle size={11} />,
      text: 'Rechazado',
    },
    none: {
      bg: SURFACE, color: MUTED, border: `1px solid ${BORD2}`,
      icon: <AlertCircle size={11} />,
      text: 'Sin verificar',
    },
  };
  const c = cfg[status];
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 8px', borderRadius: 100,
      background: c.bg, color: c.color, border: c.border,
      fontSize: 11.5, fontWeight: 600, whiteSpace: 'nowrap',
    }}>
      {c.icon} {c.text}
    </span>
  );
}

// ─── Verification row ─────────────────────────────────────────────────────────
function VerifRow({ icon, label, value, status, verifyLabel, verifyTo, verifyState, showVerify }: VerifRowProps) {
  const [hovered, setHovered] = useState(false);

  if (!showVerify) {
    // Read-only row (nothing to action)
    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '13px 16px', borderRadius: R_CARD,
        background: BG, border: `1px solid ${BORDER}`,
      }}>
        <div style={{ color: MUTED, flexShrink: 0, display: 'flex' }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{value}</p>
        </div>
        <StatusBadge status={status} />
      </div>
    );
  }

  // Tappable row with verify CTA
  return (
    <Link
      to={verifyTo!}
      state={verifyState}
      style={{ textDecoration: 'none' }}
    >
      <div
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          display: 'flex', alignItems: 'center', gap: 12,
          padding: '13px 16px', borderRadius: R_CARD,
          background: hovered ? VLIGHT : BG,
          border: hovered ? `1px solid #ddd6fe` : `1px solid ${BORDER}`,
          cursor: 'pointer', transition: 'all 0.14s',
        }}
      >
        <div style={{ color: hovered ? V : MUTED, flexShrink: 0, display: 'flex', transition: 'color 0.14s' }}>{icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ fontSize: 11.5, fontWeight: 600, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</p>
          <p style={{ fontSize: 13.5, fontWeight: 500, color: DARK, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginBottom: 4 }}>{value}</p>
          <StatusBadge status={status} />
        </div>
        <ChevronRight size={16} color={hovered ? V : MUTED} style={{ flexShrink: 0, transition: 'color 0.14s' }} />
      </div>
    </Link>
  );
}

// ─── Completion progress bar ──────────────────────────────────────────────────
function ProfileCompletion({ steps }: { steps: Array<{ label: string; done: boolean }> }) {
  const done = steps.filter(s => s.done).length;
  const pct  = Math.round((done / steps.length) * 100);
  if (pct === 100) return null;

  return (
    <div style={{
      padding: '14px 16px', borderRadius: R_CARD,
      background: VLIGHT, border: '1px solid #ddd6fe', marginBottom: 20,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 700, color: V }}>Completá tu perfil</p>
        <p style={{ fontSize: 13, fontWeight: 700, color: V }}>{done}/{steps.length}</p>
      </div>
      <div style={{ height: 5, background: '#ddd6fe', borderRadius: 100, marginBottom: 10, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct}%`, background: V, borderRadius: 100, transition: 'width 0.4s ease' }} />
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {steps.map(s => (
          <span key={s.label} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            fontSize: 11.5, fontWeight: 600, padding: '2px 8px', borderRadius: 100,
            background: s.done ? SUCCESS_LIGHT : 'rgba(255,255,255,0.7)',
            color: s.done ? SUCCESS : MUTED,
            border: s.done ? `1px solid ${SUCCESS_BORDER}` : '1px solid #ddd6fe',
          }}>
            {s.done ? <CheckCircle size={10} /> : <div style={{ width: 10, height: 10, borderRadius: '50%', border: `1.5px solid ${MUTED}` }} />}
            {s.label}
          </span>
        ))}
      </div>
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function UserProfile() {
  const { user, logout, refreshUser } = useUser();
  const { t } = useTranslation();
  const [avatarCropOpen, setAvatarCropOpen] = useState(false);

  const handleAvatarSave = async (blob: Blob) => {
    const file = new File([blob], 'avatar.jpg', { type: 'image/jpeg' });
    await usersService.uploadAvatar(file);
    await refreshUser();
  };

  if (!user) return null;

  // ── Derived state (preserving original logic exactly) ─────────────────────
  const isSeller        = VerificationHelper.isSeller(user);
  const idStatus        = user.identityVerificationStatus ?? 'none';
  const bankStatus      = user.bankAccountStatus ?? 'none';
  const identitySubmitted = idStatus === 'pending' || idStatus === 'approved' || idStatus === 'rejected';
  const bankSubmitted     = bankStatus === 'pending' || bankStatus === 'approved';

  const becomeSellerCtaLabel = !isSeller
    ? t('becomeSeller.cta.becomeSeller')
    : !identitySubmitted
      ? t('becomeSeller.cta.verifySellerData')
      : t('becomeSeller.cta.completeVerification');

  const idVerifStatus: VerifStatus =
    idStatus === 'approved' ? 'verified' :
    idStatus === 'pending'  ? 'pending'  :
    idStatus === 'rejected' ? 'rejected' : 'none';

  const bankVerifStatus: VerifStatus =
    bankStatus === 'approved' ? 'verified' :
    bankStatus === 'pending'  ? 'pending'  : 'none';

  // ── Profile completion steps ───────────────────────────────────────────────
  const completionSteps = [
    { label: 'Email',     done: user.emailVerified   },
    { label: 'Teléfono',  done: user.phoneVerified   },
    { label: 'Identidad', done: idStatus === 'approved' },
    ...(isSeller ? [{ label: 'Cuenta bancaria', done: bankStatus === 'approved' }] : []),
  ];

  return (
    <div style={{ minHeight: '100vh', background: BG, ...S }}>
      <PageContentMaxWidth style={{ paddingTop: 24, paddingBottom: 80 }}>
        {/* Page title */}
        <PageHeader title={t('userProfile.title')} backTo={{ labelKey: 'common.back' }} />

        {/* ── PROFILE CARD ── */}
        <div style={{
          background: CARD, borderRadius: R_HERO,
          border: `1px solid ${BORDER}`,
          boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
          overflow: 'hidden', marginBottom: 16,
        }}>

          {/* Header strip — avatar + name + logout */}
          <div style={{ padding: '22px 20px 20px', borderBottom: `1px solid ${BORDER}` }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>

              {/* Avatar with edit overlay */}
              <div style={{ position: 'relative', flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={() => setAvatarCropOpen(true)}
                  aria-label={t('userProfile.changePhoto')}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, borderRadius: '50%', position: 'relative', display: 'block' }}
                  className="avatar-edit-btn"
                >
                  <UserAvatar
                    name={`${user.firstName} ${user.lastName}`}
                    src={user.pic?.src}
                    className="w-16 h-16 text-lg ring-2 ring-border"
                    style={{ width: 64, height: 64, borderRadius: '50%', display: 'block' }}
                  />
                  <div style={{
                    position: 'absolute', inset: 0, borderRadius: '50%',
                    background: 'rgba(0,0,0,0)', display: 'flex',
                    alignItems: 'center', justifyContent: 'center',
                    transition: 'background 0.15s',
                  }}
                    className="avatar-overlay"
                  >
                    <div style={{
                      width: 26, height: 26, borderRadius: '50%',
                      background: 'rgba(0,0,0,0.55)', display: 'flex',
                      alignItems: 'center', justifyContent: 'center',
                      opacity: 0,
                    }}
                      className="avatar-cam"
                    >
                      <Camera size={13} color="white" />
                    </div>
                  </div>
                </button>
              </div>

              {/* Name + meta */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 4 }}>
                  <h2 style={{ ...S, fontSize: 18, fontWeight: 800, color: DARK, letterSpacing: '-0.3px' }}>
                    {user.firstName} {user.lastName}
                  </h2>
                  {isSeller && <SellerBadge user={user} />}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: MUTED }}>
                  <Calendar size={13} style={{ flexShrink: 0 }} />
                  <span>
                    {t('userProfile.memberSince')}{' '}
                    {user.createdAt ? formatMonthYear(user.createdAt) : formatMonthYear('2025-01-01')}
                  </span>
                </div>
              </div>

              {/* Logout — subtle, not alarming */}
              <button
                type="button"
                onClick={logout}
                title={t('userProfile.logout')}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: 36, height: 36, borderRadius: R_BUTTON,
                  background: BG, border: `1px solid ${BORD2}`,
                  cursor: 'pointer', color: MUTED, transition: 'all 0.14s', flexShrink: 0,
                }}
                onMouseEnter={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = '#fef2f2';
                  (e.currentTarget as HTMLButtonElement).style.borderColor = '#fca5a5';
                  (e.currentTarget as HTMLButtonElement).style.color = '#dc2626';
                }}
                onMouseLeave={e => {
                  (e.currentTarget as HTMLButtonElement).style.background = BG;
                  (e.currentTarget as HTMLButtonElement).style.borderColor = BORD2;
                  (e.currentTarget as HTMLButtonElement).style.color = MUTED;
                }}
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>

          {/* Verification rows */}
          <div style={{ padding: '18px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>

            <ProfileCompletion steps={completionSteps} />

            {/* Email */}
            <VerifRow
              icon={<Mail size={15} />}
              label={t('userProfile.labelEmail')}
              value={user.email}
              status={user.emailVerified ? 'verified' : 'none'}
              verifyLabel={t('userProfile.verifyLink')}
              verifyTo="/register"
              verifyState={{ verifyEmail: true, email: user.email, from: '/user-profile' }}
              showVerify={!user.emailVerified}
            />

            {/* Phone */}
            <VerifRow
              icon={<Phone size={15} />}
              label={t('userProfile.labelPhone')}
              value={user.phone ?? t('userProfile.phoneNotSet')}
              status={user.phoneVerified ? 'verified' : 'none'}
              verifyLabel={t('userProfile.verifyLink')}
              verifyTo="/verify-user"
              verifyState={{ verifyPhone: true, returnTo: '/user-profile' }}
              showVerify={!user.phoneVerified}
            />

            {/* Identity */}
            <VerifRow
              icon={<Shield size={15} />}
              label={t('userProfile.labelIdentity')}
              value={
                idStatus === 'approved' ? 'Verificada'    :
                idStatus === 'pending'  ? 'En revisión'   :
                idStatus === 'rejected' ? 'Rechazada'     :
                'No verificada'
              }
              status={idVerifStatus}
              verifyLabel={t('userProfile.verifyLink')}
              verifyTo="/verify-user"
              verifyState={{ verifyIdentity: true, returnTo: '/user-profile' }}
              showVerify={idStatus === 'none' || idStatus === 'rejected'}
            />

            {/* Bank account — sellers only */}
            {isSeller && (
              <VerifRow
                icon={<CreditCard size={15} />}
                label={t('userProfile.labelBankAccount')}
                value={
                  user.bankAccountLast4 != null
                    ? `••• ${user.bankAccountLast4}`
                    : t('userProfile.bankAccountNotSet')
                }
                status={bankVerifStatus}
                verifyLabel={t('userProfile.verifyLink')}
                verifyTo="/verify-user"
                verifyState={{ verifyBankAccount: true, returnTo: '/user-profile' }}
                showVerify={bankStatus === 'none'}
              />
            )}
          </div>

          {/* Become seller CTA */}
          {(!isSeller || !bankSubmitted) && (
            <div style={{ padding: '0 16px 18px' }}>
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 16 }}>
                <div style={{
                  padding: '14px 16px', borderRadius: R_CARD,
                  background: isSeller ? VLIGHT : BG,
                  border: isSeller ? '1px solid #ddd6fe' : `1px solid ${BORDER}`,
                  marginBottom: 12,
                }}>
                  <p style={{ fontSize: 13, fontWeight: 600, color: isSeller ? V : DARK, marginBottom: 3 }}>
                    {isSeller ? 'Completá tu perfil de vendedor' : 'Empezá a vender en TicketsHub'}
                  </p>
                  <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.5 }}>
                    {isSeller
                      ? 'Verificá tu identidad y cuenta bancaria para recibir pagos.'
                      : 'Vendé tus entradas de forma segura. El proceso tarda menos de 5 minutos.'}
                  </p>
                </div>
                <Link to="/become-seller" style={{ textDecoration: 'none' }}>
                  <button
                    type="button"
                    style={{
                      width: '100%', padding: '13px', borderRadius: R_BUTTON,
                      background: V, border: 'none', color: 'white',
                      fontSize: 14, fontWeight: 700,
                      ...S,
                      cursor: 'pointer', display: 'flex',
                      alignItems: 'center', justifyContent: 'center', gap: 8,
                      boxShadow: '0 4px 18px rgba(109,40,217,0.28)',
                      transition: 'background 0.14s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = '#5b21b6')}
                    onMouseLeave={e => (e.currentTarget.style.background = V)}
                  >
                    {becomeSellerCtaLabel}
                    <ChevronRight size={16} />
                  </button>
                </Link>
              </div>
            </div>
          )}
        </div>

        {/* Logout — visible as text link below card on mobile for discoverability */}
        <div style={{ textAlign: 'center', paddingTop: 4 }}>
          <button
            type="button"
            onClick={logout}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 13, color: MUTED,
              ...S,
              textDecoration: 'underline', padding: '8px',
            }}
          >
            {t('userProfile.logout')}
          </button>
        </div>
      </PageContentMaxWidth>

      {/* Avatar crop modal — untouched */}
      <AvatarCropModal
        open={avatarCropOpen}
        onClose={() => setAvatarCropOpen(false)}
        onSave={handleAvatarSave}
        cropShape="round"
      />

      {/* Avatar hover styles — minimal CSS injection */}
      <style>{`
        .avatar-edit-btn:hover .avatar-cam { opacity: 1 !important; }
        .avatar-edit-btn:hover .avatar-overlay { background: rgba(0,0,0,0.3) !important; }
      `}</style>
    </div>
  );
}
