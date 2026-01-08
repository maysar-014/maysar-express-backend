'use client';

import { ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { getSeller, hasPermission, TIER_INFO } from '@/lib/permissions';

interface SellerLayoutProps {
  children: ReactNode;
}

export default function SellerLayout({ children }: SellerLayoutProps) {
  const seller = getSeller();
  const tierInfo = TIER_INFO[seller.tier];
  const pathname = usePathname();

  const isActive = (path: string) => pathname === path;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Modern Header */}
      <header className="bg-gradient-to-r from-gray-800 via-gray-900 to-black shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">
                    Maysar Seller
                  </h1>
                  <p className="text-xs text-gray-300 opacity-90">
                    Digital Trade Network
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
                    {seller.businessName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-white">
                    {seller.businessName}
                  </p>
                  <p className="text-xs text-gray-300 opacity-90">
                    Seller Account
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
        {/* Seller Sidebar */}
        <nav className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 flex-shrink-0 sticky top-0 h-screen overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-blue-500/30 hover:[&::-webkit-scrollbar-thumb]:bg-blue-400/50">
          <div className="p-4">
            <h2 className="text-lg font-medium text-white mb-4">
              Seller Hub
            </h2>
            <ul className="space-y-2">
              {/* Core Business */}
              <li>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Core Business
                </h3>
              </li>
              <li>
                <Link
                  href="/seller/dashboard"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/dashboard')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/products"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/products')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Product Catalog
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/inventory"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/inventory')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Inventory Management
                </Link>
              </li>

              {/* Order Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Order Management
                </h3>
              </li>
              <li>
                <Link
                  href="/seller/orders"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/orders')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Customer Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/sales-analytics"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/sales-analytics')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Sales Analytics
                </Link>
              </li>

              {/* Customer Relations */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Customer Relations
                </h3>
              </li>
              <li>
                <Link
                  href="/seller/customers"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/customers')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Customer Management
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/reviews"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/reviews')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Reviews & Ratings
                </Link>
              </li>

              {/* Growth & Marketing */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Growth & Marketing
                </h3>
              </li>
              <li>
                <Link
                  href="/seller/sales-analytics"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/sales-analytics')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Sales Analytics
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/enablers"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/enablers')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Enabler Support
                </Link>
              </li>
              {hasPermission(seller.tier, 'promotions') && (
                <li>
                  <Link
                    href="/seller/promotions"
                    className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                      isActive('/seller/promotions')
                        ? 'bg-blue-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    Promotions
                  </Link>
                </li>
              )}

              {/* Financial Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Financial Management
                </h3>
              </li>
              <li>
                <Link
                  href="/seller/payments"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/payments')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Payment Records
                </Link>
              </li>

              {/* Account Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Account Management
                </h3>
              </li>
              <li>
                <Link
                  href="/seller/kyc"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/kyc')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  KYC Verification
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/settings"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/settings')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Settings
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/support"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    isActive('/seller/support')
                      ? 'bg-blue-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Support
                </Link>
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
