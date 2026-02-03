'use client';

import { useState } from 'react';

interface AnalyticsData {
  period: string;
  revenue: number;
  orders: number;
  avgOrderValue: number;
  topProducts: { name: string; sales: number; revenue: number }[];
  demandForecast: { product: string; predictedDemand: number; confidence: number }[];
  salesTrends: { month: string; sales: number; growth: number }[];
}

const mockAnalytics: AnalyticsData = {
  period: 'Last 30 Days',
  revenue: 45600000,
  orders: 156,
  avgOrderValue: 292308,
  topProducts: [
    { name: 'Coca Cola 500ml', sales: 2400, revenue: 2880000 },
    { name: 'Azam Cooking Oil 1L', sales: 850, revenue: 2975000 },
    { name: 'Pembe Flour 2kg', sales: 1200, revenue: 3360000 },
    { name: 'Kilimanjaro Water 1.5L', sales: 3200, revenue: 2560000 }
  ],
  demandForecast: [
    { product: 'Coca Cola 500ml', predictedDemand: 2800, confidence: 92 },
    { product: 'Azam Cooking Oil 1L', predictedDemand: 950, confidence: 87 },
    { product: 'Pembe Flour 2kg', predictedDemand: 1400, confidence: 89 },
    { product: 'Rice 5kg', predictedDemand: 600, confidence: 78 }
  ],
  salesTrends: [
    { month: 'Oct 2023', sales: 125000, growth: 8.5 },
    { month: 'Nov 2023', sales: 142000, growth: 13.6 },
    { month: 'Dec 2023', sales: 168000, growth: 18.3 },
    { month: 'Jan 2024', sales: 156000, growth: -7.1 }
  ]
};

export default function AnalyticsPage() {
  const [selectedPeriod, setSelectedPeriod] = useState('30days');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 90) return 'bg-green-100 text-green-800';
    if (confidence >= 80) return 'bg-yellow-100 text-yellow-800';
    return 'bg-red-100 text-red-800';
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics & Forecasting</h1>
        <div className="flex space-x-4">
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
          >
            <option value="7days">Last 7 Days</option>
            <option value="30days">Last 30 Days</option>
            <option value="90days">Last 90 Days</option>
            <option value="1year">Last Year</option>
          </select>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Export Report
          </button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Revenue</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">TZS {mockAnalytics.revenue.toLocaleString()}</p>
          <p className="text-sm text-green-600 mt-1">+12.5% from last period</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Orders</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">{mockAnalytics.orders}</p>
          <p className="text-sm text-green-600 mt-1">+8.3% from last period</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Order Value</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">TZS {mockAnalytics.avgOrderValue.toLocaleString()}</p>
          <p className="text-sm text-green-600 mt-1">+3.8% from last period</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Forecast Accuracy</h3>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">87%</p>
          <p className="text-sm text-green-600 mt-1">+2.1% from last period</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Sales Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Sales Trends</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {mockAnalytics.salesTrends.map((trend, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{trend.month}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">TZS {trend.sales.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className={`text-sm font-medium ${getGrowthColor(trend.growth)}`}>
                      {trend.growth > 0 ? '+' : ''}{trend.growth}%
                    </p>
                    <div className="w-24 bg-gray-200 rounded-full h-2 mt-1">
                      <div 
                        className={`h-2 rounded-full ${
                          trend.growth >= 0 ? 'bg-green-600' : 'bg-red-600'
                        }`}
                        style={{ width: `${Math.min(Math.abs(trend.growth) * 5, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Top Performing Products</h2>
          </div>
          <div className="p-6">
            <div className="space-y-4">
              {mockAnalytics.topProducts.map((product, index) => (
                <div key={index} className="flex justify-between items-center">
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{product.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{product.sales} units sold</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white">TZS {product.revenue.toLocaleString()}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Demand Forecasting */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Demand Forecasting - Next 30 Days</h2>
            <button className="px-4 py-2 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700">
              Generate Restock Plan
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Product</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Predicted Demand</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Confidence Level</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Stock</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {mockAnalytics.demandForecast.map((forecast, index) => {
                const currentStock = [1250, 85, 0, 450][index]; // Mock current stock
                const needsRestock = forecast.predictedDemand > currentStock;
                
                return (
                  <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {forecast.product}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {forecast.predictedDemand.toLocaleString()} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getConfidenceColor(forecast.confidence)}`}>
                        {forecast.confidence}%
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                      {currentStock.toLocaleString()} units
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {needsRestock ? (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                          Restock {(forecast.predictedDemand - currentStock).toLocaleString()} units
                        </span>
                      ) : (
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          Sufficient Stock
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Performance Insights */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Market Insights</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Beverages Growth</span>
              <span className="text-sm font-semibold text-green-600">+15.2%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Cooking Essentials</span>
              <span className="text-sm font-semibold text-green-600">+8.7%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Flour & Grains</span>
              <span className="text-sm font-semibold text-red-600">-2.1%</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Seasonal Trends</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Peak Season</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Dec - Jan</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Low Season</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Jun - Aug</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Next Peak</span>
              <span className="text-sm font-semibold text-blue-600">Ramadan 2024</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recommendations</h3>
          <div className="space-y-3">
            <div className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">Increase Coca Cola inventory by 40%</p>
            </div>
            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
              <p className="text-sm text-yellow-800 dark:text-yellow-200">Monitor flour demand closely</p>
            </div>
            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <p className="text-sm text-green-800 dark:text-green-200">Expand cooking oil varieties</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}