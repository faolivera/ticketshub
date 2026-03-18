import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { Ticket, Loader2, Calendar, X, Clock, MapPin, Tag } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/contexts/UserContext';
import { VerificationHelper, SellerTier } from '@/lib/verification';
import { useIsMobile } from '@/app/components/ui/use-mobile';
import { EmptyState } from '@/app/components/EmptyState';
import { SellerRiskRestrictionDisclaimer } from '@/app/components/SellerRiskRestrictionDisclaimer';
import { eventsService } from '@/api/services/events.service';
import { ticketsService } from '@/api/services/tickets.service';
import { bffService } from '@/api/services/bff.service';
import { promotionsService } from '@/api/services/promotions.service';
import { formatDateTime } from '@/lib/format-date';
import { formatCurrencyFromUnits } from '@/lib/format-currency';
import {
  WizardProgress, WizardFooter,
  StepChooseEvent, StepChooseDate, StepZoneAndSeats,
  StepPriceAndConditions, StepDeliveryMethod, StepReviewAndPublish,
  defaultWizardFormState, WIZARD_TOTAL_STEPS,
  type WizardStepIndex, type WizardFormState,
} from '@/app/components/sell-listing-wizard';
import type { PublicListEventItem, EventDate, EventSection } from '@/api/types';
import { SeatingType } from '@/api/types';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { cn } from '@/app/components/ui/utils';
import type { CurrencyCode } from '@/api/types';
import { TicketType, DeliveryMethod } from '@/api/types';
import type { ApiError } from '@/api/client';
import {
  V, VLIGHT, VBORD, DARK, MUTED, HINT, BG, CARD, BORDER, BORD2,
  GREEN, GLIGHT, GBORD, AMBER, ABG, ABORD, S, DS,
} from '@/app/components/sell-listing-wizard/wizardTokens';

// ─── Session draft persistence ────────────────────────────────────────────────
const DRAFT_KEY = 'th_sell_wizard_draft';

function saveDraft(form: WizardFormState, step: WizardStepIndex, eventId: string | null) {
  try {
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({ form, step, eventId, ts: Date.now() }));
  } catch {}
}

function loadDraft(): { form: WizardFormState; step: WizardStepIndex; eventId: string | null } | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Discard drafts older than 2 hours
    if (Date.now() - parsed.ts > 2 * 60 * 60 * 1000) { sessionStorage.removeItem(DRAFT_KEY); return null; }
    return parsed;
  } catch { return null; }
}

function clearDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch {}
}

function fmt(amount: number, currency: string) {
  return formatCurrencyFromUnits(amount, currency).replace(/[,.]00$/, '');
}

