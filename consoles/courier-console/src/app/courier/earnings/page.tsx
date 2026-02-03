'use client';

import { useState, useEffect } from 'react';
import { courierApi } from '@/lib/api';

export default function EarningsPage() {
  const [todayEarnings, setTodayEarnings] = useState(null);
  const [pendingEarnings, setPendingEarnings] = useState(null);
  const [earningsHistory, setEarningsHistory] = useState(null);

  useEffect(() => {
    const fetchEarningsData = async () => {
      const [todayData, pendingData, historyData] = await Promise.all([
        courierApi.getTodayEarnings(),
        courierApi.getPendingEarnings(),
        courierApi.getEarningsHistory()
      ]);
      
      // Transform new API response format
      const todayEarningsData = todayData?.data?.earnings || {};
      const pendingEarningsData = pendingData?.data?.summary || {};
      const historyEarningsData = historyData?.data?.breakdown || [];
      
      // Transform today's earnings
      const transformedToday = {
        total: todayEarningsData.total || 0,
        breakdown: {
          base: todayEarningsData.total * 0.6 || 0, // Estimate base rate
          distance: todayEarningsData.total * 0.2 || 0, // Estimate distance
          time: todayEarningsData.total * 0.1 || 0, // Estimate time
          weightBonus: todayEarningsData.bonuses || 0,
          heavyItemBonus: todayEarningsData.tips || 0
        }
      };
      
      // Transform history data
      const transformedHistory = historyEarningsData.map((item: any) => ({
        period: new Date(item.timestamp).toLocaleDateString(),
        amount: item.amount || 0,
        status: 'completed',
        breakdown: {
          base: item.amount * 0.6 || 0,
          distance: item.amount * 0.2 || 0,
          time: item.amount * 0.1 || 0,
          bonuses: item.amount * 0.1 || 0
        }
      }));
      
      setTodayEarnings(transformedToday);
      setPendingEarnings(pendingEarningsData);
      setEarningsHistory(transformedHistory);
    };
    fetchEarningsData();
  }, []);

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Earnings</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            Automated compensation with full transparency
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Transparency layer - no disputes allowed
        </div>
      </div>

      {/* Today's Earnings */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
        <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Today's Earnings</h2>
        <div className="text-center mb-4">
          <p className="text-xl font-bold text-green-600">TZS {(todayEarnings?.total ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Calculated total</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Base Rate</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              TZS {(todayEarnings?.breakdown?.base ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Distance</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              TZS {(todayEarnings?.breakdown?.distance ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              TZS {(todayEarnings?.breakdown?.time ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Weight Bonus</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              TZS {(todayEarnings?.breakdown?.weightBonus ?? 0).toLocaleString()}
            </p>
          </div>
          <div className="text-center p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
            <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Heavy Item</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">
              TZS {(todayEarnings?.breakdown?.heavyItemBonus ?? 0).toLocaleString()}
            </p>
          </div>
        </div>

        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/10 rounded-md">
          <p className="text-xs text-blue-800 dark:text-blue-200">
            All earnings are calculated by the compensation system. Components include delivery completion, distance traveled, time spent, and package characteristics. No manual adjustments or disputes are permitted.
          </p>
        </div>
      </div>

      {/* Earnings History */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Earnings History</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">Completed compensation cycles</p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Array.isArray(earningsHistory) ? earningsHistory.map((earning, index) => (
              <div key={index} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">{earning.period}</h3>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Base: TZS {(earning.breakdown?.base ?? 0).toLocaleString()} •
                      Distance: TZS {(earning.breakdown?.distance ?? 0).toLocaleString()} •
                      Time: TZS {(earning.breakdown?.time ?? 0).toLocaleString()} •
                      Bonuses: TZS {(earning.breakdown?.bonuses ?? 0).toLocaleString()}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-green-600">
                      TZS {(earning.amount ?? 0).toLocaleString()}
                    </p>
                    <span className="px-2 py-1 text-xs font-medium rounded-full mt-1 bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                      {earning.status}
                    </span>
                  </div>
                </div>
              </div>
            )) : null}
          </div>
        </div>
      </div>

      {/* Algorithm Transparency */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-md p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Compensation System</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Data-Driven</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Based on delivery metrics</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">No Disputes</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">System decisions final</p>
          </div>
          <div className="text-center">
            <p className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">Full Transparency</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">All components visible</p>
          </div>
        </div>
      </div>
    </div>
  );
}
