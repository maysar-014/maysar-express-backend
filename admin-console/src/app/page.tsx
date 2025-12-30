// Professional Dashboard Page
// Real-time operational overview with key metrics and alerts

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingBagIcon,
  UsersIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowDownIcon,
  BellAlertIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import Link from 'next/link';
import { apiService } from '@/lib/api';
import { formatCurrency, formatDate, formatNumber } from '@/lib/utils';

interface DashboardMetrics {
  totalRevenue: number;
  totalOrders: number;
  activeUsers: number;
  pendingOrders: number;
  lowStockAlerts: number;
  activeDisputes: number;
  systemHealth: number;
  revenueGrowth: number;
  ordersGrowth: number;
  usersGrowth: number;
}

interface RecentActivity {
  id: string;
  type: 'order' | 'user' | 'payment' | 'dispute' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
}

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  growth: number;
}

export default function DashboardPage() {
  const [timeframe, setTimeframe] = useState('24h');

  // Fetch dashboard metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['dashboard-metrics', timeframe],
    queryFn: () => apiService.reports.getDashboardMetrics(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Fetch recent activity
  const { data: recentActivity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => apiService.audit.getLogs({ limit: 10 }),
    staleTime: 30 * 1000,
  });

  // Fetch top products
  const { data: topProducts, isLoading: productsLoading } = useQuery({
    queryKey: ['top-products', timeframe],
    queryFn: () => apiService.reports.getSalesReport({
      startDate: getStartDate(timeframe),
      endDate: new Date().toISOString().split('T')[0],
      groupBy: 'day'
    }),
    staleTime: 5 * 60 * 1000,
  });

  // Mock data for demonstration
  const dashboardMetrics: DashboardMetrics = metrics?.data || {
    totalRevenue: 45231.89,
    totalOrders: 2847,
    activeUsers: 12847,
    pendingOrders: 23,
    lowStockAlerts: 8,
    activeDisputes: 12,
    systemHealth: 98.5,
    revenueGrowth: 12.5,
    ordersGrowth: 8.2,
    usersGrowth: -2.1
  };

  const recentActivities: RecentActivity[] = recentActivity?.data || [
    {
      id: '1',
      type: 'order',
      title: 'New Order Placed',
      description: 'Order #12345 for $299.99',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      status: 'success'
    },
    {
      id: '2',
      type: 'payment',
      title: 'Payment Processed',
      description: 'Payment of $1,250.00 received',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      status: 'success'
    },
    {
      id: '3',
      type: 'user',
      title: 'New User Registered',
      description: 'john.doe@example.com joined',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      status: 'success'
    },
    {
      id: '4',
      type: 'dispute',
      title: 'Dispute Opened',
      description: 'Order #12340 - Product quality issue',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      status: 'warning'
    }
  ];

  const topProductData: TopProduct[] = topProducts?.data || [
    { id: '1', name: 'Wireless Headphones', sales: 145, revenue: 21750, growth: 15.3 },
    { id: '2', name: 'Smart Watch', sales: 98, revenue: 29400, growth: 8.7 },
    { id: '3', name: 'Laptop Stand', sales: 234, revenue: 14040, growth: -3.2 },
    { id: '4', name: 'USB Cable', sales: 456, revenue: 2736, growth: 22.1 },
    { id: '5', name: 'Phone Case', sales: 321, revenue: 1605, growth: 5.8 }
  ];

  // Helper function to get start date
  function getStartDate(range: string): string {
    const now = new Date();
    switch (range) {
      case '1h': now.setHours(now.getHours() - 1); break;
      case '6h': now.setHours(now.getHours() - 6); break;
      case '24h': now.setDate(now.getDate() - 1); break;
      case '7d': now.setDate(now.getDate() - 7); break;
      case '30d': now.setDate(now.getDate() - 30); break;
      default: now.setDate(now.getDate() - 1);
    }
    return now.toISOString().split('T')[0];
  }

  // Mock chart data
  const revenueData = [
    { time: '00:00', revenue: 1200, orders: 45 },
    { time: '04:00', revenue: 800, orders: 32 },
    { time: '08:00', revenue: 2400, orders: 89 },
    { time: '12:00', revenue: 3600, orders: 124 },
    { time: '16:00', revenue: 2800, orders: 98 },
    { time: '20:00', revenue: 1900, orders: 67 },
  ];

  const statusData = [
    { name: 'Healthy', value: dashboardMetrics.systemHealth, color: '#10B981' },
    { name: 'Issues', value: 100 - dashboardMetrics.systemHealth, color: '#F59E0B' },
  ];

  const getActivityIcon = (type: string) => {
    const iconClass = "w-5 h-5";
    switch (type) {
      case 'order': return <ShoppingBagIcon className={iconClass} />;
      case 'user': return <UsersIcon className={iconClass} />;
      case 'payment': return <CurrencyDollarIcon className={iconClass} />;
      case 'dispute': return <ExclamationTriangleIcon className={iconClass} />;
      case 'system': return <ChartBarIcon className={iconClass} />;
      default: return <BellAlertIcon className={iconClass} />;
    }
  };

  const getActivityColor = (status?: string) => {
    switch (status) {
      case 'success': return 'text-green-600 dark:text-green-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'error': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Real-time operational overview and key performance metrics
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Revenue</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatCurrency(dashboardMetrics.totalRevenue)}
              </p>
            </div>
            <div className="flex items-center">
              <CurrencyDollarIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
              <div className={`ml-2 flex items-center text-sm ${
                dashboardMetrics.revenueGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {dashboardMetrics.revenueGrowth >= 0 ? (
                  <ArrowUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4" />
                )}
                {Math.abs(dashboardMetrics.revenueGrowth)}%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Orders</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(dashboardMetrics.totalOrders)}
              </p>
            </div>
            <div className="flex items-center">
              <ShoppingBagIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              <div className={`ml-2 flex items-center text-sm ${
                dashboardMetrics.ordersGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {dashboardMetrics.ordersGrowth >= 0 ? (
                  <ArrowUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4" />
                )}
                {Math.abs(dashboardMetrics.ordersGrowth)}%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {formatNumber(dashboardMetrics.activeUsers)}
              </p>
            </div>
            <div className="flex items-center">
              <UsersIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              <div className={`ml-2 flex items-center text-sm ${
                dashboardMetrics.usersGrowth >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {dashboardMetrics.usersGrowth >= 0 ? (
                  <ArrowUpIcon className="w-4 h-4" />
                ) : (
                  <ArrowDownIcon className="w-4 h-4" />
                )}
                {Math.abs(dashboardMetrics.usersGrowth)}%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">System Health</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {dashboardMetrics.systemHealth}%
              </p>
            </div>
            <div className="flex items-center">
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Revenue Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Revenue & Orders Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={revenueData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" />
                <YAxis yAxisId="revenue" orientation="left" />
                <YAxis yAxisId="orders" orientation="right" />
                <Tooltip
                  formatter={(value: any, name: string | undefined) => [
                    name === 'revenue' ? formatCurrency(value) : value,
                    name === 'revenue' ? 'Revenue' : 'Orders'
                  ]}
                />
                <Line
                  yAxisId="revenue"
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="revenue"
                />
                <Line
                  yAxisId="orders"
                  type="monotone"
                  dataKey="orders"
                  stroke="#10B981"
                  strokeWidth={2}
                  name="orders"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* System Health Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            System Health Status
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: any) => [`${value}%`, 'Status']} />
                <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="text-2xl font-bold">
                  {dashboardMetrics.systemHealth}%
                </text>
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Recent Activity
            </h3>
            <Link
              href="/audit"
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              View all →
            </Link>
          </div>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="text-lg">{getActivityIcon(activity.type)}</div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {activity.title}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    {activity.description}
                  </p>
                  <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                    {formatDate(activity.timestamp)}
                  </p>
                </div>
                <div className={`flex-shrink-0 w-2 h-2 rounded-full ${
                  activity.status === 'success' ? 'bg-green-500' :
                  activity.status === 'warning' ? 'bg-yellow-500' :
                  activity.status === 'error' ? 'bg-red-500' : 'bg-gray-400'
                }`} />
              </div>
            ))}
          </div>
        </div>

        {/* Top Products */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Top Performing Products
            </h3>
            <Link
              href="/analytics"
              className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400"
            >
              View analytics →
            </Link>
          </div>
          <div className="space-y-4">
            {topProductData.map((product, index) => (
              <div key={product.id} className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="flex-shrink-0 w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center text-sm font-medium text-gray-600 dark:text-gray-300">
                    {index + 1}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {product.name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {product.sales} sales
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {formatCurrency(product.revenue)}
                  </p>
                  <p className={`text-xs ${
                    product.growth >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {product.growth >= 0 ? '+' : ''}{product.growth}%
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Alerts Section */}
      {(dashboardMetrics.pendingOrders > 0 || dashboardMetrics.lowStockAlerts > 0 || dashboardMetrics.activeDisputes > 0) && (
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
          <div className="flex items-center mb-3">
            <BellAlertIcon className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mr-2" />
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Attention Required
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {dashboardMetrics.pendingOrders > 0 && (
              <Link href="/orders" className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <ClockIcon className="w-4 h-4 text-yellow-600 mr-2" />
                  <span className="text-gray-900 dark:text-white">Pending Orders</span>
                </div>
                <span className="font-medium text-yellow-600">{dashboardMetrics.pendingOrders}</span>
              </Link>
            )}
            {dashboardMetrics.lowStockAlerts > 0 && (
              <Link href="/inventory" className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <ExclamationTriangleIcon className="w-4 h-4 text-red-600 mr-2" />
                  <span className="text-gray-900 dark:text-white">Low Stock Alerts</span>
                </div>
                <span className="font-medium text-red-600">{dashboardMetrics.lowStockAlerts}</span>
              </Link>
            )}
            {dashboardMetrics.activeDisputes > 0 && (
              <Link href="/disputes" className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <ShieldCheckIcon className="w-4 h-4 text-orange-600 mr-2" />
                  <span className="text-gray-900 dark:text-white">Active Disputes</span>
                </div>
                <span className="font-medium text-orange-600">{dashboardMetrics.activeDisputes}</span>
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
