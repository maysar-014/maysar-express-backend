"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService, apiClient } from '@/lib/api';
import { formatDate, formatCurrency, capitalize } from '@/lib/utils';

interface Enabler {
  id: string;
  name: string;
  email: string;
  phone: string;
  tier: string;
  performance: number;
  orders: number;
  rating: number;
  earnings: number;
  status: string;
  territory: string;
  joinedAt: string;
  lastActive: string;
}

export default function EnablersPage() {
  const [selectedEnabler, setSelectedEnabler] = useState<Enabler | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  const { data: enablersData, isLoading, refetch } = useQuery({
    queryKey: ['enablers'],
    queryFn: () => apiClient.get('/admin/enablers'),
    staleTime: 30 * 1000,
  });

  const promoteEnablerMutation = useMutation({
    mutationFn: ({ id, newTier }: { id: string; newTier: string }) =>
      apiService.admin.promoteEnabler(id, newTier),
    onSuccess: () => {
      toast.success('Enabler promoted successfully');
      refetch();
      setShowPromoteModal(false);
    },
    onError: () => {
      toast.error('Failed to promote enabler');
    },
  });

  const enablers = enablersData?.data?.data?.enablers || [];
  const stats = enablersData?.data?.data?.stats || {};

  const tierColors = {
    'Trainee': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    'Associate': 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    'Specialist': 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300',
    'Senior': 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-300',
    'Expert': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-300',
    'Master': 'bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-300',
    'Director': 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300'
  };

  const columns: Column<Enabler>[] = [
    {
      key: 'name',
      header: 'Enabler',
      sortable: true,
      render: (value: unknown, row: Enabler) => {
        const nameValue = value as string;
        return (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{nameValue}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">{row.email}</div>
          </div>
        );
      },
    },
    {
      key: 'tier',
      header: 'Tier',
      sortable: true,
      render: (value: unknown) => {
        const tierValue = value as string;
        return (
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tierColors[tierValue as keyof typeof tierColors] || 'bg-gray-100 text-gray-800'}`}>
            {tierValue}
          </span>
        );
      },
    },
    {
      key: 'performance',
      header: 'Performance',
      sortable: true,
      render: (value: unknown) => {
        const numValue = value as number;
        return (
          <div className="flex items-center">
            <span className={`font-medium ${
              numValue >= 90 ? 'text-green-600' :
              numValue >= 75 ? 'text-yellow-600' :
              'text-red-600'
            }`}>
              {numValue}%
            </span>
            <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  numValue >= 90 ? 'bg-green-500' :
                  numValue >= 75 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${numValue}%` }}
              ></div>
            </div>
          </div>
        );
      },
    },
    {
      key: 'orders',
      header: 'Orders',
      sortable: true,
      render: (value: unknown) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{(value as number).toLocaleString()}</div>
        </div>
      ),
    },
    {
      key: 'rating',
      header: 'Rating',
      sortable: true,
      render: (value: unknown) => (
        <div className="flex items-center">
          <span className="text-yellow-400">★</span>
          <span className="ml-1 font-medium text-gray-900 dark:text-white">{(value as number).toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'earnings',
      header: 'Earnings',
      sortable: true,
      render: (value: unknown) => (
        <span className="font-medium text-green-600">{formatCurrency(value as number)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value: unknown) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'training' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {capitalize(value as string)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_: unknown, row: Enabler) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedEnabler(row);
              setShowPromoteModal(true);
            }}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Promote
          </button>
          <button
            onClick={() => setSelectedEnabler(row)}
            className="text-green-600 hover:text-green-900 text-sm font-medium"
          >
            View
          </button>
        </div>
      ),
    },
  ];

  const tierStats = enablers.reduce((acc: Record<string, number>, enabler: Enabler) => {
    acc[enabler.tier] = (acc[enabler.tier] || 0) + 1;
    return acc;
  }, {});

  const avgPerformance = enablers.length > 0
    ? enablers.reduce((sum: number, e: Enabler) => sum + e.performance, 0) / enablers.length
    : 0;

  const totalEarnings = enablers.reduce((sum: number, e: Enabler) => sum + e.earnings, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Enabler Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage enabler tiers, performance, and operational excellence
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Enabler
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Enablers</dt>
          <dd className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalEnablers || enablers.length}</dd>
          <div className="text-sm text-green-600 mt-1">
            {stats.activeEnablers || enablers.filter((e: Enabler) => e.status === 'active').length} active
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Performance</dt>
          <dd className="text-2xl font-bold text-gray-900 dark:text-white">{stats.avgPerformance?.toFixed(1) || avgPerformance.toFixed(1)}%</dd>
          <div className="text-sm text-green-600 mt-1">Performance tracking</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Earnings</dt>
          <dd className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(stats.totalEarnings || totalEarnings)}</dd>
          <div className="text-sm text-green-600 mt-1">Commission earnings</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Tier</dt>
          <dd className="text-2xl font-bold text-gray-900 dark:text-white">
            {stats.topTier?.directors || tierStats['Director'] || 0} Directors
          </dd>
          <div className="text-sm text-blue-600 mt-1">
            {stats.topTier?.masters || tierStats['Master'] || 0} Masters
          </div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tier Distribution</h3>
        <div className="grid grid-cols-7 gap-4">
          {['Trainee', 'Associate', 'Specialist', 'Senior', 'Expert', 'Master', 'Director'].map(tier => (
            <div key={tier} className="text-center">
              <div className={`inline-flex px-3 py-1 text-xs font-semibold rounded-full ${tierColors[tier as keyof typeof tierColors]}`}>
                {tier}
              </div>
              <div className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
                {tierStats[tier] || 0}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Enablers Table */}
      <DataTable
        data={enablers}
        columns={columns}
        searchable={true}
        searchPlaceholder="Search enablers..."
        pagination={{
          pageSize: 15,
          showInfo: true,
        }}
        loading={isLoading}
        emptyMessage="No enablers found"
        className="shadow-sm"
      />

      {/* Promotion Modal */}
      {showPromoteModal && selectedEnabler && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowPromoteModal(false)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
                Promote {selectedEnabler.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Current tier: <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tierColors[selectedEnabler.tier as keyof typeof tierColors] || 'bg-gray-100 text-gray-800'}`}>
                  {selectedEnabler.tier}
                </span>
              </p>
              <div className="space-y-3">
                {['Trainee', 'Associate', 'Specialist', 'Senior', 'Expert', 'Master', 'Director']
                  .filter(tier => tier !== selectedEnabler.tier)
                  .map(tier => (
                    <button
                      key={tier}
                      onClick={() => promoteEnablerMutation.mutate({ id: selectedEnabler.id, newTier: tier })}
                      className={`w-full text-left px-3 py-2 rounded-lg border hover:bg-gray-50 dark:hover:bg-gray-700 ${tierColors[tier as keyof typeof tierColors]}`}
                    >
                      Promote to {tier}
                    </button>
                  ))}
              </div>
              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setShowPromoteModal(false)}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
