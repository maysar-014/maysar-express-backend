'use client';

import { getEnabler, hasPermission, TIER_INFO } from '@/lib/permissions';

export default function EnablerDashboard() {
  const enabler = getEnabler();
  const tierInfo = TIER_INFO[enabler.tier];

  // Mock data with tier-based filtering
  const enablerStats = {
    totalEarnings: 2450750,
    monthlyEarnings: 850250,
    tasksCompleted: 127,
    activeTasks: 8,
    deliveriesCompleted: 89,
    salesAssisted: 45,
    rank: 'Gold',
    rankProgress: 75,
    trustScore: 4.8,
    completionRate: 94.5
  };

  const recentTasks = [
    { id: 1, type: 'Delivery Coordination', order: 'ORD-2024-5678', status: 'completed', earnings: 25000, time: '2 hours ago' },
    { id: 2, type: 'Sales Consultation', seller: 'TechStore TZ', status: 'in-progress', earnings: 15000, time: '30 mins ago' },
    { id: 3, type: 'Delivery Confirmation', order: 'ORD-2024-5679', status: 'pending', earnings: 10000, time: '1 hour ago' },
    { id: 4, type: 'Sales Support', seller: 'Fashion Hub TZ', status: 'completed', earnings: 20000, time: '3 hours ago' }
  ];

  const upcomingTasks = [
    { id: 5, type: 'Delivery Pickup', priority: 'high', deadline: '2 hours', earnings: 30000 },
    { id: 6, type: 'Sales Meeting', priority: 'medium', deadline: '4 hours', earnings: 20000 },
    { id: 7, type: 'Logistics Coordination', priority: 'low', deadline: '1 day', earnings: 15000 }
  ];

  return (
    <div className="space-y-8">
      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Earnings</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                TZS {enablerStats.totalEarnings.toLocaleString()}
              </p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-green-600">+12.5% from last month</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Tasks Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{enablerStats.tasksCompleted}</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-gray-600">{enablerStats.completionRate}% completion rate</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Deliveries Completed</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{enablerStats.deliveriesCompleted}</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-green-600">+15 this week</span>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{enablerStats.activeTasks}</p>
            </div>
          </div>
          <div className="flex items-center mt-2">
            <span className="text-sm text-gray-600">2 high priority</span>
          </div>
        </div>
      </div>

      {/* Rank Progress */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Rank Progress</h3>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
              <span>Gold Enabler</span>
              <span>{enablerStats.rankProgress}% to Platinum</span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
              <div 
                className="bg-yellow-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${enablerStats.rankProgress}%` }}
              ></div>
            </div>
          </div>
        </div>
        <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
          Complete 25 more tasks to reach Platinum rank and unlock higher commission rates
        </p>
      </div>

      {/* Recent Activity & Upcoming Tasks */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Tasks */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Activity</h3>
          <div className="space-y-4">
            {recentTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                  <p className="text-sm font-medium text-green-600">TZS {task.earnings.toLocaleString()}</p>
                  <div className="flex items-center">
                    <span className="text-xs text-gray-500">{task.status}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Upcoming Tasks */}
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Upcoming Tasks</h3>
          <div className="space-y-4">
            {upcomingTasks.map((task) => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
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
                  <p className="text-sm font-medium text-green-600">TZS {task.earnings.toLocaleString()}</p>
                  <button className="text-xs text-blue-600 hover:text-blue-800">
                    Start Task
                  </button>
                </div>
              </div>
            ))}
          </div>
          <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
            View All Tasks
          </button>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
          <button className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Logistics Help</p>
          </button>
          <button className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
            <p className="text-sm font-medium text-orange-900 dark:text-orange-300">Sales Support</p>
          </button>
        </div>
      </div>
    </div>
  );
}