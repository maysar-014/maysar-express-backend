'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { getSupplier, hasPermission, TIER_INFO } from '@/lib/permissions';

interface SupplierLayoutProps {
  children: ReactNode;
}

export default function SupplierLayout({ children }: SupplierLayoutProps) {
  const pathname = usePathname();
  const supplier = getSupplier();
  const tierInfo = TIER_INFO[supplier.tier];

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Clean Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Maysar Supplier
              </h1>
            </div>
            <div className="flex items-center space-x-4">
              <div className={`px-3 py-1 rounded-full text-sm font-medium ${tierInfo.color}`}>
                {tierInfo.name}
              </div>
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 bg-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                  {supplier.companyName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {supplier.companyName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Supplier Sidebar */}
        <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0 sticky top-0 h-screen overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-purple-500/30 hover:[&::-webkit-scrollbar-thumb]:bg-purple-400/50">
          <div className="p-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Supply Hub
            </h2>
            <ul className="space-y-2">
              {/* Core Operations */}
              <li>
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Core Operations
                </h3>
              </li>
              <li>
                <a
                  href="/supplier/dashboard"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/dashboard')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="/supplier/supply-catalog"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/supply-catalog')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Supply Catalog
                </a>
              </li>
              <li>
                <a
                  href="/supplier/purchase-orders"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/purchase-orders')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Purchase Orders
                </a>
              </li>
              
              {/* Production Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Production Management
                </h3>
              </li>
              <li>
                <a
                  href="/supplier/raw-materials"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/raw-materials')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Raw Materials & Stock
                </a>
              </li>
              <li>
                <a
                  href="/supplier/production"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/production')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Production & Manufacturing
                </a>
              </li>
              <li>
                <a
                  href="/supplier/quality"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/quality')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Quality & Performance
                </a>
              </li>
              
              {/* Business Operations */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Business Operations
                </h3>
              </li>
              {hasPermission(supplier.tier, 'pricing', 'contract') && (
                <li>
                  <a
                    href="/supplier/wholesale-pricing"
                    className={`block px-3 py-2 text-sm rounded-md ${
                      isActive('/supplier/wholesale-pricing')
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Wholesale Pricing
                  </a>
                </li>
              )}
              <li>
                <a
                  href="/supplier/bulk-fulfillment"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/bulk-fulfillment')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Bulk Fulfillment
                </a>
              </li>
              
              {/* Analytics & Integration */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Analytics & Integration
                </h3>
              </li>
              {hasPermission(supplier.tier, 'analytics', 'advanced') && (
                <li>
                  <a
                    href="/supplier/supply-analytics"
                    className={`block px-3 py-2 text-sm rounded-md ${
                      isActive('/supplier/supply-analytics')
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Supply Chain Analytics
                  </a>
                </li>
              )}
              {hasPermission(supplier.tier, 'integration', 'api') && (
                <li>
                  <a
                    href="/supplier/integrations"
                    className={`block px-3 py-2 text-sm rounded-md ${
                      isActive('/supplier/integrations')
                        ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    API & Integrations
                  </a>
                </li>
              )}
              
              {/* Financial Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Financial Management
                </h3>
              </li>
              <li>
                <a
                  href="/supplier/wholesale-payments"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/wholesale-payments')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Wholesale Payments
                </a>
              </li>
              
              {/* Account Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">
                  Account Management
                </h3>
              </li>
              <li>
                <a
                  href="/supplier/kyc"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/kyc')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  KYC Verification
                </a>
              </li>
              <li>
                <a
                  href="/supplier/settings"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/settings')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Settings
                </a>
              </li>
              <li>
                <a
                  href="/supplier/support"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/supplier/support')
                      ? 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 font-medium'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Support
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
  );
}