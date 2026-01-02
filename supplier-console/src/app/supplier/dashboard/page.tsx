'use client';

import { getSupplier, hasPermission, TIER_INFO } from '@/lib/permissions';

export default function SupplierDashboard() {
  const supplier = getSupplier();
  const tierInfo = TIER_INFO[supplier.tier];

  // Mock supplier data
  const supplierStats = {
    totalRevenue: 15750000,
    monthlyRevenue: 2850000,
    activePOs: 47,
    pendingPOs: 12,
    totalSKUs: 1247,
    lowStockSKUs: 23,
    fillRate: 94.2,
    onTimeDelivery: 91.8,
    qualityScore: 87.5,
    averageLeadTime: 3.2,
    totalPartners: 156,
    activeContracts: 12
  };

  const recentPOs = [
    { id: 'PO-2024-8901', seller: 'TechStore TZ', amount: 1250000, items: 45, status: 'processing', dueDate: '2024-12-31' },
    { id: 'PO-2024-8902', seller: 'Electronics Hub', amount: 890000, items: 32, status: 'shipped', dueDate: '2024-12-30' },
    { id: 'PO-2024-8903', seller: 'Digital World TZ', amount: 1560000, items: 67, status: 'delivered', dueDate: '2024-12-29' },
    { id: 'PO-2024-8904', seller: 'Mobile Center', amount: 780000, items: 28, status: 'pending', dueDate: '2025-01-02' }
  ];

  const demandForecasts = [
    { sku: 'SKU-001', product: 'Samsung Galaxy A54', currentStock: 125, forecastDemand: 89, reorderPoint: 50, urgency: 'medium' },
    { sku: 'SKU-002', product: 'iPhone 15 Pro', currentStock: 23, forecastDemand: 156, reorderPoint: 75, urgency: 'high' },
    { sku: 'SKU-003', product: 'MacBook Air M2', currentStock: 67, forecastDemand: 34, reorderPoint: 25, urgency: 'low' }
  ];

  const reorderAlerts = [
    { sku: 'SKU-004', product: 'HP Laptop 15-inch', currentStock: 8, minStock: 25, leadTime: 5, priority: 'urgent' },
    { sku: 'SKU-005', product: 'Wireless Earbuds Pro', currentStock: 15, minStock: 40, leadTime: 3, priority: 'high' },
    { sku: 'SKU-006', product: 'Gaming Mouse RGB', currentStock: 22, minStock: 35, leadTime: 2, priority: 'medium' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                TZS {supplierStats.monthlyRevenue.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-green-600">+18.7% from last month</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Purchase Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{supplierStats.activePOs}</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-gray-600">{supplierStats.pendingPOs} pending fulfillment</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Fill Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{supplierStats.fillRate}%</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-green-600">+2.1% this quarter</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Quality Score</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{supplierStats.qualityScore}/100</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-green-600">Excellent performance</span>
          </div>
        </div>
      </div>

      {/* Performance Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Supply Performance</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Fill Rate</span>
              <span className="text-sm font-medium text-green-600">{supplierStats.fillRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">On-Time Delivery</span>
              <span className="text-sm font-medium text-green-600">{supplierStats.onTimeDelivery}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Avg Lead Time</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{supplierStats.averageLeadTime} days</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Partners</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{supplierStats.totalPartners}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Purchase Orders</h3>
          <div className="space-y-3">
            {recentPOs.map((po) => (
              <div key={po.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{po.id}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{po.seller} • {po.items} items</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">TZS {po.amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(po.status)}`}>
                    {po.status}
                  </span>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            View All Orders
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Reorder Alerts</h3>
          <div className="space-y-3">
            {reorderAlerts.map((alert) => (
              <div key={alert.sku} className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{alert.product}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{alert.sku} • {alert.leadTime}d lead time</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getUrgencyColor(alert.priority)}`}>
                    {alert.priority}
                  </span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-orange-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${(alert.currentStock / alert.minStock) * 100}%` }}
                    ></div>
                  </div>
                  <p className="text-xs text-orange-700 dark:text-orange-400 mt-1">
                    {alert.currentStock} / {alert.minStock} units
                  </p>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            Manage Inventory
          </button>
        </div>
      </div>

      {/* Demand Forecasting */}
      {hasPermission(supplier.tier, 'analytics', 'forecasting') && (
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Demand Forecasting</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {demandForecasts.map((forecast) => (
              <div key={forecast.sku} className="p-4 bg-white dark:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-600">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{forecast.product}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{forecast.sku}</p>
                  </div>
                  <span className={`text-xs px-2 py-1 rounded-full ${getUrgencyColor(forecast.urgency)}`}>
                    {forecast.urgency}
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Current Stock:</span>
                    <span className="font-medium text-gray-900 dark:text-white">{forecast.currentStock}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Forecast Demand:</span>
                    <span className="font-medium text-blue-600">{forecast.forecastDemand}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600 dark:text-gray-400">Reorder Point:</span>
                    <span className="font-medium text-orange-600">{forecast.reorderPoint}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Add SKUs</p>
          </button>
          <button className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <p className="text-sm font-medium text-green-900 dark:text-green-300">Process POs</p>
          </button>
          <button className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Update Stock</p>
          </button>
          {hasPermission(supplier.tier, 'pricing', 'contract') && (
            <button className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-300">Manage Pricing</p>
            </button>
          )}
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="bg-gradient-to-r from-purple-50 to-blue-50 dark:from-purple-900/10 dark:to-blue-900/10 p-6 rounded-lg border border-purple-200 dark:border-purple-800">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <h4 className="font-semibold text-purple-900 dark:text-purple-300 mb-2">{tierInfo.name} Benefits</h4>
            <p className="text-purple-800 dark:text-purple-400 text-sm mb-3">{tierInfo.description}</p>
            <div className="flex flex-wrap gap-2">
              {tierInfo.benefits.map((benefit, index) => (
                <span key={index} className="bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-300 px-3 py-1 rounded-full text-xs">
                  {benefit}
                </span>
              ))}
            </div>
          </div>
          <button className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm">
            Upgrade Tier
          </button>
        </div>
      </div>
    </div>
  );
}