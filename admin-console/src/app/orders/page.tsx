// Professional Orders Management Page
// Complete order lifecycle management with advanced filtering and bulk operations

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  PlusIcon,
  FunnelIcon,
  ArrowDownTrayIcon,
  EyeIcon,
  PencilIcon,
  TruckIcon,
  XCircleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import Link from 'next/link';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils';
import toast from 'react-hot-toast';

interface Order {
  id: string;
  orderNumber: string;
  customerName: string;
  customerEmail: string;
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  totalAmount: number;
  currency: string;
  createdAt: string;
  updatedAt: string;
  itemsCount: number;
  paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
  shippingAddress: {
    city: string;
    country: string;
  };
}

export default function OrdersPage() {
  const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
  const [filters, setFilters] = useState({
    status: '',
    paymentStatus: '',
    dateRange: '',
    search: '',
  });

  // Fetch orders with filters
  const { data: ordersData, isLoading, refetch } = useQuery({
    queryKey: ['orders', filters],
    queryFn: () => apiService.orders.getAll({
      status: filters.status || undefined,
      search: filters.search || undefined,
      page: 1,
      limit: 50,
    }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const orders = ordersData?.data || [];

  // Table columns configuration
  const columns: Column<Order>[] = [
    {
      key: 'orderNumber',
      header: 'Order #',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm font-medium text-blue-600 dark:text-blue-400">
          {value}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.customerEmail}</div>
        </div>
      ),
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
      key: 'totalAmount',
      header: 'Total',
      sortable: true,
      render: (value, row) => formatCurrency(value, row.currency),
      className: 'text-right',
    },
    {
      key: 'itemsCount',
      header: 'Items',
      sortable: true,
      className: 'text-center',
    },
    {
      key: 'paymentStatus',
      header: 'Payment',
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
    {
      key: 'shippingAddress',
      header: 'Location',
      render: (value) => `${value.city}, ${value.country}`,
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: 'Mark as Processing',
      onClick: (selectedIds: string[]) => handleBulkStatusUpdate(selectedIds, 'processing'),
      variant: 'primary' as const,
    },
    {
      label: 'Mark as Shipped',
      onClick: (selectedIds: string[]) => handleBulkStatusUpdate(selectedIds, 'shipped'),
      variant: 'primary' as const,
    },
    {
      label: 'Cancel Orders',
      onClick: (selectedIds: string[]) => handleBulkCancel(selectedIds),
      variant: 'danger' as const,
    },
    {
      label: 'Export',
      onClick: (selectedIds: string[]) => handleBulkExport(selectedIds),
      variant: 'secondary' as const,
    },
  ];

  // Handle bulk status update
  const handleBulkStatusUpdate = async (orderIds: string[], status: string) => {
    try {
      await Promise.all(
        orderIds.map(id => apiService.orders.updateStatus(id, status, `Bulk update to ${status}`))
      );
      toast.success(`Updated ${orderIds.length} orders to ${status}`);
      refetch();
      setSelectedOrders([]);
    } catch (error) {
      toast.error('Failed to update orders');
    }
  };

  // Handle bulk cancel
  const handleBulkCancel = async (orderIds: string[]) => {
    if (!confirm(`Are you sure you want to cancel ${orderIds.length} orders?`)) return;

    try {
      await Promise.all(
        orderIds.map(id => apiService.orders.cancel(id, 'Bulk cancellation by admin'))
      );
      toast.success(`Cancelled ${orderIds.length} orders`);
      refetch();
      setSelectedOrders([]);
    } catch (error) {
      toast.error('Failed to cancel orders');
    }
  };

  // Handle bulk export
  const handleBulkExport = async (orderIds: string[]) => {
    try {
      const response = await apiService.reports.exportReport(
        'orders',
        'csv',
        { orderIds, format: 'detailed' }
      );

      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `orders-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();

      toast.success('Export completed');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  // Status filter options
  const statusOptions = [
    { value: '', label: 'All Statuses' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirmed', label: 'Confirmed' },
    { value: 'processing', label: 'Processing' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' },
    { value: 'cancelled', label: 'Cancelled' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Orders Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage and track all customer orders across the platform
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>

          <Link
            href="/orders/new"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            New Order
          </Link>
        </div>
      </div>

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center gap-4">
          {/* Status Filter */}
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={filters.status}
              onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
              className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">Date:</span>
            <select
              value={filters.dateRange}
              onChange={(e) => setFilters(prev => ({ ...prev, dateRange: e.target.value }))}
              className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Time</option>
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
            </select>
          </div>

          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="search"
              placeholder="Search orders by number, customer, or email..."
              value={filters.search}
              onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Orders Table */}
      <DataTable
        data={orders}
        columns={columns}
        searchable={false} // We have our own search above
        selectable={true}
        onSelectionChange={setSelectedOrders}
        actions={bulkActions}
        pagination={{
          pageSize: 20,
          showInfo: true,
        }}
        loading={isLoading}
        emptyMessage="No orders found matching your criteria"
        className="shadow-sm"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-blue-100 rounded-lg dark:bg-blue-900">
                <EyeIcon className="w-4 h-4 text-blue-600 dark:text-blue-400" />
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Total Orders
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {orders.length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-green-100 rounded-lg dark:bg-green-900">
                <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Completed
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {orders.filter(o => o.status === 'delivered').length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-yellow-100 rounded-lg dark:bg-yellow-900">
                <TruckIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                In Transit
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {orders.filter(o => o.status === 'shipped').length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="flex items-center justify-center w-8 h-8 bg-red-100 rounded-lg dark:bg-red-900">
                <XCircleIcon className="w-4 h-4 text-red-600 dark:text-red-400" />
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Cancelled
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {orders.filter(o => o.status === 'cancelled').length}
              </dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
