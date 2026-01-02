"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '@/lib/api';
import { formatDate, formatCurrency, capitalize } from '@/lib/utils';

interface RevenueData {
  date: string;
  totalRevenue: number;
  platformFees: number;
  commissions: number;
  refunds: number;
  chargebacks: number;
  netRevenue: number;
}

interface PaymentGateway {
  id: string;
  name: string;
  provider: 'stripe' | 'paypal' | 'square' | 'adyen';
  status: 'active' | 'inactive' | 'maintenance';
  transactionFee: number;
  monthlyFee: number;
  successRate: number;
  avgProcessingTime: number;
  totalVolume: number;
  totalTransactions: number;
  lastHealthCheck: string;
  configuration: Record<string, unknown>;
}

interface Chargeback {
  id: string;
  transactionId: string;
  orderId: string;
  customerId: string;
  sellerId: string;
  amount: number;
  reason: string;
  status: 'pending' | 'accepted' | 'disputed' | 'won' | 'lost';
  createdAt: string;
  dueDate: string;
  evidence: string[];
  responseSubmitted: boolean;
}

interface CommissionRule {
  id: string;
  name: string;
  role: 'seller' | 'enabler' | 'supplier';
  tier: string;
  category: string;
  commissionRate: number;
  minimumAmount: number;
  maximumAmount?: number;
  effectiveFrom: string;
  effectiveTo?: string;
  isActive: boolean;
}

