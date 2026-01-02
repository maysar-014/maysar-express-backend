'use client';

import { getSeller, hasPermission, TIER_INFO } from '@/lib/permissions';

export default function SellerDashboard() {
  const seller = getSeller();
  const tierInfo = TIER_INFO[seller.tier];

  // Mock business data
  const businessStats = {
    totalRevenue: 2450000,
    monthlyRevenue: 850000,
    totalOrders: 1247,
    pendingOrders: 23,
    activeProducts: 156,
    lowStockItems: 8,
    conversionRate: 3.2,
    averageOrderValue: 125000,
    customerRating: 4.8,
    totalCustomers: 892,
    returnsRate: 2.1,
    fulfillmentRate: 98.5
  };

  const recentOrders = [
    { id: 'ORD-2024-5678', customer: 'John Mwalimu', amount: 125000, status: 'processing', date: '2024-12-30 10:30' },
    { id: 'ORD-2024-5679', customer: 'Amina Hassan', amount: 89000, status: 'shipped', date: '2024-12-30 09:15' },
    { id: 'ORD-2024-5680', customer: 'Peter Mwanga', amount: 156000, status: 'delivered', date: '2024-12-29 16:45' },
    { id: 'ORD-2024-5681', customer: 'Grace Mbwana', amount: 78000, status: 'pending', date: '2024-12-29 14:20' }
  ];

  const lowStockProducts = [
    { id: 'PRD-001', name: 'Samsung Galaxy A54', currentStock: 3, minStock: 10, category: 'Smartphones' },
    { id: 'PRD-002', name: 'HP Laptop 15-inch', currentStock: 1, minStock: 5, category: 'Laptops' },
    { id: 'PRD-003', name: 'Wireless Earbuds', currentStock: 5, minStock: 15, category: 'Accessories' }
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

  return (
    <div className="space-y-8">

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                TZS {businessStats.monthlyRevenue.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-green-600">+15.3% from last month</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{businessStats.totalOrders}</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-gray-600">{businessStats.pendingOrders} pending</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Products</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{businessStats.activeProducts}</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-orange-600">{businessStats.lowStockItems} low stock</span>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Conversion Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{businessStats.conversionRate}%</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-green-600">+0.8% this week</span>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Business Health</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Fulfillment Rate</span>
              <span className="text-sm font-medium text-green-600">{businessStats.fulfillmentRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Return Rate</span>
              <span className="text-sm font-medium text-green-600">{businessStats.returnsRate}%</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Customer Rating</span>
              <span className="text-sm font-medium text-green-600">{businessStats.customerRating}/5.0</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Total Customers</span>
              <span className="text-sm font-medium text-gray-900 dark:text-white">{businessStats.totalCustomers}</span>
            </div>
          </div>
        </div>

        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Orders</h3>
          <div className="space-y-3">
            {recentOrders.map((order) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-white dark:bg-gray-700 rounded-lg">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">{order.id}</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">{order.customer}</p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">TZS {order.amount.toLocaleString()}</p>
                  <span className={`text-xs px-2 py-1 rounded-full ${getStatusColor(order.status)}`}>
                    {order.status}
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
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Stock Alerts</h3>
          <div className="space-y-3">
            {lowStockProducts.map((product) => (
              <div key={product.id} className="p-3 bg-orange-50 dark:bg-orange-900/10 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">{product.category}</p>
                  </div>
                  <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">
                    {product.currentStock} left
                  </span>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-orange-200 rounded-full h-2">
                    <div 
                      className="bg-orange-500 h-2 rounded-full"
                      style={{ width: `${(product.currentStock / product.minStock) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors">
            Restock Items
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Add Product</p>
          </button>
          <button className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <p className="text-sm font-medium text-green-900 dark:text-green-300">Process Orders</p>
          </button>
          <button className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Update Inventory</p>
          </button>
          {hasPermission(seller.tier, 'promotions') && (
            <button className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
              <p className="text-sm font-medium text-orange-900 dark:text-orange-300">Create Promotion</p>
            </button>
          )}
        </div>
      </div>

      {/* Tier Benefits */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/10 dark:to-purple-900/10 p-6 rounded-lg border border-blue-200 dark:border-blue-800">
        <div className="flex items-start space-x-4">
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-2">{tierInfo.name} Benefits</h4>
            <p className="text-blue-800 dark:text-blue-400 text-sm mb-3">{tierInfo.description}</p>
            <div className="flex flex-wrap gap-2">
              {tierInfo.benefits.map((benefit, index) => (
                <span key={index} className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-3 py-1 rounded-full text-xs">
                  {benefit}
                </span>
              ))}
            </div>
          </div>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm">
            Upgrade Tier
          </button>
        </div>
      </div>
    </div>
  );
}