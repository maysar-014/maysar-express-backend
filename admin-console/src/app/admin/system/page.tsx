"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, capitalize } from '@/lib/utils';

interface FeatureFlag {
  id: string;
  name: string;
  key: string;
  description: string;
  enabled: boolean;
  environment: 'development' | 'staging' | 'production';
  rolloutPercentage: number;
  conditions: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

interface SystemConfig {
  id: string;
  key: string;
  value: string;
  description: string;
  category: string;
  type: 'string' | 'number' | 'boolean' | 'json';
  sensitive: boolean;
  updatedAt: string;
  updatedBy: string;
}

export default function SystemConfigPage() {
  const [activeTab, setActiveTab] = useState<'features' | 'config'>('features');
  const [showCreateFlag, setShowCreateFlag] = useState(false);

  // Fetch feature flags
  // const { data: flagsData, isLoading: flagsLoading, refetch: refetchFlags } = useQuery({
  //   queryKey: ['feature-flags'],
  //   queryFn: () => apiService.system.getFeatureFlags(),
  //   staleTime: 30 * 1000,
  // });

  // Fetch system config
  const { data: configData, isLoading: configLoading, refetch: refetchConfig } = useQuery({
    queryKey: ['system-config'],
    queryFn: () => fetch('http://localhost:3001/api/admin/system/config').then(res => res.json()),
    staleTime: 30 * 1000,
  });

  const featureFlags = configData?.data?.featureFlags || [];
  const systemConfig = configData?.data?.configs || [];

  // Feature flag mutations
  const toggleFlagMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiService.system.toggleFeatureFlag(id, enabled),
    onSuccess: () => {
      toast.success('Feature flag updated successfully');
      refetchConfig();
    },
    onError: () => {
      toast.error('Failed to update feature flag');
    },
  });

  const createFlagMutation = useMutation({
    mutationFn: (flagData: Partial<FeatureFlag>) =>
      apiService.system.createFeatureFlag(flagData),
    onSuccess: () => {
      toast.success('Feature flag created successfully');
      refetchConfig();
      setShowCreateFlag(false);
    },
    onError: () => {
      toast.error('Failed to create feature flag');
    },
  });

  // Config mutations
  const updateConfigMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: string }) =>
      apiService.system.updateConfig(key, value),
    onSuccess: () => {
      toast.success('Configuration updated successfully');
      refetchConfig();
    },
    onError: () => {
      toast.error('Failed to update configuration');
    },
  });

  // Feature flags columns
  const flagColumns: Column<FeatureFlag>[] = [
    {
      key: 'name',
      header: 'Name',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.key}</div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (value) => (
        <div className="max-w-xs truncate text-gray-600 dark:text-gray-400">{value}</div>
      ),
    },
    {
      key: 'environment',
      header: 'Environment',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'production' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'staging' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        }`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'enabled',
      header: 'Status',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => toggleFlagMutation.mutate({ id: row.id, enabled: !value })}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              value ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-700'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                value ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {value ? 'Enabled' : 'Disabled'}
          </span>
        </div>
      ),
    },
    {
      key: 'rolloutPercentage',
      header: 'Rollout %',
      render: (value) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">{value}%</div>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      render: (value) => formatDate(value),
    },
  ];

  // System config columns
  const configColumns: Column<SystemConfig>[] = [
    {
      key: 'key',
      header: 'Key',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-mono text-sm text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.category}</div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (value) => (
        <div className="max-w-xs text-gray-600 dark:text-gray-400">{value}</div>
      ),
    },
    {
      key: 'value',
      header: 'Value',
      render: (value, row) => (
        <div className="max-w-xs">
          {row.sensitive ? (
            <span className="text-gray-400">••••••••</span>
          ) : (
            <span className="font-mono text-sm text-gray-900 dark:text-white">
              {typeof value === 'string' && value.length > 50 ? `${value.substring(0, 50)}...` : value}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      render: (value) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
          {value}
        </span>
      ),
    },
    {
      key: 'updatedAt',
      header: 'Last Updated',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">{formatDate(value)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">by {row.updatedBy}</div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => {
            const newValue = prompt('Enter new value:', row.value);
            if (newValue !== null) {
              updateConfigMutation.mutate({ key: row.key, value: newValue });
            }
          }}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
        >
          Edit
        </button>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Configuration
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage feature flags and system configuration
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {activeTab === 'features' && (
            <button
              onClick={() => setShowCreateFlag(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Add Feature Flag
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('features')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'features'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Feature Flags ({featureFlags.length})
          </button>
          <button
            onClick={() => setActiveTab('config')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'config'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            System Config ({systemConfig.length})
          </button>
        </nav>
      </div>

      {/* Feature Flags Tab */}
      {activeTab === 'features' && (
        <div className="space-y-6">
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Total Flags
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {featureFlags.length}
                </dd>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Enabled
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {featureFlags.filter((flag: FeatureFlag) => flag.enabled).length}
                </dd>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Production
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {featureFlags.filter((flag: FeatureFlag) => flag.environment === 'production').length}
                </dd>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div>
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                  Partial Rollout
                </dt>
                <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                  {featureFlags.filter((flag: FeatureFlag) => flag.rolloutPercentage < 100 && flag.rolloutPercentage > 0).length}
                </dd>
              </div>
            </div>
          </div>

          <DataTable
            data={featureFlags}
            columns={flagColumns}
            searchable={true}
            searchPlaceholder="Search feature flags..."
            pagination={{
              pageSize: 15,
              showInfo: true,
            }}
            loading={configLoading}
            emptyMessage="No feature flags found"
            className="shadow-sm"
          />
        </div>
      )}

      {/* System Config Tab */}
      {activeTab === 'config' && (
        <DataTable
          data={systemConfig}
          columns={configColumns}
          searchable={true}
          searchPlaceholder="Search configuration..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={configLoading}
          emptyMessage="No configuration found"
          className="shadow-sm"
        />
      )}

      {/* Create Feature Flag Modal */}
      {showCreateFlag && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowCreateFlag(false)}></div>
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Create Feature Flag
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                createFlagMutation.mutate({
                  name: formData.get('name') as string,
                  key: formData.get('key') as string,
                  description: formData.get('description') as string,
                  environment: formData.get('environment') as FeatureFlag['environment'],
                  enabled: formData.get('enabled') === 'on',
                  rolloutPercentage: parseInt(formData.get('rolloutPercentage') as string),
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Name
                    </label>
                    <input
                      type="text"
                      name="name"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Key
                    </label>
                    <input
                      type="text"
                      name="key"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <textarea
                      name="description"
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Environment
                    </label>
                    <select
                      name="environment"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="development">Development</option>
                      <option value="staging">Staging</option>
                      <option value="production">Production</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Rollout Percentage
                    </label>
                    <input
                      type="number"
                      name="rolloutPercentage"
                      min="0"
                      max="100"
                      defaultValue="0"
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      name="enabled"
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <label className="ml-2 block text-sm text-gray-700 dark:text-gray-300">
                      Enable immediately
                    </label>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateFlag(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createFlagMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createFlagMutation.isPending ? 'Creating...' : 'Create Flag'}
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