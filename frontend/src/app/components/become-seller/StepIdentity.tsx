import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { format, parse } from 'date-fns';
import { enUS, es as esLocale } from 'date-fns/locale';
import { Shield, Upload, X, Clock, CheckCircle, AlertCircle, Loader2, User, Calendar as CalendarIcon, ChevronDown } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { identityVerificationService } from '@/api/services';
import type { IdentityVerificationPublic } from '@/api/types/identity-verification';
import { Popover, PopoverContent, PopoverTrigger } from '@/app/components/ui/popover';
import { TicketsHubCalendar } from '@/app/components/TicketsHubCalendar';
import { DateOfBirthPicker, type DateOfBirthValue } from '@/app/components/DateOfBirthPicker';
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
  ERROR_DARK,
  ERROR,
  V_HOVER,
  S,
  R_HERO,
  R_BUTTON,
  R_INPUT,
} from '@/lib/design-tokens';

function parseIsoToDob(iso: string): DateOfBirthValue | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  const dt = new Date(year, month - 1, day);
  if (dt.getFullYear() !== year || dt.getMonth() !== month - 1 || dt.getDate() !== day) return null;
  return { year, month, day };
}

export interface StepIdentityProps {
  onComplete: () => void;
}

// ─── Reusable field ───────────────────────────────────────────────────────────
function Field({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <label style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, ...S }}>
        {icon} {label}
      </label>
      {children}
    </div>
  );
}

function TextInput({ value, onChange, placeholder, type = 'text', inputMode, pattern, required, hint }: {
  value: string; onChange: (v: string) => void; placeholder?: string;
  type?: string; inputMode?: React.HTMLAttributes<HTMLInputElement>['inputMode'];
  pattern?: string; required?: boolean; hint?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <>
      <input
        type={type}
        inputMode={inputMode}
        pattern={pattern}
        value={value}
        onChange={e => onChange(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        required={required}
        style={{
          width: '100%', padding: '12px 14px',
          border: `1.5px solid ${focused ? V : BORD2}`,
          borderRadius: R_INPUT, fontSize: 14, color: DARK,
          background: CARD, outline: 'none',
          boxShadow: focused ? '0 0 0 3px rgba(109,40,217,0.1)' : 'none',
          transition: 'border-color 0.14s, box-shadow 0.14s', ...S,
        }}
      />
      {hint && <p style={{ fontSize: 12, color: HINT, marginTop: 5, lineHeight: 1.4, ...S }}>{hint}</p>}
    </>
  );
}

// ─── Upload area ──────────────────────────────────────────────────────────────
function UploadArea({ preview, label, sublabel, onFileSelect, onRemove, inputRef }: {
  preview: string | null; label: string; sublabel?: string;
  onFileSelect: (f: File | null) => void;
  onRemove: () => void;
  inputRef: React.RefObject<HTMLInputElement>;
}) {
  const [hovered, setHovered] = useState(false);
  return (
    <div>
      {preview ? (
        <div style={{ position: 'relative' }}>
          <img src={preview} alt="" style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: R_INPUT, border: `1px solid ${BORDER}`, display: 'block' }} />
          <button
            type="button"
            onClick={onRemove}
            style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: DESTRUCTIVE, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
          >
            <X size={13} color="white" />
          </button>
        </div>
      ) : (
        <label
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          style={{
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            height: 120, borderRadius: R_INPUT, cursor: 'pointer', transition: 'all 0.14s',
            border: `2px dashed ${hovered ? V : BORD2}`,
            background: hovered ? VLIGHT : BG,
          }}
        >
          <Upload size={20} style={{ color: hovered ? V : HINT, marginBottom: 7 }} />
          <p style={{ fontSize: 13.5, fontWeight: 600, color: hovered ? V : DARK, marginBottom: 2, ...S }}>{label}</p>
          {sublabel && <p style={{ fontSize: 11.5, color: HINT, ...S }}>{sublabel}</p>}
          <input
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png"
            style={{ display: 'none' }}
            onChange={e => onFileSelect(e.target.files?.[0] ?? null)}
          />
        </label>
      )}
    </div>
  );
}

