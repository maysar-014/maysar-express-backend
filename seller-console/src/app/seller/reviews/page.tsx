'use client';

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';

export default function ReviewsPage() {
  const { data: reviewsData, isLoading } = useQuery({
    queryKey: ['reviews'],
    queryFn: () => apiService.getReviews(),
    staleTime: 30 * 1000,
  });

  const reviews = reviewsData?.data?.data?.reviews || [];
  const stats = reviewsData?.data?.data?.stats || {
    totalReviews: 0,
    averageRating: 0,
    ratingDistribution: {}
  };

  // Calculate pending responses (reviews that need replies)
  const pendingResponses = reviews.filter(review => review.status === 'pending').length;

  // Calculate 5-star percentage
  const fiveStarPercentage = stats.ratingDistribution[5]
    ? Math.round((stats.ratingDistribution[5] / stats.totalReviews) * 100)
    : 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Reviews & Ratings</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Monitor customer feedback and maintain your seller reputation
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
            Export Reviews
          </button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            Respond to Reviews
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Average Rating</p>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{stats.averageRating}/5</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Overall satisfaction</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Reviews</p>
          <p className="text-2xl font-bold text-blue-600 mt-2">{stats.totalReviews.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Pending Responses</p>
          <p className="text-2xl font-bold text-red-600 mt-2">{pendingResponses}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Awaiting reply</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">5-Star Reviews</p>
          <p className="text-2xl font-bold text-green-600 mt-2">{fiveStarPercentage}%</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Excellent ratings</p>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rating</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Review</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Date</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {isLoading ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  Loading reviews...
                </td>
              </tr>
            ) : reviews.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                  No reviews found
                </td>
              </tr>
            ) : (
              reviews.map((review: any) => (
                <tr key={review.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-6 py-4">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-600 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold text-xs">
                          {review.customer.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{review.customer}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900 dark:text-white">{review.productName}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }, (_, i) => (
                        <span key={i} className={`text-sm ${i < review.rating ? 'text-yellow-400' : 'text-gray-400'}`}>
                          ★
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 max-w-xs">
                    <p className="text-sm text-gray-600 dark:text-gray-300 truncate">{review.comment}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {new Date(review.date).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-md ${
                      review.status === 'published'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                    }`}>
                      {review.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">Reply</button>
                      <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm">View</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Rating Distribution</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">5 Stars</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-green-600 h-2 rounded-full" style={{ width: `${stats.ratingDistribution[5] ? Math.round((stats.ratingDistribution[5] / stats.totalReviews) * 100) : 0}%` }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-12">{stats.ratingDistribution[5] ? Math.round((stats.ratingDistribution[5] / stats.totalReviews) * 100) : 0}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">4 Stars</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-yellow-500 h-2 rounded-full" style={{ width: `${stats.ratingDistribution[4] ? Math.round((stats.ratingDistribution[4] / stats.totalReviews) * 100) : 0}%` }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-12">{stats.ratingDistribution[4] ? Math.round((stats.ratingDistribution[4] / stats.totalReviews) * 100) : 0}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">3 Stars</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-orange-500 h-2 rounded-full" style={{ width: `${stats.ratingDistribution[3] ? Math.round((stats.ratingDistribution[3] / stats.totalReviews) * 100) : 0}%` }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-12">{stats.ratingDistribution[3] ? Math.round((stats.ratingDistribution[3] / stats.totalReviews) * 100) : 0}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">2 Stars</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-red-500 h-2 rounded-full" style={{ width: `${stats.ratingDistribution[2] ? Math.round((stats.ratingDistribution[2] / stats.totalReviews) * 100) : 0}%` }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-12">{stats.ratingDistribution[2] ? Math.round((stats.ratingDistribution[2] / stats.totalReviews) * 100) : 0}%</span>
              </div>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">1 Star</span>
              <div className="flex items-center space-x-3">
                <div className="w-32 bg-gray-200 dark:bg-gray-600 rounded-full h-2">
                  <div className="bg-red-600 h-2 rounded-full" style={{ width: `${stats.ratingDistribution[1] ? Math.round((stats.ratingDistribution[1] / stats.totalReviews) * 100) : 0}%` }}></div>
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-12">{stats.ratingDistribution[1] ? Math.round((stats.ratingDistribution[1] / stats.totalReviews) * 100) : 0}%</span>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Response Management</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-md">
              <div>
                <p className="text-sm font-medium text-yellow-800 dark:text-yellow-200">Pending Responses</p>
                <p className="text-xs text-yellow-600 dark:text-yellow-300">{pendingResponses} reviews need your attention</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-yellow-200 text-yellow-800 rounded-md">{pendingResponses}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/20 rounded-md">
              <div>
                <p className="text-sm font-medium text-green-800 dark:text-green-200">Responded Today</p>
                <p className="text-xs text-green-600 dark:text-green-300">{reviews.filter(r => r.status === 'published').length} reviews replied to</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-green-200 text-green-800 rounded-md">{reviews.filter(r => r.status === 'published').length}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md">
              <div>
                <p className="text-sm font-medium text-blue-800 dark:text-blue-200">Average Response Time</p>
                <p className="text-xs text-blue-600 dark:text-blue-300">Within 24 hours</p>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-blue-200 text-blue-800 rounded-md">24h</span>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
