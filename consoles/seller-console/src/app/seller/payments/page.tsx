'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiService } from '@/lib/api';

interface PaymentData {
  balance: {
    available: number;
    pending: number;
    totalFees: number;
    successRate: number;
  };
  transactions: Array<{
    id: string;
    orderNumber: string;
    customer: string;
    amount: number;
    method: string;
    status: string;
    date: string;
    fee: number;
    reference: string;
  }>;
  payouts: Array<{
    id: string;
    amount: number;
    method: string;
    status: string;
    date: string;
    reference: string;
    bankAccount?: string;
    phoneNumber?: string;
    processingFee: number;
  }>;
  analytics: {
    nextPayout: {
      date: string;
      amount: number;
    };
    averageTransaction: {
      amount: number;
      growth: number;
      period: string;
    };
    failedTransactions: {
      rate: number;
      change: number;
      period: string;
    };
    volumeTrend: Array<{
      date: string;
      volume: number;
      transactions: number;
    }>;
  };
  stats: {
    totalTransactions: number;
    completedTransactions: number;
    pendingTransactions: number;
    failedTransactions: number;
    totalVolume: number;
    totalFees: number;
    averageTransactionValue: number;
    paymentSuccessRate: number;
  };
}

export default function PaymentsPage() {
  const [activeTab, setActiveTab] = useState('overview');

  const { data, isLoading, error } = useQuery({
    queryKey: ['payments'],
    queryFn: async () => {
      const response = await apiService.getPayments();
      return response.data.data as PaymentData;
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white p-6 rounded-lg">
                <div className="h-4 bg-gray-200 rounded w-1/2 mb-2"></div>
                <div className="h-8 bg-gray-200 rounded w-3/4"></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Records</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage your payment transaction history</p>
          </div>
          <div className="flex space-x-3">
            <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
              Export Records
            </button>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              View Statement
            </button>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <p className="text-gray-500 dark:text-gray-400">No payment data available.</p>
        </div>
      </div>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'failed': return 'bg-red-100 text-red-800';
      case 'scheduled': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payment Records</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">View and manage your payment transaction history</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Export Records
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            View Statement
          </button>
        </div>
      </div>

      {data?.balance && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Available Balance</p>
            <p className="text-2xl font-bold text-green-600">TZS {data.balance.available?.toLocaleString() || '0'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Ready for payout</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Pending Payments</p>
            <p className="text-2xl font-bold text-yellow-600">TZS {data.balance.pending?.toLocaleString() || '0'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Processing</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Fees</p>
            <p className="text-2xl font-bold text-red-600">TZS {data.balance.totalFees?.toLocaleString() || '0'}</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This month</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
            <p className="text-2xl font-bold text-blue-600">{data.balance.successRate || 0}%</p>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Payment success</p>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'transactions', label: 'Transactions' },
              { id: 'payouts', label: 'Payouts' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && data && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Volume Trend</h3>
                  <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400">Payment volume chart placeholder</p>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Payment Statistics</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Total Transactions</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">All time</p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">{data.stats?.totalTransactions?.toLocaleString() || '0'}</p>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Total Volume</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">All time</p>
                      </div>
                      <p className="text-lg font-semibold text-gray-900 dark:text-white">TZS {data.stats?.totalVolume?.toLocaleString() || '0'}</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Next Payout</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{formatDate(data.analytics?.nextPayout?.date || '')}</p>
                  <p className="text-sm text-blue-600">TZS {data.analytics?.nextPayout?.amount?.toLocaleString() || '0'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Average Transaction</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">TZS {data.analytics?.averageTransaction?.amount?.toLocaleString() || '0'}</p>
                  <p className="text-sm text-green-500">↑ {data.analytics?.averageTransaction?.growth || 0}% from last {data.analytics?.averageTransaction?.period || 'month'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Failed Transactions</p>
                  <p className="text-lg font-semibold text-gray-900 dark:text-white">{data.analytics?.failedTransactions?.rate || 0}%</p>
                  <p className="text-sm text-red-500">↓ {Math.abs(data.analytics?.failedTransactions?.change || 0)}% from last {data.analytics?.failedTransactions?.period || 'month'}</p>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'transactions' && data && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Transactions</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Search transactions..."
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                  <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                    <option>All Status</option>
                    <option>Completed</option>
                    <option>Pending</option>
                    <option>Failed</option>
                  </select>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Method</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fee</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(data.transactions || []).map((transaction) => (
                      <tr key={transaction.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-sm font-medium text-blue-600">{transaction.orderNumber}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{transaction.customer}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">TZS {transaction.amount?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{transaction.method}</td>
                        <td className="px-4 py-2 text-sm text-red-600">TZS {transaction.fee?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(transaction.status)}`}>
                            {transaction.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{formatDate(transaction.date)}</td>
                        <td className="px-4 py-2">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-800 text-xs">View</button>
                            {transaction.status === 'failed' && (
                              <button className="text-green-600 hover:text-green-800 text-xs">Retry</button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'payouts' && data && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Payout History</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  Schedule Payout
                </button>
              </div>
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-medium text-blue-900 dark:text-blue-100">Available for Payout</h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300">Your current available balance</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-900 dark:text-blue-100">TZS {data.balance?.available?.toLocaleString() || '0'}</p>
                    <button className="mt-1 px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700">
                      Request Payout
                    </button>
                  </div>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reference</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Amount</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Method</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Fee</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(data.payouts || []).map((payout) => (
                      <tr key={payout.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-sm font-medium text-blue-600">{payout.reference}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">TZS {payout.amount?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{payout.method}</td>
                        <td className="px-4 py-2 text-sm text-red-600">TZS {payout.processingFee?.toLocaleString() || '0'}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(payout.status)}`}>
                            {payout.status}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{formatDate(payout.date)}</td>
                        <td className="px-4 py-2">
                          <button className="text-blue-600 hover:text-blue-800 text-xs">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}