export default function FinancialOversightPage() {
  const [activeTab, setActiveTab] = useState<'analytics' | 'gateways' | 'chargebacks' | 'commissions'>('analytics');
  const [dateRange, setDateRange] = useState('30d');
  const [selectedChargeback, setSelectedChargeback] = useState<Chargeback | null>(null);
  const [showCommissionModal, setShowCommissionModal] = useState(false);
  const [editingCommission, setEditingCommission] = useState<CommissionRule | null>(null);

  // Fetch revenue analytics
  const { data: revenueData, isLoading: revenueLoading } = useQuery({
    queryKey: ['revenue-analytics', dateRange],
    queryFn: () => apiService.finance.getRevenueAnalytics(dateRange),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch payment gateways
  const { data: gatewaysData, isLoading: gatewaysLoading, refetch: refetchGateways } = useQuery({
    queryKey: ['payment-gateways'],
    queryFn: () => apiService.finance.getPaymentGateways(),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch chargebacks
  const { data: chargebacksData, isLoading: chargebacksLoading, refetch: refetchChargebacks } = useQuery({
    queryKey: ['chargebacks'],
    queryFn: () => apiService.finance.getChargebacks(),
    staleTime: 30 * 1000,
  });

  // Fetch commission rules
  const { data: commissionsData, isLoading: commissionsLoading, refetch: refetchCommissions } = useQuery({
    queryKey: ['commission-rules'],
    queryFn: () => apiService.finance.getCommissionRules(),
    staleTime: 5 * 60 * 1000,
  });

  const revenue = revenueData?.data || [];
  const gateways = gatewaysData?.data || [];
  const chargebacks = chargebacksData?.data || [];
  const commissions = commissionsData?.data || [];

  // Mutations
  const updateGatewayMutation = useMutation({
    mutationFn: ({ id, config }: { id: string; config: Record<string, unknown> }) =>
      apiService.finance.updateGatewayConfig(id, config),
    onSuccess: () => {
      toast.success('Gateway configuration updated');
      refetchGateways();
    },
    onError: () => {
      toast.error('Failed to update gateway');
    },
  });

  const respondChargebackMutation = useMutation({
    mutationFn: ({ id, evidence }: { id: string; evidence: string[] }) =>
      apiService.finance.respondToChargeback(id, evidence),
    onSuccess: () => {
      toast.success('Chargeback response submitted');
      refetchChargebacks();
      setSelectedChargeback(null);
    },
    onError: () => {
      toast.error('Failed to submit chargeback response');
    },
  });

  const updateCommissionMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CommissionRule> }) =>
      apiService.finance.updateCommissionRule(id, data),
    onSuccess: () => {
      toast.success('Commission rule updated');
      refetchCommissions();
    },
    onError: () => {
      toast.error('Failed to update commission rule');
    },
  });

  // Calculate totals
  const totalRevenue = revenue.reduce((sum: number, item: RevenueData) => sum + item.totalRevenue, 0);
  const totalCommissions = revenue.reduce((sum: number, item: RevenueData) => sum + item.commissions, 0);
  const totalChargebacks = chargebacks.reduce((sum: number, item: Chargeback) => sum + item.amount, 0);
  const pendingChargebacks = chargebacks.filter((cb: Chargeback) => cb.status === 'pending');

  // Gateway columns
  const gatewayColumns: Column<PaymentGateway>[] = [
    {
      key: 'name',
      header: 'Gateway',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{capitalize(row.provider)}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'maintenance' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        }`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'successRate',
      header: 'Success Rate',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <span className={`font-medium ${
            value >= 95 ? 'text-green-600' :
            value >= 90 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {value.toFixed(1)}%
          </span>
          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                value >= 95 ? 'bg-green-500' :
                value >= 90 ? 'bg-yellow-500' :
                'bg-red-500'
              }`}
              style={{ width: `${value}%` }}
            ></div>
          </div>
        </div>
      ),
    },
    {
      key: 'totalVolume',
      header: 'Volume',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(value)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.totalTransactions.toLocaleString()} txns
          </div>
        </div>
      ),
    },
    {
      key: 'transactionFee',
      header: 'Fees',
      render: (value, row) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">{value}% + {formatCurrency(row.monthlyFee)}/mo</div>
        </div>
      ),
    },
    {
      key: 'avgProcessingTime',
      header: 'Avg Time',
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{value}s</span>
      ),
    },
  ];

  // Chargeback columns
  const chargebackColumns: Column<Chargeback>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'orderId',
      header: 'Order',
      render: (value, row) => (
        <div>
          <div className="font-mono text-sm text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">Txn: {row.transactionId}</div>
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-red-600">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'reason',
      header: 'Reason',
      render: (value) => (
        <span className="text-sm text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'won' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'lost' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'disputed' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        }`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'dueDate',
      header: 'Due Date',
      sortable: true,
      render: (value) => {
        const isOverdue = new Date(value) < new Date();
        return (
          <span className={isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}>
            {formatDate(value)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedChargeback(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Review
          </button>
          {row.status === 'pending' && !row.responseSubmitted && (
            <button
              onClick={() => setSelectedChargeback(row)}
              className="text-green-600 hover:text-green-900 text-sm font-medium"
            >
              Respond
            </button>
          )}
        </div>
      ),
    },
  ];

  // Commission columns
  const commissionColumns: Column<CommissionRule>[] = [
    {
      key: 'name',
      header: 'Rule Name',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      sortable: true,
      render: (value, row) => {
        const tierColors = {
          // Seller tiers
          'Starter': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
          'Growth': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
          'Premium': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          'Elite': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
          'Partner': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
          // Enabler tiers
          'Trainee': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
          'Associate': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
          'Specialist': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
          'Senior': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
          'Expert': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
          'Master': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
          'Director': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300',
          // Supplier tiers
          'Vendor': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
          'Provider': 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
          'Distributor': 'bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-300',
          'Wholesaler': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
          'Enterprise': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
          'Alliance': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
        };
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tierColors[value as keyof typeof tierColors] || 'bg-gray-100 text-gray-800'}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'category',
      header: 'Category',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
      ),
    },
    {
      key: 'commissionRate',
      header: 'Rate',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900 dark:text-white">{value}%</span>
      ),
    },
    {
      key: 'minimumAmount',
      header: 'Min Amount',
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'isActive',
      header: 'Status',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'effectiveFrom',
      header: 'Effective From',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setEditingCommission(row);
              setShowCommissionModal(true);
            }}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete this commission rule?')) {
                // Handle delete
              }
            }}
            className="text-red-600 hover:text-red-900 text-sm font-medium"
          >
            Delete
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Financial Oversight
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Platform revenue analytics, payment gateway monitoring, and financial operations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="1y">Last Year</option>
          </select>
          
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Financial KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Revenue
            </dt>
            <dd className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalRevenue)}
            </dd>
            <div className="text-sm text-green-600 mt-1">+12.5% vs last period</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Platform Commissions
            </dt>
            <dd className="text-2xl font-bold text-gray-900 dark:text-white">
              {formatCurrency(totalCommissions)}
            </dd>
            <div className="text-sm text-green-600 mt-1">+8.2% vs last period</div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Active Gateways
            </dt>
            <dd className="text-2xl font-bold text-gray-900 dark:text-white">
              {gateways.filter((gw: PaymentGateway) => gw.status === 'active').length}
            </dd>
            <div className="text-sm text-gray-600 mt-1">
              Avg Success: {gateways.length > 0 ? (gateways.reduce((sum: number, gw: PaymentGateway) => sum + gw.successRate, 0) / gateways.length).toFixed(1) : 0}%
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Pending Chargebacks
            </dt>
            <dd className="text-2xl font-bold text-red-600">
              {pendingChargebacks.length}
            </dd>
            <div className="text-sm text-gray-600 mt-1">
              {formatCurrency(totalChargebacks)} total exposure
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Revenue Analytics
          </button>
          <button
            onClick={() => setActiveTab('gateways')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'gateways'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Payment Gateways ({gateways.length})
          </button>
          <button
            onClick={() => setActiveTab('chargebacks')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'chargebacks'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Chargebacks ({pendingChargebacks.length})
          </button>
          <button
            onClick={() => setActiveTab('commissions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'commissions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Commission Rules ({commissions.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          {/* Revenue Chart */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Revenue Trend Analysis
            </h3>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={revenue}>
                  <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip formatter={(value: any) => [formatCurrency(value), '']} />
                  <Line type="monotone" dataKey="totalRevenue" stroke="#3B82F6" strokeWidth={2} name="Total Revenue" />
                  <Line type="monotone" dataKey="commissions" stroke="#10B981" strokeWidth={2} name="Commissions" />
                  <Line type="monotone" dataKey="netRevenue" stroke="#8B5CF6" strokeWidth={2} name="Net Revenue" />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gateways' && (
        <DataTable
          data={gateways}
          columns={gatewayColumns}
          searchable={true}
          searchPlaceholder="Search payment gateways..."
          pagination={{
            pageSize: 10,
            showInfo: true,
          }}
          loading={gatewaysLoading}
          emptyMessage="No payment gateways found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'chargebacks' && (
        <DataTable
          data={chargebacks}
          columns={chargebackColumns}
          searchable={true}
          searchPlaceholder="Search chargebacks..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={chargebacksLoading}
          emptyMessage="No chargebacks found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'commissions' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">Commission Rules</h3>
              <button 
                onClick={() => setShowCommissionModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm"
              >
                Add Rule
              </button>
            </div>
            <DataTable
              data={commissions}
              columns={commissionColumns}
              searchable={true}
              searchPlaceholder="Search commission rules..."
              pagination={{
                pageSize: 15,
                showInfo: true,
              }}
              loading={commissionsLoading}
              emptyMessage="No commission rules found"
              className="shadow-sm"
            />
          </div>
        </div>
      )}

      {/* Chargeback Detail Modal */}
      {selectedChargeback && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setSelectedChargeback(null)}></div>
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Chargeback Details
                </h3>
                <button
                  onClick={() => setSelectedChargeback(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Order ID
                    </label>
                    <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">
                      {selectedChargeback.orderId}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Amount
                    </label>
                    <p className="mt-1 text-sm font-medium text-red-600">
                      {formatCurrency(selectedChargeback.amount)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Reason
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {selectedChargeback.reason}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Created Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formatDate(selectedChargeback.createdAt)}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Due Date
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formatDate(selectedChargeback.dueDate)}
                    </p>
                  </div>
                </div>

                {selectedChargeback.evidence.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Evidence Files
                    </label>
                    <div className="space-y-2">
                      {selectedChargeback.evidence.map((file, index) => (
                        <div key={index} className="bg-gray-50 dark:bg-gray-700 p-3 rounded-lg">
                          <span className="text-sm text-gray-900 dark:text-white">{file}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {selectedChargeback.status === 'pending' && !selectedChargeback.responseSubmitted && (
                  <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={() => setSelectedChargeback(null)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                    >
                      Close
                    </button>
                    <button
                      onClick={() => {
                        const evidence = prompt('Enter evidence details:');
                        if (evidence) {
                          respondChargebackMutation.mutate({
                            id: selectedChargeback.id,
                            evidence: [evidence]
                          });
                        }
                      }}
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      Submit Response
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Commission Rule Modal */}
      {showCommissionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowCommissionModal(false)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  {editingCommission ? 'Edit Commission Rule' : 'Add Commission Rule'}
                </h3>
                <button
                  onClick={() => {
                    setShowCommissionModal(false);
                    setEditingCommission(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <form className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Rule Name
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="Enter rule name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Role
                  </label>
                  <select 
                    id="role"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    onChange={(e) => {
                      const tierSelect = document.getElementById('tier') as HTMLSelectElement;
                      const role = e.target.value;
                      tierSelect.innerHTML = '';
                      
                      if (role === 'seller') {
                        ['Starter', 'Growth', 'Premium', 'Elite', 'Partner'].forEach(tier => {
                          const option = document.createElement('option');
                          option.value = tier;
                          option.textContent = tier;
                          tierSelect.appendChild(option);
                        });
                      } else if (role === 'enabler') {
                        ['Trainee', 'Associate', 'Specialist', 'Senior', 'Expert', 'Master', 'Director'].forEach(tier => {
                          const option = document.createElement('option');
                          option.value = tier;
                          option.textContent = tier;
                          tierSelect.appendChild(option);
                        });
                      } else if (role === 'supplier') {
                        ['Vendor', 'Provider', 'Distributor', 'Wholesaler', 'Enterprise', 'Alliance'].forEach(tier => {
                          const option = document.createElement('option');
                          option.value = tier;
                          option.textContent = tier;
                          tierSelect.appendChild(option);
                        });
                      }
                    }}
                  >
                    <option value="">Select Role</option>
                    <option value="seller">Seller</option>
                    <option value="enabler">Enabler</option>
                    <option value="supplier">Supplier</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Tier
                  </label>
                  <select id="tier" className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white">
                    <option value="">Select Role First</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="e.g., Electronics, Fashion"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Commission Rate (%)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="5.5"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Amount ($)
                  </label>
                  <input
                    type="number"
                    min="0"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    placeholder="100"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Effective From
                  </label>
                  <input
                    type="date"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                </div>

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    className="h-4 w-4 text-blue-600 border-gray-300 rounded"
                    defaultChecked
                  />
                  <label htmlFor="isActive" className="ml-2 text-sm text-gray-700 dark:text-gray-300">
                    Active
                  </label>
                </div>

                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCommissionModal(false);
                      setEditingCommission(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                  >
                    {editingCommission ? 'Update Rule' : 'Create Rule'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}