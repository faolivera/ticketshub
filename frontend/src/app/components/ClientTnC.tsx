import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { TermsModal } from '@/app/components/TermsModal';

export interface ClientTnCProps {
  termsVersionId: string | null;
  termsLoading: boolean;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  checkboxId?: string;
}

/**
 * Shared Terms and Conditions block: checkbox, "I agree to the Terms and Conditions" text with link that opens the terms modal.
 * Used on Register and Buy (checkout) when the user must accept buyer T&C.
 */
export function ClientTnC({
  termsVersionId,
  termsLoading,
  checked,
  onCheckedChange,
  disabled = false,
  checkboxId = 'client-tnc',
}: ClientTnCProps) {
  const { t } = useTranslation();
  const [showTermsModal, setShowTermsModal] = useState(false);

  const openModal = () => {
    if (termsVersionId) setShowTermsModal(true);
  };

  return (
    <>
      <div className="flex items-start gap-3">
        <input
          type="checkbox"
          id={checkboxId}
          checked={checked}
          onChange={(e) => onCheckedChange(e.target.checked)}
          disabled={disabled || !termsVersionId || termsLoading}
          className="mt-1 w-5 h-5 text-blue-600 rounded border-gray-300 focus:ring-2 focus:ring-blue-500"
        />
        <label htmlFor={checkboxId} className="text-sm text-gray-700">
          {t('clientTnC.agreeToTerms')}{' '}
          <button
            type="button"
            onClick={openModal}
            disabled={!termsVersionId || termsLoading || disabled}
            className="text-blue-600 hover:text-blue-700 font-semibold underline disabled:opacity-50"
          >
            {t('clientTnC.termsAndConditions')}
          </button>
        </label>
      </div>
      {showTermsModal && termsVersionId && (
        <TermsModal
          termsVersionId={termsVersionId}
          title={t('clientTnC.termsAndConditions')}
          onClose={() => setShowTermsModal(false)}
        />
      )}
    </>
  );
}
