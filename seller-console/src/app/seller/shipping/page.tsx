'use client';

export default function ShippingPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shipping & Fulfillment</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Orders to Ship</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">23</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">In Transit</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">67</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivered Today</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">45</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">On-Time Rate</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">96.8%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Order Fulfillment & Shipping Management</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage customer order fulfillment, shipping labels, tracking, and delivery confirmation for your retail business.</p>
      </div>
    </div>
  );
}