'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enablerApi } from '@/lib/api';
import { getEnabler, hasPermission } from '@/lib/permissions';

export default function TasksPage() {
  const [filter, setFilter] = useState('available');
  const enabler = getEnabler();

  const { data: tasksData, isLoading, error } = useQuery({
    queryKey: ['enabler-tasks'],
    queryFn: () => enablerApi.getTasks()
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
        <p className="text-red-600">Error loading tasks data</p>
      </div>
    );
  }

  const activeTasks = tasksData?.data?.activeTasks || [];
  const completedTasks = tasksData?.data?.completedTasks || [];
  const availableTasks = tasksData?.data?.availableTasks || [];

  const allTasks = [...activeTasks, ...availableTasks];
  const rankHierarchy = ['trainee', 'associate', 'specialist', 'senior', 'expert', 'master', 'director'];
  const enablerRankIndex = rankHierarchy.indexOf(enabler.tier.toLowerCase());

  const filteredTasks = allTasks.filter(task => {
    if (filter === 'available') return task.status === 'pending' || task.status === 'available';
    if (filter === 'accepted') return task.status === 'in_progress';
    if (filter === 'eligible') return true;
    return true;
  });

  const handleAcceptTask = (taskId: string) => {
    console.log('Accepting task:', taskId);
    alert('Task accepted successfully!');
  };

  const getRankColor = (rank: string) => {
    const colors = {
      trainee: 'bg-gray-100 text-gray-800',
      associate: 'bg-blue-100 text-blue-800',
      specialist: 'bg-green-100 text-green-800',
      senior: 'bg-yellow-100 text-yellow-800',
      expert: 'bg-orange-100 text-orange-800',
      master: 'bg-red-100 text-red-800',
      director: 'bg-purple-100 text-purple-800'
    };
    return colors[rank as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  const getUrgencyColor = (urgency: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      medium: 'bg-yellow-100 text-yellow-800',
      low: 'bg-green-100 text-green-800'
    };
    return colors[urgency as keyof typeof colors] || 'bg-gray-100 text-gray-800';
  };

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks Hub</h1>
        <div className="flex items-center space-x-2">
          <span className="text-sm text-gray-600 dark:text-gray-400">Your Rank:</span>
          <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRankColor(enabler.rank.toLowerCase())}`}>
            {enabler.rank}
          </span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="bg-white dark:bg-gray-800 p-1 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex space-x-1">
          {[
            { key: 'available', label: 'Available Tasks', count: availableTasks.length },
            { key: 'accepted', label: 'My Tasks', count: activeTasks.length },
            { key: 'eligible', label: 'All Tasks', count: allTasks.length }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setFilter(tab.key)}
              className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                filter === tab.key
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white'
              }`}
            >
              {tab.label} ({tab.count})
            </button>
          ))}
        </div>
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        {filteredTasks.length === 0 ? (
          <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 text-center">
            <p className="text-gray-500 dark:text-gray-400">No tasks available for your current filter.</p>
          </div>
        ) : (
          filteredTasks.map((task) => {
            const salesEarnings = 0;
            const logisticsEarnings = 0;
            const totalEarnings = task.earnings || 0;

            return (
              <div key={task.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{task.title}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(task.priority || 'medium')}`}>
                        {task.priority || 'medium'} priority
                      </span>
                      <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {task.type}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      {task.description}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {task.location} • {task.estimatedTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">TZS {(task.earnings || 0).toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total Earnings</p>
                  </div>
                </div>

                {/* Task Progress */}
                {task.progress !== undefined && (
                  <div className="mb-4">
                    <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                      <span>Progress</span>
                      <span>{task.progress}%</span>
                    </div>
                    <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${task.progress}%` }}
                      ></div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex justify-between items-center">
                  <div className="flex space-x-2">
                    <button className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-md hover:bg-gray-200 dark:hover:bg-gray-600">
                      View Details
                    </button>
                    <button className="px-3 py-1 text-xs bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-md hover:bg-blue-200 dark:hover:bg-blue-900/30">
                      Contact Seller
                    </button>
                  </div>
                  
                  {task.status === 'pending' || task.status === 'available' ? (
                    <button
                      onClick={() => handleAcceptTask(task.id)}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Accept Task
                    </button>
                  ) : task.status === 'in_progress' ? (
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        Continue Work
                      </button>
                      <button className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                        Pause
                      </button>
                    </div>
                  ) : (
                    <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm rounded-lg">
                      {task.status}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Available Tasks</h3>
          <p className="text-3xl font-bold text-blue-600">
            {availableTasks.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tasks you can accept</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Potential Earnings</h3>
          <p className="text-3xl font-bold text-green-600">
            TZS {availableTasks
              .reduce((sum, t) => sum + (t.earnings || 0), 0)
              .toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">From available tasks</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Active Tasks</h3>
          <p className="text-3xl font-bold text-orange-600">
            {activeTasks.length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Currently working on</p>
        </div>
      </div>
    </div>
  );
}