'use client';

export default function PricingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Pricing & Discounts</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Active Discounts</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">8</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Profit Margin</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">32%</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Price Alerts</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">3</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Competitive Score</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">87%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Retail Pricing Strategy & Discount Management</h2>
        <p className="text-gray-600 dark:text-gray-400">Set competitive prices, create promotional discounts, and optimize your retail pricing strategy to maximize sales and profits.</p>
      </div>
    </div>
  );
}