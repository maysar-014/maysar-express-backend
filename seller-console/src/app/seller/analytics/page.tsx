'use client';

import { getSeller, hasPermission } from '@/lib/permissions';

export default function AnalyticsPage() {
  const seller = getSeller();

  const salesData = {
    totalRevenue: 2450000,
    monthlyRevenue: 850000,
    dailyRevenue: 45000,
    revenueGrowth: 15.3,
    totalOrders: 1247,
    monthlyOrders: 156,
    conversionRate: 3.2,
    averageOrderValue: 125000,
    topProducts: [
      { name: 'Samsung Galaxy A54', sales: 156, revenue: 850000 },
      { name: 'Wireless Earbuds', sales: 234, revenue: 650000 },
      { name: 'HP Laptop 15-inch', sales: 89, revenue: 1200000 }
    ],
    customerMetrics: {
      totalCustomers: 892,
      newCustomers: 45,
      returningCustomers: 67,
      customerRetentionRate: 68.5
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your business performance and growth insights
          </p>
        </div>
        <div className="flex space-x-3">
          <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 3 months</option>
            <option>Last year</option>
          </select>
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Export Report
          </button>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-gray-900">TZS {salesData.totalRevenue.toLocaleString()}</p>
          <div className="flex items-center mt-2">
            <span className="text-sm text-green-600">+{salesData.revenueGrowth}% from last month</span>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
          <p className="text-2xl font-bold text-blue-600">TZS {salesData.monthlyRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">This month</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Average Order Value</p>
          <p className="text-2xl font-bold text-purple-600">TZS {salesData.averageOrderValue.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Per order</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Conversion Rate</p>
          <p className="text-2xl font-bold text-green-600">{salesData.conversionRate}%</p>
          <p className="text-sm text-gray-500 mt-1">Visitors to buyers</p>
        </div>
      </div>

      {/* Sales Performance Chart */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-semibold text-gray-900">Sales Performance</h3>
          <div className="flex space-x-2">
            <button className="px-3 py-1 text-sm bg-blue-100 text-blue-800 rounded">Revenue</button>
            <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Orders</button>
            <button className="px-3 py-1 text-sm text-gray-600 hover:bg-gray-100 rounded">Customers</button>
          </div>
        </div>
        <div className="h-64 bg-gray-50 rounded-lg flex items-center justify-center">
          <p className="text-gray-500">Sales performance chart would be displayed here</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Top Performing Products</h3>
          <div className="space-y-4">
            {salesData.topProducts.map((product, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div>
                  <p className="font-medium text-gray-900">{product.name}</p>
                  <p className="text-sm text-gray-500">{product.sales} units sold</p>
                </div>
                <div className="text-right">
                  <p className="font-medium text-gray-900">TZS {product.revenue.toLocaleString()}</p>
                  <p className="text-sm text-gray-500">Revenue</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Metrics */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Customer Insights</h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Total Customers</span>
              <span className="font-semibold text-gray-900">{salesData.customerMetrics.totalCustomers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">New Customers (30d)</span>
              <span className="font-semibold text-green-600">{salesData.customerMetrics.newCustomers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Returning Customers</span>
              <span className="font-semibold text-blue-600">{salesData.customerMetrics.returningCustomers}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Retention Rate</span>
              <span className="font-semibold text-purple-600">{salesData.customerMetrics.customerRetentionRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {hasPermission(seller.tier, 'advancedAnalytics') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Advanced Analytics */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Advanced Insights</h3>
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h4 className="font-medium text-blue-900">Peak Sales Hours</h4>
                <p className="text-sm text-blue-700 mt-1">Most sales occur between 2 PM - 6 PM</p>
              </div>
              <div className="p-4 bg-green-50 rounded-lg">
                <h4 className="font-medium text-green-900">Growth Opportunity</h4>
                <p className="text-sm text-green-700 mt-1">Electronics category showing 25% growth potential</p>
              </div>
              <div className="p-4 bg-purple-50 rounded-lg">
                <h4 className="font-medium text-purple-900">Customer Behavior</h4>
                <p className="text-sm text-purple-700 mt-1">Average 2.3 products per order, 68% mobile users</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Growth Recommendations</h3>
            <div className="space-y-3">
              <div className="p-3 border-l-4 border-blue-500 bg-blue-50">
                <p className="text-sm font-medium text-blue-900">Inventory Optimization</p>
                <p className="text-xs text-blue-700 mt-1">Increase stock for Samsung Galaxy A54 - high demand detected</p>
              </div>
              <div className="p-3 border-l-4 border-green-500 bg-green-50">
                <p className="text-sm font-medium text-green-900">Pricing Strategy</p>
                <p className="text-xs text-green-700 mt-1">Consider 5% price increase for Wireless Earbuds</p>
              </div>
              <div className="p-3 border-l-4 border-purple-500 bg-purple-50">
                <p className="text-sm font-medium text-purple-900">Marketing Focus</p>
                <p className="text-xs text-purple-700 mt-1">Target laptop promotions during weekends</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!hasPermission(seller.tier, 'advancedAnalytics') && (
        <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-blue-900">Unlock Advanced Analytics</h4>
              <p className="text-blue-700 text-sm mt-1">
                Upgrade to Gold tier or higher to access detailed insights, growth recommendations, and predictive analytics.
              </p>
            </div>
            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Upgrade Now
            </button>
          </div>
        </div>
      )}
    </div>
  );
}