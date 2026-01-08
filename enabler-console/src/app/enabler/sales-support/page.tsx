'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { enablerApi } from '../../../lib/api';

export default function SalesSupport() {
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const { data: salesData, isLoading, error } = useQuery({
    queryKey: ['enabler-sales-support'],
    queryFn: () => {
      console.log('[FRONTEND] Calling getSalesSupport API');
      return enablerApi.getSalesSupport();
    },
    staleTime: 30 * 1000,
    onSuccess: (data) => {
      console.log('[FRONTEND] Sales data received:', data);
    },
    onError: (error) => {
      console.error('[FRONTEND] Sales data error:', error);
    }
  });

  const allAssignments = salesData?.data?.activeSessions?.map(session => ({
    id: session.id,
    sellerName: session.seller?.name || session.sellerName || 'Unknown Seller',
    priority: session.priority || 'medium',
    status: session.status,
    description: session.description || 'No description available',
    type: session.type,
    product: session.product || (session.products && session.products[0]) || '',
    productPrice: session.productPrice || session.targetSales || 0,
    deadline: session.deadline || 'N/A',
    requirements: session.requirements || [],
    earnings: session.earnings || 0,
    commission: session.commission || 'N/A',
    createdAt: session.createdAt || 'N/A'
  })) || [];

  // Filter available assignments (pending or in-progress)
  const salesAssignments = allAssignments.filter(assignment =>
    assignment.status === 'pending' || assignment.status === 'in-progress'
  );

  const completedAssignments = salesData?.data?.completedSessions || [];

  // Calculate stats from filtered data
  const totalEarnings = salesAssignments.reduce((sum: number, assignment: any) => sum + (assignment.earnings || 0), 0);
  const stats = {
    totalSessions: salesAssignments.length + completedAssignments.length,
    completed: completedAssignments.length,
    active: salesAssignments.length,
    averageRating: (salesData as any)?.data?.stats?.averageRating || 0,
    totalEarnings: totalEarnings,
    averageSessionDuration: (salesData as any)?.data?.stats?.averageSessionDuration || '0 hours'
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const handleStartAssignment = (assignmentId: string) => {
    console.log(`Starting sales assignment ${assignmentId}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Sales Support</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Help sellers boost their sales and earn commission-based rewards
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded text-blue-800 dark:text-blue-300 text-xs font-medium">
            {stats.active} Available
          </span>
          <span className="bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded text-green-800 dark:text-green-300 text-xs font-medium">
            TZS {stats.totalEarnings.toLocaleString()} Potential
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-950/50 dark:to-blue-900/30 p-6 rounded-xl border border-blue-200/50 dark:border-blue-800/50 shadow-sm hover:shadow-md transition-all duration-200">
          <p className="text-xs font-semibold text-blue-700 dark:text-blue-300 uppercase tracking-wider">Active Assignments</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-100 mt-2">
            {stats.active}
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1 font-medium">Currently available</p>
        </div>

        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-950/50 dark:to-green-900/30 p-6 rounded-xl border border-green-200/50 dark:border-green-800/50 shadow-sm hover:shadow-md transition-all duration-200">
          <p className="text-xs font-semibold text-green-700 dark:text-green-300 uppercase tracking-wider">Avg. Commission</p>
          <p className="text-3xl font-bold text-green-900 dark:text-green-100 mt-2">{stats.averageRating}%</p>
          <p className="text-xs text-green-600 dark:text-green-400 mt-1 font-medium">Per assignment</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/50 dark:to-purple-900/30 p-6 rounded-xl border border-purple-200/50 dark:border-purple-800/50 shadow-sm hover:shadow-md transition-all duration-200">
          <p className="text-xs font-semibold text-purple-700 dark:text-purple-300 uppercase tracking-wider">Success Rate</p>
          <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mt-2">{Math.round((stats.completed / stats.totalSessions) * 100) || 0}%</p>
          <p className="text-xs text-purple-600 dark:text-purple-400 mt-1 font-medium">Completion rate</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-950/50 dark:to-orange-900/30 p-6 rounded-xl border border-orange-200/50 dark:border-orange-800/50 shadow-sm hover:shadow-md transition-all duration-200">
          <p className="text-xs font-semibold text-orange-700 dark:text-orange-300 uppercase tracking-wider">Total Earnings</p>
          <p className="text-3xl font-bold text-orange-900 dark:text-orange-100 mt-2">TZS {Math.round(stats.totalEarnings / 1000)}K</p>
          <p className="text-xs text-orange-600 dark:text-orange-400 mt-1 font-medium">From all assignments</p>
        </div>
      </div>

      {/* Sales Assignments */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Available Sales Assignments</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">New opportunities to help sellers and earn commissions</p>
        </div>
        <div className="p-6">
          {salesAssignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No sales assignments available at the moment.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Check back later for new opportunities.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {salesAssignments.map((assignment: any) => (
                <div key={assignment.id} className="bg-gradient-to-r from-white to-gray-50 dark:from-gray-800 dark:to-gray-750 rounded-xl p-6 border border-gray-200/60 dark:border-gray-700/60 shadow-sm hover:shadow-lg hover:border-blue-300/60 dark:hover:border-blue-600/60 transition-all duration-300 group">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-4 mb-4">
                        <div className="relative">
                          <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
                            <span className="text-white font-bold text-sm">
                              {assignment.sellerName.split(' ').map((n: string) => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-green-500 rounded-full border-2 border-white dark:border-gray-800"></div>
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center space-x-3 mb-1">
                            <h4 className="text-lg font-semibold text-gray-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                              {assignment.sellerName}
                            </h4>
                            <span className={`px-3 py-1 rounded-full text-xs font-semibold ${getPriorityColor(assignment.priority)} shadow-sm`}>
                              {assignment.priority.toUpperCase()}
                            </span>
                          </div>
                          <div className="flex items-center space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m8 0V8a2 2 0 01-2 2H8a2 2 0 01-2-2V6m8 0H8m0 0V4" />
                            </svg>
                            <span>{assignment.type || 'Sales Support'} Assignment</span>
                          </div>
                        </div>
                      </div>

                      <p className="text-gray-700 dark:text-gray-300 mb-4 leading-relaxed text-sm">{assignment.description}</p>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-100 dark:border-blue-800">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                            </svg>
                            <span className="text-xs font-medium text-blue-700 dark:text-blue-300 uppercase tracking-wider">Product</span>
                          </div>
                          <p className="text-sm font-semibold text-blue-900 dark:text-blue-100 mt-1">{assignment.product || 'N/A'}</p>
                        </div>

                        <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-3 border border-green-100 dark:border-green-800">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                            </svg>
                            <span className="text-xs font-medium text-green-700 dark:text-green-300 uppercase tracking-wider">Target</span>
                          </div>
                          <p className="text-sm font-semibold text-green-900 dark:text-green-100 mt-1">TZS {Math.round((assignment.productPrice || 0) / 1000)}K</p>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3 border border-purple-100 dark:border-purple-800">
                          <div className="flex items-center space-x-2">
                            <svg className="w-4 h-4 text-purple-600 dark:text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" />
                            </svg>
                            <span className="text-xs font-medium text-purple-700 dark:text-purple-300 uppercase tracking-wider">Commission</span>
                          </div>
                          <p className="text-sm font-semibold text-purple-900 dark:text-purple-100 mt-1">TZS {Math.round((assignment.earnings || 0) / 1000)}K</p>
                        </div>
                      </div>
                    </div>

                    <div className="ml-6 flex flex-col space-y-3">
                      <button
                        onClick={() => handleStartAssignment(assignment.id)}
                        className="px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl text-sm hover:from-blue-700 hover:to-blue-800 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                      >
                        Start Assignment
                      </button>
                      <button className="px-6 py-3 border-2 border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-xl text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all duration-200 font-medium hover:border-gray-400 dark:hover:border-gray-500">
                        View Details
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recently Completed */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recently Completed Assignments</h3>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">Your successful sales support history</p>
        </div>
        <div className="p-6">
          {completedAssignments.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400 text-sm">No completed assignments yet.</p>
              <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">Complete your first assignment to see your history here.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {completedAssignments.map((assignment: any) => (
                <div key={assignment.id} className="bg-green-50 dark:bg-green-900/10 rounded-md p-4 border border-green-200 dark:border-green-800">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-3">
                        <div className="w-10 h-10 bg-green-600 rounded-md flex items-center justify-center">
                          <span className="text-white font-bold text-sm">✓</span>
                        </div>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-white">{assignment.sellerName}</h4>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {assignment.assignmentType?.replace('-', ' ') || 'Sales Support'} Assignment
                          </p>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div className="space-y-1">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Sales Achievement</p>
                          <p className="font-medium text-gray-900 dark:text-white">
                            TZS {(assignment.salesAchieved || 0).toLocaleString()} / TZS {(assignment.targetSales || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-green-600">
                            {assignment.successRate} success rate
                          </p>
                        </div>
                        <div className="space-y-1 text-right md:text-left">
                          <p className="text-xs text-gray-500 dark:text-gray-400">Earnings</p>
                          <p className="text-lg font-bold text-green-600">
                            TZS {(assignment.earnings || 0).toLocaleString()}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Completed {assignment.completedAt}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
