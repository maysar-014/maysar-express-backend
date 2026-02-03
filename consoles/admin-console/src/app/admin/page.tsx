"use client";

import React from 'react';
import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiService } from '@/lib/api';
import { formatDate, formatCurrencyForCard } from '@/lib/utils';

export default function AdminDashboard() {
  const [page1, setPage1] = useState(0);
  const [cardPage1, setCardPage1] = useState(0);
  
  // Fetch dashboard data with error handling
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: async () => {
      console.log('Making API request to:', `${process.env.NEXT_PUBLIC_API_BASE_URL}/admin/dashboard`);
      const response = await apiService.getDashboardData();
      console.log('API Response:', response);
      return response;
    },
    staleTime: 5 * 60 * 1000,
    refetchInterval: 30 * 1000,
    retry: 1,
    onError: (err) => {
      console.error('Query Error:', err);
    },
    onSuccess: (data) => {
      console.log('Query Success:', data);
    }
  });

  // Remove direct API test and fix the data access
  const metrics = dashboardData?.data?.data || null;

  // Show raw data for debugging
  console.log('Raw API Response:', dashboardData);
  console.log('Extracted metrics:', metrics);
  console.log('Error state:', error);
  console.log('Loading state:', isLoading);

  const defaultMetrics = {
    totalUsers: { count: 0, growth: 0 },
    activeUsers: { count: 0, growth: 0 },
    totalRevenue: { amount: 0, formatted: 'TSh 0.00', growth: 0 },
    monthlyRevenue: { amount: 0, formatted: 'TSh 0.00', growth: 0 },
    totalOrders: { count: 0, growth: 0 },
    pendingOrders: { count: 0, growth: 0 },
    systemHealth: {
      status: 'Unknown',
      uptime: 'N/A',
      responseTime: 0,
      activeServices: { active: 0, total: 0 }
    },
    recentActivity: [],
    topPerformingProducts: { summary: 'No data available' },
    systemAlerts: { critical: 0, warnings: 0, info: 0 },
    performanceOverview: {
      apiUptime: { value: 0 },
      avgResponseTime: { value: 0 },
      cacheEfficiency: { value: 0 }
    }
  };

  const finalMetrics = metrics || defaultMetrics;

  const kpiCards = [
    {
      title: 'Total Users',
      value: (finalMetrics.totalUsers?.count || 0).toLocaleString(),
      change: `+${finalMetrics.totalUsers?.growth || 0}%`,
      changeType: 'positive' as const,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Users',
      value: (finalMetrics.activeUsers?.count || 0).toLocaleString(),
      change: `+${finalMetrics.activeUsers?.growth || 0}%`,
      changeType: 'positive' as const,
      color: 'bg-green-500',
    },
    {
      title: 'Total Revenue',
      value: formatCurrencyForCard(finalMetrics.totalRevenue?.amount || 0),
      change: `+${finalMetrics.totalRevenue?.growth || 0}%`,
      changeType: 'positive' as const,
      color: 'bg-purple-500',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrencyForCard(finalMetrics.monthlyRevenue?.amount || 0),
      change: `+${finalMetrics.monthlyRevenue?.growth || 0}%`,
      changeType: 'positive' as const,
      color: 'bg-indigo-500',
    },
    {
      title: 'Total Orders',
      value: (finalMetrics.totalOrders?.count || 0).toLocaleString(),
      change: `+${finalMetrics.totalOrders?.growth || 0}%`,
      changeType: 'positive' as const,
      color: 'bg-orange-500',
    },
    {
      title: 'Pending Orders',
      value: (finalMetrics.pendingOrders?.count || 0).toLocaleString(),
      change: `${finalMetrics.pendingOrders?.growth || 0}%`,
      changeType: (finalMetrics.pendingOrders?.growth || 0) >= 0 ? 'positive' : 'negative' as const,
      color: 'bg-yellow-500',
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  // Show error message if API fails
  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-600 mb-4">API Connection Failed</div>
          <div className="text-sm text-gray-500">Check console for details</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kpiCards.map((card, index) => (
          <div
            key={index}
            className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 hover:shadow-xl transition-shadow duration-300"
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                  {card.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mb-2 truncate">
                  {card.value}
                </p>
                <div className="flex items-center">
                  <span
                    className={`text-sm font-medium ${
                      card.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                    }`}
                  >
                    {card.change} from last month
                  </span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* System Health */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Health
            </h3>
            <div className={`flex items-center px-3 py-1 rounded-full text-xs font-medium ${
              finalMetrics.systemHealth?.status === 'Healthy'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : finalMetrics.systemHealth?.status === 'warning'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                finalMetrics.systemHealth?.status === 'Healthy'
                  ? 'bg-green-500'
                  : finalMetrics.systemHealth?.status === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}></div>
              {finalMetrics.systemHealth?.status || 'Unknown'}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {finalMetrics.systemHealth?.uptime || 'N/A'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Response Time</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {finalMetrics.systemHealth?.responseTime || 0}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Services</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {finalMetrics.systemHealth?.activeServices?.active || 0}/{finalMetrics.systemHealth?.activeServices?.total || 0}
              </span>
            </div>
          </div>

          <div className="mt-6">
            <button className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-4 rounded-lg transition-colors duration-200">
              View Details
            </button>
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View All
            </button>
          </div>

          <div className="space-y-4">
            {(finalMetrics.recentActivity || []).slice(0, 5).map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {activity.user && `${activity.user} • `}{formatDate(activity.timestamp)}
                  </p>
                </div>
              </div>
            ))}
            {(!finalMetrics.recentActivity || finalMetrics.recentActivity.length === 0) && (
              <div className="text-center py-8">
                <p className="text-sm text-gray-500 dark:text-gray-400">No recent activity</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/admin/users" className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
              <span className="text-xs font-medium text-gray-900 dark:text-white">Manage Users</span>
            </Link>

            <Link href="/admin/sellers" className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
              <span className="text-xs font-medium text-gray-900 dark:text-white">Sellers</span>
            </Link>

            <Link href="/admin/kyc" className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
              <span className="text-xs font-medium text-gray-900 dark:text-white">KYC Review</span>
            </Link>

            <Link href="/admin/finance" className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
              <span className="text-xs font-medium text-gray-900 dark:text-white">Finance</span>
            </Link>

            <Link href="/admin/compliance" className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
              <span className="text-xs font-medium text-gray-900 dark:text-white">Compliance</span>
            </Link>

            <Link href="/admin/audit" className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
              <span className="text-xs font-medium text-gray-900 dark:text-white">Audit Logs</span>
            </Link>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Top Performing Products
            </h3>
            <button className="text-blue-600 hover:text-blue-700 text-sm font-medium">
              View Report
            </button>
          </div>

          <div className="space-y-4">
            <div className="text-center py-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {finalMetrics.topPerformingProducts?.summary || 'No product data available'}
              </p>
            </div>
          </div>
        </div>

        {/* System Alerts */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              System Alerts
            </h3>
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <div className="w-2 h-2 bg-red-500 rounded-full mr-2"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {finalMetrics.systemAlerts?.critical || 0} Critical
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {finalMetrics.systemAlerts?.warnings || 0} Warnings
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="text-center py-8">
              <p className="text-sm text-gray-500 dark:text-gray-400">
                No active alerts
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Performance Metrics */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Performance Overview
          </h3>
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-green-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">API Response</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-blue-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Database</span>
            </div>
            <div className="flex items-center">
              <div className="w-3 h-3 bg-purple-500 rounded-full mr-2"></div>
              <span className="text-sm text-gray-600 dark:text-gray-400">Cache Hit Rate</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600 mb-2">{finalMetrics.performanceOverview?.apiUptime?.value || 0}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">API Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">{finalMetrics.performanceOverview?.avgResponseTime?.value || 0}ms</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">{finalMetrics.performanceOverview?.cacheEfficiency?.value || 0}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cache Efficiency</div>
          </div>
        </div>
      </div>
    </div>
  );
}
