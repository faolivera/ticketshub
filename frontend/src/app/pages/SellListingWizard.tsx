import { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation, useSearchParams, Navigate } from 'react-router-dom';
import { Ticket, Loader2, Calendar, X, Clock } from 'lucide-react';
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
import {
  WizardProgress,
  WizardFooter,
  StepChooseEvent,
  StepChooseDate,
  StepZoneAndSeats,
  StepPriceAndConditions,
  StepDeliveryMethod,
  StepReviewAndPublish,
  defaultWizardFormState,
  WIZARD_TOTAL_STEPS,
  type WizardStepIndex,
  type WizardFormState,
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

export function SellListingWizard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const newEvent = location.state?.newEvent as { id: string } | undefined;
  const eventNameFromUrl = searchParams.get('eventName') ?? '';
  const { user, isAuthenticated, canSell } = useUser();
  const isMobile = useIsMobile();

  const [currentStep, setCurrentStep] = useState<WizardStepIndex>(0);
  const [event, setEvent] = useState<PublicListEventItem | null>(null);
  const [form, setForm] = useState<WizardFormState>(defaultWizardFormState);
  const [returnToReview, setReturnToReview] = useState(false);

  const [showCreateDateModal, setShowCreateDateModal] = useState(false);
  const [showCreateSectionModal, setShowCreateSectionModal] = useState(false);
  const [newDateForm, setNewDateForm] = useState({ date: '', time: '' });
  const [newSectionName, setNewSectionName] = useState('');
  const [newSectionSeatingType, setNewSectionSeatingType] = useState<'numbered' | 'unnumbered'>('unnumbered');
  const [isCreatingDate, setIsCreatingDate] = useState(false);
  const [isCreatingSection, setIsCreatingSection] = useState(false);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [showSellerRiskRestriction, setShowSellerRiskRestriction] = useState(false);
  const [isValidatingStep, setIsValidatingStep] = useState(false);

  const [sellerPlatformFeePercentage, setSellerPlatformFeePercentage] = useState<number>(5);
  const [activePromotion, setActivePromotion] = useState<{
    id: string;
    name: string;
    type: string;
    config: { feePercentage: number };
  } | null>(null);

  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [checkedPromotion, setCheckedPromotion] = useState<import('@/api/types/promotions').CheckSellerPromotionCodeResponse | null>(null);
  const [promotionCheckError, setPromotionCheckError] = useState<string | null>(null);
  const [isCheckingPromo, setIsCheckingPromo] = useState(false);

  const stepHeadingRef = useRef<HTMLHeadingElement>(null);

  const sellerCurrency = user?.currency ?? 'ARS';

  useEffect(() => {
    bffService.getSellTicketConfig().then((res) => {
      setSellerPlatformFeePercentage(res.sellerPlatformFeePercentage);
      setActivePromotion(res.activePromotion ?? null);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (newEvent?.id) {
      handleEventSelect(newEvent.id);
    }
  }, [newEvent?.id]);

  useEffect(() => {
    stepHeadingRef.current?.focus({ preventScroll: true });
  }, [currentStep]);

  const handleEventSelect = async (eventId: string) => {
    setIsLoadingEvent(true);
    setPublishError(null);
    setShowSellerRiskRestriction(false);
    try {
      const ev = await eventsService.getEvent(eventId);
      setEvent(ev);
      setForm((prev) => ({
        ...prev,
        eventId: ev.id,
        eventDateId: '',
        eventSectionId: '',
      }));
      setCurrentStep(1);
    } catch (err) {
      console.error('Failed to fetch event:', err);
    } finally {
      setIsLoadingEvent(false);
    }
  };

  const handleDateSelect = (eventDate: EventDate) => {
    setForm((prev) => ({ ...prev, eventDateId: eventDate.id }));
    setCurrentStep(2);
  };

  const handleAddDate = () => setShowCreateDateModal(true);

  const handleCreateDate = async () => {
    if (!event || !newDateForm.date || !newDateForm.time) return;
    const dateTime = new Date(`${newDateForm.date}T${newDateForm.time}`);
    if (Number.isNaN(dateTime.getTime())) return;
    setIsCreatingDate(true);
    try {
      const newEventDate = await eventsService.addEventDate(event.id, {
        date: dateTime.toISOString(),
      });
      const updatedEvent = await eventsService.getEvent(event.id);
      setEvent(updatedEvent);
      setForm((prev) => ({ ...prev, eventDateId: newEventDate.id }));
      setShowCreateDateModal(false);
      setNewDateForm({ date: '', time: '' });
    } catch (err) {
      console.error('Failed to create date:', err);
    } finally {
      setIsCreatingDate(false);
    }
  };

  const handleCreateSection = () => setShowCreateSectionModal(true);

  const handleSubmitCreateSection = async () => {
    if (!event || !newSectionName.trim()) return;
    setIsCreatingSection(true);
    try {
      const seatingType =
        newSectionSeatingType === 'numbered' ? SeatingType.Numbered : SeatingType.Unnumbered;
      const newSection = await eventsService.addEventSection(event.id, {
        name: newSectionName.trim(),
        seatingType,
      });
      const updatedEvent = await eventsService.getEvent(event.id);
      setEvent(updatedEvent);
      setForm((prev) => ({
        ...prev,
        eventSectionId: newSection.id,
        seatingType: newSectionSeatingType,
        numberedSeats:
          newSectionSeatingType === 'numbered' ? [{ row: '', seatNumber: '' }] : prev.numberedSeats,
      }));
      setShowCreateSectionModal(false);
      setNewSectionName('');
      setNewSectionSeatingType('unnumbered');
    } catch (err) {
      console.error('Failed to create section:', err);
    } finally {
      setIsCreatingSection(false);
    }
  };

  const setFormPatch = (patch: Partial<WizardFormState>) => {
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const selectedDate = event?.dates.find((d) => d.id === form.eventDateId) ?? null;
  const selectedSection = event?.sections.find((s) => s.id === form.eventSectionId) ?? null;

  const canProceedStep0 = !!form.eventId && !!event;
  const canProceedStep1 = !!form.eventDateId && !!event;
  const canProceedStep2 = (() => {
    if (!form.eventSectionId) return false;
    if (form.seatingType === 'numbered') {
      const valid = form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim());
      return valid.length > 0;
    }
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
    currentStep === 0
      ? canProceedStep0
      : currentStep === 1
        ? canProceedStep1
        : currentStep === 2
          ? canProceedStep2
          : currentStep === 3
            ? canProceedStep3
            : currentStep === 4
              ? canProceedStep4
              : canProceedStep5;

  const handleBack = () => {
    setPublishError(null);
    setShowSellerRiskRestriction(false);
    if (currentStep === 0) return;
    if (returnToReview && currentStep === 5) {
      setReturnToReview(false);
    }
    setCurrentStep((s) => (s - 1) as WizardStepIndex);
  };

  const handleNext = async () => {
    setPublishError(null);
    setShowSellerRiskRestriction(false);
    if (currentStep === 3) {
      const quantity =
        form.seatingType === 'numbered'
          ? form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim()).length
          : form.quantity;
      if (quantity < 1 || form.pricePerTicket <= 0) {
        setCurrentStep(4);
        if (returnToReview) setReturnToReview(false);
        return;
      }
      setIsValidatingStep(true);
      try {
        const result = await bffService.validateSellListing({
          quantity,
          pricePerTicket: {
            amount: Math.round(form.pricePerTicket * 100),
            currency: sellerCurrency,
          },
        });
        if (result.status === 'seller_risk_restriction') {
          setShowSellerRiskRestriction(true);
          return;
        }
        setCurrentStep(4);
        if (returnToReview) setReturnToReview(false);
      } finally {
        setIsValidatingStep(false);
      }
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
      if (!result) {
        setPromotionCheckError(t('sellListingWizard.promotionCodeInvalid'));
      }
    } catch {
      setCheckedPromotion(null);
      setPromotionCheckError(t('sellListingWizard.promotionCodeCheckFailed'));
    } finally {
      setIsCheckingPromo(false);
    }
  };

  const isStep6PromotionApplicable =
    checkedPromotion &&
    (checkedPromotion.target === 'seller' ||
      (checkedPromotion.target === 'verified_seller' &&
        VerificationHelper.sellerTier(user) === SellerTier.VERIFIED_SELLER));
  const promotionCodeToSend =
    isStep6PromotionApplicable && promoCodeInput.trim() ? promoCodeInput.trim() : undefined;

  const handlePublish = async () => {
    if (!event || !form.eventDateId || !form.eventSectionId || form.pricePerTicket <= 0) return;

    const isNumbered = form.seatingType === 'numbered';
    const ticketType =
      form.deliveryMethod === 'physical' ? TicketType.Physical : TicketType.Digital;
    let deliveryMethod: DeliveryMethod | undefined;
    if (form.deliveryMethod === 'physical') {
      deliveryMethod =
        form.physicalDeliveryMethod === 'pickup'
          ? DeliveryMethod.Pickup
          : DeliveryMethod.ArrangeWithSeller;
    }

    const validSeats = form.numberedSeats.filter((s) => s.row.trim() && s.seatNumber.trim());

    setIsPublishing(true);
    setPublishError(null);
    setShowSellerRiskRestriction(false);
    try {
      const listing = await ticketsService.createListing({
        eventId: form.eventId,
        eventDateId: form.eventDateId,
        type: ticketType,
        quantity: isNumbered ? undefined : form.quantity,
        ticketUnits: isNumbered
          ? validSeats.map((seat) => ({
              seat: { row: seat.row.trim(), seatNumber: seat.seatNumber.trim() },
            }))
          : undefined,
        sellTogether: form.sellTogether,
        pricePerTicket: {
          amount: Math.round(form.pricePerTicket * 100),
          currency: sellerCurrency as CurrencyCode,
        },
        deliveryMethod,
        pickupAddress:
          form.physicalDeliveryMethod === 'pickup' && form.pickupAddress.trim()
            ? {
                line1: form.pickupAddress.trim(),
                city: '',
                countryCode: 'AR',
              }
            : undefined,
        eventSectionId: form.eventSectionId,
        bestOfferConfig: form.bestOfferEnabled
          ? {
              enabled: true,
              minimumPrice: {
                amount: Math.round(parseFloat(form.bestOfferMinPrice || '0') * 100),
                currency: sellerCurrency as CurrencyCode,
              },
            }
          : undefined,
        promotionCode: promotionCodeToSend,
      });
      navigate(`/buy/${listing.eventSlug}/${listing.id}`, { replace: true });
    } catch (err) {
      console.error('Failed to create listing:', err);
      const apiErr = err as ApiError | undefined;
      if (apiErr?.code === 'SELLER_RISK_RESTRICTION') {
        setShowSellerRiskRestriction(true);
        setPublishError(null);
      } else {
        setShowSellerRiskRestriction(false);
        setPublishError(err instanceof Error ? err.message : t('sellTicket.createListingFailed'));
      }
    } finally {
      setIsPublishing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-muted/30 flex items-center justify-center p-4">
        <EmptyState
          icon={Ticket}
          title={t('sellTicket.loginRequired')}
          description={t('sellTicket.mustBeLoggedIn')}
          action={{ label: t('sellTicket.loginToSell'), to: '/register' }}
        />
      </div>
    );
  }

  if (user && !canSell()) {
    return <Navigate to="/become-seller" replace />;
  }

  const effectiveFeePercent = activePromotion?.config.feePercentage ?? sellerPlatformFeePercentage;

  return (
    <div className="min-h-screen bg-muted/30">
      {isLoadingEvent && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-background rounded-lg p-6 flex items-center gap-3 shadow-lg">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
            <span className="text-foreground">{t('common.loading')}</span>
          </div>
        </div>
      )}

      <div className="max-w-3xl mx-auto px-4 py-6 md:py-8">
        <div className="bg-card rounded-xl shadow-sm border overflow-hidden">
          <div className="px-4 md:px-6 pt-4 md:pt-6">
            <div className="flex items-center gap-3 mb-4">
              <Ticket className="h-8 w-8 text-primary shrink-0" />
              <div>
                <h1
                  ref={stepHeadingRef}
                  tabIndex={-1}
                  className="text-2xl md:text-3xl font-bold text-foreground"
                >
                  {t('sellListingWizard.title')}
                </h1>
                <p className="text-muted-foreground text-sm mt-0.5">
                  {t('sellListingWizard.subtitle')}
                </p>
              </div>
            </div>
            <WizardProgress currentStep={currentStep} isMobile={isMobile} />
          </div>

          <div className="px-4 md:px-6 py-6 md:py-8">
            {currentStep === 0 && (
              <StepChooseEvent
                onSelect={handleEventSelect}
                isMobile={isMobile}
                initialSearchTerm={eventNameFromUrl}
              />
            )}
            {currentStep === 1 && event && (
              <StepChooseDate
                event={event}
                selectedDateId={form.eventDateId}
                onSelect={handleDateSelect}
                onAddDate={handleAddDate}
                isMobile={isMobile}
              />
            )}
            {currentStep === 2 && event && (
              <StepZoneAndSeats
                event={event}
                form={form}
                onFormChange={setFormPatch}
                onCreateSection={handleCreateSection}
                isMobile={isMobile}
              />
            )}
            {currentStep === 3 && (
              <StepPriceAndConditions
                form={form}
                onFormChange={setFormPatch}
                currency={sellerCurrency}
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
                event={event}
                selectedDate={selectedDate}
                selectedSection={selectedSection}
                form={form}
                currency={sellerCurrency}
                sellerPlatformFeePercent={sellerPlatformFeePercentage}
                effectiveFeePercent={activePromotion ? effectiveFeePercent : undefined}
                promotionName={activePromotion?.name}
                onEditStep={handleEditStep}
                promoCodeInput={promoCodeInput}
                onPromoCodeChange={setPromoCodeInput}
                onClaimPromo={handleClaimPromo}
                checkedPromotion={checkedPromotion}
                promotionCheckError={promotionCheckError}
                isCheckingPromo={isCheckingPromo}
                user={user}
              />
            )}

            {showSellerRiskRestriction && (
              <SellerRiskRestrictionDisclaimer className="mt-4" />
            )}

            {publishError && !showSellerRiskRestriction && (
              <p className="mt-4 text-sm text-destructive" role="alert">
                {publishError}
              </p>
            )}

            <div className="mt-8">
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
      </div>

      {/* Create Date Modal */}
      {showCreateDateModal && event && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Calendar className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  {t('sellTicket.createDateTitle')}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateDateModal(false)}
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('sellTicket.createDateDesc', { eventName: event.name })}
            </p>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('sellTicket.eventDate')} *</Label>
                <Input
                  type="date"
                  value={newDateForm.date}
                  onChange={(e) => setNewDateForm((p) => ({ ...p, date: e.target.value }))}
                  className="mt-2 min-h-[44px]"
                  min={new Date().toISOString().split('T')[0]}
                />
              </div>
              <div>
                <Label className="text-sm font-medium">{t('sellTicket.dateTime')} *</Label>
                <Input
                  type="time"
                  value={newDateForm.time}
                  onChange={(e) => setNewDateForm((p) => ({ ...p, time: e.target.value }))}
                  className="mt-2 min-h-[44px]"
                />
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('sellTicket.newDatePendingNote')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateDateModal(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1"
                disabled={isCreatingDate || !newDateForm.date || !newDateForm.time}
                onClick={handleCreateDate}
              >
                {isCreatingDate ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Calendar className="h-4 w-4" />
                )}
                {isCreatingDate ? t('common.creating') : t('sellTicket.createDate')}
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Create Section Modal */}
      {showCreateSectionModal && event && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-card rounded-xl shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <Ticket className="h-6 w-6 text-primary" />
                <h2 className="text-xl font-bold text-foreground">
                  {t('sellTicket.createSectionTitle')}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowCreateSectionModal(false)}
                aria-label={t('common.close')}
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-muted-foreground mb-4">
              {t('sellTicket.createSectionDesc', { eventName: event.name })}
            </p>
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium">{t('sellTicket.sectionName')} *</Label>
                <Input
                  value={newSectionName}
                  onChange={(e) => setNewSectionName(e.target.value)}
                  placeholder={t('sellTicket.sectionNamePlaceholder')}
                  className="mt-2 min-h-[44px]"
                />
              </div>
              <div>
                <Label className="text-sm font-medium mb-2 block">{t('sellTicket.seatingType')}</Label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setNewSectionSeatingType('unnumbered')}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-colors',
                      newSectionSeatingType === 'unnumbered'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <p className="font-medium text-foreground">{t('sellTicket.generalAdmission')}</p>
                    <p className="text-sm text-muted-foreground">{t('sellTicket.generalAdmissionDesc')}</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => setNewSectionSeatingType('numbered')}
                    className={cn(
                      'p-4 rounded-lg border-2 text-left transition-colors',
                      newSectionSeatingType === 'numbered'
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <p className="font-medium text-foreground">{t('sellTicket.numberedSeating')}</p>
                    <p className="text-sm text-muted-foreground">{t('sellTicket.numberedSeatingDesc')}</p>
                  </button>
                </div>
              </div>
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-lg flex items-start gap-2">
                <Clock className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  {t('sellTicket.newSectionPendingNote')}
                </p>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => setShowCreateSectionModal(false)}
              >
                {t('common.cancel')}
              </Button>
              <Button
                className="flex-1"
                disabled={isCreatingSection || !newSectionName.trim()}
                onClick={handleSubmitCreateSection}
              >
                {isCreatingSection ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Ticket className="h-4 w-4" />
                )}
                {isCreatingSection ? t('common.creating') : t('sellTicket.createSection')}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
