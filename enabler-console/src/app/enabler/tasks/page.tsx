'use client';

import { useState } from 'react';
import { getEnabler, hasPermission } from '@/lib/permissions';

export default function TasksPage() {
  const [filter, setFilter] = useState('available');
  const enabler = getEnabler();

  const taskRequests = [
    {
      id: 'TR-001',
      seller: 'TechStore Tanzania',
      product: { name: 'Samsung Galaxy A54', price: 850000, category: 'Electronics' },
      supportTypes: { sales: true, logistics: true },
      commissions: { sales: 8, logistics: 5 },
      minRank: 'specialist',
      postedTime: '2 hours ago',
      status: 'available',
      urgency: 'high',
      location: 'Dar es Salaam'
    },
    {
      id: 'TR-002',
      seller: 'Fashion Hub TZ',
      product: { name: 'Nike Air Max 270', price: 320000, category: 'Fashion' },
      supportTypes: { sales: true, logistics: false },
      commissions: { sales: 12, logistics: 0 },
      minRank: 'associate',
      postedTime: '4 hours ago',
      status: 'available',
      urgency: 'medium',
      location: 'Arusha'
    },
    {
      id: 'TR-003',
      seller: 'Electronics Plus',
      product: { name: 'MacBook Air M2', price: 2800000, category: 'Electronics' },
      supportTypes: { sales: true, logistics: true },
      commissions: { sales: 6, logistics: 4 },
      minRank: 'expert',
      postedTime: '1 day ago',
      status: 'available',
      urgency: 'low',
      location: 'Mwanza'
    },
    {
      id: 'TR-004',
      seller: 'Sports World TZ',
      product: { name: 'Adidas Ultraboost 22', price: 280000, category: 'Fashion' },
      supportTypes: { sales: true, logistics: true },
      commissions: { sales: 10, logistics: 6 },
      minRank: 'senior',
      postedTime: '30 mins ago',
      status: 'accepted',
      urgency: 'high',
      location: 'Dodoma',
      acceptedBy: enabler.id
    }
  ];

  const rankHierarchy = ['trainee', 'associate', 'specialist', 'senior', 'expert', 'master', 'director'];
  const enablerRankIndex = rankHierarchy.indexOf(enabler.rank.toLowerCase());

  const filteredTasks = taskRequests.filter(task => {
    const taskRankIndex = rankHierarchy.indexOf(task.minRank);
    const isEligible = enablerRankIndex >= taskRankIndex;
    
    if (filter === 'available') return task.status === 'available' && isEligible;
    if (filter === 'accepted') return task.status === 'accepted' && task.acceptedBy === enabler.id;
    if (filter === 'eligible') return isEligible;
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
            { key: 'available', label: 'Available Tasks', count: filteredTasks.filter(t => t.status === 'available').length },
            { key: 'accepted', label: 'My Tasks', count: filteredTasks.filter(t => t.status === 'accepted').length },
            { key: 'eligible', label: 'All Eligible', count: filteredTasks.length }
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
            const salesEarnings = task.supportTypes.sales ? Math.round(task.product.price * (task.commissions.sales / 100)) : 0;
            const logisticsEarnings = task.supportTypes.logistics ? Math.round(task.product.price * (task.commissions.logistics / 100)) : 0;
            const totalEarnings = salesEarnings + logisticsEarnings;

            return (
              <div key={task.id} className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{task.product.name}</h3>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getUrgencyColor(task.urgency)}`}>
                        {task.urgency} priority
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRankColor(task.minRank)}`}>
                        Min: {task.minRank}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-1">
                      Seller: {task.seller} • {task.location}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Product Price: TZS {task.product.price.toLocaleString()} • Posted {task.postedTime}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-bold text-green-600">TZS {totalEarnings.toLocaleString()}</p>
                    <p className="text-xs text-gray-500">Total Earnings</p>
                  </div>
                </div>

                {/* Support Types & Commissions */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  {task.supportTypes.sales && (
                    <div className="bg-orange-50 dark:bg-orange-900/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-orange-900 dark:text-orange-300">Sales Support</p>
                          <p className="text-xs text-orange-700 dark:text-orange-400">Customer inquiries & sales</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-orange-900 dark:text-orange-300">
                            TZS {salesEarnings.toLocaleString()}
                          </p>
                          <p className="text-xs text-orange-700 dark:text-orange-400">{task.commissions.sales}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  {task.supportTypes.logistics && (
                    <div className="bg-purple-50 dark:bg-purple-900/20 p-3 rounded-lg">
                      <div className="flex justify-between items-center">
                        <div>
                          <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Logistics Support</p>
                          <p className="text-xs text-purple-700 dark:text-purple-400">Delivery & coordination</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-purple-900 dark:text-purple-300">
                            TZS {logisticsEarnings.toLocaleString()}
                          </p>
                          <p className="text-xs text-purple-700 dark:text-purple-400">{task.commissions.logistics}%</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

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
                  
                  {task.status === 'available' ? (
                    <button
                      onClick={() => handleAcceptTask(task.id)}
                      className="px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 transition-colors"
                    >
                      Accept Task
                    </button>
                  ) : task.status === 'accepted' && task.acceptedBy === enabler.id ? (
                    <div className="flex space-x-2">
                      <button className="px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors">
                        Start Work
                      </button>
                      <button className="px-4 py-2 bg-gray-600 text-white text-sm font-medium rounded-lg hover:bg-gray-700 transition-colors">
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <span className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 text-sm rounded-lg">
                      Not Available
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
            {taskRequests.filter(t => t.status === 'available' && rankHierarchy.indexOf(t.minRank) <= enablerRankIndex).length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Tasks you can accept</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Potential Earnings</h3>
          <p className="text-3xl font-bold text-green-600">
            TZS {taskRequests
              .filter(t => t.status === 'available' && rankHierarchy.indexOf(t.minRank) <= enablerRankIndex)
              .reduce((sum, t) => {
                const sales = t.supportTypes.sales ? Math.round(t.product.price * (t.commissions.sales / 100)) : 0;
                const logistics = t.supportTypes.logistics ? Math.round(t.product.price * (t.commissions.logistics / 100)) : 0;
                return sum + sales + logistics;
              }, 0)
              .toLocaleString()}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">From available tasks</p>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">Active Tasks</h3>
          <p className="text-3xl font-bold text-orange-600">
            {taskRequests.filter(t => t.status === 'accepted' && t.acceptedBy === enabler.id).length}
          </p>
          <p className="text-sm text-gray-600 dark:text-gray-400">Currently working on</p>
        </div>
      </div>
    </div>
  );
}