import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { CreditCard, CheckCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useUser } from '@/app/contexts/UserContext';
import { usersService } from '@/api/services/users.service';
import type { MyBankAccount } from '@/api/types/users';
import { Button } from '@/app/components/ui/button';

const CBU_CVU_LENGTH = 22;

export interface StepBankProps {
  onComplete: () => void;
}

export function StepBank({ onComplete }: StepBankProps) {
  const { t } = useTranslation();
  const { refreshUser } = useUser();
  const [bankAccount, setBankAccount] = useState<MyBankAccount | null>(null);
  const [loading, setLoading] = useState(true);
  const [holderName, setHolderName] = useState('');
  const [cbuOrCvu, setCbuOrCvu] = useState('');
  const [alias, setAlias] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    usersService
      .getBankAccount()
      .then((data) => {
        if (!cancelled && data) {
          setBankAccount(data);
          setHolderName(data.holderName ?? '');
          setCbuOrCvu(data.cbuOrCvu ?? '');
          setAlias(data.alias ?? '');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const trimmedHolder = holderName.trim();
    const trimmedCbu = cbuOrCvu.replace(/\D/g, '').slice(0, CBU_CVU_LENGTH);
    if (!trimmedHolder) {
      setError(t('bankAccount.holderNameRequired'));
      return;
    }
    if (trimmedCbu.length !== CBU_CVU_LENGTH || !/^\d+$/.test(trimmedCbu)) {
      setError(t('bankAccount.cbuOrCvuInvalid'));
      return;
    }
    try {
      setSaving(true);
      await usersService.updateBankAccount({
        holderName: trimmedHolder,
        cbuOrCvu: trimmedCbu,
        alias: alias.trim() || undefined,
      });
      await refreshUser();
      setSubmitted(true);
      onComplete();
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bankAccount.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center rounded-xl border border-gray-200 bg-white p-12 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  if (submitted || bankAccount != null) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100">
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {t('becomeSeller.step4.successTitle')}
            </h2>
            <p className="text-sm text-gray-600">
              {t('becomeSeller.step4.successMessage')}
            </p>
          </div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row">
          <Button asChild className="w-full sm:w-auto">
            <Link to="/sell-ticket">{t('becomeSeller.step4.goToSell')}</Link>
          </Button>
          <Button asChild variant="outline" className="w-full sm:w-auto">
            <Link to="/user-profile">{t('becomeSeller.step4.backToProfile')}</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
          <CreditCard className="h-5 w-5 text-blue-600" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">
            {t('becomeSeller.step4.title')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('becomeSeller.step4.subtitle')}
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('bankAccount.holderName')} *
          </label>
          <input
            type="text"
            value={holderName}
            onChange={(e) => setHolderName(e.target.value)}
            placeholder={t('bankAccount.holderNamePlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('bankAccount.cbuOrCvu')} *
          </label>
          <input
            type="text"
            inputMode="numeric"
            value={cbuOrCvu}
            onChange={(e) =>
              setCbuOrCvu(e.target.value.replace(/\D/g, '').slice(0, CBU_CVU_LENGTH))
            }
            placeholder={t('bankAccount.cbuOrCvuPlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 font-mono focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            maxLength={CBU_CVU_LENGTH}
          />
          <p className="mt-1 text-xs text-gray-500">
            {t('bankAccount.cbuOrCvuHint')}
          </p>
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">
            {t('bankAccount.alias')}
          </label>
          <input
            type="text"
            value={alias}
            onChange={(e) => setAlias(e.target.value)}
            placeholder={t('bankAccount.aliasPlaceholder')}
            className="w-full rounded-lg border border-gray-300 px-4 py-3 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <Button type="submit" disabled={saving} className="w-full">
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              {t('bankAccount.saving')}
            </>
          ) : (
            t('bankAccount.save')
          )}
        </Button>
      </form>
    </div>
  );
}
