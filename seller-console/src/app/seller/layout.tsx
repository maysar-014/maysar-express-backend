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
                <Link
                  href="/seller/dashboard"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/dashboard')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Dashboard
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/products"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/products')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Product Catalog
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/inventory"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/inventory')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Inventory Management
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/orders"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/orders')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Customer Orders
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/customers"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/customers')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Customer Management
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/reviews"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/reviews')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Reviews & Ratings
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/shipping"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/shipping')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Shipping & Fulfillment
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/sales-analytics"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/sales-analytics')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Sales Analytics
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/enablers"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/enablers')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Request Enablers
                </Link>
              </li>
              {hasPermission(seller.tier, 'promotions') && (
                <li>
                  <Link
                    href="/seller/promotions"
                    className={`block px-3 py-2 text-sm rounded-md ${
                      isActive('/seller/promotions')
                        ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                    }`}
                  >
                    Promotions
                  </Link>
                </li>
              )}
              <li>
                <Link
                  href="/seller/payments"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/payments')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Payments & Payouts
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/kyc"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/kyc')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  KYC Verification
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/settings"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/settings')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                  }`}
                >
                  Settings
                </Link>
              </li>
              <li>
                <Link
                  href="/seller/support"
                  className={`block px-3 py-2 text-sm rounded-md ${
                    isActive('/seller/support')
                      ? 'bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
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