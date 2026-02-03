'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiService } from '@/lib/api';
import { getSeller, hasPermission, TIER_INFO } from '@/lib/permissions';

export default function SellerDashboard() {
  const seller = getSeller();
  const tierInfo = TIER_INFO[seller.tier];
  const [recentOrdersPage, setRecentOrdersPage] = useState(0);
  const [stockAlertsPage, setStockAlertsPage] = useState(0);

  // Fetch dashboard data from API
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => apiService.getDashboard(),
    staleTime: 30 * 1000,
  });

  console.log('Dashboard data:', dashboardData);
  console.log('Loading:', isLoading);
  console.log('Error:', error);

  const businessStats = dashboardData?.data?.data?.stats || {};
  const recentOrders = dashboardData?.data?.data?.recentOrders || [];
  const lowStockProducts = dashboardData?.data?.data?.lowStockProducts || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Monthly Revenue</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                TZS {businessStats.monthlyRevenue?.toLocaleString() || '0'}
              </p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-green-600">{businessStats.monthlyGrowth || '+0%'} from last month</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Orders</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{businessStats.totalOrders || 0}</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-gray-600">{businessStats.pendingOrders || 0} pending</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Active Products</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{businessStats.activeProducts}</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-orange-600">{businessStats.lowStockItems} low stock</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Conversion Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{businessStats.conversionRate}%</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-green-600">{businessStats.conversionGrowth || '+0%'} this week</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Business Health</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Fulfillment Rate</span>
              <span className="text-xs font-medium text-green-600">{businessStats.fulfillmentRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Return Rate</span>
              <span className="text-xs font-medium text-green-600">{businessStats.returnsRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Customer Rating</span>
              <span className="text-xs font-medium text-green-600">{businessStats.customerRating}/5.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Customers</span>
              <span className="text-xs font-medium text-gray-900 dark:text-white">{businessStats.totalCustomers}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Orders</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setRecentOrdersPage(Math.max(0, recentOrdersPage - 1))}
                disabled={recentOrdersPage === 0}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <button
                onClick={() => setRecentOrdersPage(recentOrdersPage + 1)}
                disabled={(recentOrdersPage + 1) * 2 >= recentOrders.length}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {recentOrders.slice(recentOrdersPage * 2, (recentOrdersPage + 1) * 2).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-md">
                <div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{order.id}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{order.customer}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-gray-900 dark:text-white">TZS {order.amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
                  </span>
                </div>
              </div>
            ))}
            {recentOrders.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No recent orders</p>
            )}
          </div>
          <button className="w-full mt-4 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs">
            View All Orders
          </button>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Stock Alerts</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setStockAlertsPage(Math.max(0, stockAlertsPage - 1))}
                disabled={stockAlertsPage === 0}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <button
                onClick={() => setStockAlertsPage(stockAlertsPage + 1)}
                disabled={(stockAlertsPage + 1) * 2 >= lowStockProducts.length}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {lowStockProducts.slice(stockAlertsPage * 2, (stockAlertsPage + 1) * 2).map((product: any) => (
              <div key={product.id} className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-md border border-orange-200 dark:border-orange-800">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-xs font-medium text-gray-900 dark:text-white">{product.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{product.category}</p>
                  </div>
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    {product.currentStock} left
                  </span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-orange-200 rounded-md h-2">
                    <div
                      className="bg-orange-500 h-2 rounded-md"
                      style={{ width: `${(product.currentStock / product.minStock) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
            {lowStockProducts.length === 0 && (
              <p className="text-xs text-gray-500 text-center py-4">No stock alerts</p>
            )}
          </div>
          <button className="w-full mt-4 px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-xs">
            Restock Items
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300">Add Product</p>
          </button>
          <button className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <p className="text-xs font-medium text-green-900 dark:text-green-300">Process Orders</p>
          </button>
          <button className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <p className="text-xs font-medium text-purple-900 dark:text-purple-300">Update Inventory</p>
          </button>
          {hasPermission(seller.tier, 'promotions') && (
            <button className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
              <p className="text-xs font-medium text-orange-900 dark:text-orange-300">Create Promotion</p>
            </button>
          )}
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 p-4 rounded-md border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2 text-sm">{tierInfo.name} Benefits</h4>
            <p className="text-blue-800 dark:text-blue-400 text-xs mb-3">{tierInfo.description}</p>
            <div className="flex flex-wrap gap-2">
              {tierInfo.benefits.map((benefit: string, index: number) => (
                <span key={index} className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">
                  {benefit}
                </span>
              ))}
            </div>
          </div>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-xs">
            Upgrade Tier
          </button>
        </div>
      </div>
    </div>
  );
}
