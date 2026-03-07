import { useState, useEffect } from 'react';
import { Link, useLocation, Navigate } from 'react-router-dom';
import { Ticket, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useUser } from '@/app/contexts/UserContext';
import { EmptyState } from '@/app/components/EmptyState';
import { eventsService } from '@/api/services/events.service';
import type { EventWithDates } from '@/api/types';
import { EventSelectionStep, TicketDetailsStep } from '@/app/components/sell-ticket';

type WizardStep = 'select-event' | 'ticket-details';

export function SellTicket() {
  const { t } = useTranslation();
  const location = useLocation();
  const newEvent = location.state?.newEvent;
  const { user, isAuthenticated, canSell } = useUser();

  const [step, setStep] = useState<WizardStep>('select-event');
  const [selectedEvent, setSelectedEvent] = useState<EventWithDates | null>(null);
  const [isLoadingEvent, setIsLoadingEvent] = useState(false);

  useEffect(() => {
    if (newEvent?.id) {
      handleEventSelect(newEvent.id);
    }
  }, [newEvent]);

  const handleEventSelect = async (eventId: string) => {
    setIsLoadingEvent(true);
    try {
      const event = await eventsService.getEvent(eventId);
      setSelectedEvent(event);
      setStep('ticket-details');
    } catch (err) {
      console.error('Failed to fetch event details:', err);
    } finally {
      setIsLoadingEvent(false);
    }
  };

  const handleBack = () => {
    setSelectedEvent(null);
    setStep('select-event');
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <EmptyState
          icon={Ticket}
          title={t('sellTicket.loginRequired')}
          description={t('sellTicket.mustBeLoggedIn')}
          action={{
            label: t('sellTicket.loginToSell'),
            to: '/register',
          }}
        />
      </div>
    );
  }

  if (user && !canSell()) {
    return <Navigate to="/become-seller" replace />;
  }

  return (
    <>
      {isLoadingEvent && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 flex items-center gap-3 shadow-lg">
            <Loader2 className="w-6 h-6 animate-spin text-blue-600" />
            <span className="text-gray-700">{t('common.loading')}</span>
          </div>
        </div>
      )}

      <div className="min-h-screen bg-gray-50">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="bg-white rounded-lg shadow-md p-8">
            {step === 'select-event' && (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <Ticket className="w-8 h-8 text-blue-600" />
                  <h1 className="text-3xl font-bold text-gray-900">{t('sellTicket.title')}</h1>
                </div>

                <p className="text-gray-600 mb-8">{t('sellTicket.subtitle')}</p>

                <EventSelectionStep onSelect={handleEventSelect} />
              </>
            )}

            {step === 'ticket-details' && selectedEvent && (
              <TicketDetailsStep
                event={selectedEvent}
                onBack={handleBack}
                preselectedDateISO={newEvent?.dateISO}
              />
            )}
          </div>
        </div>
      </div>
    </>
  );
}