// ─── Context sidebar ──────────────────────────────────────────────────────────
function ContextPanel({
  currentStep, event, selectedDate, selectedSection, form, currency, feePercent,
}: {
  currentStep: WizardStepIndex;
  event: PublicListEventItem | null;
  selectedDate: EventDate | null;
  selectedSection: EventSection | null;
  form: WizardFormState;
  currency: string;
  feePercent: number;
}) {
  const { t } = useTranslation();
  if (!event && currentStep === 0) return null;

  const banner = event?.rectangleBannerUrl ?? event?.squareBannerUrl;
  const ticketCount = form.seatingType === 'numbered'
    ? form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim()).length
    : form.quantity;
  const net = form.pricePerTicket > 0
    ? form.pricePerTicket * Math.max(1, ticketCount) * (1 - feePercent / 100)
    : 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, position: 'sticky', top: 24 }}>

      {/* Event card */}
      {event && (
        <div style={{ background: CARD, borderRadius: 16, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          {banner && (
            <div style={{ aspectRatio: '16/7', overflow: 'hidden' }}>
              <img src={banner} alt={event.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </div>
          )}
          <div style={{ padding: '12px 14px' }}>
            <p style={{ fontSize: 15, fontWeight: 800, color: DARK, marginBottom: 4, lineHeight: 1.3, ...S }}>
              {event.name}
            </p>
            <p style={{ fontSize: 13, color: MUTED, display: 'flex', alignItems: 'center', gap: 5, ...S }}>
              <MapPin size={12} style={{ flexShrink: 0 }} /> {event.venue}
            </p>
          </div>
        </div>
      )}

      {/* Selection summary — fills in as user progresses */}
      {currentStep >= 2 && (selectedDate || selectedSection || form.pricePerTicket > 0) && (
        <div style={{ background: CARD, borderRadius: 14, border: `1px solid ${BORDER}`, padding: '12px 14px' }}>
          <p style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: HINT, marginBottom: 10, ...S }}>
            {t('sellListingWizard.reviewTitle', { defaultValue: 'Tu publicación' })}
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {selectedDate && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: DARK, ...S }}>
                <Calendar size={13} style={{ color: MUTED, flexShrink: 0 }} />
                {formatDateTime(selectedDate.date)}
              </div>
            )}
            {selectedSection && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: DARK, ...S }}>
                <Ticket size={13} style={{ color: MUTED, flexShrink: 0 }} />
                {selectedSection.name}
                {form.seatingType === 'unnumbered' && form.quantity > 0 && (
                  <span style={{ color: MUTED }}>× {form.quantity}</span>
                )}
              </div>
            )}
            {form.pricePerTicket > 0 && (
              <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 8, marginTop: 2 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: MUTED, marginBottom: 4, ...S }}>
                  <span>{t('sellListingWizard.platformFee')} ({feePercent}%)</span>
                  <span>−{fmt(form.pricePerTicket * ticketCount * (feePercent / 100), currency)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 14, fontWeight: 800, color: DARK, ...S }}>
                  <span>{t('sellTicket.sellerReceives')}</span>
                  <span style={{ color: V }}>{fmt(net, currency)}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Fee reminder */}
      {currentStep < 3 && (
        <div style={{ background: GLIGHT, borderRadius: 12, border: `1px solid ${GBORD}`, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <Tag size={13} style={{ color: GREEN, flexShrink: 0, marginTop: 1 }} />
          <p style={{ fontSize: 12.5, color: GREEN, lineHeight: 1.5, ...S }}>
            {t('sellListingWizard.feeReminder', { defaultValue: `Comisión del ${feePercent}% solo si vendés. Sin costo por publicar.`, percent: feePercent })}
          </p>
        </div>
      )}
    </div>
  );
}

