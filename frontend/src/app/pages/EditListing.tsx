import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Calendar, Ticket, Save, Eye, EyeOff, Loader2, Trash2, MapPin, ArrowLeft, AlertTriangle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { ticketsService } from '../../api/services/tickets.service';
import type { ApiError } from '../../api/client';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorMessage } from '../components/ErrorMessage';
import type { TicketListingWithEvent } from '../../api/types';
import { TicketUnitStatus } from '../../api/types';
import { formatDateTime } from '@/lib/format-date';
import { formatCurrencyFromUnitsDisplay } from '@/lib/format-currency';
import { useIsMobile } from '../components/ui/use-mobile';
import { Switch } from '@/app/components/ui/switch';
import { Label } from '@/app/components/ui/label';
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
  R_BUTTON,
  R_INPUT,
} from '@/lib/design-tokens';

const DS = { ...E, fontWeight: 400 };

export function EditListing() {
  const { t } = useTranslation();
  const { listingId } = useParams<{ listingId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();

  const [listing,            setListing]            = useState<TicketListingWithEvent | null>(null);
  const [isLoading,          setIsLoading]          = useState(true);
  const [error,              setError]              = useState<string | null>(null);
  const [price,              setPrice]              = useState('');
  const [bestOfferEnabled,   setBestOfferEnabled]   = useState(false);
  const [bestOfferMinPrice,  setBestOfferMinPrice]  = useState('');
  const [isSaving,           setIsSaving]           = useState(false);
  const [isCancelling,       setIsCancelling]       = useState(false);
  const [isVersionConflict,  setIsVersionConflict]  = useState(false);
  // Inline cancel confirmation — replaces browser confirm()
  const [showCancelConfirm,  setShowCancelConfirm]  = useState(false);

  const loadListing = (id: string) => {
    setIsLoading(true); setError(null); setIsVersionConflict(false);
    ticketsService.getListing(id)
      .then(data => {
        setListing(data);
        setPrice(Math.floor(data.pricePerTicket.amount / 100).toString());
        setBestOfferEnabled(data.bestOfferConfig?.enabled ?? false);
        setBestOfferMinPrice(
          data.bestOfferConfig?.minimumPrice != null
            ? Math.floor(data.bestOfferConfig.minimumPrice.amount / 100).toString()
            : '',
        );
      })
      .catch(() => setError(t('editListing.errorLoading')))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    if (!listingId) return;
    loadListing(listingId);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listingId, t]);

  const handleSave = async () => {
    if (!listingId || !listing) return;
    setIsSaving(true); setError(null);
    try {
      const currency = listing.pricePerTicket.currency || 'ARS';
      await ticketsService.updateListing(listingId, {
        pricePerTicket: {
          amount: Math.round(parseInt(price, 10) * 100),
          currency,
        },
        bestOfferConfig: bestOfferEnabled
          ? {
              enabled: true,
              minimumPrice: {
                amount: Math.round(parseInt(bestOfferMinPrice || '0', 10) * 100),
                currency,
              },
            }
          : null,
      });
      navigate('/seller-dashboard');
    } catch (err) {
      const apiErr = err as ApiError;
      if (apiErr?.statusCode === 409 && apiErr?.code === 'OPTIMISTIC_LOCK_CONFLICT') {
        setIsVersionConflict(true);
        setError(t('editListing.versionConflict'));
      } else {
        setError(apiErr?.message ?? t('editListing.saveFailed'));
      }
    } finally { setIsSaving(false); }
  };

  const handleCancelListing = async () => {
    if (!listingId) return;
    setIsCancelling(true); setError(null);
    try {
      await ticketsService.cancelListing(listingId);
      navigate('/seller-dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : t('editListing.cancelFailed'));
      setShowCancelConfirm(false);
    } finally { setIsCancelling(false); }
  };

  if (isLoading) return <LoadingSpinner size="lg" text={t('common.loading')} fullScreen />;
  if (!listing)  return <ErrorMessage title={error || t('editListing.listingNotFound')} message={t('editListing.errorLoading')} fullScreen />;

  const priceValue     = parseInt(price, 10) || 0;
  const isValidPrice   = priceValue > 0;
  const minOfferValue  = parseInt(bestOfferMinPrice, 10) || 0;
  const isValidMinOffer = !bestOfferEnabled || (minOfferValue > 0 && minOfferValue <= priceValue);
  const canSave        = isValidPrice && isValidMinOffer && !isSaving;
  const isActive       = listing.status === 'Active';
  const availableUnits = listing.ticketUnits.filter(u => u.status === TicketUnitStatus.Available);
  const numberedSeats  = listing.ticketUnits.filter(u => u.seat).map(u => `${u.seat!.row}-${u.seat!.seatNumber}`);
  const currency       = listing.pricePerTicket.currency || 'ARS';

  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      <style>{`
        @keyframes spin{to{transform:rotate(360deg)}}
        .th-input{width:100%;padding:11px 14px;border-radius:10px;border:1.5px solid ${BORDER};background:${CARD};font-size:15px;color:${DARK};outline:none;transition:border-color 0.15s;box-sizing:border-box;font-family:'Plus Jakarta Sans',sans-serif}
        .th-input:focus{border-color:${V};box-shadow:0 0 0 3px ${VLIGHT}}
        .th-input:disabled{background:${BG};color:${HINT};cursor:not-allowed}
        .th-input[type=number]::-webkit-inner-spin-button{opacity:1}
      `}</style>

      <div style={{ maxWidth: 880, margin: '0 auto', padding: 'clamp(20px,4vw,40px) 16px' }}>

        {/* Back + heading */}
        <div style={{ marginBottom: 24 }}>
          <Link
            to="/seller-dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 13.5, fontWeight: 600, color: MUTED, textDecoration: 'none', marginBottom: 14, ...S }}
          >
            <ArrowLeft size={14} /> {t('editListing.backToSellerDashboard')}
          </Link>
          <h1 style={{ ...DS, fontSize: 'clamp(22px,3vw,28px)', color: DARK }}>{t('editListing.title')}</h1>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: R_INPUT, padding: '12px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <AlertTriangle size={15} style={{ color: '#dc2626', flexShrink: 0 }} />
            <p style={{ flex: 1, fontSize: 13.5, color: '#dc2626', ...S }}>{error}</p>
            {isVersionConflict && listingId && (
              <button
                onClick={() => loadListing(listingId)}
                style={{
                  flexShrink: 0, fontSize: 13, fontWeight: 700, color: '#dc2626',
                  background: 'transparent', border: '1.5px solid #fca5a5',
                  borderRadius: R_BUTTON, padding: '5px 12px', cursor: 'pointer', ...S,
                }}
              >
                {t('editListing.reloadListing')}
              </button>
            )}
          </div>
        )}

        {/* Disclaimer */}
        <div style={{ background: VLIGHT, border: `1px solid ${VL_BORDER}`, borderRadius: R_INPUT, padding: '12px 16px', marginBottom: 22, display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <div style={{ width: 20, height: 20, borderRadius: '50%', background: V, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>i</span>
          </div>
          <p style={{ fontSize: 13.5, color: V, lineHeight: 1.55, ...S }}>
            <strong>{t('editListing.importantNote')}</strong>{' '}{t('editListing.changesDisclaimer')}
          </p>
        </div>

        {/* Two-column grid */}
        <div style={{
          display: isMobile ? 'flex' : 'grid',
          flexDirection: 'column',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
          alignItems: 'start',
        }}>

          {/* ── Left: read-only context ──────────────────────────────── */}
          <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
            {/* Banner */}
            <div style={{ height: 180, background: VLIGHT, position: 'relative', overflow: 'hidden' }}>
              {listing.bannerUrls?.rectangle || listing.bannerUrls?.square ? (
                <img
                  src={listing.bannerUrls.rectangle ?? listing.bannerUrls.square!}
                  alt=""
                  style={{ width: '100%', height: '100%', objectFit: 'cover', position: 'absolute', inset: 0 }}
                />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <Ticket size={48} style={{ color: VL_BORDER }} />
                </div>
              )}
              {/* Status pill over image */}
              <div style={{ position: 'absolute', top: 12, right: 12 }}>
                <span style={{
                  display: 'inline-flex', alignItems: 'center', gap: 5,
                  padding: '4px 10px', borderRadius: 100, fontSize: 11.5, fontWeight: 700,
                  background: isActive ? 'rgba(240,253,244,0.92)' : 'rgba(243,243,240,0.92)',
                  color: isActive ? GREEN : MUTED,
                  backdropFilter: 'blur(6px)',
                  ...S,
                }}>
                  {isActive ? <Eye size={12} /> : <EyeOff size={12} />}
                  {isActive ? t('editListing.active') : listing.status}
                </span>
              </div>
            </div>

            {/* Info */}
            <div style={{ padding: '18px 20px' }}>
              <h2 style={{ ...DS, fontSize: 20, color: DARK, marginBottom: 16 }}>{listing.eventName}</h2>

              <p style={{ fontSize: 10.5, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: HINT, marginBottom: 12, ...S }}>
                {t('editListing.nonEditableInfo', { defaultValue: 'No modificable' })}
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {/* Sector */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Ticket size={14} style={{ color: MUTED, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11.5, color: HINT, marginBottom: 1, ...S }}>{t('editListing.ticketType')}</p>
                    <p style={{ fontSize: 13.5, fontWeight: 700, color: DARK, ...S }}>
                      {listing.sectionName || listing.type}
                    </p>
                  </div>
                </div>

                {/* Date */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <Calendar size={14} style={{ color: MUTED, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11.5, color: HINT, marginBottom: 1, ...S }}>{t('editListing.eventDateTime')}</p>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK, ...S }}>
                      {formatDateTime(listing.eventDate)}
                    </p>
                  </div>
                </div>

                {/* Venue */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <MapPin size={14} style={{ color: MUTED, flexShrink: 0 }} />
                  <div>
                    <p style={{ fontSize: 11.5, color: HINT, marginBottom: 1, ...S }}>{t('editListing.venue')}</p>
                    <p style={{ fontSize: 13.5, fontWeight: 600, color: DARK, ...S }}>{listing.venue}</p>
                  </div>
                </div>

                {/* Quantity */}
                <div style={{ padding: '10px 12px', background: BG, borderRadius: R_INPUT }}>
                  <p style={{ fontSize: 13, color: DARK, fontWeight: 600, ...S }}>
                    {t('editListing.quantityAvailable', {
                      available: availableUnits.length,
                      total: listing.ticketUnits.length,
                    })}
                    {listing.sellTogether && (
                      <span style={{ color: MUTED, fontWeight: 400 }}> · {t('editListing.soldTogether')}</span>
                    )}
                  </p>
                  {numberedSeats.length > 0 && (
                    <p style={{ fontSize: 12.5, color: MUTED, marginTop: 3, ...S }}>
                      {numberedSeats.join(', ')}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* ── Right: editable fields + actions ────────────────────── */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>

            {/* Edit form */}
            <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, padding: '20px 22px' }}>
              <p style={{ fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: HINT, marginBottom: 18, ...S }}>
                {t('editListing.editableFields')}
              </p>

              {/* Price */}
              <div style={{ marginBottom: 20 }}>
                <label style={{ display: 'block', fontSize: 13.5, fontWeight: 600, color: DARK, marginBottom: 6, ...S }}>
                  {t('editListing.listingPrice')} <span style={{ color: '#dc2626' }}>*</span>
                </label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 15, fontWeight: 700, color: MUTED, pointerEvents: 'none' }}>
                    $
                  </span>
                  <input
                    type="number"
                    value={price}
                    onChange={e => setPrice(e.target.value)}
                    min="0"
                    step="1"
                    className="th-input"
                    style={{ paddingLeft: 28 }}
                    placeholder="0"
                    disabled={!isActive}
                  />
                </div>
                {!isValidPrice && price !== '' && (
                  <p style={{ fontSize: 12.5, color: '#dc2626', marginTop: 4, ...S }}>{t('editListing.enterValidPrice')}</p>
                )}
                <p style={{ fontSize: 12.5, color: HINT, marginTop: 5, ...S }}>{t('editListing.priceDescription')}</p>
              </div>

              {/* Best offer toggle — same pattern as StepPriceAndConditions */}
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 18 }}>
                <div style={{
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  background: BG, borderRadius: R_INPUT, padding: '12px 14px',
                }}>
                  <Switch
                    id="edit-best-offer"
                    checked={bestOfferEnabled}
                    onCheckedChange={setBestOfferEnabled}
                    disabled={!isActive}
                  />
                  <div style={{ flex: 1 }}>
                    <Label
                      htmlFor="edit-best-offer"
                      style={{ fontSize: 14, fontWeight: 600, color: DARK, cursor: isActive ? 'pointer' : 'not-allowed', display: 'block', marginBottom: 3, ...S }}
                    >
                      {t('editListing.allowOffers')}
                    </Label>
                    <p style={{ fontSize: 13, color: MUTED, lineHeight: 1.5, ...S }}>
                      {t('editListing.allowOffersDescription')}
                    </p>
                    {bestOfferEnabled && (
                      <div style={{ marginTop: 12 }}>
                        <label style={{ display: 'block', fontSize: 13, color: MUTED, marginBottom: 5, ...S }}>
                          {t('editListing.minimumOfferPrice')}
                        </label>
                        <input
                          type="number"
                          value={bestOfferMinPrice}
                          onChange={e => setBestOfferMinPrice(e.target.value)}
                          min="0"
                          max={priceValue || undefined}
                          step="1"
                          className="th-input"
                          placeholder="0"
                          disabled={!isActive}
                          style={{ maxWidth: 200 }}
                        />
                        <p style={{ fontSize: 12, color: HINT, marginTop: 4, ...S }}>
                          {t('editListing.minimumOfferPriceHint')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Actions card */}
            <div style={{ background: CARD, borderRadius: 18, border: `1px solid ${BORDER}`, padding: '20px 22px' }}>
              {isActive ? (
                <>
                  {/* Save */}
                  <button
                    onClick={handleSave}
                    disabled={!canSave}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: R_BUTTON,
                      background: canSave ? V : VL_BORDER,
                      color: canSave ? 'white' : '#a78bfa',
                      border: 'none', fontSize: 14, fontWeight: 700,
                      cursor: canSave ? 'pointer' : 'not-allowed',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                      boxShadow: canSave ? '0 2px 12px rgba(105,45,212,0.22)' : 'none',
                      transition: 'background 0.14s',
                      ...S,
                    }}
                  >
                    {isSaving
                      ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} />
                      : <Save size={16} />
                    }
                    {isSaving ? t('editListing.saving') : t('editListing.saveChanges')}
                  </button>

                  {/* Cancel listing — inline confirmation, no browser confirm() */}
                  <div style={{ marginTop: 14, paddingTop: 14, borderTop: `1px solid ${BORDER}` }}>
                    {!showCancelConfirm ? (
                      <button
                        onClick={() => setShowCancelConfirm(true)}
                        disabled={isCancelling}
                        style={{
                          width: '100%', padding: '11px 0', borderRadius: R_BUTTON,
                          background: 'transparent', border: '1.5px solid #fca5a5',
                          color: '#dc2626', fontSize: 14, fontWeight: 600,
                          cursor: 'pointer',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
                          transition: 'background 0.14s',
                          ...S,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.background = '#fef2f2')}
                        onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                      >
                        <Trash2 size={15} />
                        {t('editListing.cancelListing')}
                      </button>
                    ) : (
                      /* Inline confirmation panel */
                      <div style={{
                        background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: R_INPUT,
                        padding: '14px 16px',
                      }}>
                        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 9, marginBottom: 14 }}>
                          <AlertTriangle size={16} style={{ color: '#dc2626', flexShrink: 0, marginTop: 1 }} />
                          <div>
                            <p style={{ fontSize: 13.5, fontWeight: 700, color: '#991b1b', marginBottom: 2, ...S }}>
                              {t('editListing.cancelListingConfirmTitle', { defaultValue: '¿Cancelar publicación?' })}
                            </p>
                            <p style={{ fontSize: 13, color: '#dc2626', lineHeight: 1.5, ...S }}>
                              {t('editListing.cancelListingConfirm')}
                            </p>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={handleCancelListing}
                            disabled={isCancelling}
                            style={{
                              flex: 1, padding: '9px 0', borderRadius: R_BUTTON, border: 'none',
                              background: '#dc2626', color: 'white',
                              fontSize: 13.5, fontWeight: 700,
                              cursor: isCancelling ? 'not-allowed' : 'pointer',
                              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                              ...S,
                            }}
                          >
                            {isCancelling
                              ? <Loader2 size={14} style={{ animation: 'spin 0.7s linear infinite' }} />
                              : <Trash2 size={14} />
                            }
                            {isCancelling ? t('common.loading') : t('editListing.confirmCancel', { defaultValue: 'Sí, cancelar' })}
                          </button>
                          <button
                            onClick={() => setShowCancelConfirm(false)}
                            disabled={isCancelling}
                            style={{
                              flex: 1, padding: '9px 0', borderRadius: R_BUTTON,
                              border: '1px solid #fca5a5', background: 'transparent',
                              color: '#dc2626', fontSize: 13.5, fontWeight: 600,
                              cursor: 'pointer', ...S,
                            }}
                          >
                            {t('editListing.keepListing', { defaultValue: 'No, volver' })}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                /* Inactive listing state */
                <div style={{ textAlign: 'center', padding: '20px 0' }}>
                  <div style={{ width: 44, height: 44, borderRadius: '50%', background: BG, display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 10px' }}>
                    <EyeOff size={20} style={{ color: BORD2 }} />
                  </div>
                  <p style={{ fontSize: 14, color: MUTED, lineHeight: 1.55, ...S }}>
                    {t('editListing.listingInactive')}
                  </p>
                </div>
              )}
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
