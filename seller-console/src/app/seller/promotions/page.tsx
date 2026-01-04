'use client';

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';

interface Promotion {
  id: string;
  name: string;
  discount: string;
  discountType: string;
  discountValue: number;
  status: 'active' | 'scheduled' | 'ended';
  products: number;
  startDate: string;
  endDate: string;
  description: string;
  minOrderValue: number;
  maxDiscount: number;
  usageLimit: number;
  usedCount: number;
}

interface PromotionTip {
  title: string;
  description: string;
  category: string;
}

interface PromotionsData {
  promotions: Promotion[];
  stats: {
    totalPromotions: number;
    activePromotions: number;
    scheduledPromotions: number;
    endedPromotions: number;
    totalSavings: number;
    averageDiscount: number;
  };
  tips: PromotionTip[];
}

export default function PromotionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['promotions'],
    queryFn: async () => {
      const response = await apiService.getPromotions();
      return response.data.data as PromotionsData;
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="bg-white rounded-lg p-6">
            <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-gray-100 rounded"></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-6xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Error Loading Promotions</h2>
          <p className="text-red-600">Failed to load promotions data. Please try again later.</p>
        </div>
      </div>
    );
  }

  const promotions = data?.promotions || [];
  const tips = data?.tips || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      case 'scheduled':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'ended':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Promotions</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Create Promotion
        </button>
      </div>
      
      <div className="space-y-6">
        {/* Promotions Stats */}
        {data?.stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Promotions</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{data.stats.totalPromotions}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">Active</p>
              <p className="text-2xl font-bold text-green-600">{data.stats.activePromotions}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">Scheduled</p>
              <p className="text-2xl font-bold text-yellow-600">{data.stats.scheduledPromotions}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg border border-gray-200 dark:border-gray-700">
              <p className="text-sm text-gray-600 dark:text-gray-400">Total Savings</p>
              <p className="text-2xl font-bold text-blue-600">TZS {data.stats.totalSavings.toLocaleString()}</p>
            </div>
          </div>
        )}

        {/* Active Promotions */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Your Promotions</h2>
          </div>
          <div className="p-6">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700">
                    <th className="text-left py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Name</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Discount</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Products</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Status</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Ends</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Usage</th>
                    <th className="text-left py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promo) => (
                    <tr key={promo.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-4">
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">{promo.name}</p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">{promo.description}</p>
                        </div>
                      </td>
                      <td className="py-4 text-gray-600 dark:text-gray-400">{promo.discount}</td>
                      <td className="py-4 text-gray-600 dark:text-gray-400">{promo.products}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(promo.status)}`}>
                          {promo.status}
                        </span>
                      </td>
                      <td className="py-4 text-gray-600 dark:text-gray-400">{formatDate(promo.endDate)}</td>
                      <td className="py-4">
                        <div className="text-sm">
                          <p className="text-gray-900 dark:text-white">{promo.usedCount}/{promo.usageLimit}</p>
                          <div className="w-16 bg-gray-200 rounded-full h-1.5 mt-1">
                            <div 
                              className="bg-blue-600 h-1.5 rounded-full" 
                              style={{ width: `${(promo.usedCount / promo.usageLimit) * 100}%` }}
                            ></div>
                          </div>
                        </div>
                      </td>
                      <td className="py-4">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">Edit</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Promotion Tips */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Promotion Tips</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tips.map((tip, index) => {
              const colors = [
                'bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-300',
                'bg-green-50 dark:bg-green-900/20 text-green-900 dark:text-green-300',
                'bg-purple-50 dark:bg-purple-900/20 text-purple-900 dark:text-purple-300',
                'bg-orange-50 dark:bg-orange-900/20 text-orange-900 dark:text-orange-300'
              ];
              const colorClass = colors[index % colors.length];
              
              return (
                <div key={index} className={`p-4 rounded-lg ${colorClass}`}>
                  <h3 className="font-medium mb-2">{tip.title}</h3>
                  <p className="text-sm opacity-80">{tip.description}</p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}