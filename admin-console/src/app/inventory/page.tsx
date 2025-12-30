// Professional Inventory Management Page
// Complete inventory tracking with warehouse visualization and real-time updates

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  CubeIcon,
  MapPinIcon,
  ExclamationTriangleIcon,
  ArrowDownTrayIcon,
  PlusIcon,
  PencilIcon,
  EyeIcon,
  TruckIcon,
  BuildingStorefrontIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils';

interface Warehouse {
  id: string;
  name: string;
  location: string;
  capacity: number;
  currentStock: number;
  status: 'active' | 'maintenance' | 'inactive';
}

interface InventoryItem {
  id: string;
  productId: string;
  productName: string;
  variantId: string;
  variantName: string;
  warehouseId: string;
  warehouseName: string;
  quantity: number;
  reservedQuantity: number;
  availableQuantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  lastUpdated: string;
  status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'overstock';
}

interface StockMovement {
  id: string;
  productId: string;
  productName: string;
  warehouseId: string;
  warehouseName: string;
  type: 'inbound' | 'outbound' | 'adjustment' | 'transfer';
  quantity: number;
  reason: string;
  createdAt: string;
  createdBy: string;
}

export default function InventoryPage() {
  const [selectedWarehouse, setSelectedWarehouse] = useState<string>('all');
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [showWarehouseModal, setShowWarehouseModal] = useState(false);
  const [showStockModal, setShowStockModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch warehouses
  const { data: warehousesData, isLoading: warehousesLoading } = useQuery({
    queryKey: ['warehouses'],
    queryFn: () => apiService.inventory.getWarehouses(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch inventory items
  const { data: inventoryData, isLoading: inventoryLoading, refetch: refetchInventory } = useQuery({
    queryKey: ['inventory', selectedWarehouse],
    queryFn: () => apiService.inventory.getStock({
      warehouseId: selectedWarehouse === 'all' ? undefined : selectedWarehouse,
      page: 1,
      limit: 100,
    }),
    staleTime: 2 * 60 * 1000,
  });

  // Fetch low stock alerts
  const { data: alertsData } = useQuery({
    queryKey: ['low-stock-alerts'],
    queryFn: () => apiService.inventory.getLowStockAlerts(),
    staleTime: 60 * 1000,
  });

  const warehouses = warehousesData?.data || [];
  const inventoryItems = inventoryData?.data || [];
  const alerts = alertsData?.data || [];

  // Mutations
  const updateStockMutation = useMutation({
    mutationFn: ({ productId, warehouseId, quantity }: {
      productId: string;
      warehouseId: string;
      quantity: number;
    }) => apiService.inventory.updateStock(productId, warehouseId, quantity),
    onSuccess: () => {
      toast.success('Stock updated successfully');
      refetchInventory();
      queryClient.invalidateQueries({ queryKey: ['low-stock-alerts'] });
    },
    onError: () => {
      toast.error('Failed to update stock');
    },
  });

  // Calculate warehouse utilization
  const getWarehouseUtilization = (warehouse: Warehouse) => {
    return warehouse.capacity > 0 ? (warehouse.currentStock / warehouse.capacity) * 100 : 0;
  };

  // Inventory table columns
  const inventoryColumns: Column<InventoryItem>[] = [
    {
      key: 'productName',
      header: 'Product',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.variantName}</div>
        </div>
      ),
    },
    {
      key: 'warehouseName',
      header: 'Warehouse',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <BuildingStorefrontIcon className="w-4 h-4 mr-2 text-gray-400" />
          {value}
        </div>
      ),
    },
    {
      key: 'quantity',
      header: 'Total Stock',
      sortable: true,
      className: 'text-center',
    },
    {
      key: 'availableQuantity',
      header: 'Available',
      sortable: true,
      className: 'text-center',
      render: (value, row) => (
        <span className={value < row.minStockLevel ? 'text-red-600 font-medium' : ''}>
          {value}
        </span>
      ),
    },
    {
      key: 'reservedQuantity',
      header: 'Reserved',
      sortable: true,
      className: 'text-center',
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(value)}`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'lastUpdated',
      header: 'Last Updated',
      sortable: true,
      render: (value) => formatDate(value),
    },
  ];

  // Bulk actions for inventory
  const bulkActions = [
    {
      label: 'Update Stock Levels',
      onClick: (selectedIds: string[]) => {
        // Open bulk stock update modal
        setShowStockModal(true);
      },
      variant: 'primary' as const,
    },
    {
      label: 'Export Data',
      onClick: (selectedIds: string[]) => handleBulkExport(selectedIds),
      variant: 'secondary' as const,
    },
  ];

  const handleBulkExport = async (itemIds: string[]) => {
    try {
      const response = await apiService.reports.exportReport(
        'inventory',
        'csv',
        { itemIds, warehouseId: selectedWarehouse }
      );

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `inventory-export-${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      toast.success('Export completed');
    } catch (error) {
      toast.error('Export failed');
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Inventory Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Real-time stock tracking across all warehouses
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetchInventory()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowDownTrayIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>

          <button
            onClick={() => setShowWarehouseModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4 mr-2" />
            Add Warehouse
          </button>
        </div>
      </div>

      {/* Warehouse Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {warehouses.slice(0, 4).map((warehouse: Warehouse) => {
          const utilization = getWarehouseUtilization(warehouse);
          return (
            <div key={warehouse.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <BuildingStorefrontIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  <div className="ml-4">
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                      {warehouse.name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      {warehouse.location}
                    </p>
                  </div>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(warehouse.status)}`}>
                  {capitalize(warehouse.status)}
                </span>
              </div>

              <div className="mt-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">Utilization</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {utilization.toFixed(1)}%
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2 dark:bg-gray-700">
                  <div
                    className={`h-2 rounded-full ${
                      utilization > 90 ? 'bg-red-600' :
                      utilization > 70 ? 'bg-yellow-600' : 'bg-green-600'
                    }`}
                    style={{ width: `${Math.min(utilization, 100)}%` }}
                  />
                </div>
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  {warehouse.currentStock} / {warehouse.capacity} units
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Low Stock Alerts */}
      {alerts.length > 0 && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center">
            <ExclamationTriangleIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-3" />
            <div>
              <h3 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
                Low Stock Alerts ({alerts.length})
              </h3>
              <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                {alerts.length} products are running low on stock across warehouses
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Filters and Controls */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <MapPinIcon className="w-5 h-5 text-gray-400" />
            <select
              value={selectedWarehouse}
              onChange={(e) => setSelectedWarehouse(e.target.value)}
              className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Warehouses</option>
              {warehouses.map(warehouse => (
                <option key={warehouse.id} value={warehouse.id}>
                  {warehouse.name} - {warehouse.location}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <CubeIcon className="w-5 h-5 text-gray-400" />
            <select className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white">
              <option value="all">All Products</option>
              <option value="low_stock">Low Stock Only</option>
              <option value="out_of_stock">Out of Stock</option>
              <option value="overstock">Overstock</option>
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <input
              type="search"
              placeholder="Search products..."
              className="w-full rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      <DataTable
        data={inventoryItems}
        columns={inventoryColumns}
        searchable={false}
        selectable={true}
        onSelectionChange={setSelectedItems}
        actions={bulkActions}
        pagination={{
          pageSize: 20,
          showInfo: true,
        }}
        loading={inventoryLoading}
        emptyMessage="No inventory items found"
        className="shadow-sm"
      />

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CubeIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Total Products
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {inventoryItems.length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Low Stock Items
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {inventoryItems.filter((item: InventoryItem) => item.status === 'low_stock').length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <TruckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                In Stock
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {inventoryItems.filter((item: InventoryItem) => item.status === 'in_stock').length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <MapPinIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Warehouses
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {warehouses.length}
              </dd>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
