'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enablerApi } from '@/lib/api';
import { getEnabler, hasPermission } from '@/lib/permissions';

export default function TasksPage() {
  const [filter, setFilter] = useState('available');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 6;
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
    // Show blank data instead of error message
    const activeTasks = [];
    const completedTasks = [];
    const availableTasks = [];
    const allTasks = [];

    return (
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks Hub</h1>
          <div className="flex items-center space-x-2">
            <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Your Rank:</span>
            <span className="px-3 py-1 rounded text-xs font-medium bg-gray-100 text-gray-800">
              Trainee
            </span>
          </div>
        </div>

        {/* Search and Filter Controls */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <input
                type="text"
                placeholder="Search tasks by title, location, or type..."
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled
              />
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="bg-white dark:bg-gray-800 p-1 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="flex space-x-1">
              <button className="flex-1 px-3 py-2 text-xs font-medium rounded bg-blue-600 text-white">
                Available Tasks (0)
              </button>
              <button className="flex-1 px-3 py-2 text-xs font-medium rounded text-gray-600 dark:text-gray-400">
                My Tasks (0)
              </button>
              <button className="flex-1 px-3 py-2 text-xs font-medium rounded text-gray-600 dark:text-gray-400">
                All Tasks (0)
              </button>
            </div>
          </div>
        </div>

        {/* Tasks List */}
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="col-span-full bg-white dark:bg-gray-800 p-6 rounded-md border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No tasks available</p>
            </div>
          </div>
        </div>

        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Available Tasks</h3>
            <p className="text-xl font-bold text-blue-600">0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Tasks you can accept</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Potential Earnings</h3>
            <p className="text-xl font-bold text-green-600">TZS 0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">From available tasks</p>
          </div>
          <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Active Tasks</h3>
            <p className="text-xl font-bold text-orange-600">0</p>
            <p className="text-xs text-gray-600 dark:text-gray-400">Currently working on</p>
          </div>
        </div>
      </div>
    );
  }

  const activeTasks = tasksData?.data?.activeTasks || [];
  const completedTasks = tasksData?.data?.completedTasks || [];
  const availableTasks = tasksData?.data?.availableTasks || [];

  console.log('Tasks Data:', tasksData);

  const allTasks = [...activeTasks, ...availableTasks];
  const enablerRankIndex = 0;

  const filteredTasks = allTasks.filter(task => {
    const matchesFilter = filter === 'available' ? (task.status === 'pending' || task.status === 'available') :
                         filter === 'accepted' ? task.status === 'in_progress' : true;
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.type.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.ceil(filteredTasks.length / itemsPerPage);
  const paginatedTasks = filteredTasks.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Tasks Hub</h1>
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Your Rank:</span>
          <span className={`px-3 py-1 rounded text-xs font-medium ${getRankColor((enabler?.tier || 'trainee').toLowerCase())}`}>
            {enabler?.tier || 'Trainee'}
          </span>
        </div>
      </div>

      {/* Search and Filter Controls */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <input
              type="text"
              placeholder="Search tasks by title, location, or type..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white dark:bg-gray-800 p-1 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex space-x-1">
            {[
              { key: 'available', label: 'Available Tasks', count: availableTasks.length },
              { key: 'accepted', label: 'My Tasks', count: activeTasks.length },
              { key: 'eligible', label: 'All Tasks', count: allTasks.length }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => {
                  setFilter(tab.key);
                  setCurrentPage(1);
                }}
                className={`flex-1 px-3 py-2 text-xs font-medium rounded transition-colors ${
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
      </div>

      {/* Tasks List */}
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {paginatedTasks.length === 0 ? (
            <div className="col-span-full bg-white dark:bg-gray-800 p-6 rounded-md border border-gray-200 dark:border-gray-700 text-center">
              <p className="text-gray-500 dark:text-gray-400 text-sm">
                {searchTerm ? `No tasks found matching "${searchTerm}"` : 'No tasks available for your current filter.'}
              </p>
            </div>
          ) : (
            paginatedTasks.map((task) => {
              return (
                <div key={task.id} className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
                  <div className="space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="text-xs font-mono text-gray-500 dark:text-gray-400">{task.seller?.name?.slice(0,7) || 'MYS3907'}-TSK-{task.id?.slice(-3) || '565'}</span>
                        </div>
                        <h3 className="text-sm font-semibold text-gray-900 dark:text-white truncate">{task.title}</h3>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          {task.location} • {task.estimatedTime}
                        </p>
                      </div>
                      <div className="text-right ml-2">
                        <p className="text-sm font-bold text-green-600">TZS {(task.earnings || 0).toLocaleString()}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${getUrgencyColor(task.priority || 'medium')}`}>
                          {task.priority || 'medium'}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {task.type}
                        </span>
                      </div>
                      {task.status === 'pending' || task.status === 'available' ? (
                        <button
                          onClick={() => handleAcceptTask(task.id)}
                          className="px-3 py-1.5 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 transition-colors"
                        >
                          Accept
                        </button>
                      ) : task.status === 'in_progress' ? (
                        <button className="px-3 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 transition-colors">
                          Continue
                        </button>
                      ) : (
                        <span className="px-3 py-1.5 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-xs rounded">
                          {task.status}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between bg-white dark:bg-gray-800 px-3 py-2 rounded-md border border-gray-200 dark:border-gray-700">
            <div className="text-xs text-gray-700 dark:text-gray-300">
              Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, filteredTasks.length)} of {filteredTasks.length} tasks
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-xs text-gray-700 dark:text-gray-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded hover:bg-gray-200 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Available Tasks</h3>
          <p className="text-xl font-bold text-blue-600">
            {availableTasks.length}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Tasks you can accept</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Potential Earnings</h3>
          <p className="text-xl font-bold text-green-600">
            TZS {availableTasks
              .reduce((sum: number, t: any) => sum + (t.earnings || 0), 0)
              .toLocaleString()}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">From available tasks</p>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-2">Active Tasks</h3>
          <p className="text-xl font-bold text-orange-600">
            {activeTasks.length}
          </p>
          <p className="text-xs text-gray-600 dark:text-gray-400">Currently working on</p>
        </div>
      </div>
    </div>
  );
}
