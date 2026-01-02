"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, capitalize } from '@/lib/utils';

interface AuditLog {
  id: string;
  userId: string;
  userEmail: string;
  action: string;
  resource: string;
  resourceId: string;
  details: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  status: 'success' | 'failure' | 'warning';
}

export default function AuditTrailPage() {
  const [filters, setFilters] = useState({
    action: '',
    resource: '',
    status: '',
    dateFrom: '',
    dateTo: '',
    userId: '',
  });

  // Fetch audit logs
  const { data: auditData, isLoading, refetch } = useQuery({
    queryKey: ['audit-logs', filters],
    queryFn: () => apiService.audit.getLogs(filters),
    staleTime: 30 * 1000,
  });

  const auditLogs = auditData?.data || [];

  // Table columns
  const columns: Column<AuditLog>[] = [
    {
      key: 'timestamp',
      header: 'Timestamp',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'userEmail',
      header: 'User',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.userId}</div>
        </div>
      ),
    },
    {
      key: 'action',
      header: 'Action',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {value}
        </span>
      ),
    },
    {
      key: 'resource',
      header: 'Resource',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.resourceId}</div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'failure' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        }`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'ipAddress',
      header: 'IP Address',
      render: (value) => (
        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{value}</span>
      ),
    },
    {
      key: 'details',
      header: 'Details',
      render: (value) => (
        <button
          onClick={() => alert(JSON.stringify(value, null, 2))}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
        >
          View Details
        </button>
      ),
    },
  ];

  const handleExport = () => {
    // Export audit logs to CSV
    const csv = [
      ['Timestamp', 'User', 'Action', 'Resource', 'Status', 'IP Address'],
      ...auditLogs.map((log: AuditLog) => [
        log.timestamp,
        log.userEmail,
        log.action,
        `${log.resource}:${log.resourceId}`,
        log.status,
        log.ipAddress,
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Audit Trail
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Audit trail with filtering and export
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={handleExport}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Export CSV
          </button>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Action
            </label>
            <select
              value={filters.action}
              onChange={(e) => setFilters({ ...filters, action: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Actions</option>
              <option value="CREATE">Create</option>
              <option value="UPDATE">Update</option>
              <option value="DELETE">Delete</option>
              <option value="LOGIN">Login</option>
              <option value="LOGOUT">Logout</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Resource
            </label>
            <select
              value={filters.resource}
              onChange={(e) => setFilters({ ...filters, resource: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Resources</option>
              <option value="user">User</option>
              <option value="admin">Admin</option>
              <option value="order">Order</option>
              <option value="product">Product</option>
              <option value="seller">Seller</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="success">Success</option>
              <option value="failure">Failure</option>
              <option value="warning">Warning</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filters.dateFrom}
              onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Date To
            </label>
            <input
              type="date"
              value={filters.dateTo}
              onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              User ID
            </label>
            <input
              type="text"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
              placeholder="Enter user ID"
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div className="mt-4 flex justify-end space-x-3">
          <button
            onClick={() => setFilters({
              action: '',
              resource: '',
              status: '',
              dateFrom: '',
              dateTo: '',
              userId: '',
            })}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Clear Filters
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Events
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {auditLogs.length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Success Rate
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {auditLogs.length > 0 ? 
                Math.round((auditLogs.filter((log: AuditLog) => log.status === 'success').length / auditLogs.length) * 100) : 0}%
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Failed Events
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {auditLogs.filter((log: AuditLog) => log.status === 'failure').length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Unique Users
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {new Set(auditLogs.map((log: AuditLog) => log.userId)).size}
            </dd>
          </div>
        </div>
      </div>

      {/* Audit Logs Table */}
      <DataTable
        data={auditLogs}
        columns={columns}
        searchable={true}
        searchPlaceholder="Search audit logs..."
        pagination={{
          pageSize: 20,
          showInfo: true,
        }}
        loading={isLoading}
        emptyMessage="No audit logs found"
        className="shadow-sm"
      />
    </div>
  );
}