'use client';

import { useState, useEffect } from 'react';

export default function IssueReportingPage() {
  const [selectedIssue, setSelectedIssue] = useState<string | null>(null);
  const [reported, setReported] = useState(false);

  const issueTypes = [
    {
      id: 'customer_unavailable',
      title: 'Customer Not Available',
      description: 'Recipient is not present at delivery location'
    },
    {
      id: 'package_heavy',
      title: 'Package Heavier Than Declared',
      description: 'Item weight exceeds stated specifications'
    },
    {
      id: 'unsafe_location',
      title: 'Unsafe Location',
      description: 'Delivery area poses safety concerns'
    },
    {
      id: 'traffic_blockage',
      title: 'Traffic Blockage',
      description: 'Road conditions prevent access'
    },
    {
      id: 'vehicle_problem',
      title: 'Vehicle Problem',
      description: 'Vehicle issue affecting delivery capability'
    }
  ];

  const handleReportIssue = async (issueId: string) => {
    try {
      setSelectedIssue(issueId);
      setReported(true);
      // TODO: Implement API call
      // await courierApi.reportIssue({ type: issueId });

      // Auto-clear after 3 seconds
      setTimeout(() => {
        setSelectedIssue(null);
        setReported(false);
      }, 3000);
    } catch (err) {
      console.error('Failed to report issue:', err);
      setReported(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Issue Reporting</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            Report issues early to enable algorithm-driven resolution
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Algorithm-governed early warning system
        </div>
      </div>

      {/* Issue Types Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {issueTypes.map((issue) => (
          <div
            key={issue.id}
            className={`bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4 cursor-pointer transition-all ${
              selectedIssue === issue.id && reported
                ? 'ring-2 ring-green-500 bg-green-50 dark:bg-green-900/10'
                : 'hover:shadow-md hover:border-gray-300 dark:hover:border-gray-600'
            }`}
            onClick={() => handleReportIssue(issue.id)}
          >
            <div className="flex items-start space-x-3">
              <div className="flex-1">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
                  {issue.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                  {issue.description}
                </p>
                <button
                  className={`w-full px-3 py-2 text-xs font-medium rounded-md transition-colors ${
                    selectedIssue === issue.id && reported
                      ? 'bg-green-600 text-white'
                      : 'bg-orange-600 text-white hover:bg-orange-700'
                  }`}
                  disabled={reported}
                >
                  {selectedIssue === issue.id && reported ? 'Reported' : 'Report Issue'}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Algorithm Feedback */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-4">
        <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-2">
          Maysar Response
        </h3>
        <p className="text-xs text-blue-800 dark:text-blue-200">
          Issues reported here trigger automatic resolution workflows. No explanations needed - structured reporting enables faster, more accurate responses.
        </p>
      </div>

      {/* Recent Reports */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Recent Reports</h2>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex items-center space-x-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">Traffic Blockage</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">2 hours ago • Auto-resolved</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 rounded-full">
                Resolved
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className="flex items-center space-x-2">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white uppercase tracking-wider">Customer Not Available</p>
                  <p className="text-xs text-gray-600 dark:text-gray-400">1 day ago • Reassigned</p>
                </div>
              </div>
              <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 rounded-full">
                Reassigned
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
