'use client';

export default function ReviewsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Reviews & Ratings</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Average Rating</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">4.7/5</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Reviews</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">2,341</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Responses</h3>
          <p className="text-2xl font-bold text-red-600 mt-2">12</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">5-Star Reviews</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">68%</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Customer Reviews & Feedback Management</h2>
        <p className="text-gray-600 dark:text-gray-400">Monitor customer reviews, respond to feedback, and maintain your seller reputation on the platform.</p>
      </div>
    </div>
  );
}