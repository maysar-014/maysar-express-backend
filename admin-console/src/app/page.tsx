// Professional Dashboard Page
// Real-time operational overview with key metrics and alerts

"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
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
  conversionRate: number;
  avgOrderValue: number;
  customerSatisfaction: number;
  serverUptime: number;
}

interface RecentActivity {
  id: string;
  type: 'order' | 'user' | 'payment' | 'dispute' | 'system';
  title: string;
  description: string;
  timestamp: string;
  status?: 'success' | 'warning' | 'error';
  user?: string;
  amount?: number;
}

interface TopProduct {
  id: string;
  name: string;
  sales: number;
  revenue: number;
  growth: number;
  category: string;
  image?: string;
}

interface Alert {
  id: string;
  type: 'critical' | 'warning' | 'info';
  title: string;
  message: string;
  timestamp: string;
  acknowledged: boolean;
}

export default function DashboardPage() {
  const [timeframe, setTimeframe] = useState('24h');
  const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedMetric, setSelectedMetric] = useState<string | null>(null);

  // Real-time clock
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

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
    usersGrowth: -2.1,
    conversionRate: 3.4,
    avgOrderValue: 89.32,
    customerSatisfaction: 4.7,
    serverUptime: 99.97
  };

  const alerts: Alert[] = [
    {
      id: '1',
      type: 'critical',
      title: 'High Server Load',
      message: 'Server CPU usage at 85%',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      acknowledged: false
    },
    {
      id: '2',
      type: 'warning',
      title: 'Low Stock Alert',
      message: '8 products below minimum threshold',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      acknowledged: false
    }
  ];

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
    { id: '1', name: 'Wireless Headphones', sales: 145, revenue: 21750, growth: 15.3, category: 'Electronics', image: '/products/headphones.jpg' },
    { id: '2', name: 'Smart Watch', sales: 98, revenue: 29400, growth: 8.7, category: 'Wearables', image: '/products/watch.jpg' },
    { id: '3', name: 'Laptop Stand', sales: 234, revenue: 14040, growth: -3.2, category: 'Accessories', image: '/products/stand.jpg' },
    { id: '4', name: 'USB Cable', sales: 456, revenue: 2736, growth: 22.1, category: 'Accessories', image: '/products/cable.jpg' },
    { id: '5', name: 'Phone Case', sales: 321, revenue: 1605, growth: 5.8, category: 'Accessories', image: '/products/case.jpg' }
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

  // Enhanced chart data with more data points
  const revenueData = [
    { time: '00:00', revenue: 1200, orders: 45, users: 234 },
    { time: '02:00', revenue: 950, orders: 38, users: 189 },
    { time: '04:00', revenue: 800, orders: 32, users: 156 },
    { time: '06:00', revenue: 1100, orders: 42, users: 201 },
    { time: '08:00', revenue: 2400, orders: 89, users: 445 },
    { time: '10:00', revenue: 3200, orders: 118, users: 567 },
    { time: '12:00', revenue: 3600, orders: 124, users: 623 },
    { time: '14:00', revenue: 3100, orders: 112, users: 589 },
    { time: '16:00', revenue: 2800, orders: 98, users: 534 },
    { time: '18:00', revenue: 2200, orders: 78, users: 456 },
    { time: '20:00', revenue: 1900, orders: 67, users: 389 },
    { time: '22:00', revenue: 1400, orders: 52, users: 298 },
  ];

  const categoryData = [
    { name: 'Electronics', value: 35, revenue: 15420 },
    { name: 'Clothing', value: 28, revenue: 12340 },
    { name: 'Home & Garden', value: 18, revenue: 8950 },
    { name: 'Sports', value: 12, revenue: 5670 },
    { name: 'Books', value: 7, revenue: 2890 },
  ];

  const performanceData = [
    { metric: 'Page Load', value: 1.2, target: 2.0, status: 'good' },
    { metric: 'API Response', value: 180, target: 200, status: 'good' },
    { metric: 'Error Rate', value: 0.8, target: 1.0, status: 'good' },
    { metric: 'Uptime', value: 99.97, target: 99.9, status: 'excellent' },
  ];

  const statusData = [
    { name: 'Healthy', value: dashboardMetrics.systemHealth, color: '#10B981' },
    { name: 'Issues', value: 100 - dashboardMetrics.systemHealth, color: '#F59E0B' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'order': return '🛍️';
      case 'user': return '👤';
      case 'payment': return '💰';
      case 'dispute': return '⚠️';
      case 'system': return '📊';
      default: return '🔔';
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
    <div className="space-y-6 p-6 bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Enhanced Header with Real-time Clock and Quick Actions */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">
            Dashboard Overview
          </h1>
          <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
            <span>Last updated: {formatDate(currentTime.toISOString())}</span>
            <span className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
              Live Data
            </span>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            Export Report
          </button>
        </div>
      </div>

      {/* Critical Alerts Banner */}
      {alerts.filter(alert => !alert.acknowledged && alert.type === 'critical').length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
              <div>
                <h3 className="text-red-800 dark:text-red-300 font-medium">
                  Critical Alert: {alerts.find(a => a.type === 'critical')?.title}
                </h3>
                <p className="text-red-700 dark:text-red-400 text-sm">
                  {alerts.find(a => a.type === 'critical')?.message}
                </p>
              </div>
            </div>
            <button className="text-red-600 hover:text-red-800 font-medium text-sm">
              Acknowledge
            </button>
          </div>
        </div>
      )}
      {/* Enhanced KPI Cards with Animations and Drill-down */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {[
          {
            title: 'Total Revenue',
            value: formatCurrency(dashboardMetrics.totalRevenue),
            change: dashboardMetrics.revenueGrowth,
            icon: '💰',
            color: 'blue',
            subtitle: `Avg: ${formatCurrency(dashboardMetrics.avgOrderValue)}/order`
          },
          {
            title: 'Total Orders',
            value: formatNumber(dashboardMetrics.totalOrders),
            change: dashboardMetrics.ordersGrowth,
            icon: '📦',
            color: 'green',
            subtitle: `${dashboardMetrics.pendingOrders} pending`
          },
          {
            title: 'Active Users',
            value: formatNumber(dashboardMetrics.activeUsers),
            change: dashboardMetrics.usersGrowth,
            icon: '👥',
            color: 'purple',
            subtitle: `${dashboardMetrics.conversionRate}% conversion`
          },
          {
            title: 'System Health',
            value: `${dashboardMetrics.systemHealth}%`,
            change: 0.2,
            icon: '⚡',
            color: 'emerald',
            subtitle: `${dashboardMetrics.serverUptime}% uptime`
          }
        ].map((card, index) => (
          <div
            key={index}
            className={`bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-100 dark:border-gray-700 p-6 hover:shadow-xl transition-all duration-300 cursor-pointer transform hover:-translate-y-1 ${
              selectedMetric === card.title ? 'ring-2 ring-blue-500' : ''
            }`}
            onClick={() => setSelectedMetric(selectedMetric === card.title ? null : card.title)}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="text-2xl">{card.icon}</div>
              <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                card.change >= 0 ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
                'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
              }`}>
                {card.change >= 0 ? '+' : ''}{card.change}%
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
                {card.title}
              </p>
              <p className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
                {card.value}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {card.subtitle}
              </p>
            </div>
            
            {/* Mini sparkline */}
            <div className="mt-4 h-8">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={revenueData.slice(-6)}>
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke={`var(--color-${card.color}-500)`}
                    fill={`var(--color-${card.color}-100)`}
                    strokeWidth={2}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        ))}
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
            <h4 className="text-sm font-medium text-yellow-800 dark:text-yellow-200">
              Attention Required
            </h4>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {dashboardMetrics.pendingOrders > 0 && (
              <Link href="/orders" className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <span className="text-gray-900 dark:text-white">Pending Orders</span>
                </div>
                <span className="font-medium text-yellow-600">{dashboardMetrics.pendingOrders}</span>
              </Link>
            )}
            {dashboardMetrics.lowStockAlerts > 0 && (
              <Link href="/inventory" className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
                  <span className="text-gray-900 dark:text-white">Low Stock Alerts</span>
                </div>
                <span className="font-medium text-red-600">{dashboardMetrics.lowStockAlerts}</span>
              </Link>
            )}
            {dashboardMetrics.activeDisputes > 0 && (
              <Link href="/disputes" className="flex items-center justify-between p-3 bg-white dark:bg-gray-800 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex items-center">
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