// ═════════════════════════════════════════════════════════════════════════════
export function SellListingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const newEvent = location.state?.newEvent as { id: string } | undefined;
  const eventNameFromUrl = searchParams.get('eventName') ?? '';
  const { user, isAuthenticated, canSell } = useUser();
  const isMobile = useIsMobile();

  const [currentStep, setCurrentStep]   = useState<WizardStepIndex>(0);
  const [event,        setEvent]         = useState<PublicListEventItem | null>(null);
  const [form,         setForm]          = useState<WizardFormState>(defaultWizardFormState);
  const [returnToReview, setReturnToReview] = useState(false);

  const [showCreateDateModal,    setShowCreateDateModal]    = useState(false);
  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [newDateForm,            setNewDateForm]            = useState({ date: '', time: '' });
  const [newSectionName,         setNewSectionName]         = useState('');
  const [newSectionSeatingType,  setNewSectionSeatingType]  = useState<'numbered' | 'unnumbered'>('unnumbered');
  const [isCreatingDate,         setIsCreatingDate]         = useState(false);
  const [isCreatingSection,      setIsCreatingSection]      = useState(false);
  const [createDateError,        setCreateDateError]        = useState<string | null>(null);
  const [createSectionError,     setCreateSectionError]     = useState<string | null>(null);
  const [isLoadingEvent,         setIsLoadingEvent]         = useState(false);
  const [isPublishing,           setIsPublishing]           = useState(false);
  const [publishError,           setPublishError]           = useState<string | null>(null);
  const [showSellerRiskRestriction, setShowSellerRiskRestriction] = useState(false);
  const [isValidatingStep,       setIsValidatingStep]       = useState(false);
  const [showDraftBanner,        setShowDraftBanner]        = useState(false);
  const [draftEventId,           setDraftEventId]           = useState<string | null>(null);
  const [pendingDraft,           setPendingDraft]           = useState<ReturnType<typeof loadDraft>>(null);

  const [sellerPlatformFeePercentage, setSellerPlatformFeePercentage] = useState<number>(5);
  const [activePromotion, setActivePromotion] = useState<{
    id: string; name: string; type: string; config: { feePercentage: number };
  } | null>(null);
  const [promoCodeInput,       setPromoCodeInput]       = useState('');
  const [checkedPromotion,     setCheckedPromotion]     = useState<import('@/api/types/promotions').CheckSellerPromotionCodeResponse | null>(null);
  const [promotionCheckError,  setPromotionCheckError]  = useState<string | null>(null);
  const [isCheckingPromo,      setIsCheckingPromo]      = useState(false);

  const stepHeadingRef = useRef<HTMLDivElement>(null);
  const sellerCurrency = user?.currency ?? 'ARS';
  const effectiveFeePercent = activePromotion?.config.feePercentage ?? sellerPlatformFeePercentage;
  const feeForDisplay = activePromotion ? effectiveFeePercent : sellerPlatformFeePercentage;

  // ── On mount: load config + check for draft ───────────────────────────────
  useEffect(() => {
    bffService.getSellTicketConfig().then((res) => {
      setSellerPlatformFeePercentage(res.sellerPlatformFeePercentage);
      setActivePromotion(res.activePromotion ?? null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const draft = loadDraft();
    if (draft && draft.eventId) {
      setPendingDraft(draft);
      setShowDraftBanner(true);
    }
  }, []);

  useEffect(() => {
    if (newEvent?.id) handleEventSelect(newEvent.id);
  }, [newEvent?.id]);

  // ── Persist draft on every form change ───────────────────────────────────
  useEffect(() => {
    if (currentStep > 0 || form.eventId) {
      saveDraft(form, currentStep, event?.id ?? null);
    }
  }, [form, currentStep, event?.id]);

  useEffect(() => {
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

  // ── Draft restore ─────────────────────────────────────────────────────────
  const restoreDraft = async () => {
    if (!pendingDraft) return;
    setShowDraftBanner(false);
    if (pendingDraft.eventId) {
      setIsLoadingEvent(true);
      try {
        const ev = await eventsService.getEvent(pendingDraft.eventId);
        setEvent(ev);
        setForm(pendingDraft.form);
        setCurrentStep(pendingDraft.step);
      } catch {
        clearDraft();
      } finally {
        setIsLoadingEvent(false);
      }
    }
    setPendingDraft(null);
  };

  const discardDraft = () => {
    clearDraft();
    setShowDraftBanner(false);
    setPendingDraft(null);
  };

  // ── Event / date / section selection ─────────────────────────────────────
  const handleEventSelect = async (eventId: string) => {
    setIsLoadingEvent(true);
    setPublishError(null);
    setShowSellerRiskRestriction(false);
    try {
      const ev = await eventsService.getEvent(eventId);
      setEvent(ev);
      setForm((prev) => ({ ...prev, eventId: ev.id, eventDateId: '', eventSectionId: '' }));
      setCurrentStep(1);
    } catch (err) {
      console.error('Failed to fetch event:', err);
    } finally {
      setIsLoadingEvent(false);
    }
  };

  /**
   * Date selection:
   * - Mobile: auto-advance (immediate feedback for touch)
   * - Desktop: just mark the selection; "Siguiente" button handles advancement
   */
  const handleDateSelect = (eventDate: EventDate) => {
    setForm((prev) => ({ ...prev, eventDateId: eventDate.id }));
    if (isMobile) setCurrentStep(2);
  };

  const handleAddDate    = () => setShowCreateDateModal(true);
  const handleCreateSection = () => setShowCreateSectionModal(true);

  const handleCreateDate = async () => {
    if (!event || !newDateForm.date || !newDateForm.time) return;
    const dateTime = new Date(`${newDateForm.date}T${newDateForm.time}`);
    if (Number.isNaN(dateTime.getTime())) return;
    setCreateDateError(null);
    setIsCreatingDate(true);
    try {
      const newEventDate = await eventsService.addEventDate(event.id, { date: dateTime.toISOString() });
      const updatedEvent = await eventsService.getEvent(event.id);
      setEvent(updatedEvent);
      setForm((prev) => ({ ...prev, eventDateId: newEventDate.id }));
      setShowCreateDateModal(false);
      setNewDateForm({ date: '', time: '' });
    } catch (err) {
      setCreateDateError(err instanceof Error ? err.message : t('common.unknownError', { defaultValue: 'Ocurrió un error. Intentá de nuevo.' }));
    } finally {
      setIsCreatingDate(false);
    }
  };

  const handleSubmitCreateSection = async () => {
    if (!event || !newSectionName.trim()) return;
    setCreateSectionError(null);
    setIsCreatingSection(true);
    try {
      const seatingType = newSectionSeatingType === 'numbered' ? SeatingType.Numbered : SeatingType.Unnumbered;
      const newSection  = await eventsService.addEventSection(event.id, { name: newSectionName.trim(), seatingType });
      const updatedEvent = await eventsService.getEvent(event.id);
      setEvent(updatedEvent);
      setForm((prev) => ({
        ...prev, eventSectionId: newSection.id, seatingType: newSectionSeatingType,
        numberedSeats: newSectionSeatingType === 'numbered' ? [{ row: '', seatNumber: '' }] : prev.numberedSeats,
      }));
      setShowCreateSectionModal(false);
      setNewSectionName('');
      setNewSectionSeatingType('unnumbered');
    } catch (err) {
      setCreateSectionError(err instanceof Error ? err.message : t('common.unknownError', { defaultValue: 'Ocurrió un error. Intentá de nuevo.' }));
    } finally {
      setIsCreatingSection(false);
    }
  };

  const setFormPatch = (patch: Partial<WizardFormState>) => setForm((prev) => ({ ...prev, ...patch }));

  const selectedDate    = event?.dates.find((d) => d.id === form.eventDateId) ?? null;
  const selectedSection = event?.sections.find((s) => s.id === form.eventSectionId) ?? null;

  // ── canGoNext per step ────────────────────────────────────────────────────
  const canProceedStep0 = !!form.eventId && !!event;
  const canProceedStep1 = !!form.eventDateId && !!event;
  const canProceedStep2 = (() => {
    if (!form.eventSectionId) return false;
    if (form.seatingType === 'numbered') return form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim()).length > 0;
    return form.quantity >= 1;
  })();
  const canProceedStep3 = form.pricePerTicket > 0;
  const canProceedStep4 = (() => {
    if (form.deliveryMethod === 'digital') return true;
    if (form.physicalDeliveryMethod === 'arrange') return true;
    return form.physicalDeliveryMethod === 'pickup' && form.pickupAddress.trim().length > 0;
  })();
  const canProceedStep5 = true;

  const canGoNext =
    currentStep === 0 ? canProceedStep0 :
    currentStep === 1 ? canProceedStep1 :
    currentStep === 2 ? canProceedStep2 :
    currentStep === 3 ? canProceedStep3 :
    currentStep === 4 ? canProceedStep4 :
    canProceedStep5;

  // ── Navigation ────────────────────────────────────────────────────────────
  const handleBack = () => {
    setPublishError(null);
    setShowSellerRiskRestriction(false);
    if (currentStep === 0) return;
    if (returnToReview && currentStep === 5) setReturnToReview(false);
    setCurrentStep((s) => (s - 1) as WizardStepIndex);
  };

  const handleNext = async () => {
    setPublishError(null);
    setShowSellerRiskRestriction(false);
    if (currentStep === 3) {
      const quantity = form.seatingType === 'numbered'
        ? form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim()).length
        : form.quantity;
      if (quantity < 1 || form.pricePerTicket <= 0) { setCurrentStep(4); if (returnToReview) setReturnToReview(false); return; }
      setIsValidatingStep(true);
      try {
        const result = await bffService.validateSellListing({
          quantity,
          pricePerTicket: { amount: Math.round(form.pricePerTicket * 100), currency: sellerCurrency },
        });
        if (result.status === 'seller_risk_restriction') { setShowSellerRiskRestriction(true); return; }
        setCurrentStep(4);
        if (returnToReview) setReturnToReview(false);
      } finally { setIsValidatingStep(false); }
      return;
    }
    if (currentStep < 5) {
      const next = (currentStep + 1) as WizardStepIndex;
      setCurrentStep(next);
      if (returnToReview && next === 5) setReturnToReview(false);
    }
  };

  const handleEditStep = (stepIndex: number) => {
    setCurrentStep(stepIndex as WizardStepIndex);
    setReturnToReview(true);
  };

  const handleClaimPromo = async () => {
    const code = promoCodeInput.trim();
    if (!code) return;
    setPromotionCheckError(null);
    setIsCheckingPromo(true);
    try {
      const result = await promotionsService.checkSellerPromotionCode(code);
      setCheckedPromotion(result ?? null);
      if (!result) setPromotionCheckError(t('sellListingWizard.promotionCodeInvalid'));
    } catch {
      setCheckedPromotion(null);
      setPromotionCheckError(t('sellListingWizard.promotionCodeCheckFailed'));
    } finally { setIsCheckingPromo(false); }
  };

  const isStep6PromotionApplicable =
    checkedPromotion &&
    (checkedPromotion.target === 'seller' ||
      (checkedPromotion.target === 'verified_seller' && VerificationHelper.sellerTier(user) === SellerTier.VERIFIED_SELLER));
  const promotionCodeToSend =
    isStep6PromotionApplicable && promoCodeInput.trim() ? promoCodeInput.trim() : undefined;

  const handlePublish = async () => {
    if (!event || !form.eventDateId || !form.eventSectionId || form.pricePerTicket <= 0) return;
    const isNumbered = form.seatingType === 'numbered';
    const ticketType = form.deliveryMethod === 'physical' ? TicketType.Physical : TicketType.Digital;
    let deliveryMethod: DeliveryMethod | undefined;
    if (form.deliveryMethod === 'physical') {
      deliveryMethod = form.physicalDeliveryMethod === 'pickup' ? DeliveryMethod.Pickup : DeliveryMethod.ArrangeWithSeller;
    }
    const validSeats = form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim());
    setIsPublishing(true); setPublishError(null); setShowSellerRiskRestriction(false);
    try {
      const listing = await ticketsService.createListing({
        eventId: form.eventId, eventDateId: form.eventDateId, type: ticketType,
        quantity: isNumbered ? undefined : form.quantity,
        ticketUnits: isNumbered ? validSeats.map((s) => ({ seat: { row: s.row.trim(), seatNumber: s.seatNumber.trim() } })) : undefined,
        sellTogether: form.sellTogether,
        pricePerTicket: { amount: Math.round(form.pricePerTicket * 100), currency: sellerCurrency as CurrencyCode },
        deliveryMethod,
        pickupAddress: form.physicalDeliveryMethod === 'pickup' && form.pickupAddress.trim()
          ? { line1: form.pickupAddress.trim(), city: '', countryCode: 'AR' }
          : undefined,
        eventSectionId: form.eventSectionId,
        bestOfferConfig: form.bestOfferEnabled
          ? { enabled: true, minimumPrice: { amount: Math.round(parseFloat(form.bestOfferMinPrice || '0') * 100), currency: sellerCurrency as CurrencyCode } }
          : undefined,
        promotionCode: promotionCodeToSend,
      });
      clearDraft();
      navigate(`/buy/${listing.eventSlug}/${listing.id}`, { replace: true });
    } catch (err) {
      console.error('Failed to create listing:', err);
      const apiErr = err as ApiError | undefined;
      if (apiErr?.code === 'SELLER_RISK_RESTRICTION') {
        setShowSellerRiskRestriction(true); setPublishError(null);
      } else {
        setShowSellerRiskRestriction(false);
        setPublishError(err instanceof Error ? err.message : t('sellTicket.createListingFailed'));
      }
    } finally { setIsPublishing(false); }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4" style={{ background: BG }}>
        <EmptyState
          icon={Ticket}
          title={t('sellTicket.loginRequired')}
          description={t('sellTicket.mustBeLoggedIn')}
          action={{ label: t('sellTicket.loginToSell'), to: '/register' }}
        />
      </div>
    );
  }
  if (user && !canSell()) return <Navigate to="/become-seller" replace />;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: BG }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap');
        @keyframes spin { to { transform: rotate(360deg) } }
      `}</style>

      {/* Loading overlay */}
      {isLoadingEvent && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50 }}>
          <div style={{ background: CARD, borderRadius: 14, padding: '20px 28px', display: 'flex', alignItems: 'center', gap: 12 }}>
            <Loader2 size={22} style={{ color: V, animation: 'spin 0.7s linear infinite' }} />
            <span style={{ fontSize: 14, color: DARK, ...S }}>{t('common.loading')}</span>
          </div>
        </div>
      )}

      {/* Draft restore banner */}
      {showDraftBanner && pendingDraft && (
        <div style={{ background: VLIGHT, borderBottom: `1px solid ${VBORD}`, padding: '10px 24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, flexWrap: 'wrap' }}>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: DARK, ...S }}>
            {t('sellListingWizard.draftBannerText', { defaultValue: 'Tenés una publicación sin terminar. ¿Querés continuar desde donde dejaste?' })}
          </span>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={restoreDraft} style={{ padding: '6px 16px', borderRadius: 8, background: V, color: 'white', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer', ...S }}>
              {t('sellListingWizard.draftRestore', { defaultValue: 'Continuar' })}
            </button>
            <button onClick={discardDraft} style={{ padding: '6px 14px', borderRadius: 8, background: 'transparent', color: MUTED, border: `1px solid ${BORD2}`, fontSize: 13, fontWeight: 600, cursor: 'pointer', ...S }}>
              {t('common.discard', { defaultValue: 'Descartar' })}
            </button>
          </div>
        </div>
      )}

      {/* Page layout — single column mobile, two columns desktop */}
      <div style={{ maxWidth: 1040, margin: '0 auto', padding: 'clamp(16px,3vw,32px)', display: 'grid', gridTemplateColumns: '1fr', gap: 20 }}
        className="lg:grid lg:grid-cols-[1fr_300px] lg:items-start">

        {/* ── Wizard card ───────────────────────────────────────────────── */}
        <div style={{ background: CARD, borderRadius: 20, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>

          {/* Header */}
          <div style={{ padding: 'clamp(16px,3vw,24px)', paddingBottom: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <div style={{ width: 44, height: 44, borderRadius: 12, background: VLIGHT, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Ticket size={22} style={{ color: V }} />
              </div>
              <div>
                <h1
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  style={{ ...DS, fontSize: 'clamp(20px,2.5vw,26px)', color: DARK, marginBottom: 2 }}
                >
                  {t('sellListingWizard.title')}
                </h1>
                <p style={{ fontSize: 13, color: MUTED, ...S }}>
                  {t('sellListingWizard.subtitle')}
                </p>
              </div>
            </div>
            <WizardProgress currentStep={currentStep} isMobile={isMobile} />
          </div>

          {/* Step content */}
          <div style={{ padding: 'clamp(16px,3vw,28px)' }}>
            {currentStep === 0 && (
              <StepChooseEvent onSelect={handleEventSelect} isMobile={isMobile} initialSearchTerm={eventNameFromUrl} />
            )}
            {currentStep === 1 && event && (
              <StepChooseDate
                event={event} selectedDateId={form.eventDateId}
                onSelect={handleDateSelect} onAddDate={handleAddDate} isMobile={isMobile}
              />
            )}
            {currentStep === 2 && event && (
              <StepZoneAndSeats event={event} form={form} onFormChange={setFormPatch} onCreateSection={handleCreateSection} isMobile={isMobile} />
            )}
            {currentStep === 3 && (
              <StepPriceAndConditions
                form={form} onFormChange={setFormPatch} currency={sellerCurrency}
                sellerPlatformFeePercent={sellerPlatformFeePercentage}
                effectiveFeePercent={activePromotion ? effectiveFeePercent : undefined}
                promotionName={activePromotion?.name}
              />
            )}
            {currentStep === 4 && (
              <StepDeliveryMethod form={form} onFormChange={setFormPatch} />
            )}
            {currentStep === 5 && event && selectedDate && (
              <StepReviewAndPublish
                event={event} selectedDate={selectedDate} selectedSection={selectedSection}
                form={form} currency={sellerCurrency}
                sellerPlatformFeePercent={sellerPlatformFeePercentage}
                effectiveFeePercent={activePromotion ? effectiveFeePercent : undefined}
                promotionName={activePromotion?.name}
                onEditStep={handleEditStep}
                promoCodeInput={promoCodeInput} onPromoCodeChange={setPromoCodeInput}
                onClaimPromo={handleClaimPromo} checkedPromotion={checkedPromotion}
                promotionCheckError={promotionCheckError} isCheckingPromo={isCheckingPromo}
                user={user}
              />
            )}

            {showSellerRiskRestriction && <SellerRiskRestrictionDisclaimer className="mt-4" />}
            {publishError && !showSellerRiskRestriction && (
              <p style={{ marginTop: 14, fontSize: 13, color: '#dc2626', ...S }} role="alert">{publishError}</p>
            )}

            <div style={{ marginTop: 28 }}>
              <WizardFooter
                onBack={handleBack}
                onNext={currentStep === 5 ? handlePublish : handleNext}
                showPublish={currentStep === 5}
                canGoNext={canGoNext}
                isPublishing={isPublishing}
                isNextLoading={isValidatingStep}
                isMobile={isMobile}
              />
            </div>
          </div>
        </div>

        {/* ── Context sidebar — hidden on mobile via CSS class ──────────── */}
        <div className="hidden lg:block">
          <ContextPanel
            currentStep={currentStep}
            event={event}
            selectedDate={selectedDate}
            selectedSection={selectedSection}
            form={form}
            currency={sellerCurrency}
            feePercent={feeForDisplay}
          />
        </div>
      </div>

      {/* ── Create date modal ──────────────────────────────────────────── */}
      {showCreateDateModal && event && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: CARD, borderRadius: 20, width: '100%', maxWidth: 440, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Calendar size={20} style={{ color: V }} />
                <h2 style={{ ...DS, fontSize: 20, color: DARK }}>{t('sellTicket.createDateTitle')}</h2>
              </div>
              <button onClick={() => { setShowCreateDateModal(false); setCreateDateError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 18, lineHeight: 1.5, ...S }}>
              {t('sellTicket.createDateDesc', { eventName: event.name })}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
              <div>
                <Label style={{ fontSize: 13.5, fontWeight: 600, color: DARK, ...S }}>{t('sellTicket.eventDate')} *</Label>
                <Input type="date" value={newDateForm.date} onChange={(e) => setNewDateForm((p) => ({ ...p, date: e.target.value }))} className="mt-2 min-h-[44px]" min={new Date().toISOString().split('T')[0]} />
              </div>
              <div>
                <Label style={{ fontSize: 13.5, fontWeight: 600, color: DARK, ...S }}>{t('sellTicket.dateTime')} *</Label>
                <Input type="time" value={newDateForm.time} onChange={(e) => setNewDateForm((p) => ({ ...p, time: e.target.value }))} className="mt-2 min-h-[44px]" />
              </div>
              {/* Warning — prominent, not at the bottom */}
              <div style={{ background: ABG, border: `1px solid ${ABORD}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Clock size={16} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: AMBER, lineHeight: 1.5, ...S }}>{t('sellTicket.newDatePendingNote')}</p>
              </div>
              {createDateError && (
                <p style={{ fontSize: 13, color: '#dc2626', ...S }} role="alert">{createDateError}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="outline" className="flex-1" onClick={() => { setShowCreateDateModal(false); setCreateDateError(null); }}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" disabled={isCreatingDate || !newDateForm.date || !newDateForm.time} onClick={handleCreateDate}>
                {isCreatingDate ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Calendar size={16} />}
                {isCreatingDate ? t('common.creating') : t('sellTicket.createDate')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* ── Create section modal ───────────────────────────────────────── */}
      {showCreateSectionModal && event && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(15,15,26,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}>
          <div style={{ background: CARD, borderRadius: 20, width: '100%', maxWidth: 440, padding: '24px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <Ticket size={20} style={{ color: V }} />
                <h2 style={{ ...DS, fontSize: 20, color: DARK }}>{t('sellTicket.createSectionTitle')}</h2>
              </div>
              <button onClick={() => { setShowCreateSectionModal(false); setCreateSectionError(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: MUTED, padding: 4 }}>
                <X size={18} />
              </button>
            </div>
            <p style={{ fontSize: 13.5, color: MUTED, marginBottom: 18, lineHeight: 1.5, ...S }}>
              {t('sellTicket.createSectionDesc', { eventName: event.name })}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 16 }}>
              {/* Warning — prominent, before the form */}
              <div style={{ background: ABG, border: `1px solid ${ABORD}`, borderRadius: 10, padding: '10px 12px', display: 'flex', alignItems: 'flex-start', gap: 8 }}>
                <Clock size={16} style={{ color: AMBER, flexShrink: 0, marginTop: 1 }} />
                <p style={{ fontSize: 13, color: AMBER, lineHeight: 1.5, ...S }}>{t('sellTicket.newSectionPendingNote')}</p>
              </div>
              <div>
                <Label style={{ fontSize: 13.5, fontWeight: 600, color: DARK, ...S }}>{t('sellTicket.sectionName')} *</Label>
                <Input value={newSectionName} onChange={(e) => setNewSectionName(e.target.value)} placeholder={t('sellTicket.sectionNamePlaceholder')} className="mt-2 min-h-[44px]" />
              </div>
              <div>
                <Label style={{ fontSize: 13.5, fontWeight: 600, color: DARK, display: 'block', marginBottom: 8, ...S }}>{t('sellTicket.seatingType')}</Label>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {(['unnumbered', 'numbered'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setNewSectionSeatingType(type)}
                      style={{
                        padding: '12px 14px', borderRadius: 10, textAlign: 'left',
                        border: `2px solid ${newSectionSeatingType === type ? V : BORDER}`,
                        background: newSectionSeatingType === type ? VLIGHT : CARD,
                        cursor: 'pointer',
                      }}
                    >
                      <p style={{ fontWeight: 700, color: newSectionSeatingType === type ? V : DARK, fontSize: 13.5, marginBottom: 2, ...S }}>
                        {type === 'unnumbered' ? t('sellTicket.generalAdmission') : t('sellTicket.numberedSeating')}
                      </p>
                      <p style={{ fontSize: 12.5, color: MUTED, lineHeight: 1.4, ...S }}>
                        {type === 'unnumbered' ? t('sellTicket.generalAdmissionDesc') : t('sellTicket.numberedSeatingDesc')}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
              {createSectionError && (
                <p style={{ fontSize: 13, color: '#dc2626', ...S }} role="alert">{createSectionError}</p>
              )}
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <Button variant="outline" className="flex-1" onClick={() => { setShowCreateSectionModal(false); setCreateSectionError(null); }}>
                {t('common.cancel')}
              </Button>
              <Button className="flex-1" disabled={isCreatingSection || !newSectionName.trim()} onClick={handleSubmitCreateSection}>
                {isCreatingSection ? <Loader2 size={16} style={{ animation: 'spin 0.7s linear infinite' }} /> : <Ticket size={16} />}
                {isCreatingSection ? t('common.creating') : t('sellTicket.createSection')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