// ─── Primary button ───────────────────────────────────────────────────────────
function PrimaryBtn({ label, loading, loadingLabel, disabled, onClick, icon }: {
  label: string; loading?: boolean; loadingLabel?: string; disabled?: boolean;
  onClick?: () => void; icon?: React.ReactNode;
}) {
  const [hovered, setHovered] = useState(false);
  const isDisabled = disabled || loading;
  return (
    <button
      type={onClick ? 'button' : 'submit'}
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        width: '100%', padding: '13px', borderRadius: R_BUTTON, border: 'none',
        background: isDisabled ? BORD2 : hovered ? V_HOVER : V,
        color: 'white', fontSize: 14.5, fontWeight: 700,
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        boxShadow: isDisabled ? 'none' : '0 4px 18px rgba(109,40,217,0.28)',
        transition: 'all 0.15s',
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, ...S,
      }}
    >
      {loading ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : icon}
      {loading ? (loadingLabel ?? label) : label}
    </button>
  );
}

// ─── Status card (pending / approved) ────────────────────────────────────────
function StatusCard({ type, title, subtitle, onContinue, continueLabel }: {
  type: 'pending' | 'approved';
  title: string; subtitle: string;
  onContinue?: () => void; continueLabel?: string;
}) {
  const isPending  = type === 'pending';
  const iconBg     = isPending ? ABG     : GLIGHT;
  const iconColor  = isPending ? AMBER   : GREEN;
  const borderColor= isPending ? ABORD   : GBORD;
  const Icon       = isPending ? Clock   : CheckCircle;

  return (
    <div style={{ background: CARD, borderRadius: R_HERO, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>
      <div style={{ background: iconBg, borderBottom: `1px solid ${borderColor}`, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ width: 44, height: 44, borderRadius: R_BUTTON, background: iconBg, border: `1.5px solid ${borderColor}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Icon size={22} style={{ color: iconColor }} />
        </div>
        <div>
          <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 3, ...S }}>{title}</p>
          <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, ...S }}>{subtitle}</p>
        </div>
      </div>
      {onContinue && (
        <div style={{ padding: '16px 20px' }}>
          <PrimaryBtn label={continueLabel ?? 'Continuar'} onClick={onContinue} />
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function StepIdentity({ onComplete }: StepIdentityProps) {
  const { t, i18n } = useTranslation();
  const { user, refreshUser } = useUser();

  const [loading,    setLoading]    = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [dob, setDob] = useState<{ day: number; month: number; year: number } | null>(null);

  const [existingVerification, setExistingVerification] = useState<IdentityVerificationPublic | null>(null);

  const [identityData, setIdentityData] = useState({
    legalFirstName:    user?.firstName || '',
    legalLastName:     user?.lastName  || '',
    dateOfBirth:       '',
    governmentIdNumber:'',
  });

  const [documentFront,         setDocumentFront]         = useState<File | null>(null);
  const [documentBack,          setDocumentBack]          = useState<File | null>(null);
  const [documentSelfie,        setDocumentSelfie]        = useState<File | null>(null);
  const [documentFrontPreview,  setDocumentFrontPreview]  = useState<string | null>(null);
  const [documentBackPreview,   setDocumentBackPreview]   = useState<string | null>(null);
  const [documentSelfiePreview, setDocumentSelfiePreview] = useState<string | null>(null);

  const frontInputRef  = useRef<HTMLInputElement>(null);
  const backInputRef   = useRef<HTMLInputElement>(null);
  const selfieInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (user?.firstName) setIdentityData(p => ({ ...p, legalFirstName: user.firstName }));
    if (user?.lastName)  setIdentityData(p => ({ ...p, legalLastName:  user.lastName  }));
  }, [user?.firstName, user?.lastName]);

  useEffect(() => {
    let cancelled = false;
    identityVerificationService.getMyVerification()
      .then(res  => { if (!cancelled) setExistingVerification(res.verification); })
      .catch(err => { if (!cancelled) console.error('Failed to load verification:', err); })
      .finally(()=> { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, []);

  const handleFileSelect = (file: File | null, type: 'front' | 'back' | 'selfie') => {
    if (!file) return;
    if (!['image/jpeg', 'image/jpg', 'image/png'].includes(file.type)) {
      setError(t('verification.invalidFileType')); return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError(t('verification.fileTooLarge')); return;
    }
    setError(null);
    const url = URL.createObjectURL(file);
    if (type === 'front') {
      if (documentFrontPreview) URL.revokeObjectURL(documentFrontPreview);
      setDocumentFront(file); setDocumentFrontPreview(url);
    } else if (type === 'back') {
      if (documentBackPreview) URL.revokeObjectURL(documentBackPreview);
      setDocumentBack(file); setDocumentBackPreview(url);
    } else {
      if (documentSelfiePreview) URL.revokeObjectURL(documentSelfiePreview);
      setDocumentSelfie(file); setDocumentSelfiePreview(url);
    }
  };

  const removeFile = (type: 'front' | 'back' | 'selfie') => {
    if (type === 'front') {
      if (documentFrontPreview) URL.revokeObjectURL(documentFrontPreview);
      setDocumentFront(null); setDocumentFrontPreview(null);
      if (frontInputRef.current) frontInputRef.current.value = '';
    } else if (type === 'back') {
      if (documentBackPreview) URL.revokeObjectURL(documentBackPreview);
      setDocumentBack(null); setDocumentBackPreview(null);
      if (backInputRef.current) backInputRef.current.value = '';
    } else {
      if (documentSelfiePreview) URL.revokeObjectURL(documentSelfiePreview);
      setDocumentSelfie(null); setDocumentSelfiePreview(null);
      if (selfieInputRef.current) selfieInputRef.current.value = '';
    }
  };

  const dfLocale = i18n.language?.toLowerCase().startsWith('es') ? esLocale : enUS;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    const issues: string[] = [];
    if (!identityData.legalFirstName.trim()) issues.push(t('verification.errorMissingFirstName'));
    if (!identityData.legalLastName.trim()) issues.push(t('verification.errorMissingLastName'));
    if (!identityData.dateOfBirth.trim()) issues.push(t('verification.errorMissingDateOfBirth'));
    if (!identityData.governmentIdNumber.trim()) issues.push(t('verification.errorMissingGovernmentId'));
    if (!documentFront) issues.push(t('verification.errorMissingDocumentFront'));
    if (!documentBack) issues.push(t('verification.errorMissingDocumentBack'));
    if (!documentSelfie) issues.push(t('verification.errorMissingSelfie'));
    setValidationIssues(issues);
    if (issues.length > 0) return;
    try {
      setSubmitting(true);
      const response = await identityVerificationService.submitVerification({
        legalFirstName: identityData.legalFirstName,
        legalLastName:  identityData.legalLastName,
        dateOfBirth:    identityData.dateOfBirth,
        governmentIdNumber: identityData.governmentIdNumber,
        documentFront,
        documentBack,
        selfie: documentSelfie,
      });
      setExistingVerification(response.verification);
      await refreshUser();
      onComplete();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : t('verification.submitFailed'));
    } finally {
      setSubmitting(false);
    }
  };

  const dobDate = identityData.dateOfBirth
    ? parse(identityData.dateOfBirth, 'yyyy-MM-dd', new Date())
    : undefined;
  const dobValid = dobDate && !Number.isNaN(dobDate.getTime());

  // ── Loading ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ background: CARD, borderRadius: R_HERO, border: `1px solid ${BORDER}`, padding: '40px', display: 'flex', justifyContent: 'center' }}>
        <Loader2 size={28} style={{ color: V, animation: 'spin 0.7s linear infinite' }} />
        <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
      </div>
    );
  }

  // ── Pending ────────────────────────────────────────────────────────────────
  if (existingVerification?.status === 'pending') {
    return (
      <StatusCard
        type="pending"
        title={t('becomeSeller.step3.identityUnderReview')}
        subtitle={t('becomeSeller.step3.identityUnderReviewMessage')}
      />
    );
  }

  // ── Approved ───────────────────────────────────────────────────────────────
  if (existingVerification?.status === 'approved') {
    return (
      <StatusCard
        type="approved"
        title={t('verification.approvedTitle')}
        subtitle={t('verification.approvedMessage')}
        onContinue={onComplete}
        continueLabel={t('becomeSeller.step3.next')}
      />
    );
  }

  // ── Form (new submission or rejected) ────────────────────────────────────
  return (
    <>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      <div style={{ background: CARD, borderRadius: R_HERO, border: `1px solid ${BORDER}`, boxShadow: '0 2px 12px rgba(0,0,0,0.05)', overflow: 'hidden' }}>

        {/* Header */}
        <div style={{ background: VLIGHT, borderBottom: `1px solid ${VL_BORDER}`, padding: '18px 20px', display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: R_BUTTON, background: V, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <Shield size={20} color="white" />
          </div>
          <div>
            <p style={{ fontSize: 16, fontWeight: 700, color: DARK, marginBottom: 3, ...S }}>{t('becomeSeller.step3.title')}</p>
            <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, ...S }}>{t('becomeSeller.step3.subtitle')}</p>
          </div>
        </div>

        <div style={{ padding: '20px' }}>

          {/* Rejection banner */}
          {existingVerification?.status === 'rejected' && (
            <div style={{ padding: '12px 14px', borderRadius: R_INPUT, marginBottom: 20, background: ERROR_BG, border: `1px solid ${BADGE_DEMAND_BORDER}`, display: 'flex', gap: 10 }}>
              <AlertCircle size={16} style={{ color: DESTRUCTIVE, flexShrink: 0, marginTop: 1 }} />
              <div>
                <p style={{ fontSize: 13.5, fontWeight: 700, color: DESTRUCTIVE, marginBottom: 3, ...S }}>Verificación rechazada</p>
                <p style={{ fontSize: 13, color: ERROR_DARK, lineHeight: 1.5, ...S }}>
                  {existingVerification.rejectionReason ?? t('verification.rejectedMessage')}
                </p>
              </div>
            </div>
          )}

          {error && (
            <div style={{ padding: '11px 14px', borderRadius: R_INPUT, marginBottom: 16, background: ERROR_BG, border: `1px solid ${BADGE_DEMAND_BORDER}`, fontSize: 13.5, color: DESTRUCTIVE, lineHeight: 1.5, ...S }}>
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* Name row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <Field label={t('verification.legalFirstName')} icon={<User size={13} />}>
                <TextInput
                  value={identityData.legalFirstName}
                  onChange={v => setIdentityData(p => ({ ...p, legalFirstName: v }))}
                  required
                />
              </Field>
              <Field label={t('verification.legalLastName')} icon={<User size={13} />}>
                <TextInput
                  value={identityData.legalLastName}
                  onChange={v => setIdentityData(p => ({ ...p, legalLastName: v }))}
                  required
                />
              </Field>
            </div>


            <DateOfBirthPicker
              label={t('verification.dateOfBirth')}
              value={parseIsoToDob(identityData.dateOfBirth)}
              onChange={v => {
                const iso = `${v.year}-${String(v.month).padStart(2, '0')}-${String(v.day).padStart(2, '0')}`;
                setIdentityData(p => ({ ...p, dateOfBirth: iso }));
              }}
              error={
                validationIssues.includes(t('verification.errorMissingDateOfBirth'))
                  ? t('verification.errorMissingDateOfBirth')
                  : undefined
              }
              hint={t('verification.dateOfBirthPrivacyHint')}
            />

            {/* DNI number */}
            <Field label={t('verification.governmentId')} icon={<Shield size={13} />}>
              <TextInput
                value={identityData.governmentIdNumber}
                onChange={v => setIdentityData(p => ({ ...p, governmentIdNumber: v.replace(/\D/g, '') }))}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder={t('verification.governmentIdPlaceholder')}
                required
                hint={t('verification.governmentIdHint')}
              />
            </Field>

            {/* Photo uploads */}
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: DARK, marginBottom: 4, ...S }}>{t('verification.documentPhotos')}</p>
              <p style={{ fontSize: 12.5, color: MUTED, marginBottom: 14, lineHeight: 1.5, ...S }}>{t('verification.documentPhotosHint')}</p>

              {/* Front + Back in 2 cols */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
                <div>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, ...S }}>{t('verification.documentFront')} *</p>
                  <UploadArea
                    preview={documentFrontPreview}
                    label={t('verification.uploadFront')}
                    sublabel="JPG, PNG"
                    onFileSelect={f => handleFileSelect(f, 'front')}
                    onRemove={() => removeFile('front')}
                    inputRef={frontInputRef}
                  />
                </div>
                <div>
                  <p style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8, ...S }}>{t('verification.documentBack')} *</p>
                  <UploadArea
                    preview={documentBackPreview}
                    label={t('verification.uploadBack')}
                    sublabel="JPG, PNG"
                    onFileSelect={f => handleFileSelect(f, 'back')}
                    onRemove={() => removeFile('back')}
                    inputRef={backInputRef}
                  />
                </div>
              </div>

              {/* Selfie full width */}
              <div>
                <p style={{ fontSize: 11.5, fontWeight: 700, color: MUTED, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4, ...S }}>{t('verification.selfieTitle')} *</p>
                <p style={{ fontSize: 12, color: HINT, marginBottom: 8, lineHeight: 1.4, ...S }}>{t('verification.selfieHint')}</p>
                <UploadArea
                  preview={documentSelfiePreview}
                  label={t('verification.uploadSelfie')}
                  sublabel="Foto tuya sosteniendo el DNI"
                  onFileSelect={f => handleFileSelect(f, 'selfie')}
                  onRemove={() => removeFile('selfie')}
                  inputRef={selfieInputRef}
                />
              </div>
            </div>

            {(validationIssues.length > 0 || submitError) && (
              <div
                role="alert"
                style={{
                  padding: '14px 16px',
                  borderRadius: R_INPUT,
                  background: ERROR_BG,
                  border: `1px solid ${BADGE_DEMAND_BORDER}`,
                  ...S,
                }}
              >
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  <AlertCircle size={18} style={{ color: DESTRUCTIVE, flexShrink: 0, marginTop: 1 }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {validationIssues.length > 0 && (
                      <>
                        <p
                          style={{
                            fontSize: 13,
                            fontWeight: 700,
                            color: ERROR_DARK,
                            marginBottom: 8,
                            lineHeight: 1.4,
                          }}
                        >
                          {t('verification.validationFixBelow')}
                        </p>
                        <ul
                          style={{
                            margin: 0,
                            paddingLeft: 18,
                            fontSize: 13,
                            color: ERROR,
                            lineHeight: 1.55,
                          }}
                        >
                          {validationIssues.map((msg, i) => (
                            <li key={`${i}-${msg}`} style={{ marginBottom: 4 }}>
                              {msg}
                            </li>
                          ))}
                        </ul>
                      </>
                    )}
                    {submitError && (
                      <p
                        style={{
                          fontSize: 13.5,
                          color: DESTRUCTIVE,
                          lineHeight: 1.5,
                          marginTop: validationIssues.length > 0 ? 10 : 0,
                          marginBottom: 0,
                        }}
                      >
                        {submitError}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            <PrimaryBtn
              label={t('verification.submitVerification')}
              loading={submitting}
              loadingLabel={t('verification.submitting')}
              icon={<Shield size={15} />}
            />
          </form>
        </div>
      </div>
    </>
  );
}
