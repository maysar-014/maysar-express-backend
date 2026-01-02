'use client';

export default function ProductionPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Production & Manufacturing</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Production Orders</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">12</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Manufacturing Capacity</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">85%</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Quality Score</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">94.2%</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Lead Time</h3>
          <p className="text-2xl font-bold text-orange-600 mt-2">3.2 days</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Production Planning & Manufacturing Operations</h2>
        <p className="text-gray-600 dark:text-gray-400">Manage production schedules, manufacturing processes, quality control, and capacity planning for your supply operations.</p>
      </div>
    </div>
  );
}