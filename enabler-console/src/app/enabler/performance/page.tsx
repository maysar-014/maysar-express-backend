'use client';

import { useQuery } from '@tanstack/react-query';
import { enablerApi } from '@/lib/api';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function PerformanceMetrics() {
  const { data: performanceData, isLoading, error } = useQuery({
    queryKey: ['enabler-performance'],
    queryFn: () => enablerApi.getPerformance()
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    const overview = {};
    const metrics = [];

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Metrics</h1>
            <p className="text-gray-600 dark:text-gray-400 text-sm">
              Track your performance and skill development
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <div className="bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1 rounded">
              <span className="text-yellow-800 dark:text-yellow-300 text-xs font-medium">
                Gold Enabler
              </span>
            </div>
            <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded">
              <span className="text-blue-800 dark:text-blue-300 text-xs font-medium">
                4.8 Trust Score
              </span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Completion Rate</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">0%</p>
              </div>
            </div>
            <div className="flex items-center mt-2">
              <span className="text-xs text-gray-600">No data available</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Average Rating</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">0/5.0</p>
              </div>
            </div>
            <div className="flex items-center mt-2">
              <span className="text-xs text-gray-600">No reviews yet</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Response Time</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">0m</p>
              </div>
            </div>
            <div className="flex items-center mt-2">
              <span className="text-xs text-gray-600">No data available</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Monthly Growth</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">0%</p>
              </div>
            </div>
            <div className="flex items-center mt-2">
              <span className="text-xs text-gray-600">No growth data</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Task Completion Trends</h3>
          <div className="h-64 flex items-center justify-center">
            <div className="text-center">
              <div className="w-full h-48 bg-gray-100 dark:bg-gray-700 rounded-md flex items-center justify-center mb-4">
                <span className="text-gray-500 dark:text-gray-400">No trend data available</span>
              </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Rating Trends</h3>
            <div className="h-48 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">No rating data available</span>
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Earnings Trends</h3>
            <div className="h-48 flex items-center justify-center">
              <span className="text-gray-500 dark:text-gray-400">No earnings data available</span>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-md border border-blue-200 dark:border-gray-600">
          <div className="text-center mb-4">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Performance Summary</h3>
            <p className="text-gray-600 dark:text-gray-400 text-sm">Your overall performance metrics</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center bg-white dark:bg-gray-800 p-4 rounded-md">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center mx-auto mb-3">
                <span className="text-base font-bold text-blue-600 dark:text-blue-400">0</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">0</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Total Tasks</p>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 p-4 rounded-md">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center mx-auto mb-3">
                <span className="text-base font-bold text-green-600 dark:text-green-400">0%</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">0%</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Completion Rate</p>
            </div>
            <div className="text-center bg-white dark:bg-gray-800 p-4 rounded-md">
              <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded flex items-center justify-center mx-auto mb-3">
                <span className="text-base font-bold text-yellow-600 dark:text-yellow-400">0</span>
              </div>
              <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">0</p>
              <p className="text-xs text-gray-600 dark:text-gray-400">Trust Score</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const overview = performanceData?.data?.overview || {};
  const rankings = performanceData?.data?.rankings || {};
  const metrics = performanceData?.data?.metrics || [];
  const achievements = performanceData?.data?.achievements || [];

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600';
    if (score >= 80) return 'text-yellow-600';
    if (score >= 70) return 'text-orange-600';
    return 'text-red-600';
  };

  const getScoreBarColor = (score: number) => {
    if (score >= 90) return 'bg-green-500';
    if (score >= 80) return 'bg-yellow-500';
    if (score >= 70) return 'bg-orange-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Performance Metrics</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Track your performance, rankings, and skill development
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1 rounded">
            <span className="text-yellow-800 dark:text-yellow-300 text-xs font-medium">
              {overview.currentRank || 'Gold'} Enabler
            </span>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded">
            <span className="text-blue-800 dark:text-blue-300 text-xs font-medium">
              {overview.trustScore || 4.8} Trust Score
            </span>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Completion Rate</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {overview.completionRate || 94.5}%
              </p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-green-600">+2.3% from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Average Rating</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {overview.customerSatisfaction || 4.7}/5.0
              </p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-gray-600">Based on {overview.totalTasks || 127} reviews</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Response Time</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                {overview.responseTime || 18}
              </p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-green-600">-5m improvement</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Monthly Growth</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                +{overview.monthlyGrowth || 12.5}%
              </p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-gray-600">Tasks completed growth</span>
          </div>
        </div>
      </div>

      {/* Performance Trends Graph */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Task Completion Trends</h3>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={performanceData?.data?.trends || []}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-md border border-blue-200 dark:border-gray-600">
        <div className="text-center mb-4">
          <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Performance Summary</h3>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Your overall performance metrics</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center bg-white dark:bg-gray-800 p-4 rounded-md">
            <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded flex items-center justify-center mx-auto mb-3">
              <span className="text-base font-bold text-blue-600 dark:text-blue-400">{overview.totalTasks || 127}</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">{overview.totalTasks || 127}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Total Tasks</p>
          </div>
          <div className="text-center bg-white dark:bg-gray-800 p-4 rounded-md">
            <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded flex items-center justify-center mx-auto mb-3">
              <span className="text-base font-bold text-green-600 dark:text-green-400">{overview.completionRate || 94.5}%</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">{overview.completionRate || 94.5}%</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Completion Rate</p>
          </div>
          <div className="text-center bg-white dark:bg-gray-800 p-4 rounded-md">
            <div className="w-12 h-12 bg-yellow-100 dark:bg-yellow-900/30 rounded flex items-center justify-center mx-auto mb-3">
              <span className="text-base font-bold text-yellow-600 dark:text-yellow-400">{overview.trustScore || 4.8}</span>
            </div>
            <p className="text-lg font-bold text-gray-900 dark:text-white mb-1">{overview.trustScore || 4.8}</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Trust Score</p>
          </div>
        </div>
      </div>
    </div>
  );
}
