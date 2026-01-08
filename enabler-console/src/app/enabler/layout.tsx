'use client';

import { ReactNode } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { usePathname } from 'next/navigation';
import { getEnabler, hasPermission, TIER_INFO } from '@/lib/permissions';

interface EnablerLayoutProps {
  children: ReactNode;
}

export default function EnablerLayout({ children }: EnablerLayoutProps) {
  const [queryClient] = useState(() => new QueryClient());
  const pathname = usePathname();
  const enabler = getEnabler();
  const tierInfo = TIER_INFO[enabler.tier];

  const isActive = (path: string) => pathname === path;

  return (
    <QueryClientProvider client={queryClient}>
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Header */}
      <header className="bg-gradient-to-r from-gray-800 via-gray-900 to-black shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">
                    Maysar Enabler
                  </h1>
                  <p className="text-xs text-gray-300 opacity-90">
                    Sales Excellence Platform
                  </p>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Tier Badge */}
              <div className="px-3 py-1 rounded-full text-xs font-semibold text-white border border-gray-600 bg-gray-700">
                {tierInfo.name}
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center border border-gray-600">
                  <span className="text-white font-semibold text-sm">
                    {enabler.name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-white">
                    {enabler.name}
                  </p>
                  <p className="text-xs text-gray-300 opacity-90">
                    Enabler Account
                  </p>
                </div>
                <button className="p-1 text-white hover:bg-gray-700 rounded-md transition-colors">
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Enabler Sidebar */}
        <nav className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 flex-shrink-0 sticky top-0 h-screen overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-green-500/30 hover:[&::-webkit-scrollbar-thumb]:bg-green-400/50">
          <div className="p-4">
            <h2 className="text-lg font-medium text-white mb-4">
              Enabler Hub
            </h2>
            <ul className="space-y-2">
              {/* Shop Section - Top Priority */}
              <li>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Marketplace
                </h3>
              </li>
              <li>
                <a
                  href="/enabler/shop"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/enabler/shop')
                      ? 'bg-green-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  My Shop
                </a>
              </li>

              {/* Core Functions */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Core Functions
                </h3>
              </li>
              <li>
                <a
                  href="/enabler/dashboard"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/enabler/dashboard')
                      ? 'bg-green-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="/enabler/sales-support"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/enabler/sales-support')
                      ? 'bg-green-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Sales Support
                </a>
              </li>
              <li>
                <a
                  href="/enabler/tasks"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/enabler/tasks')
                      ? 'bg-green-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Tasks Hub
                </a>
              </li>

              {/* Performance & Growth */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Performance & Growth
                </h3>
              </li>
              <li>
                <a
                  href="/enabler/earnings"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/enabler/earnings')
                      ? 'bg-green-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Earnings History
                </a>
              </li>
              <li>
                <a
                  href="/enabler/performance"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/enabler/performance')
                      ? 'bg-green-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Performance
                </a>
              </li>
              <li>
                <a
                  href="/enabler/training"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/enabler/training')
                      ? 'bg-green-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Training Center
                </a>
              </li>

              {/* Account Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Account Management
                </h3>
              </li>
              <li>
                <a
                  href="/enabler/kyc"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/enabler/kyc')
                      ? 'bg-green-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  KYC Verification
                </a>
              </li>
              <li>
                <a
                  href="/enabler/settings"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/enabler/settings')
                      ? 'bg-green-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Settings
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
