import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import { CreditCard, CheckCircle, AlertCircle, Clock } from 'lucide-react';
import { useUser } from '@/app/contexts/UserContext';
import { VerificationHelper } from '@/lib/verification';
import { BackButton } from '@/app/components/BackButton';
import { usersService } from '@/api/services/users.service';
import type { MyBankAccount } from '@/api/types/users';

const CBU_CVU_LENGTH = 22;

export function BankAccountPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useUser();
  const [bankAccount, setBankAccount] = useState<MyBankAccount | null>(null);
  const [bankLoading, setBankLoading] = useState(true);
  const [holderName, setHolderName] = useState('');
  const [cbuOrCvu, setCbuOrCvu] = useState('');
  const [alias, setAlias] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

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
        if (!cancelled) setBankLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const isSeller = VerificationHelper.isSeller(user);
  const hasBankAccount = Boolean(bankAccount);
  const verified = user?.bankDetailsVerified === true;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const trimmedHolder = holderName.trim();
    const trimmedCbu = cbuOrCvu.trim().replace(/\s/g, '');

    if (!trimmedHolder) {
      setError(t('bankAccount.holderNameRequired'));
      return;
    }
    if (!trimmedCbu) {
      setError(t('bankAccount.cbuOrCvuRequired'));
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
      const updated = await usersService.getBankAccount();
      if (updated) {
        setBankAccount(updated);
        setHolderName(updated.holderName ?? '');
        setCbuOrCvu(updated.cbuOrCvu ?? '');
        setAlias(updated.alias ?? '');
      }
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : t('bankAccount.saveFailed'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-lg mx-auto px-4">
        <BackButton />

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <div className="flex items-center gap-3 mb-6">
            <CreditCard className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                {t('bankAccount.title')}
              </h1>
              <p className="text-gray-600 text-sm mt-0.5">
                {t('bankAccount.subtitle')}
              </p>
            </div>
          </div>

          {!isSeller && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-semibold text-amber-900">
                  {t('bankAccount.sellerOnlyTitle')}
                </p>
                <p className="text-sm text-amber-800 mt-1">
                  {t('bankAccount.sellerOnlyMessage')}
                </p>
                <Link
                  to="/user-profile"
                  className="inline-block mt-3 text-sm font-semibold text-amber-700 hover:text-amber-800"
                >
                  {t('bankAccount.backToProfile')}
                </Link>
              </div>
            </div>
          )}

          {hasBankAccount && verified && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0" />
              <p className="text-sm text-green-800">{t('bankAccount.verified')}</p>
            </div>
          )}

          {hasBankAccount && !verified && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex items-center gap-3">
              <Clock className="w-5 h-5 text-amber-600 flex-shrink-0" />
              <p className="text-sm text-amber-800">{t('bankAccount.pendingApproval')}</p>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6 flex items-center gap-2 text-red-700">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6 flex items-center gap-2 text-green-800">
              <CheckCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{t('bankAccount.saved')}</p>
            </div>
          )}

          {isSeller && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('bankAccount.holderName')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={holderName}
                  onChange={(e) => setHolderName(e.target.value)}
                  placeholder={t('bankAccount.holderNamePlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('bankAccount.cbuOrCvu')} <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  value={cbuOrCvu}
                  onChange={(e) => setCbuOrCvu(e.target.value.replace(/\D/g, '').slice(0, CBU_CVU_LENGTH))}
                  placeholder={t('bankAccount.cbuOrCvuPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  maxLength={CBU_CVU_LENGTH}
                />
                <p className="text-xs text-gray-500 mt-1">{t('bankAccount.cbuOrCvuHint')}</p>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {t('bankAccount.alias')}
                </label>
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                  placeholder={t('bankAccount.aliasPlaceholder')}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                disabled={saving}
                className="w-full py-3 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />
                    {t('bankAccount.saving')}
                  </>
                ) : (
                  t('bankAccount.save')
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
