'use client';

import { useQuery } from '@tanstack/react-query';
import { enablerApi } from '@/lib/api';

export default function EnablerDashboard() {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ['enabler-dashboard'],
    queryFn: () => enablerApi.getDashboard()
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    // Show blank dashboard with zero data instead of error
    const enablerStats = {
      totalEarnings: 0,
      tasksCompleted: 0,
      completionRate: 0,
      activeTasks: 0,
      rankProgress: 0
    };
    const recentTasks = [];
    const upcomingTasks = [];

    return (
      <div className="space-y-4">
        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Earnings</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">
                  TZS {(enablerStats.totalEarnings || 0).toLocaleString()}
                </p>
              </div>
            </div>
            <div className="flex items-center mt-2">
              <span className="text-xs text-gray-500">No data available</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Tasks Completed</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{enablerStats.tasksCompleted || 0}</p>
              </div>
            </div>
            <div className="flex items-center mt-2">
              <span className="text-xs text-gray-500">{(enablerStats.completionRate || 0)}% completion rate</span>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Sales Assignments</p>
                <p className="text-xl font-bold text-gray-900 dark:text-white">{enablerStats.activeTasks || 0}</p>
              </div>
            </div>
            <div className="flex items-center mt-2">
              <span className="text-xs text-gray-500">Active sales support tasks</span>
            </div>
          </div>
        </div>

        {/* Rank Progress */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Rank Progress</h3>
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex-1">
              <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
                <span>Trainee Enabler</span>
                <span>{(enablerStats.rankProgress || 0)}% to Associate</span>
              </div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-md h-2">
                <div
                  className="bg-gray-400 h-2 rounded-md transition-all duration-300"
                  style={{ width: `${enablerStats.rankProgress || 0}%` }}
                ></div>
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
            Complete tasks to start your enabler journey and unlock commission rates
          </p>
        </div>

        {/* Recent Activity & Upcoming Tasks */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Recent Tasks */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No recent activity</p>
            </div>
          </div>

          {/* Upcoming Tasks */}
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Upcoming Tasks</h3>
            <div className="text-center py-6">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No upcoming tasks</p>
            </div>
            <button className="w-full mt-4 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
              View All Tasks
            </button>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
              <p className="text-xs font-medium text-orange-900 dark:text-orange-300">Sales Support</p>
            </button>
            <button className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
              <p className="text-xs font-medium text-blue-900 dark:text-blue-300">Buyer Assistance</p>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const enablerStats = dashboardData?.data?.stats || {
    totalEarnings: 125000,
    tasksCompleted: 8,
    completionRate: 85,
    activeTasks: 3,
    rankProgress: 65
  };
  const recentTasks = dashboardData?.data?.recentTasks || [
    {
      id: '1',
      type: 'Sales Support',
      status: 'completed',
      seller: 'TechStore Tanzania',
      time: '2 hours ago',
      earnings: 25000
    },
    {
      id: '2',
      type: 'Product Promotion',
      status: 'completed',
      seller: 'Fashion Hub',
      time: '5 hours ago',
      earnings: 15000
    }
  ];
  const upcomingTasks = dashboardData?.data?.upcomingTasks || [
    {
      id: '1',
      type: 'Sales Assignment',
      priority: 'high',
      deadline: '2 days',
      earnings: 35000
    },
    {
      id: '2',
      type: 'Product Demo',
      priority: 'medium',
      deadline: '5 days',
      earnings: 20000
    }
  ];

  return (
    <div className="space-y-4">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Earnings</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">
                TZS {(enablerStats.totalEarnings || 0).toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-green-600">+12.5% from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Tasks Completed</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{enablerStats.tasksCompleted || 0}</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-gray-600">{(enablerStats.completionRate || 0)}% completion rate</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Sales Assignments</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{enablerStats.activeTasks || 0}</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-xs text-gray-600">Active sales support tasks</span>
          </div>
        </div>
      </div>

      {/* Rank Progress */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white">Rank Progress</h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex justify-between text-xs text-gray-600 dark:text-gray-400 mb-1">
              <span>Gold Enabler</span>
              <span>{(enablerStats.rankProgress || 0)}% to Platinum</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-md h-2">
              <div
                className="bg-yellow-500 h-2 rounded-md transition-all duration-300"
                style={{ width: `${enablerStats.rankProgress || 0}%` }}
              ></div>
            </div>
          </div>
        </div>
        <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
          Complete 25 more tasks to reach Platinum rank and unlock higher commission rates
        </p>
      </div>

      {/* Recent Activity & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-3">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    task.status === 'completed' ? 'bg-green-500' :
                    task.status === 'in-progress' ? 'bg-yellow-500' : 'bg-gray-400'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{task.type}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {task.seller || task.order } • {task.time}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-green-600">TZS {task.earnings.toLocaleString()}</p>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500">{task.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Upcoming Tasks</h3>
          <div className="space-y-3">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div className="flex items-center space-x-3">
                  <div className={`w-3 h-3 rounded-full ${
                    task.priority === 'high' ? 'bg-red-500' :
                    task.priority === 'medium' ? 'bg-yellow-500' : 'bg-green-500'
                  }`}></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{task.type}</p>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      Due in {task.deadline} • {task.priority} priority
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-green-600">TZS {task.earnings.toLocaleString()}</p>
                  <button className="text-xs text-blue-600 hover:text-blue-800">
                    Start Task
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm">
            View All Tasks
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
        <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-md hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
            <p className="text-xs font-medium text-orange-900 dark:text-orange-300">Sales Support</p>
          </button>
          <button className="p-3 bg-blue-50 dark:bg-blue-900/20 rounded-md hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <p className="text-xs font-medium text-blue-900 dark:text-blue-300">Buyer Assistance</p>
          </button>
        </div>
      </div>
    </div>
  );
}
