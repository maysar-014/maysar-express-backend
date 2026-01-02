"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, formatCurrency, capitalize } from '@/lib/utils';

interface Supplier {
  id: string;
  name: string;
  email: string;
  tier: 'Vendor' | 'Provider' | 'Distributor' | 'Wholesaler' | 'Enterprise' | 'Alliance';
  categories: string[];
  productsSupplied: number;
  totalVolume: number;
  avgDeliveryTime: number;
  qualityRating: number;
  commissionEarned: number;
  status: 'active' | 'inactive' | 'suspended' | 'pending';
  joinedAt: string;
  lastDelivery: string;
  reliabilityScore: number;
  regions: string[];
}

export default function SuppliersPage() {
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showPromoteModal, setShowPromoteModal] = useState(false);

  const { data: suppliersData, isLoading, refetch } = useQuery({
    queryKey: ['suppliers'],
    queryFn: () => apiService.admin.getSuppliers(),
    staleTime: 30 * 1000,
  });

  const promoteSupplierMutation = useMutation({
    mutationFn: ({ id, newTier }: { id: string; newTier: string }) =>
      apiService.admin.promoteSupplier(id, newTier),
    onSuccess: () => {
      toast.success('Supplier promoted successfully');
      refetch();
      setShowPromoteModal(false);
    },
    onError: () => {
      toast.error('Failed to promote supplier');
    },
  });

  const suppliers = suppliersData?.data || [];

  const tierColors = {
    'Vendor': 'bg-slate-100 text-slate-800 dark:bg-slate-900 dark:text-slate-300',
    'Provider': 'bg-zinc-100 text-zinc-800 dark:bg-zinc-900 dark:text-zinc-300',
    'Distributor': 'bg-stone-100 text-stone-800 dark:bg-stone-900 dark:text-stone-300',
    'Wholesaler': 'bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-300',
    'Enterprise': 'bg-lime-100 text-lime-800 dark:bg-lime-900 dark:text-lime-300',
    'Alliance': 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300'
  };

  const columns: Column<Supplier>[] = [
    {
      key: 'name',
      header: 'Supplier',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.email}</div>
        </div>
      ),
    },
    {
      key: 'tier',
      header: 'Tier',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tierColors[value]}`}>
          {value}
        </span>
      ),
    },
    {
      key: 'reliabilityScore',
      header: 'Reliability',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <span className={`font-medium ${
            value >= 95 ? 'text-green-600' :
            value >= 85 ? 'text-yellow-600' :
            'text-red-600'
          }`}>
            {value}%
          </span>
          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                value >= 95 ? 'bg-green-500' :
                value >= 85 ? 'bg-yellow-500' :
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
          <div className="font-medium text-gray-900 dark:text-white">{formatCurrency(value)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.productsSupplied} products
          </div>
        </div>
      ),
    },
    {
      key: 'avgDeliveryTime',
      header: 'Delivery',
      sortable: true,
      render: (value) => (
        <span className={`font-medium ${
          value <= 2 ? 'text-green-600' :
          value <= 5 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {value} days
        </span>
      ),
    },
    {
      key: 'qualityRating',
      header: 'Quality',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <span className="text-yellow-400">★</span>
          <span className="ml-1 font-medium text-gray-900 dark:text-white">{value.toFixed(1)}</span>
        </div>
      ),
    },
    {
      key: 'commissionEarned',
      header: 'Earnings',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-green-600">{formatCurrency(value)}</span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'pending' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => {
              setSelectedSupplier(row);
              setShowPromoteModal(true);
            }}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Promote
          </button>
          <button
            onClick={() => setSelectedSupplier(row)}
            className="text-green-600 hover:text-green-900 text-sm font-medium"
          >
            View
          </button>
        </div>
      ),
    },
  ];

  const tierStats = suppliers.reduce((acc: Record<string, number>, supplier: Supplier) => {
    acc[supplier.tier] = (acc[supplier.tier] || 0) + 1;
    return acc;
  }, {});

  const avgReliability = suppliers.length > 0 
    ? suppliers.reduce((sum: number, s: Supplier) => sum + s.reliabilityScore, 0) / suppliers.length 
    : 0;

  const totalVolume = suppliers.reduce((sum: number, s: Supplier) => sum + s.totalVolume, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Supplier Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage supplier tiers, supply chain performance, and partnerships
          </p>
        </div>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Add Supplier
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Suppliers</dt>
          <dd className="text-2xl font-bold text-gray-900 dark:text-white">{suppliers.length}</dd>
          <div className="text-sm text-green-600 mt-1">
            {suppliers.filter((s: Supplier) => s.status === 'active').length} active
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Reliability</dt>
          <dd className="text-2xl font-bold text-gray-900 dark:text-white">{avgReliability.toFixed(1)}%</dd>
          <div className="text-sm text-green-600 mt-1">+3.8% vs last month</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Supply Volume</dt>
          <dd className="text-2xl font-bold text-gray-900 dark:text-white">{formatCurrency(totalVolume)}</dd>
          <div className="text-sm text-green-600 mt-1">+18.5% vs last month</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Top Tier</dt>
          <dd className="text-2xl font-bold text-gray-900 dark:text-white">
            {tierStats['Alliance'] || 0} Alliance
          </dd>
          <div className="text-sm text-blue-600 mt-1">
            {tierStats['Enterprise'] || 0} Enterprise
          </div>
        </div>
      </div>

      {/* Tier Distribution */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Tier Distribution</h3>
        <div className="grid grid-cols-6 gap-4">
          {['Vendor', 'Provider', 'Distributor', 'Wholesaler', 'Enterprise', 'Alliance'].map(tier => (
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

      {/* Suppliers Table */}
      <DataTable
        data={suppliers}
        columns={columns}
        searchable={true}
        searchPlaceholder="Search suppliers..."
        pagination={{
          pageSize: 15,
          showInfo: true,
        }}
        loading={isLoading}
        emptyMessage="No suppliers found"
        className="shadow-sm"
      />

      {/* Promotion Modal */}
      {showPromoteModal && selectedSupplier && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowPromoteModal(false)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
                Promote {selectedSupplier.name}
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
                Current tier: <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${tierColors[selectedSupplier.tier]}`}>
                  {selectedSupplier.tier}
                </span>
              </p>
              <div className="space-y-3">
                {['Vendor', 'Provider', 'Distributor', 'Wholesaler', 'Enterprise', 'Alliance']
                  .filter(tier => tier !== selectedSupplier.tier)
                  .map(tier => (
                    <button
                      key={tier}
                      onClick={() => promoteSupplierMutation.mutate({ id: selectedSupplier.id, newTier: tier })}
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