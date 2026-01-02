'use client';

export default function SalesAnalyticsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales Analytics</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Sales</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">TZS 12.5M</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Orders This Month</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">342</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Conversion Rate</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">3.8%</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Order Value</h3>
          <p className="text-2xl font-bold text-orange-600 mt-2">TZS 36,500</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Retail Sales Performance & Customer Insights</h2>
        <p className="text-gray-600 dark:text-gray-400">Track sales performance, customer behavior, product trends, and optimize your retail strategy with detailed analytics.</p>
      </div>
    </div>
  );
}