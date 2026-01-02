import { ReactNode } from 'react';
import { getSeller, hasPermission, TIER_INFO } from '@/lib/permissions';

interface SellerLayoutProps {
  children: ReactNode;
}

export default function SellerLayout({ children }: SellerLayoutProps) {
  const seller = getSeller();
  const tierInfo = TIER_INFO[seller.tier];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Seller Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center">
              <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
                Maysar Seller Console
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
                <div className="w-8 h-8 bg-gradient-to-br from-green-500 to-blue-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {seller.businessName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {seller.businessName}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="flex min-h-[calc(100vh-4rem)]">
        {/* Seller Sidebar */}
        <nav className="w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="p-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Seller Hub
            </h2>
            <ul className="space-y-2">
              <li>
                <a
                  href="/seller/dashboard"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Dashboard
                </a>
              </li>
              <li>
                <a
                  href="/seller/products"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Product Catalog
                </a>
              </li>
              <li>
                <a
                  href="/seller/inventory"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Inventory Management
                </a>
              </li>
              <li>
                <a
                  href="/seller/orders"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Customer Orders
                </a>
              </li>
              <li>
                <a
                  href="/seller/customers"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Customer Management
                </a>
              </li>
              <li>
                <a
                  href="/seller/reviews"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Reviews & Ratings
                </a>
              </li>
              <li>
                <a
                  href="/seller/shipping"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Shipping & Fulfillment
                </a>
              </li>
              <li>
                <a
                  href="/seller/sales-analytics"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Sales Analytics
                </a>
              </li>
              <li>
                <a
                  href="/seller/pricing"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Pricing & Discounts
                </a>
              </li>
              <li>
                <a
                  href="/seller/enablers"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Request Enablers
                </a>
              </li>
              {hasPermission(seller.tier, 'promotions') && (
                <li>
                  <a
                    href="/seller/promotions"
                    className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                  >
                    Promotions
                  </a>
                </li>
              )}
              <li>
                <a
                  href="/seller/payments"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Payments & Payouts
                </a>
              </li>
              <li>
                <a
                  href="/seller/kyc"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  KYC Verification
                </a>
              </li>
              <li>
                <a
                  href="/seller/settings"
                  className="block px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
                >
                  Settings
                </a>
              </li>
              <li>
                <a
                  href="/seller/support"
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