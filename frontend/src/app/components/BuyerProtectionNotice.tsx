import { useTranslation } from 'react-i18next';
import { Shield } from 'lucide-react';

export function BuyerProtectionNotice() {
  const { t } = useTranslation();

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
      <div className="flex items-start gap-3">
        <Shield className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
        <div>
          <p className="font-semibold text-blue-900 mb-1">
            {t('buyerProtection.title')}
          </p>
          <p className="text-sm text-blue-800">
            {t('buyerProtection.message')}
          </p>
        </div>
      </div>
    </div>
  );
}
