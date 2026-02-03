'use client';

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { getSeller, hasPermission } from '@/lib/permissions';
import { useState } from 'react';

type ChartType = 'revenue' | 'orders' | 'customers';

export default function SalesAnalyticsPage() {
  const seller = getSeller();
  const [chartType, setChartType] = useState<ChartType>('revenue');

  const { data: analyticsData, isLoading } = useQuery({
    queryKey: ['analytics'],
    queryFn: () => apiService.getAnalytics(),
    staleTime: 30 * 1000,
  });

  const analytics = analyticsData?.data?.data || {};
  const salesData = analytics.salesData || [];
  const customerInsights = analytics.customerInsights || {};
  const topProducts = analytics.topProducts || [];

  // Calculate totals from sales data
  const totalRevenue = salesData.reduce((sum: number, day: any) => sum + (day.sales || 0), 0);
  const totalOrders = salesData.reduce((sum: number, day: any) => sum + (day.orders || 0), 0);
  const averageOrderValue = totalOrders > 0 ? Math.round(totalRevenue / totalOrders) : 0;

  // Calculate sales growth and trends
  const salesTrend = salesData.length > 1
    ? salesData[salesData.length - 1]?.sales > salesData[salesData.length - 2]?.sales ? 'up' : 'down'
    : 'stable';

  const salesGrowth = salesData.length > 1
    ? ((salesData[salesData.length - 1]?.sales - salesData[salesData.length - 2]?.sales) / salesData[salesData.length - 2]?.sales * 100).toFixed(1)
    : 0;

  // Sales velocity (orders per day)
  const salesVelocity = salesData.length > 0 ? Math.round(totalOrders / salesData.length) : 0;

  // Peak sales day
  const peakSalesDay = salesData.reduce((max: any, day: any) =>
    day.sales > (max?.sales || 0) ? day : max, salesData[0]);

  // Chart data preparation based on type
  const getChartData = () => {
    const data = salesData.slice(-7); // Last 7 days for the chart

    if (chartType === 'revenue') {
      return data.map((day: any) => ({ date: day.date, value: day.sales || 0, label: 'Revenue' }));
    } else if (chartType === 'orders') {
      return data.map((day: any) => ({ date: day.date, value: day.orders || 0, label: 'Orders' }));
    } else if (chartType === 'customers') {
      // For customers, we'll simulate customer acquisition data (could be enhanced with real data)
      return data.map((day: any, index: number) => ({
        date: day.date,
        value: Math.floor((day.sales || 0) / 10000) + index, // Simulate customer data
        label: 'Customers'
      }));
    }
    return [];
  };

  const chartData = getChartData();
  const maxValue = Math.max(...chartData.map((d: any) => d.value || 0));
  const chartHeight = 200;
  const chartWidth = 800; // Increased width for full container

  // Generate chart points for line
  const getChartPoints = () => {
    if (chartData.length === 0) return '';

    return chartData.map((day: any, index: number) => {
      const x = (index / (chartData.length - 1)) * chartWidth;
      const y = chartHeight - ((day.value || 0) / maxValue) * chartHeight;
      return `${x},${y}`;
    }).join(' ');
  };

  // Generate area fill points
  const getAreaPoints = () => {
    if (chartData.length === 0) return '';

    const linePoints = chartData.map((day: any, index: number) => {
      const x = (index / (chartData.length - 1)) * chartWidth;
      const y = chartHeight - ((day.value || 0) / maxValue) * chartHeight;
      return `${x},${y}`;
    });

    return [
      ...linePoints,
      `${chartWidth},${chartHeight}`,
      `0,${chartHeight}`
    ].join(' ');
  };

  // Get chart color based on type
  const getChartColor = () => {
    switch (chartType) {
      case 'revenue': return 'rgb(59, 130, 246)'; // Blue
      case 'orders': return 'rgb(16, 185, 129)'; // Green
      case 'customers': return 'rgb(139, 92, 246)'; // Purple
      default: return 'rgb(59, 130, 246)';
    }
  };

  // Get Y-axis labels based on type
  const getYAxisLabels = () => {
    return [0, 1, 2, 3, 4].map((label) => {
      const value = Math.round((maxValue * (4 - label)) / 4);
      switch (chartType) {
        case 'revenue': return `TZS ${value.toLocaleString()}`;
        case 'orders': return value.toString();
        case 'customers': return value.toString();
        default: return value.toString();
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Analytics</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Detailed insights into your sales performance and revenue trends
          </p>
        </div>
        <div className="flex space-x-3">
          <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
            <option>Last 30 days</option>
            <option>Last 7 days</option>
            <option>Last 3 months</option>
            <option>Last year</option>
          </select>
          <button className="px-3 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-600 text-sm">
            Export Report
          </button>
        </div>
      </div>

      {/* Revenue Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Revenue</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">TZS {totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 30 days</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-xl font-bold text-blue-600">{totalOrders}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Last 30 days</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Average Order Value</p>
          <p className="text-xl font-bold text-purple-600">TZS {averageOrderValue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per order</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Daily Average</p>
          <p className="text-xl font-bold text-green-600">TZS {salesData.length > 0 ? Math.round(totalRevenue / salesData.length).toLocaleString() : 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Revenue per day</p>
        </div>
      </div>

      {/* Sales Performance Chart */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Sales Performance</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Track your revenue and order trends over time</p>
            </div>
            <div className="flex space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
              <button
                onClick={() => setChartType('revenue')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  chartType === 'revenue'
                    ? 'bg-white dark:bg-gray-600 text-blue-600 dark:text-blue-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Revenue
              </button>
              <button
                onClick={() => setChartType('orders')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  chartType === 'orders'
                    ? 'bg-white dark:bg-gray-600 text-green-600 dark:text-green-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Orders
              </button>
              <button
                onClick={() => setChartType('customers')}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  chartType === 'customers'
                    ? 'bg-white dark:bg-gray-600 text-purple-600 dark:text-purple-400 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                Customers
              </button>
            </div>
          </div>
          <div className="relative">
            <div className="h-80 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-700 rounded-xl border border-gray-100 dark:border-gray-600 p-6">
              {chartData.length > 0 ? (
                <svg width="100%" height="100%" viewBox={`0 0 ${chartWidth + 80} ${chartHeight + 20}`} className="overflow-visible">
                  {/* Grid lines */}
                  {[0, 1, 2, 3, 4].map((line) => (
                    <line
                      key={line}
                      x1="0"
                      y1={(line * chartHeight) / 4}
                      x2={chartWidth}
                      y2={(line * chartHeight) / 4}
                      stroke="currentColor"
                      strokeWidth="0.5"
                      className="text-gray-300 dark:text-gray-600"
                    />
                  ))}

                  {/* Area fill */}
                  <polygon
                    points={getAreaPoints()}
                    fill="url(#areaGradient)"
                    opacity="0.3"
                  />

                  {/* Line */}
                  <polyline
                    points={getChartPoints()}
                    fill="none"
                    stroke={getChartColor()}
                    strokeWidth="3"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Data points */}
                  {chartData.map((day: any, index: number) => {
                    const x = (index / (chartData.length - 1)) * chartWidth;
                    const y = chartHeight - ((day.value || 0) / maxValue) * chartHeight;
                    return (
                      <circle
                        key={index}
                        cx={x}
                        cy={y}
                        r="4"
                        fill={getChartColor()}
                        className="hover:r-6 transition-all duration-200"
                      />
                    );
                  })}

                  {/* X-axis labels */}
                  {chartData.map((day: any, index: number) => {
                    if (index % Math.ceil(chartData.length / 7) === 0) {
                      const x = (index / (chartData.length - 1)) * chartWidth;
                      return (
                        <text
                          key={index}
                          x={x}
                          y={chartHeight + 15}
                          textAnchor="middle"
                          className="text-xs fill-gray-500 dark:fill-gray-400"
                        >
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </text>
                      );
                    }
                    return null;
                  })}

                  {/* Y-axis labels */}
                  {getYAxisLabels().map((labelText, index) => (
                    <text
                      key={index}
                      x="50"
                      y={(index * chartHeight) / 4 + 4}
                      textAnchor="end"
                      className="text-xs fill-gray-500 dark:fill-gray-400"
                    >
                      {labelText}
                    </text>
                  ))}

                  {/* Gradient definition */}
                  <defs>
                    <linearGradient id="areaGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor={getChartColor()} stopOpacity="0.4" />
                      <stop offset="100%" stopColor={getChartColor()} stopOpacity="0.1" />
                    </linearGradient>
                  </defs>
                </svg>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center">
                    <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white mb-2">No Data Available</h4>
                    <p className="text-gray-500 dark:text-gray-400 text-sm max-w-sm mx-auto">Start making sales to see your performance analytics and trends here</p>
                  </div>
                </div>
              )}
            </div>
            <div className="absolute top-4 right-4">
              <button className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors rounded-md hover:bg-white/50">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Top Performing Products</h3>
          <div className="space-y-3">
            {isLoading ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">Loading products...</div>
            ) : topProducts.length === 0 ? (
              <div className="text-center text-gray-500 dark:text-gray-400 py-4">No products data available</div>
            ) : (
              topProducts.map((product: any, index: number) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{product.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{product.sales} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-gray-900 dark:text-white text-sm">TZS {product.revenue.toLocaleString()}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Revenue</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Sales Performance Metrics */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Sales Performance</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Sales Growth</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Monthly change</p>
              </div>
              <div className="text-right">
                <p className={`text-xl font-bold ${salesTrend === 'up' ? 'text-green-600' : salesTrend === 'down' ? 'text-red-600' : 'text-gray-600'}`}>
                  {salesTrend === 'up' ? '+' : salesTrend === 'down' ? '-' : ''}{Math.abs(Number(salesGrowth))}%
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Sales Velocity</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Orders per day</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-blue-600">{salesVelocity}</p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Peak Sales Day</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Highest performing day</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-purple-600">
                  {peakSalesDay?.date ? new Date(peakSalesDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A'}
                </p>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Conversion Rate</p>
                <p className="text-sm text-gray-500 dark:text-gray-400">Visitors to buyers</p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-orange-600">3.2%</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {hasPermission(seller.tier, 'advancedAnalytics') && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Advanced Analytics */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Advanced Insights</h3>
            <div className="space-y-3">
              <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <h4 className="font-medium text-blue-900 dark:text-blue-200 text-sm">Peak Sales Hours</h4>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Most sales occur between 2 PM - 6 PM</p>
              </div>
              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
                <h4 className="font-medium text-green-900 dark:text-green-200 text-sm">Growth Opportunity</h4>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">Electronics category showing 25% growth potential</p>
              </div>
              <div className="p-3 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                <h4 className="font-medium text-purple-900 dark:text-purple-200 text-sm">Customer Behavior</h4>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">Average 2.3 products per order, 68% mobile users</p>
              </div>
            </div>
          </div>

          {/* Recommendations */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Growth Recommendations</h3>
            <div className="space-y-3">
              <div className="p-3 border-l-4 border-blue-500 bg-blue-50 dark:bg-blue-900/20 rounded-md">
                <p className="text-xs font-medium text-blue-900 dark:text-blue-200">Inventory Optimization</p>
                <p className="text-xs text-blue-700 dark:text-blue-300 mt-1">Increase stock for Samsung Galaxy A54 - high demand detected</p>
              </div>
              <div className="p-3 border-l-4 border-green-500 bg-green-50 dark:bg-green-900/20 rounded-md">
                <p className="text-xs font-medium text-green-900 dark:text-green-200">Pricing Strategy</p>
                <p className="text-xs text-green-700 dark:text-green-300 mt-1">Consider 5% price increase for Wireless Earbuds</p>
              </div>
              <div className="p-3 border-l-4 border-purple-500 bg-purple-50 dark:bg-purple-900/20 rounded-md">
                <p className="text-xs font-medium text-purple-900 dark:text-purple-200">Marketing Focus</p>
                <p className="text-xs text-purple-700 dark:text-purple-300 mt-1">Target laptop promotions during weekends</p>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
