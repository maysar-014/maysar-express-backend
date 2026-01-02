'use client';

import { 
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  ClockIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function TrustReportsContent() {
  const trustCases = [
    {
      id: 'TR-001',
      caseType: 'suspicious-transaction',
      priority: 'high',
      status: 'pending',
      estimatedEarnings: 40.00,
      description: 'Multiple high-value transactions from new buyer account',
      riskScore: 85
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Trust & Fraud Reports</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Investigate suspicious activities and protect platform integrity
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-red-100 dark:bg-red-900/20 px-3 py-1 rounded-full text-red-800 dark:text-red-300 text-sm font-medium">
            {trustCases.length} Pending Cases
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Cases</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{trustCases.length}</p>
            </div>
            <ShieldCheckIcon className="h-8 w-8 text-red-500" />
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Active Trust & Safety Cases</h3>
        <div className="space-y-4">
          {trustCases.map((case_) => (
            <div key={case_.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-12 h-12 bg-red-100 dark:bg-red-900/20 rounded-lg flex items-center justify-center">
                    <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                      {case_.id}
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400">{case_.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-600">KES {case_.estimatedEarnings}</p>
                  <button className="mt-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm">
                    Start Investigation
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}