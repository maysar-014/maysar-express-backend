'use client';

import { getSeller } from '@/lib/permissions';

export default function InventoryPage() {
  const seller = getSeller();

  const inventoryItems = [
    { id: 'PRD-001', name: 'Samsung Galaxy A54', sku: 'SAM-A54-128', currentStock: 25, minStock: 10, maxStock: 100, location: 'Warehouse A', lastUpdated: '2024-12-30 09:30' },
    { id: 'PRD-002', name: 'HP Laptop 15-inch', sku: 'HP-LAP-15', currentStock: 3, minStock: 5, maxStock: 50, location: 'Warehouse B', lastUpdated: '2024-12-29 14:20' },
    { id: 'PRD-003', name: 'Wireless Earbuds', sku: 'WL-EAR-001', currentStock: 45, minStock: 15, maxStock: 200, location: 'Warehouse A', lastUpdated: '2024-12-30 11:15' },
    { id: 'PRD-004', name: 'iPhone 15 Pro', sku: 'IPH-15-PRO', currentStock: 0, minStock: 3, maxStock: 30, location: 'Warehouse C', lastUpdated: '2024-12-28 16:45' },
    { id: 'PRD-005', name: 'MacBook Air M2', sku: 'MBA-M2-256', currentStock: 12, minStock: 8, maxStock: 40, location: 'Warehouse B', lastUpdated: '2024-12-30 08:00' }
  ];

  const getStockStatus = (current: number, min: number) => {
    if (current === 0) return { status: 'Out of Stock', color: 'text-red-600 bg-red-100' };
    if (current <= min) return { status: 'Low Stock', color: 'text-yellow-600 bg-yellow-100' };
    return { status: 'In Stock', color: 'text-green-600 bg-green-100' };
  };

  const totalValue = inventoryItems.reduce((sum, item) => sum + (item.currentStock * 100000), 0);
  const lowStockItems = inventoryItems.filter(item => item.currentStock <= item.minStock).length;
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
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Total Inventory Value</p>
          <p className="text-2xl font-bold text-gray-900">TZS {totalValue.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Estimated value</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Total Items</p>
          <p className="text-2xl font-bold text-blue-600">{inventoryItems.reduce((sum, item) => sum + item.currentStock, 0)}</p>
          <p className="text-sm text-gray-500 mt-1">Units in stock</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Low Stock Alerts</p>
          <p className="text-2xl font-bold text-yellow-600">{lowStockItems}</p>
          <p className="text-sm text-gray-500 mt-1">Items need restocking</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Out of Stock</p>
          <p className="text-2xl font-bold text-red-600">{outOfStockItems}</p>
          <p className="text-sm text-gray-500 mt-1">Items unavailable</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Inventory Overview</h3>
            <div className="flex space-x-2">
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Locations</option>
                <option>Warehouse A</option>
                <option>Warehouse B</option>
                <option>Warehouse C</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
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
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">SKU</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Min/Max</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Location</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Last Updated</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {inventoryItems.map((item) => {
                const stockStatus = getStockStatus(item.currentStock, item.minStock);
                return (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{item.name}</p>
                        <p className="text-sm text-gray-500">{item.id}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.sku}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center">
                        <span className="text-lg font-semibold text-gray-900">{item.currentStock}</span>
                        <span className="text-sm text-gray-500 ml-1">units</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {item.minStock} / {item.maxStock}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-900">{item.location}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${stockStatus.color}`}>
                        {stockStatus.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{item.lastUpdated}</td>
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
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Stock Movement History</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">Samsung Galaxy A54</p>
                <p className="text-xs text-gray-500">Stock adjustment</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">+50 units</p>
                <p className="text-xs text-gray-500">2024-12-30 09:30</p>
              </div>
            </div>
            <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">HP Laptop 15-inch</p>
                <p className="text-xs text-gray-500">Sale</p>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-red-600">-2 units</p>
                <p className="text-xs text-gray-500">2024-12-29 14:20</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Restock Recommendations</h3>
          <div className="space-y-3">
            {inventoryItems.filter(item => item.currentStock <= item.minStock).map((item) => (
              <div key={item.id} className="p-3 bg-orange-50 rounded-lg border border-orange-200">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{item.name}</p>
                    <p className="text-xs text-gray-500">Current: {item.currentStock} | Min: {item.minStock}</p>
                  </div>
                  <button className="text-xs bg-orange-600 text-white px-3 py-1 rounded hover:bg-orange-700">
                    Restock
                  </button>
                </div>
                <p className="text-xs text-orange-700 mt-2">
                  Recommended: {item.maxStock - item.currentStock} units
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}