import { ReactNode } from 'react';
import { getSupplier, hasPermission, TIER_INFO } from '@/lib/permissions';

interface SupplierLayoutProps {
  children: ReactNode;
}

export default function SupplierLayout({ children }: SupplierLayoutProps) {
  const supplier = getSupplier();
  const tierInfo = TIER_INFO[supplier.tier];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Supplier Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Maysar Supplier Console
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
                <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
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
        <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="p-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Supply Hub
            </h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="/supplier/dashboard"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="/supplier/supply-catalog"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Supply Catalog
                </a>
              </li>
              <li>
                <a
                  href="/supplier/purchase-orders"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Purchase Orders
                </a>
              </li>
              <li>
                <a
                  href="/supplier/raw-materials"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Raw Materials & Stock
                </a>
              </li>
              <li>
                <a
                  href="/supplier/production"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Production & Manufacturing
                </a>
              </li>
              {hasPermission(supplier.tier, 'pricing', 'contract') && (
                <li>
                  <a
                    href="/supplier/wholesale-pricing"
                    className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Wholesale Pricing
                  </a>
                </li>
              )}
              {hasPermission(supplier.tier, 'analytics', 'advanced') && (
                <li>
                  <a
                    href="/supplier/supply-analytics"
                    className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Supply Chain Analytics
                  </a>
                </li>
              )}
              <li>
                <a
                  href="/supplier/bulk-fulfillment"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Bulk Fulfillment
                </a>
              </li>
              <li>
                <a
                  href="/supplier/wholesale-payments"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Wholesale Payments
                </a>
              </li>
              <li>
                <a
                  href="/supplier/quality"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Quality & Performance
                </a>
              </li>
              {hasPermission(supplier.tier, 'integration', 'api') && (
                <li>
                  <a
                    href="/supplier/integrations"
                    className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    API & Integrations
                  </a>
                </li>
              )}
              <li>
                <a
                  href="/supplier/kyc"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  KYC Verification
                </a>
              </li>
              <li>
                <a
                  href="/supplier/settings"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Settings
                </a>
              </li>
              <li>
                <a
                  href="/supplier/support"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
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