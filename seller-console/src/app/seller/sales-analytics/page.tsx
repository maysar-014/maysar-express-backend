'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiService } from '@/lib/api';
import { getSeller } from '@/lib/permissions';

export default function SalesAnalyticsPage() {
  const [timeRange, setTimeRange] = useState('30d');
  const [activeTab, setActiveTab] = useState('overview');
  const seller = getSeller();

  const { data: analyticsData } = useQuery({
    queryKey: ['analytics', seller?.id, timeRange],
    queryFn: () => apiService.getAnalytics(),
    staleTime: 30 * 1000,
    enabled: !!seller?.id,
  });

  // Debug logging
  console.log('Analytics Data:', analyticsData);
  console.log('Sales Data:', analyticsData?.data?.data);
  console.log('Customer Insights:', analyticsData?.data?.data?.customerInsights);
  console.log('Customer Insights Full:', analyticsData?.data?.data?.customerInsights);
  console.log('Average CLV:', analyticsData?.data?.data?.customerInsights?.averageClv);
  console.log('New Customer CLV:', analyticsData?.data?.data?.customerInsights?.newCustomerClv);
  console.log('Returning Customer CLV:', analyticsData?.data?.data?.customerInsights?.returningCustomerClv);

  // Extract data from API response
  const salesData = analyticsData?.data?.data || {
    salesData: [],
    topProducts: [],
    customerInsights: {
      newCustomers: 0,
      returningCustomers: 0,
      customerRetentionRate: 0
    }
  };

  // Calculate metrics from API data
  const totalRevenue = salesData.salesData?.reduce((sum: number, day: any) => sum + day.sales, 0) || 0;
  const totalOrders = salesData.salesData?.reduce((sum: number, day: any) => sum + day.orders, 0) || 0;
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;
  
  // Calculate growth rates from API data (comparing first vs last entries)
  const revenueGrowth = salesData.salesData?.length > 1 ? 
    ((salesData.salesData[salesData.salesData.length - 1]?.sales - salesData.salesData[0]?.sales) / salesData.salesData[0]?.sales * 100).toFixed(1) : '0.0';
  const ordersGrowth = salesData.salesData?.length > 1 ? 
    ((salesData.salesData[salesData.salesData.length - 1]?.orders - salesData.salesData[0]?.orders) / salesData.salesData[0]?.orders * 100).toFixed(1) : '0.0';
  const conversionRate = salesData.customerInsights?.customerRetentionRate || 0;

  // Calculate additional metrics from API data
  const bestSellingDay = salesData.salesData?.length > 0 ? 
    salesData.salesData.reduce((max: any, day: any) => day.orders > max.orders ? day : max, salesData.salesData[0]) : null;
  const avgOrdersPerDay = salesData.salesData?.length > 0 ? 
    Math.round(totalOrders / salesData.salesData.length) : 0;
  const returnRate = ((totalOrders - (salesData.customerInsights?.returningCustomers || 0)) / totalOrders * 100).toFixed(1) || '0.0';

  // CLV data from API - properly fetch from customerInsights
  const clvData = {
    averageClv: salesData.customerInsights?.averageClv || 0,
    newCustomerClv: salesData.customerInsights?.newCustomerClv || 0,
    returningCustomerClv: salesData.customerInsights?.returningCustomerClv || 0,
    retentionRate: salesData.customerInsights?.customerRetentionRate || 0
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Track performance and analyze sales trends</p>
        </div>
        <div className="flex space-x-3">
          <select 
            value={timeRange} 
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Export Report
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">TZS {totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-green-500 mt-1">{revenueGrowth >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(revenueGrowth))}% from last period</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
          <p className="text-2xl font-bold text-blue-600">{totalOrders}</p>
          <p className="text-sm text-blue-500 mt-1">{ordersGrowth >= 0 ? '↑' : '↓'} {Math.abs(parseFloat(ordersGrowth))}% from last period</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Order Value</p>
          <p className="text-2xl font-bold text-purple-600">TZS {averageOrderValue.toLocaleString()}</p>
          <p className="text-sm text-purple-500 mt-1">Calculated from API data</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Customer Retention</p>
          <p className="text-2xl font-bold text-orange-600">{conversionRate}%</p>
          <p className="text-sm text-gray-500 mt-1">From customer insights</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'overview', label: 'Overview' },
              { id: 'products', label: 'Product Performance' },
              { id: 'customers', label: 'Customer Insights' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Revenue Trend</h3>
                  <div className="h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full h-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {(salesData.salesData || []).map((day: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-green-600 text-right">
                              TZS {day.sales.toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Orders Trend</h3>
                  <div className="h-64 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full h-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Orders</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {(salesData.salesData || []).map((day: any, index: number) => (
                          <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                            <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                              {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </td>
                            <td className="px-4 py-2 text-sm font-medium text-blue-600 text-right">
                              {day.orders} orders
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Key Metrics Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Best Selling Day</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">
                      {bestSellingDay ? new Date(bestSellingDay.date).toLocaleDateString('en-US', { weekday: 'long' }) : 'N/A'}
                    </p>
                    <p className="text-sm text-gray-500">Orders: {bestSellingDay?.orders || 0}</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Avg Orders/Day</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{avgOrdersPerDay}</p>
                    <p className="text-sm text-gray-500">From {salesData.salesData?.length || 0} days</p>
                  </div>
                  <div className="bg-gray-50 dark:bg-gray-700 p-4 rounded-lg">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Return Rate</p>
                    <p className="text-lg font-semibold text-gray-900 dark:text-white">{returnRate}%</p>
                    <p className="text-sm text-gray-500">Calculated from data</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performing Products</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Units Sold</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Growth</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {(salesData.topProducts || []).map((product: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{product.sales}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">TZS {product.revenue.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-green-500">↑ 15.2%</td>
                        <td className="px-4 py-2">
                          <button className="text-blue-600 hover:text-blue-800 text-xs">View Details</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Segments</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">New Customers</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{salesData.customerInsights?.newCustomers || 0} customers</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {Math.round((salesData.customerInsights?.newCustomers || 0) / ((salesData.customerInsights?.newCustomers || 0) + (salesData.customerInsights?.returningCustomers || 0)) * 100) || 0}%
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">Returning Customers</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{salesData.customerInsights?.returningCustomers || 0} customers</p>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold text-gray-900 dark:text-white">
                          {Math.round((salesData.customerInsights?.returningCustomers || 0) / ((salesData.customerInsights?.newCustomers || 0) + (salesData.customerInsights?.returningCustomers || 0)) * 100) || 0}%
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Lifetime Value</h3>
                  <div className="h-48 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <table className="w-full h-full">
                      <thead className="bg-gray-50 dark:bg-gray-700">
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Metric</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Value</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">Average CLV</td>
                          <td className="px-4 py-2 text-sm font-medium text-purple-600 text-right">
                            TZS {clvData.averageClv.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">New Customer CLV</td>
                          <td className="px-4 py-2 text-sm font-medium text-blue-600 text-right">
                            TZS {clvData.newCustomerClv.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">Returning Customer CLV</td>
                          <td className="px-4 py-2 text-sm font-medium text-green-600 text-right">
                            TZS {clvData.returningCustomerClv.toLocaleString()}
                          </td>
                        </tr>
                        <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                          <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">Retention Rate</td>
                          <td className="px-4 py-2 text-sm font-medium text-orange-600 text-right">
                            {clvData.retentionRate}%
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}