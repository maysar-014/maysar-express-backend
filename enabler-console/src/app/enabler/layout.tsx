'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { getEnabler, hasPermission, TIER_INFO } from '@/lib/permissions';

interface EnablerLayoutProps {
  children: ReactNode;
}

export default function EnablerLayout({ children }: EnablerLayoutProps) {
  const [queryClient] = useState(() => new QueryClient());
  const enabler = getEnabler();
  const tierInfo = TIER_INFO[enabler.tier];

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Enabler Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Maysar Enabler Console
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-4 py-2 rounded-lg text-sm font-medium ${tierInfo.color} border border-opacity-20`}>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-current rounded-full"></div>
                  <span>{tierInfo.name}</span>
                </div>
              </div>
              <div className="flex items-center space-x-2 bg-gray-100 dark:bg-gray-700 px-3 py-2 rounded-lg">
                <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {enabler.name.split(' ').map(n => n[0]).join('')}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {enabler.name}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Enabler Sidebar */}
        <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="p-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Enabler Hub
            </h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="/enabler/dashboard"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="/enabler/tasks"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Tasks Hub
                </a>
              </li>
              <li>
                <a
                  href="/enabler/tasks"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Task Queue
                </a>
              </li>
              <li>
                <a
                  href="/enabler/earnings"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Earnings Wallet
                </a>
              </li>
              <li>
                <a
                  href="/enabler/performance"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Performance
                </a>
              </li>
              <li>
                <a
                  href="/enabler/training"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Training Center
                </a>
              </li>
              <li>
                <a
                  href="/enabler/kyc"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  KYC Verification
                </a>
              </li>
              <li>
                <a
                  href="/enabler/settings"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Settings
                </a>
              </li>
              
              {/* Core Enabler Functions */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Core Functions
                </h3>
              </li>
              <li>
                <a
                  href="/enabler/logistics"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Logistics Support
                </a>
              </li>
              <li>
                <a
                  href="/enabler/sales-support"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Sales Support
                </a>
              </li>
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
    </QueryClientProvider>
  );
}