"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService, apiClient } from '@/lib/api';
import { formatDate, formatCurrency, capitalize } from '@/lib/utils';

interface Seller {
  id: string;
  businessName: string;
  ownerName: string;
  email: string;
  phone: string;
  businessType: string;
  tier: string;
  status: string;
  kycStatus: string;
  joinedAt: string;
  location: string;
  metrics: {
    totalOrders: number;
    monthlyOrders: number;
    revenue: number;
    monthlyRevenue: number;
    rating: number;
    products: number;
    activeProducts: number;
    fulfillmentRate: number;
    responseTime: number;
    disputes: number;
    returns: number;
  };
}

interface TierDistribution {
  starter: { count: number; revenue: number; avgRating: number };
  growth: { count: number; revenue: number; avgRating: number };
  premium: { count: number; revenue: number; avgRating: number };
  elite: { count: number; revenue: number; avgRating: number };
  partner: { count: number; revenue: number; avgRating: number };
}

export default function SellerOversightPage() {
  const [activeTab, setActiveTab] = useState<'overview' | 'analytics' | 'operations' | 'compliance'>('overview');
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);

  // Fetch sellers data based on active tab
  const { data: sellersData, isLoading: sellersLoading, refetch: refetchSellers } = useQuery({
    queryKey: ['admin-sellers', activeTab],
    queryFn: () => apiClient.get('/admin/sellers', { params: { tab: activeTab } }),
    staleTime: 30 * 1000,
  });

  const sellers = sellersData?.data?.data?.sellers || [];
  const tierDistribution: TierDistribution = sellersData?.data?.data?.tierDistribution || {};
  const analytics = sellersData?.data?.data?.analytics;
  const operations = sellersData?.data?.data?.operations;
  const compliance = sellersData?.data?.data?.compliance;

  // Mutations
  const suspendSellerMutation = useMutation({
    mutationFn: ({ sellerId, reason }: { sellerId: string; reason: string }) =>
      apiService.sellers.suspend(sellerId, reason),
    onSuccess: () => {
      toast.success('Seller suspended');
      refetchSellers();
    },
    onError: () => {
      toast.error('Failed to suspend seller');
    },
  });

  // Overview columns
  const overviewColumns: Column<Seller>[] = [
    {
      key: 'businessName',
      header: 'Business',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.ownerName}</div>
          <div className="text-xs text-gray-400 dark:text-gray-500">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'businessType',
      header: 'Type',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {value}
        </span>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      sortable: true,
      render: (value) => {
        const tierColors = {
          'Starter': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
          'Growth': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
          'Premium': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
          'Elite': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
          'Partner': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        };
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tierColors[value as keyof typeof tierColors] || 'bg-gray-100 text-gray-800'}`}>
            {value}
          </span>
        );
      },
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'Inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' :
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'kycStatus',
      header: 'KYC',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'Verified' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        }`}>
          {value}
        </span>
      ),
    },
    {
      key: 'metrics',
      header: 'Performance',
      render: (_, row) => (
        <div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            TSh {row.metrics.revenue.toLocaleString()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.metrics.totalOrders} orders • ⭐ {row.metrics.rating}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            {row.metrics.fulfillmentRate}% fulfillment
          </div>
        </div>
      ),
    },
    {
      key: 'joinedAt',
      header: 'Joined',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedSeller(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            View
          </button>
          {row.status === 'Active' && (
            <button
              onClick={() => {
                const reason = prompt('Suspension reason:');
                if (reason) suspendSellerMutation.mutate({ sellerId: row.id, reason });
              }}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Suspend
            </button>
          )}
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
            Seller Oversight
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Comprehensive seller onboarding, verification, and performance management
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetchSellers()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Seller Tier Distribution</h3>
        <div className="grid grid-cols-5 gap-4">
          {Object.entries(tierDistribution).map(([tier, data]) => {
            const tierColors = {
              'starter': 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300',
              'growth': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300',
              'premium': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
              'elite': 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300',
              'partner': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
            };
            return (
              <div key={tier} className="text-center">
                <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${tierColors[tier as keyof typeof tierColors]}`}>
                  {capitalize(tier)}
                </div>
                <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                  {data.count}
                </div>
                <div className="text-sm text-gray-500 dark:text-gray-400">
                  TSh {data.revenue.toLocaleString()}
                </div>
                <div className="text-xs text-gray-400 dark:text-gray-500">
                  {data.avgRating} avg
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'overview'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Overview ({sellers.length})
          </button>
          <button
            onClick={() => setActiveTab('analytics')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'analytics'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Analytics
          </button>
          <button
            onClick={() => setActiveTab('operations')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'operations'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Operations
          </button>
          <button
            onClick={() => setActiveTab('compliance')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'compliance'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Compliance
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'overview' && (
        <DataTable
          data={sellers}
          columns={overviewColumns}
          searchable={true}
          searchPlaceholder="Search sellers by business name or email..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={sellersLoading}
          emptyMessage="No sellers found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'analytics' && analytics && (
        <div className="space-y-6">
          {/* Performance Metrics */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Fulfillment Rate</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.performanceMetrics.avgFulfillmentRate}%</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Response Time</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.performanceMetrics.avgResponseTime}h</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Rating</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">⭐ {analytics.performanceMetrics.avgRating}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Disputes</div>
              <div className="text-2xl font-bold text-gray-900 dark:text-white">{analytics.performanceMetrics.totalDisputes}</div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Top Performers</h3>
            <div className="space-y-3">
              {analytics.topPerformers.map((seller: any, index: number) => (
                <div key={seller.sellerId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <div className="text-sm font-medium text-gray-500 dark:text-gray-400">#{index + 1}</div>
                    <div>
                      <div className="font-medium text-gray-900 dark:text-white">{seller.businessName}</div>
                      <div className="text-sm text-gray-500 dark:text-gray-400">⭐ {seller.rating} • {seller.orders} orders</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">TSh {seller.revenue.toLocaleString()}</div>
                    <div className="text-sm text-green-600 dark:text-green-400">+{seller.growth}%</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'operations' && operations && (
        <div className="space-y-6">
          {/* Active Orders */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Active Orders</h3>
            <div className="space-y-3">
              {operations.activeOrders.map((order: any) => (
                <div key={order.orderId} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{order.orderId}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{order.businessName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-gray-900 dark:text-white">TSh {order.amount.toLocaleString()}</div>
                    <div className="text-sm text-blue-600 dark:text-blue-400">{order.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Inventory Alerts */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Inventory Alerts</h3>
            <div className="space-y-3">
              {operations.inventoryAlerts.map((alert: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{alert.productName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{alert.businessName}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-yellow-600 dark:text-yellow-400">{alert.currentStock} left</div>
                    <div className="text-sm text-yellow-600 dark:text-yellow-400">{alert.alertType}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'compliance' && compliance && (
        <div className="space-y-6">
          {/* KYC Overview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Verified</div>
              <div className="text-2xl font-bold text-green-600 dark:text-green-400">{compliance.kycOverview.verified}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending</div>
              <div className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">{compliance.kycOverview.pending}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Rejected</div>
              <div className="text-2xl font-bold text-red-600 dark:text-red-400">{compliance.kycOverview.rejected}</div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Not Started</div>
              <div className="text-2xl font-bold text-gray-600 dark:text-gray-400">{compliance.kycOverview.notStarted}</div>
            </div>
          </div>

          {/* Violations */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Policy Violations</h3>
            <div className="space-y-3">
              {compliance.violations.map((violation: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
                  <div>
                    <div className="font-medium text-gray-900 dark:text-white">{violation.businessName}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{violation.description}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-red-600 dark:text-red-400">{violation.severity}</div>
                    <div className="text-sm text-red-600 dark:text-red-400">{violation.status}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}