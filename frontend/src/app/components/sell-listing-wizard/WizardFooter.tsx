import { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { cn } from '@/app/components/ui/utils';

interface WizardFooterProps {
  onBack: () => void;
  onNext: () => void;
  showPublish: boolean;
  canGoNext: boolean;
  isPublishing: boolean;
  /** Mobile: sticky bottom with safe area; desktop: inline */
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
  isMobile,
  backLabel,
  nextLabel,
}) => {
  const { t } = useTranslation();

  const content = (
    <div
      className={cn(
        'flex gap-3 w-full',
        isMobile ? 'flex-row' : 'flex-row'
      )}
    >
      <Button
        type="button"
        variant="outline"
        onClick={onBack}
        className={cn(
          'min-h-[44px] md:min-h-[40px] text-base md:text-sm',
          isMobile ? 'flex-[0_1_40%]' : 'min-w-[100px]'
        )}
        aria-label={backLabel ?? t('sellListingWizard.back')}
      >
        {backLabel ?? t('sellListingWizard.back')}
      </Button>
      {showPublish ? (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canGoNext || isPublishing}
          className={cn(
            'min-h-[44px] md:min-h-[40px] text-base md:text-sm flex-1'
          )}
          aria-busy={isPublishing}
          aria-label={t('sellListingWizard.publish')}
        >
          {isPublishing ? (
            <>
              <Loader2 className="h-5 w-5 animate-spin" />
              {t('sellListingWizard.publishing')}
            </>
          ) : (
            t('sellListingWizard.publish')
          )}
        </Button>
      ) : (
        <Button
          type="button"
          onClick={onNext}
          disabled={!canGoNext}
          className={cn(
            'min-h-[44px] md:min-h-[40px] text-base md:text-sm flex-1 md:flex-initial md:min-w-[120px]'
          )}
          aria-label={nextLabel ?? t('sellListingWizard.next')}
        >
          {nextLabel ?? t('sellListingWizard.next')}
        </Button>
      )}
    </div>
  );

  if (isMobile) {
    return (
      <div
        className="sticky bottom-0 left-0 right-0 z-10 bg-background border-t px-4 py-4 shadow-[0_-2px_8px_rgba(0,0,0,0.08)] pb-[max(1rem,env(safe-area-inset-bottom))]"
        role="group"
        aria-label={t('sellListingWizard.progressStep', { current: 1, total: 6 })}
      >
        {content}
      </div>
    );
  }

  return <div className="flex gap-3 pt-6">{content}</div>;
};
