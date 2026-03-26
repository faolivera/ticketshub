import { useState } from 'react';
import { Check, Mail } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  CARD,
  BORDER,
  DARK,
  MUTED,
  SUCCESS,
  SUCCESS_LIGHT,
  SUCCESS_BORDER,
  V,
  S,
  R_INPUT,
} from '@/lib/design-tokens';

interface BuyerDeliveryEmailCardProps {
  deliveryEmail: string | null;
  currentUserEmail: string;
  onConfirm: (email: string) => Promise<void>;
}

export function BuyerDeliveryEmailCard({
  deliveryEmail,
  currentUserEmail,
  onConfirm,
}: BuyerDeliveryEmailCardProps) {
  const { t } = useTranslation();
  const [inputEmail, setInputEmail] = useState(currentUserEmail);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(inputEmail.trim());

  const handleConfirm = async (): Promise<void> => {
    if (!isValidEmail || saving) return;
    setError(null);
    setSaving(true);
    try {
      await onConfirm(inputEmail.trim());
    } catch (err: unknown) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Error al guardar el email';
      setError(message);
    } finally {
      setSaving(false);
    }
  };

  if (deliveryEmail !== null) {
    return (
      <div
        className="rounded-card border p-4 flex items-start gap-3"
        style={{ background: SUCCESS_LIGHT, borderColor: SUCCESS_BORDER, ...S }}
      >
        <Check className="mt-0.5 h-4 w-4 flex-shrink-0" style={{ color: SUCCESS }} />
        <div>
          <p className="text-sm font-semibold" style={{ color: SUCCESS }}>
            {deliveryEmail}
          </p>
          <p className="text-xs mt-0.5" style={{ color: MUTED }}>
            {t('transaction.deliveryEmail.lockedHint')}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div
      className="rounded-card border p-4"
      style={{ background: CARD, borderColor: BORDER, ...S }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Mail className="h-4 w-4 flex-shrink-0" style={{ color: V }} />
        <h3 className="text-sm font-bold" style={{ color: DARK }}>
          {t('transaction.deliveryEmail.cardTitle')}
        </h3>
      </div>
      <div className="flex gap-2">
        <input
          type="email"
          value={inputEmail}
          onChange={(e) => setInputEmail(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') void handleConfirm();
          }}
          disabled={saving}
          className="flex-1 px-3 py-2 text-sm border focus:outline-none focus:ring-2 disabled:opacity-50"
          style={{
            borderRadius: R_INPUT,
            borderColor: BORDER,
            ...S,
          }}
        />
        <button
          type="button"
          onClick={() => void handleConfirm()}
          disabled={!isValidEmail || saving}
          className="px-4 py-2 rounded-button text-sm font-bold text-white flex-shrink-0 disabled:opacity-50"
          style={{ background: V }}
        >
          {saving ? t('transaction.deliveryEmail.saving') : t('transaction.deliveryEmail.confirmButton')}
        </button>
      </div>
      <p className="text-xs mt-2" style={{ color: MUTED }}>
        {t('transaction.deliveryEmail.hint')}
      </p>
      {error && <p className="text-xs mt-2 text-red-600">{error}</p>}
    </div>
  );
}
