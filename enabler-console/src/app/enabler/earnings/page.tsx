'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enablerApi } from '@/lib/api';
import { 
  CurrencyDollarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BanknotesIcon,
  ClockIcon,
  CheckCircleIcon,
  CalendarIcon,
  DocumentTextIcon
} from '@heroicons/react/24/outline';

export default function EarningsWallet() {
  const [selectedPeriod, setSelectedPeriod] = useState('this-month');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);

  const { data: earningsData, isLoading, error } = useQuery({
    queryKey: ['enabler-earnings'],
    queryFn: () => enablerApi.getEarnings()
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading earnings data</p>
      </div>
    );
  }

  const walletData = earningsData?.data?.wallet || {};
  const transactions = earningsData?.data?.transactions || [];
  const payoutMethods = earningsData?.data?.payoutMethods || [];

  const getTransactionIcon = (type: string, status: string) => {
    if (type === 'payout') {
      return <ArrowDownIcon className="h-5 w-5 text-red-500" />;
    }
    if (status === 'pending') {
      return <ClockIcon className="h-5 w-5 text-yellow-500" />;
    }
    return <ArrowUpIcon className="h-5 w-5 text-green-500" />;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'completed':
        return <span className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">Completed</span>;
      case 'pending':
        return <span className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300 px-2 py-1 rounded-full text-xs font-medium">Pending</span>;
      case 'failed':
        return <span className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 px-2 py-1 rounded-full text-xs font-medium">Failed</span>;
      default:
        return <span className="bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300 px-2 py-1 rounded-full text-xs font-medium">Unknown</span>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Earnings Wallet</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your earnings, commissions, and manage payouts
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <button 
            onClick={() => setShowWithdrawModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
          >
            Request Payout
          </button>
          <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            Download Statement
          </button>
        </div>
      </div>

      {/* Wallet Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Balance</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                KES {(walletData.availableBalance || 0).toLocaleString()}
              </p>
            </div>
            <CurrencyDollarIcon className="h-8 w-8 text-green-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Ready for withdrawal
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Earnings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                KES {(walletData.pendingEarnings || 0).toLocaleString()}
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-yellow-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            Processing tasks
          </p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">This Month</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                KES {(walletData.thisMonthEarnings || 0).toLocaleString()}
              </p>
            </div>
            <CalendarIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex items-center mt-2">
            <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+23% from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Lifetime</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                KES {(walletData.totalEarnings || 0).toLocaleString()}
              </p>
            </div>
            <BanknotesIcon className="h-8 w-8 text-purple-500" />
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            All-time earnings
          </p>
        </div>
      </div>

      {/* Commission Structure */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Commission Structure</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-2xl">🏆</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white">{walletData.rank || 'Gold'} Enabler</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Current Rank</p>
          </div>
          <div className="text-center">
            <div className="bg-green-100 dark:bg-green-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-green-600">{walletData.commissionRate || 15}%</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Base Commission</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Per completed task</p>
          </div>
          <div className="text-center">
            <div className="bg-blue-100 dark:bg-blue-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-3">
              <span className="text-xl font-bold text-blue-600">+{walletData.rankBonus || 5}%</span>
            </div>
            <h4 className="font-semibold text-gray-900 dark:text-white">Rank Bonus</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400">Additional earnings</p>
          </div>
        </div>
      </div>

      {/* Payout Schedule */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payout Schedule</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Last Payout</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{walletData.lastPayoutDate || 'N/A'}</p>
            <p className="text-sm text-green-600">KES 1,200.00 paid to M-Pesa</p>
          </div>
          <div>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">Next Scheduled Payout</p>
            <p className="text-lg font-semibold text-gray-900 dark:text-white">{walletData.nextPayoutDate || 'N/A'}</p>
            <p className="text-sm text-blue-600">Monthly automatic payout</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Transaction History</h3>
          <select 
            value={selectedPeriod} 
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="border border-gray-300 dark:border-gray-600 rounded-md px-3 py-1 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="this-month">This Month</option>
            <option value="last-month">Last Month</option>
            <option value="last-3-months">Last 3 Months</option>
            <option value="all-time">All Time</option>
          </select>
        </div>
        
        <div className="space-y-4">
          {transactions.map((transaction) => (
            <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-4">
                <div className="flex-shrink-0">
                  {getTransactionIcon(transaction.type, transaction.status)}
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{transaction.description}</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <p className="text-sm text-gray-600 dark:text-gray-400">{transaction.date}</p>
                    {transaction.taskId && (
                      <span className="text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-2 py-1 rounded">
                        {transaction.taskId}
                      </span>
                    )}
                    {getStatusBadge(transaction.status)}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className={`font-semibold ${
                  transaction.amount > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {transaction.amount > 0 ? '+' : ''}KES {Math.abs(transaction.amount).toLocaleString()}
                </p>
                {transaction.commission && (
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {transaction.commission}% commission
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payout Methods */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payout Methods</h3>
        <div className="space-y-3">
          {payoutMethods.map((method) => (
            <div key={method.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                  <BanknotesIcon className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{method.name}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {method.number || method.account || method.email}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                {method.primary && (
                  <span className="bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 px-2 py-1 rounded-full text-xs font-medium">
                    Primary
                  </span>
                )}
                <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
              </div>
            </div>
          ))}
        </div>
        <button className="w-full mt-4 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
          Add New Payout Method
        </button>
      </div>

      {/* Withdraw Modal */}
      {showWithdrawModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Request Payout</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Amount (KES)
                </label>
                <input 
                  type="number" 
                  max={walletData.availableBalance || 0}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Enter amount"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Available: KES {(walletData.availableBalance || 0).toLocaleString()}
                </p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Payout Method
                </label>
                <select className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                  {payoutMethods.map((method) => (
                    <option key={method.id} value={method.id}>
                      {method.name} - {method.number || method.account || method.email}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex space-x-3 mt-6">
              <button 
                onClick={() => setShowWithdrawModal(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Cancel
              </button>
              <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                Request Payout
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}