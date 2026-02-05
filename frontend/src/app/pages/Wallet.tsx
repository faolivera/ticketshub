import { useState } from 'react';
import { Wallet as WalletIcon, DollarSign, Clock, CheckCircle, ArrowUpRight, TrendingUp, Calendar } from 'lucide-react';

interface Transaction {
  id: string;
  eventName: string;
  ticketType: string;
  amount: number;
  status: 'pending' | 'released' | 'completed';
  buyer: string;
  saleDate: string;
  releaseDate: string;
  transactionDate?: string;
}

const mockTransactions: Transaction[] = [
  {
    id: '1',
    eventName: 'Summer Music Festival',
    ticketType: 'VIP',
    amount: 250,
    status: 'completed',
    buyer: 'Alice Johnson',
    saleDate: 'January 10, 2026',
    releaseDate: 'January 13, 2026',
    transactionDate: 'January 13, 2026'
  },
  {
    id: '2',
    eventName: 'Rock Night',
    ticketType: 'General Admission',
    amount: 125,
    status: 'pending',
    buyer: 'Bob Smith',
    saleDate: 'January 18, 2026',
    releaseDate: 'January 25, 2026'
  },
  {
    id: '3',
    eventName: 'Jazz Evening',
    ticketType: 'Premium',
    amount: 175,
    status: 'completed',
    buyer: 'Carol White',
    saleDate: 'January 5, 2026',
    releaseDate: 'January 8, 2026',
    transactionDate: 'January 8, 2026'
  },
  {
    id: '4',
    eventName: 'Tech Conference 2026',
    ticketType: 'Early Bird',
    amount: 300,
    status: 'pending',
    buyer: 'David Brown',
    saleDate: 'January 20, 2026',
    releaseDate: 'January 27, 2026'
  },
  {
    id: '5',
    eventName: 'Comedy Show',
    ticketType: 'Front Row',
    amount: 80,
    status: 'completed',
    buyer: 'Emma Davis',
    saleDate: 'December 28, 2025',
    releaseDate: 'December 31, 2025',
    transactionDate: 'December 31, 2025'
  },
  {
    id: '6',
    eventName: 'Food Festival',
    ticketType: 'All Access',
    amount: 95,
    status: 'completed',
    buyer: 'Frank Miller',
    saleDate: 'December 20, 2025',
    releaseDate: 'December 23, 2025',
    transactionDate: 'December 23, 2025'
  },
  {
    id: '7',
    eventName: 'Theater Performance',
    ticketType: 'Balcony',
    amount: 60,
    status: 'released',
    buyer: 'Grace Lee',
    saleDate: 'January 15, 2026',
    releaseDate: 'January 22, 2026',
    transactionDate: 'January 22, 2026'
  }
];

export function Wallet() {
  const [transactions] = useState<Transaction[]>(mockTransactions);
  const [activeTab, setActiveTab] = useState<'all' | 'pending'>('all');

  // Calculate stats
  const pendingTransactions = transactions.filter(t => t.status === 'pending');
  const completedTransactions = transactions.filter(t => t.status === 'completed' || t.status === 'released');
  
  const pendingAmount = pendingTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Last month earnings (January 2026)
  const lastMonthTransactions = completedTransactions.filter(t => {
    const transDate = new Date(t.transactionDate || '');
    return transDate.getMonth() === 0 && transDate.getFullYear() === 2026;
  });
  const lastMonthEarnings = lastMonthTransactions.reduce((sum, t) => sum + t.amount, 0);
  
  // Last year earnings (2025)
  const lastYearTransactions = completedTransactions.filter(t => {
    const transDate = new Date(t.transactionDate || '');
    return transDate.getFullYear() === 2025;
  });
  const lastYearEarnings = lastYearTransactions.reduce((sum, t) => sum + t.amount, 0);

  const filteredTransactions = activeTab === 'pending' 
    ? pendingTransactions 
    : transactions.slice(0, 10);

  const getStatusBadge = (status: Transaction['status']) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
            <Clock className="w-4 h-4" />
            Pending
          </span>
        );
      case 'released':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
            <ArrowUpRight className="w-4 h-4" />
            Released
          </span>
        );
      case 'completed':
        return (
          <span className="inline-flex items-center gap-1 px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm">
            <CheckCircle className="w-4 h-4" />
            Completed
          </span>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">My Wallet</h1>

        {/* Overview Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          {/* Pending Money */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="w-6 h-6 text-yellow-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600">Pending Transfer</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">${pendingAmount.toFixed(2)}</p>
            <p className="text-sm text-gray-600 mt-1">
              {pendingTransactions.length} transaction{pendingTransactions.length !== 1 ? 's' : ''} waiting
            </p>
          </div>

          {/* Last Month Earnings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-blue-100 rounded-lg">
                <Calendar className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600">Last Month</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">${lastMonthEarnings.toFixed(2)}</p>
            <p className="text-sm text-gray-600 mt-1">
              January 2026
            </p>
          </div>

          {/* Last Year Earnings */}
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-green-100 rounded-lg">
                <TrendingUp className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="text-sm font-semibold text-gray-600">Last Year</h3>
            </div>
            <p className="text-3xl font-bold text-gray-900">${lastYearEarnings.toFixed(2)}</p>
            <p className="text-sm text-gray-600 mt-1">
              2025 Total
            </p>
          </div>
        </div>

        {/* Info Banner */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3">
            <WalletIcon className="w-5 h-5 text-blue-600 mt-0.5" />
            <div>
              <h4 className="font-semibold text-blue-900 mb-1">How payments work</h4>
              <p className="text-sm text-blue-800">
                Funds are held for 7 days after ticket sale completion to ensure buyer satisfaction. 
                After the retention period, money is automatically transferred to your account.
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
                Transaction History
              </button>
              <button
                onClick={() => setActiveTab('pending')}
                className={`pb-4 px-1 border-b-2 font-semibold transition-colors ${
                  activeTab === 'pending'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                Pending ({pendingTransactions.length})
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
                    Event
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Buyer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Sale Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Release Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredTransactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-semibold text-gray-900">{transaction.eventName}</p>
                        <p className="text-sm text-gray-600">{transaction.ticketType}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-gray-900">
                      {transaction.buyer}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-gray-900">${transaction.amount}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {transaction.saleDate}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {transaction.releaseDate}
                    </td>
                    <td className="px-6 py-4">
                      {getStatusBadge(transaction.status)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length === 0 && (
            <div className="p-12 text-center">
              <DollarSign className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                No transactions yet
              </h3>
              <p className="text-gray-600">
                {activeTab === 'pending' 
                  ? 'You have no pending transactions'
                  : 'Your transaction history will appear here'
                }
              </p>
            </div>
          )}
        </div>

        {activeTab === 'all' && transactions.length > 10 && (
          <p className="text-sm text-gray-600 mt-4 text-center">
            Showing last 10 transactions
          </p>
        )}
      </div>
    </div>
  );
}
