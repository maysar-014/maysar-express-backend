"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { formatDate, formatCurrency } from '@/lib/utils';

interface DashboardMetrics {
  totalUsers: number;
  activeUsers: number;
  totalRevenue: number;
  monthlyRevenue: number;
  totalOrders: number;
  pendingOrders: number;
  systemHealth: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: string;
    responseTime: number;
  };
  recentActivity: Array<{
    id: string;
    type: string;
    description: string;
    timestamp: string;
    user?: string;
  }>;
  topProducts: Array<{
    id: string;
    name: string;
    sales: number;
    revenue: number;
    growth: number;
  }>;
  alerts: Array<{
    id: string;
    type: 'info' | 'warning' | 'error';
    title: string;
    message: string;
    timestamp: string;
  }>;
}

export default function AdminDashboard() {
  // Fetch dashboard data
  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['admin-dashboard'],
    queryFn: () => apiService.getDashboardData(),
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 30 * 1000, // 30 seconds
  });

  const metrics: DashboardMetrics = dashboardData?.data || {
    totalUsers: 0,
    activeUsers: 0,
    totalRevenue: 0,
    monthlyRevenue: 0,
    totalOrders: 0,
    pendingOrders: 0,
    systemHealth: {
      status: 'healthy',
      uptime: '99.9%',
      responseTime: 120,
    },
    recentActivity: [],
    topProducts: [],
    alerts: [],
  };

  const kpiCards = [
    {
      title: 'Total Users',
      value: metrics.totalUsers.toLocaleString(),
      change: '+12.5%',
      changeType: 'positive' as const,
      color: 'bg-blue-500',
    },
    {
      title: 'Active Users',
      value: metrics.activeUsers.toLocaleString(),
      change: '+8.2%',
      changeType: 'positive' as const,
      color: 'bg-green-500',
    },
    {
      title: 'Total Revenue',
      value: formatCurrency(metrics.totalRevenue),
      change: '+15.3%',
      changeType: 'positive' as const,
      color: 'bg-purple-500',
    },
    {
      title: 'Monthly Revenue',
      value: formatCurrency(metrics.monthlyRevenue),
      change: '+22.1%',
      changeType: 'positive' as const,
      color: 'bg-indigo-500',
    },
    {
      title: 'Total Orders',
      value: metrics.totalOrders.toLocaleString(),
      change: '+18.7%',
      changeType: 'positive' as const,
      color: 'bg-orange-500',
    },
    {
      title: 'Pending Orders',
      value: metrics.pendingOrders.toLocaleString(),
      change: '-5.2%',
      changeType: 'negative' as const,
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
                <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
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
              metrics.systemHealth.status === 'healthy'
                ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
                : metrics.systemHealth.status === 'warning'
                ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
                : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
            }`}>
              <div className={`w-2 h-2 rounded-full mr-2 ${
                metrics.systemHealth.status === 'healthy'
                  ? 'bg-green-500'
                  : metrics.systemHealth.status === 'warning'
                  ? 'bg-yellow-500'
                  : 'bg-red-500'
              }`}></div>
              {metrics.systemHealth.status.charAt(0).toUpperCase() + metrics.systemHealth.status.slice(1)}
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Uptime</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {metrics.systemHealth.uptime}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Response Time</span>
              <span className="font-semibold text-gray-900 dark:text-white">
                {metrics.systemHealth.responseTime}ms
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Active Services</span>
              <span className="font-semibold text-gray-900 dark:text-white">12/12</span>
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
            {metrics.recentActivity.slice(0, 5).map((activity) => (
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
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">
            Quick Actions
          </h3>

          <div className="grid grid-cols-2 gap-3">
            <button className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
              <span className="text-xs font-medium text-gray-900 dark:text-white">Add User</span>
            </button>

            <button className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
              <span className="text-xs font-medium text-gray-900 dark:text-white">New Order</span>
            </button>

            <button className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
              <span className="text-xs font-medium text-gray-900 dark:text-white">Analytics</span>
            </button>

            <button className="flex flex-col items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors duration-200">
              <span className="text-xs font-medium text-gray-900 dark:text-white">Security</span>
            </button>
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
            {metrics.topProducts.slice(0, 5).map((product, index) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center">
                    <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                      {index + 1}
                    </span>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {product.sales} sales • {formatCurrency(product.revenue)}
                    </p>
                  </div>
                </div>
                <div className={`flex items-center ${
                  product.growth > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  <span className="text-sm font-medium">
                    {product.growth > 0 ? '+' : ''}{product.growth}%
                  </span>
                </div>
              </div>
            ))}
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
                  {metrics.alerts.filter(a => a.type === 'error').length} Critical
                </span>
              </div>
              <div className="flex items-center">
                <div className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></div>
                <span className="text-xs text-gray-600 dark:text-gray-400">
                  {metrics.alerts.filter(a => a.type === 'warning').length} Warnings
                </span>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {metrics.alerts.slice(0, 5).map((alert) => (
              <div key={alert.id} className="flex items-start space-x-3">
                <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                  alert.type === 'error'
                    ? 'bg-red-100 dark:bg-red-900'
                    : alert.type === 'warning'
                    ? 'bg-yellow-100 dark:bg-yellow-900'
                    : 'bg-blue-100 dark:bg-blue-900'
                }`}>
                  <div className={`w-2 h-2 rounded-full ${
                    alert.type === 'error'
                      ? 'bg-red-600'
                      : alert.type === 'warning'
                      ? 'bg-yellow-600'
                      : 'bg-blue-600'
                  }`}></div>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {alert.title}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {alert.message}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatDate(alert.timestamp)}
                  </p>
                </div>
              </div>
            ))}
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
            <div className="text-3xl font-bold text-green-600 mb-2">98.5%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">API Uptime</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 mb-2">245ms</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Avg Response Time</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-purple-600 mb-2">94.2%</div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Cache Efficiency</div>
          </div>
        </div>
      </div>
    </div>
  );
}
