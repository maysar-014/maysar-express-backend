'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiService } from '@/lib/api';
import { getSeller } from '@/lib/permissions';

export default function InventoryPage() {
  const seller = getSeller();

  const { data: inventoryData, isLoading } = useQuery({
    queryKey: ['inventory'],
    queryFn: () => apiService.getInventory(),
    staleTime: 30 * 1000,
  });

  const inventoryItems = inventoryData?.data?.data?.inventory || [];
  const lowStockAlerts = inventoryData?.data?.data?.lowStockAlerts || [];
  const stockMovements = inventoryData?.data?.data?.stockMovements || [];

  const getStockStatus = (current: number, min: number) => {
    if (current === 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (current <= min) return { status: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.currentStock * 100000), 0);
  const lowStockItems = inventoryItems.filter(item => item.currentStock <= item.reorderLevel).length;
  const outOfStockItems = inventoryItems.filter(item => item.currentStock === 0).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Inventory Management</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track and manage your product inventory levels
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Export Report
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Adjust Stock
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Inventory Value</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white">TZS {totalValue.toLocaleString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Estimated value</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Items</p>
          <p className="text-2xl font-bold text-blue-600">{inventoryItems.reduce((sum, item) => sum + item.currentStock, 0)}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Units in stock</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-yellow-600">{lowStockItems}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Items need restocking</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{outOfStockItems}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Items unavailable</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Inventory Overview</h3>
            <div className="flex space-x-2">
              <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>All Status</option>
                <option>In Stock</option>
                <option>Low Stock</option>
                <option>Out of Stock</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Available</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Reorder Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {inventoryItems.map((item) => {
                const stockStatus = getStockStatus(item.currentStock, item.reorderLevel);
                return (
                  <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{item.productName}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{item.productId}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{item.sku}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-lg font-semibold text-gray-900 dark:text-white">{item.currentStock}</span>
                        <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">units</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {item.availableStock} units
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">
                      {item.reorderLevel}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-full whitespace-nowrap ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{new Date(item.lastUpdated).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">Adjust</button>
                        <button className="text-green-600 hover:text-green-800 text-sm">Restock</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock Movement History</h3>
          <div className="space-y-3">
            {stockMovements.map((movement) => (
              <div key={movement.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{movement.productName}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{movement.type === 'adjustment' ? 'Stock adjustment' : 'Sale'}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-medium ${movement.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {movement.quantity > 0 ? '+' : ''}{movement.quantity} units
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{new Date(movement.date).toLocaleString()}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Restock Recommendations</h3>
          <div className="space-y-3">
            {lowStockAlerts.map((item) => (
              <div key={item.productId} className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{item.productName}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Current: {item.currentStock} | Min: {item.reorderLevel}</p>
                  </div>
                  <button className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700">
                    Restock
                  </button>
                </div>
                <p className="text-xs text-orange-700 dark:text-orange-300 mt-2">
                  Recommended: {item.reorderLevel - item.currentStock + 10} units
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}