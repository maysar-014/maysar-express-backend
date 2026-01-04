'use client';

import { useQuery } from '@tanstack/react-query';
import { enablerApi } from '@/lib/api';
import { 
  ChartBarIcon,
  TrophyIcon,
  ClockIcon,
  CheckCircleIcon,
  UserGroupIcon,
  StarIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  CalendarIcon
} from '@heroicons/react/24/outline';

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
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-600">Error loading performance data</p>
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Performance Metrics</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Track your performance, rankings, and skill development
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <div className="bg-yellow-100 dark:bg-yellow-900/20 px-3 py-1 rounded-full">
            <span className="text-yellow-800 dark:text-yellow-300 text-sm font-medium">
              🏆 {overview.currentRank || 'Gold'} Enabler
            </span>
          </div>
          <div className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded-full">
            <span className="text-blue-800 dark:text-blue-300 text-sm font-medium">
              ⭐ {overview.trustScore || 4.8} Trust Score
            </span>
          </div>
        </div>
      </div>

      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completion Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview.completionRate || 94.5}%
              </p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-green-500" />
          </div>
          <div className="flex items-center mt-2">
            <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">+2.3% from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Average Rating</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview.customerSatisfaction || 4.7}/5.0
              </p>
            </div>
            <StarIcon className="h-8 w-8 text-yellow-500" />
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-gray-600">Based on {overview.totalTasks || 127} reviews</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Response Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {overview.responseTime || 18}m
              </p>
            </div>
            <ClockIcon className="h-8 w-8 text-blue-500" />
          </div>
          <div className="flex items-center mt-2">
            <ArrowDownIcon className="h-4 w-4 text-green-500 mr-1" />
            <span className="text-sm text-green-600">-5m improvement</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Monthly Growth</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                +{overview.monthlyGrowth || 12.5}%
              </p>
            </div>
            <ChartBarIcon className="h-8 w-8 text-purple-500" />
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-gray-600">Tasks completed growth</span>
          </div>
        </div>
      </div>

      {/* Rankings */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Rankings</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="bg-blue-100 dark:bg-blue-900/20 p-4 rounded-lg">
              <p className="text-2xl font-bold text-blue-600">#{rankings.regional?.position || 3}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Regional Rank</p>
              <p className="text-xs text-gray-500">out of {rankings.regional?.total || 45} in {rankings.regional?.region || 'East Africa'}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-green-100 dark:bg-green-900/20 p-4 rounded-lg">
              <p className="text-2xl font-bold text-green-600">#{rankings.national?.position || 12}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">National Rank</p>
              <p className="text-xs text-gray-500">out of {rankings.national?.total || 234} in {rankings.national?.country || 'Tanzania'}</p>
            </div>
          </div>
          <div className="text-center">
            <div className="bg-purple-100 dark:bg-purple-900/20 p-4 rounded-lg">
              <p className="text-2xl font-bold text-purple-600">#{rankings.global?.position || 89}</p>
              <p className="text-sm text-gray-600 dark:text-gray-400">Global Rank</p>
              <p className="text-xs text-gray-500">out of {rankings.global?.total || 1567} worldwide</p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Key Metrics</h3>
        <div className="space-y-4">
          {metrics.map((metric, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div>
                <p className="font-medium text-gray-900 dark:text-white">{metric.name}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Target: {metric.target}{metric.unit ? ` ${metric.unit}` : ''}
                </p>
              </div>
              <div className="text-right">
                <p className="text-lg font-bold text-gray-900 dark:text-white">
                  {metric.value}{metric.unit ? ` ${metric.unit}` : ''}
                </p>
                <div className="flex items-center">
                  {metric.trend === 'up' ? (
                    <ArrowUpIcon className="h-4 w-4 text-green-500 mr-1" />
                  ) : (
                    <ArrowDownIcon className="h-4 w-4 text-red-500 mr-1" />
                  )}
                  <span className={`text-sm ${
                    metric.trend === 'up' ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {metric.change > 0 ? '+' : ''}{metric.change}%
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Achievements */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Achievements</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {achievements.map((achievement) => (
            <div key={achievement.id} className="flex items-center space-x-4 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="text-2xl">{achievement.icon}</div>
              <div className="flex-1">
                <h4 className="font-semibold text-gray-900 dark:text-white">{achievement.title}</h4>
                <p className="text-sm text-gray-600 dark:text-gray-400">{achievement.description}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Earned on {achievement.earnedDate} • Category: {achievement.category}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Performance Summary */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Performance Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <UserGroupIcon className="h-12 w-12 text-blue-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.totalTasks || 127}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Total Tasks</p>
          </div>
          <div className="text-center">
            <CheckCircleIcon className="h-12 w-12 text-green-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.completionRate || 94.5}%</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Completion Rate</p>
          </div>
          <div className="text-center">
            <TrophyIcon className="h-12 w-12 text-yellow-500 mx-auto mb-2" />
            <p className="text-2xl font-bold text-gray-900 dark:text-white">{overview.trustScore || 4.8}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">Trust Score</p>
          </div>
        </div>
      </div>
    </div>
  );
}