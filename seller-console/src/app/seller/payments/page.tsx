'use client';

export default function PaymentsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payments & Payouts</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Earnings</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">TZS 8.7M</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Payouts</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">TZS 245K</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">This Month</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">TZS 1.2M</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Payout Frequency</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">Weekly</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Seller Payment Management & Earnings</h2>
        <p className="text-gray-600 dark:text-gray-400">Track your sales earnings, manage payout schedules, and monitor payment transactions from customer purchases.</p>
      </div>
    </div>
  );
}