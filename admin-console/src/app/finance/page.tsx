// Professional Financial Dashboard Page
// Complete revenue and commission tracking with advanced analytics

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CurrencyDollarIcon,
  BanknotesIcon,
  ChartBarIcon,
  ArrowDownTrayIcon,
  CalendarDaysIcon,
  CreditCardIcon,
  ReceiptRefundIcon,
  UserGroupIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils';

interface RevenueData {
  date: string;
  revenue: number;
  orders: number;
  averageOrderValue: number;
}

interface PayoutData {
  id: string;
  sellerId: string;
  sellerName: string;
  amount: number;
  status: 'pending' | 'processing' | 'paid' | 'failed';
  dueDate: string;
  createdAt: string;
}

interface TransactionData {
  id: string;
  type: 'payment' | 'refund' | 'payout' | 'commission';
  amount: number;
  currency: string;
  status: 'success' | 'failed' | 'pending';
  createdAt: string;
  description: string;
  referenceId: string;
}

interface FinancialMetrics {
  totalRevenue: number;
  totalPayouts: number;
  totalCommissions: number;
  pendingPayouts: number;
  failedPayments: number;
  monthlyGrowth: number;
}

const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6'];

export default function FinancePage() {
  const [dateRange, setDateRange] = useState('30d');
  const [selectedTab, setSelectedTab] = useState('overview');

  // Fetch financial metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['financial-metrics', dateRange],
    queryFn: () => apiService.reports.getFinancialReport({
      startDate: getStartDate(dateRange),
      endDate: new Date().toISOString().split('T')[0],
      reportType: 'overview'
    }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch revenue data for charts
  const { data: revenueChartData, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-chart', dateRange],
    queryFn: () => apiService.finance.getRevenue({
      startDate: getStartDate(dateRange),
      endDate: new Date().toISOString().split('T')[0],
      groupBy: dateRange.includes('d') ? 'day' : 'month'
    }),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch payouts
  const { data: payoutsData, isLoading: payoutsLoading } = useQuery({
    queryKey: ['payouts', dateRange],
    queryFn: () => apiService.finance.getPayouts({
      page: 1,
      limit: 50
    }),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch transactions
  const { data: transactionsData, isLoading: transactionsLoading } = useQuery({
    queryKey: ['transactions', dateRange],
    queryFn: () => apiService.finance.getTransactions({
      startDate: getStartDate(dateRange),
      endDate: new Date().toISOString().split('T')[0],
      page: 1,
      limit: 100
    }),
    staleTime: 2 * 60 * 1000,
  });

  const metrics = metricsData?.data || {
    totalRevenue: 0,
    totalPayouts: 0,
    totalCommissions: 0,
    pendingPayouts: 0,
    failedPayments: 0,
    monthlyGrowth: 0
  };

  const revenueData = revenueChartData?.data || [];
  const payouts = payoutsData?.data || [];
  const transactions = transactionsData?.data || [];

  // Helper function to get start date based on range
  function getStartDate(range: string): string {
    const now = new Date();
    switch (range) {
      case '7d':
        now.setDate(now.getDate() - 7);
        break;
      case '30d':
        now.setDate(now.getDate() - 30);
        break;
      case '90d':
        now.setDate(now.getDate() - 90);
        break;
      case '1y':
        now.setFullYear(now.getFullYear() - 1);
        break;
      default:
        now.setDate(now.getDate() - 30);
    }
    return now.toISOString().split('T')[0];
  }

  // Prepare chart data
  const chartData = revenueData.map((item: RevenueData) => ({
    date: formatDate(item.date),
    revenue: item.revenue,
    orders: item.orders,
    averageOrderValue: item.averageOrderValue
  }));

  // Payouts table columns
  const payoutColumns: Column<PayoutData>[] = [
    {
      key: 'sellerName',
      header: 'Seller',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">ID: {row.sellerId}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value) => formatCurrency(value, 'USD'),
      className: 'text-right',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(value)}`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (value) => formatDate(value),
    },
  ];

  // Transactions table columns
  const transactionColumns: Column<TransactionData>[] = [
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(value)}`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      sortable: true,
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value, row) => (
        <span className={row.type === 'refund' ? 'text-red-600' : 'text-green-600'}>
          {row.type === 'refund' ? '-' : '+'}{formatCurrency(Math.abs(value), row.currency)}
        </span>
      ),
      className: 'text-right',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(value)}`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (value) => formatDate(value),
    },
  ];

  const tabs = [
    { id: 'overview', name: 'Overview', icon: ChartBarIcon },
    { id: 'revenue', name: 'Revenue', icon: CurrencyDollarIcon },
    { id: 'payouts', name: 'Payouts', icon: BanknotesIcon },
    { id: 'transactions', name: 'Transactions', icon: CreditCardIcon },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Revenue, payouts, and commission tracking
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>

          <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700">
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CurrencyDollarIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Total Revenue
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(metrics.totalRevenue, 'USD')}
              </dd>
              <div className="text-sm text-green-600 dark:text-green-400">
                +{metrics.monthlyGrowth}% from last month
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BanknotesIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Total Payouts
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(metrics.totalPayouts, 'USD')}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserGroupIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Pending Payouts
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {formatCurrency(metrics.pendingPayouts, 'USD')}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ReceiptRefundIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Failed Payments
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.failedPayments}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id as any)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-4 h-4 mr-2" />
                {tab.name}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="space-y-6">
          {/* Revenue Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Revenue Trends
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any, name: string) => [
                      name === 'revenue' ? formatCurrency(value, 'USD') : value,
                      name === 'revenue' ? 'Revenue' : name === 'orders' ? 'Orders' : 'Avg Order Value'
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3B82F6"
                    strokeWidth={2}
                    dot={{ fill: '#3B82F6' }}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#10B981"
                    strokeWidth={2}
                    dot={{ fill: '#10B981' }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Recent Transactions */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Recent Transactions
            </h3>
            <DataTable
              data={transactions.slice(0, 10)}
              columns={transactionColumns}
              pagination={false}
              loading={transactionsLoading}
              emptyMessage="No transactions found"
            />
          </div>
        </div>
      )}

      {selectedTab === 'revenue' && (
        <div className="space-y-6">
          {/* Revenue Analytics */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Revenue Analytics
            </h3>
            <div className="h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip
                    formatter={(value: any) => [formatCurrency(value, 'USD'), 'Revenue']}
                  />
                  <Bar dataKey="revenue" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {selectedTab === 'payouts' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Seller Payouts
            </h3>
            <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
              Process Payouts
            </button>
          </div>

          <DataTable
            data={payouts}
            columns={payoutColumns}
            pagination={{
              pageSize: 20,
              showInfo: true,
            }}
            loading={payoutsLoading}
            emptyMessage="No payouts found"
          />
        </div>
      )}

      {selectedTab === 'transactions' && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Transaction History
          </h3>

          <DataTable
            data={transactions}
            columns={transactionColumns}
            pagination={{
              pageSize: 20,
              showInfo: true,
            }}
            loading={transactionsLoading}
            emptyMessage="No transactions found"
          />
        </div>
      )}
    </div>
  );
}
