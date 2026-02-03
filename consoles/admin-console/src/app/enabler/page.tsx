"use client";

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { apiService } from '@/lib/api';
import { formatDate, formatCurrency, capitalize } from '@/lib/utils';

interface EnablerMetrics {
  ordersProcessed: number;
  avgResolutionTime: number;
  customerSatisfaction: number;
  activeTickets: number;
  pendingReturns: number;
  disputesResolved: number;
  performanceScore: number;
  commissionEarned: number;
}

interface Task {
  id: string;
  type: 'order_issue' | 'customer_inquiry' | 'return_request' | 'dispute' | 'quality_check';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  assignedAt: string;
  dueAt: string;
  status: 'pending' | 'in_progress' | 'completed';
  orderId?: string;
  customerId?: string;
}

interface RecentActivity {
  id: string;
  type: string;
  description: string;
  timestamp: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

export default function EnablerDashboard() {
    const [page1, setPage1] = useState(0);
  const [page2, setPage2] = useState(0);
const [currentTime, setCurrentTime] = useState(new Date());
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);

  // Update clock every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
  const [cardPage1, setCardPage1] = useState(0);

    return () => clearInterval(timer);
  }, []);

  // Fetch enabler metrics
  const { data: metricsData, isLoading: metricsLoading } = useQuery({
    queryKey: ['enabler-metrics'],
    queryFn: () => apiService.enabler.getMetrics(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });

  // Fetch pending tasks
  const { data: tasksData, isLoading: tasksLoading } = useQuery({
    queryKey: ['enabler-tasks'],
    queryFn: () => apiService.enabler.getTasks(),
    staleTime: 15 * 1000,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });

  // Fetch recent activity
  const { data: activityData } = useQuery({
    queryKey: ['enabler-activity'],
    queryFn: () => apiService.enabler.getRecentActivity(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  const metrics: EnablerMetrics = metricsData?.data || {
    ordersProcessed: 0,
    avgResolutionTime: 0,
    customerSatisfaction: 0,
    activeTickets: 0,
    pendingReturns: 0,
    disputesResolved: 0,
    performanceScore: 0,
    commissionEarned: 0,
  };

  const tasks: Task[] = tasksData?.data || [];
  const activities: RecentActivity[] = activityData?.data || [];

  const urgentTasks = tasks.filter(task => task.priority === 'urgent' && task.status !== 'completed');
  const highPriorityTasks = tasks.filter(task => task.priority === 'high' && task.status !== 'completed');
  const pendingTasks = tasks.filter(task => task.status === 'pending');

  const taskPriorityColors = {
    urgent: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
    high: 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300',
    medium: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
    low: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
  };

  const taskTypeIcons = {
    order_issue: '📦',
    customer_inquiry: '💬',
    return_request: '↩️',
    dispute: '⚖️',
    quality_check: '✅',
  };

  return (
    <div className="space-y-6">
      {/* Header with Real-time Clock */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Operations Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Real-time operational metrics and task management
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-mono font-bold text-gray-900 dark:text-white">
            {currentTime.toLocaleTimeString()}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {currentTime.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </div>
        </div>
      </div>

      {/* Critical Alerts */}
      {urgentTasks.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <span className="text-red-600 text-xl">🚨</span>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                Urgent Tasks Require Immediate Attention
              </h3>
              <div className="mt-2 text-sm text-red-700 dark:text-red-300">
                {urgentTasks.length} urgent task{urgentTasks.length !== 1 ? 's' : ''} pending
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Performance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900 rounded-lg flex items-center justify-center">
                <span className="text-blue-600 dark:text-blue-400 text-lg">📊</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Performance Score</dt>
              <dd className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.performanceScore}%</dd>
              <div className="text-sm text-green-600 mt-1">+5.2% vs last week</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-green-100 dark:bg-green-900 rounded-lg flex items-center justify-center">
                <span className="text-green-600 dark:text-green-400 text-lg">📦</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Orders Processed</dt>
              <dd className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.ordersProcessed}</dd>
              <div className="text-sm text-green-600 mt-1">Today</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-yellow-100 dark:bg-yellow-900 rounded-lg flex items-center justify-center">
                <span className="text-yellow-600 dark:text-yellow-400 text-lg">⏱️</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Resolution</dt>
              <dd className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.avgResolutionTime}h</dd>
              <div className="text-sm text-green-600 mt-1">-12% improvement</div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900 rounded-lg flex items-center justify-center">
                <span className="text-purple-600 dark:text-purple-400 text-lg">⭐</span>
              </div>
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Customer Satisfaction</dt>
              <dd className="text-2xl font-bold text-gray-900 dark:text-white">{metrics.customerSatisfaction}%</dd>
              <div className="text-sm text-green-600 mt-1">+2.8% this month</div>
            </div>
          </div>
        </div>
      </div>

      {/* Task Management & Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Pending Tasks */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Pending Tasks ({pendingTasks.length})
              </h3>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-red-600 font-medium">
                  {urgentTasks.length} Urgent
                </span>
                <span className="text-xs text-orange-600 font-medium">
                  {highPriorityTasks.length} High
                </span>
              </div>
            </div>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {pendingTasks.slice(page1 * 2, (page1 + 1) * 2).map((task) => (
              <div
                key={task.id}
                className="p-4 border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer"
                onClick={() => setSelectedTask(task)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start space-x-3">
                    <span className="text-lg">{taskTypeIcons[task.type]}</span>
                    <div className="flex-1">
                      <div className="flex items-center space-x-2">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-white">
                          {task.title}
                        </h4>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${taskPriorityColors[task.priority]}`}>
                          {capitalize(task.priority)}
                        </span>
                      </div>
                      <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                        {task.description}
                      </p>
                      <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
                        <span>Due: {formatDate(task.dueAt)}</span>
                        {task.orderId && <span>Order: {task.orderId}</span>}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Activity */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Recent Activity
            </h3>
          </div>
          <div className="max-h-96 overflow-y-auto">
            {activities.slice(0, 10).map((activity) => (
              <div key={activity.id} className="p-4 border-b border-gray-100 dark:border-gray-700">
                <div className="flex items-start space-x-3">
                  <div className={`w-2 h-2 rounded-full mt-2 ${
                    activity.status === 'success' ? 'bg-green-500' :
                    activity.status === 'warning' ? 'bg-yellow-500' :
                    activity.status === 'error' ? 'bg-red-500' :
                    'bg-blue-500'
                  }`}></div>
                  <div className="flex-1">
                    <p className="text-sm text-gray-900 dark:text-white">
                      {activity.description}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatDate(activity.timestamp)}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          Quick Actions
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 text-center border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="text-2xl mb-2">📋</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Process Orders</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{metrics.activeTickets} pending</div>
          </button>
          <button className="p-4 text-center border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="text-2xl mb-2">💬</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Customer Support</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Live chat</div>
          </button>
          <button className="p-4 text-center border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="text-2xl mb-2">↩️</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">Handle Returns</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">{metrics.pendingReturns} pending</div>
          </button>
          <button className="p-4 text-center border border-gray-200 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <div className="text-2xl mb-2">📊</div>
            <div className="text-sm font-medium text-gray-900 dark:text-white">View Reports</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Performance</div>
          </button>
        </div>
      </div>

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSelectedTask(null)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Task Details
                </h3>
                <button
                  onClick={() => setSelectedTask(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              <div className="space-y-4">
                <div>
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="text-lg">{taskTypeIcons[selectedTask.type]}</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${taskPriorityColors[selectedTask.priority]}`}>
                      {capitalize(selectedTask.priority)}
                    </span>
                  </div>
                  <h4 className="font-medium text-gray-900 dark:text-white">{selectedTask.title}</h4>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{selectedTask.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Assigned:</span>
                    <div className="font-medium">{formatDate(selectedTask.assignedAt)}</div>
                  </div>
                  <div>
                    <span className="text-gray-500 dark:text-gray-400">Due:</span>
                    <div className="font-medium">{formatDate(selectedTask.dueAt)}</div>
                  </div>
                </div>
                <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => setSelectedTask(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Close
                  </button>
                  <button className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
                    Start Task
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}