'use client';

import { useState } from 'react';

export default function PromotionsPage() {
  const [promotions] = useState([
    { id: 1, name: 'Summer Sale', discount: '20%', status: 'active', products: 15, ends: '2024-08-31' },
    { id: 2, name: 'Electronics Deal', discount: '15%', status: 'scheduled', products: 8, ends: '2024-09-15' },
    { id: 3, name: 'Back to School', discount: '25%', status: 'ended', products: 12, ends: '2024-07-30' }
  ]);

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Promotions</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
          Create Promotion
        </button>
      </div>
      
      <div className="space-y-6">
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
                    <th className="text-left py-3 text-sm font-medium text-gray-700 dark:text-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {promotions.map((promo) => (
                    <tr key={promo.id} className="border-b border-gray-100 dark:border-gray-700">
                      <td className="py-4 text-gray-900 dark:text-white font-medium">{promo.name}</td>
                      <td className="py-4 text-gray-600 dark:text-gray-400">{promo.discount}</td>
                      <td className="py-4 text-gray-600 dark:text-gray-400">{promo.products}</td>
                      <td className="py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          promo.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300' :
                          promo.status === 'scheduled' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300'
                        }`}>
                          {promo.status}
                        </span>
                      </td>
                      <td className="py-4 text-gray-600 dark:text-gray-400">{promo.ends}</td>
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
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
              <h3 className="font-medium text-blue-900 dark:text-blue-300 mb-2">Seasonal Sales</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400">Create promotions around holidays and seasons for maximum impact.</p>
            </div>
            <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
              <h3 className="font-medium text-green-900 dark:text-green-300 mb-2">Bundle Deals</h3>
              <p className="text-sm text-green-700 dark:text-green-400">Offer discounts on product bundles to increase average order value.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}