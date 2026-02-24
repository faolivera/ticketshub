import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Wallet as WalletIcon, DollarSign, Clock, CheckCircle, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { walletService } from '../../api/services/wallet.service';
import { LoadingSpinner } from '../components/LoadingSpinner';
import { ErrorAlert } from '../components/ErrorMessage';
import { EmptyState } from '../components/EmptyState';
import type { Wallet as WalletType, WalletTransaction, WalletTransactionType } from '../../api/types';
import { useUser } from '../contexts/UserContext';

/**
 * Format money amount from cents to display
 */
function formatMoney(amount: number, currency: string = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);
}

/**
 * Get transaction type badge
 */
function getTransactionTypeBadge(type: WalletTransactionType, t: (key: string) => string) {
  switch (type) {
    case 'credit':
      return {
        label: t('wallet.credit'),
        color: 'bg-green-100 text-green-800',
        icon: ArrowDownRight,
      };
    case 'debit':
      return {
        label: t('wallet.debit'),
        color: 'bg-red-100 text-red-800',
        icon: ArrowUpRight,
      };
    case 'hold':
      return {
        label: t('wallet.hold'),
        color: 'bg-yellow-100 text-yellow-800',
        icon: Clock,
      };
    case 'release':
      return {
        label: t('wallet.release'),
        color: 'bg-blue-100 text-blue-800',
        icon: CheckCircle,
      };
    default:
      return {
        label: type,
        color: 'bg-gray-100 text-gray-800',
        icon: DollarSign,
      };
  }
}

export function Wallet() {
  const { t } = useTranslation();
  const { isAuthenticated } = useUser();
  
  const [wallet, setWallet] = useState<WalletType | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

  // Fetch wallet and transactions
  useEffect(() => {
    async function fetchData() {
      if (!isAuthenticated) return;
      
      setIsLoading(true);
      setError(null);
      
      try {
        const [walletData, transactionsData] = await Promise.all([
          walletService.getWallet(),
          walletService.getTransactions(),
        ]);
        
        setWallet(walletData);
        setTransactions(transactionsData);
      } catch (err) {
        console.error('Failed to fetch wallet data:', err);
        setError(t('wallet.errorLoading'));
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [isAuthenticated, t]);

  // Not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <EmptyState
          icon={WalletIcon}
          title={t('wallet.loginRequired')}
          description={t('wallet.mustBeLoggedIn')}
          action={{
            label: t('wallet.loginToView'),
            to: '/register',
          }}
        />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <LoadingSpinner 
        size="lg" 
        text={t('common.loading')} 
        fullScreen 
      />
    );
  }

  // Filter transactions
  const pendingTransactions = transactions.filter(t => t.type === 'hold');
  const filteredTransactions = activeTab === 'pending' 
    ? pendingTransactions 
    : transactions.slice(0, 20);

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('wallet.title')}</h1>

        {error && (
          <ErrorAlert message={error} className="mb-6" />
        )}

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Available Balance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <DollarSign className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600">{t('wallet.availableBalance')}</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {wallet ? formatMoney(wallet.balance.amount, wallet.balance.currency) : '$0.00'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t('wallet.readyToWithdraw')}
            </p>
          </div>

          {/* Pending Balance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600">{t('wallet.pendingBalance')}</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {wallet ? formatMoney(wallet.pendingBalance.amount, wallet.pendingBalance.currency) : '$0.00'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t('wallet.inEscrow')}
            </p>
          </div>

          {/* Total Balance */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <WalletIcon className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600">{t('wallet.totalBalance')}</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">
              {wallet ? formatMoney(
                wallet.balance.amount + wallet.pendingBalance.amount, 
                wallet.balance.currency
              ) : '$0.00'}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t('wallet.availablePlusPending')}
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <WalletIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">{t('wallet.howPaymentsWork')}</h4>
              <p className="text-sm text-blue-800">
                {t('wallet.paymentExplanation')}
              </p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <div className="flex gap-8">
              <button
                onClick={() => setActiveTab('all')}
                className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                  activeTab === 'all'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('wallet.transactionHistory')}
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                  activeTab === 'pending'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {t('wallet.pending')} ({pendingTransactions.length})
              </button>
            </div>
          </div>
        </div>

        {/* Transactions Table */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('wallet.description')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('wallet.reference')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('wallet.amount')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('wallet.date')}
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    {t('wallet.type')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => {
                  const badge = getTransactionTypeBadge(transaction.type, t);
                  const BadgeIcon = badge.icon;
                  const isPositive = transaction.type === 'credit' || transaction.type === 'release';
                  
                  return (
                    <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-gray-900">{transaction.description}</p>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {transaction.reference}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`font-semibold ${isPositive ? 'text-green-600' : 'text-gray-900'}`}>
                          {isPositive ? '+' : '-'}{formatMoney(transaction.amount.amount, transaction.amount.currency)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(transaction.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric',
                        })}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm ${badge.color}`}>
                          <BadgeIcon className="w-4 h-4" />
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="p-12">
              <EmptyState
                icon={DollarSign}
                title={t('wallet.noTransactions')}
                description={activeTab === 'pending' 
                  ? t('wallet.noPendingTransactions')
                  : t('wallet.transactionHistoryEmpty')
                }
              />
            </div>
          )}
        </div>

        {activeTab === 'all' && transactions.length > 20 && (
          <p className="text-sm text-gray-600 mt-4 text-center">
            {t('wallet.showingLast20')}
          </p>
        )}
      </div>
    </div>
  );
}
