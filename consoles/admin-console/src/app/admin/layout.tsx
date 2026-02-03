'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';

interface AdminLayoutProps {
  children: ReactNode;
}

function AdminLayoutContent({ children }: AdminLayoutProps) {
  const pathname = usePathname();
  const { theme } = useTheme();

  const navItems = [
    { href: '/admin', label: 'Dashboard' },
    { href: '/admin/admins', label: 'Admin Users' },
    { href: '/admin/users', label: 'Platform Users' },
    { href: '/admin/sellers', label: 'Sellers' },
    { href: '/admin/enablers', label: 'Enablers' },
    { href: '/admin/suppliers', label: 'Suppliers' },
    { href: '/admin/finance', label: 'Finance' },
    { href: '/admin/kyc', label: 'KYC Management' },
    { href: '/admin/compliance', label: 'Compliance' },
    { href: '/admin/audit', label: 'Audit Logs' },
    { href: '/admin/system', label: 'System Config' },
  ];

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      theme === 'light'
        ? 'bg-gray-50 text-gray-900'
        : theme === 'dark'
        ? 'bg-gray-900 text-white'
        : 'bg-gradient-to-br from-yellow-50 to-orange-50 text-gray-900'
    }`}>
      {/* Modern Header */}
      <header className="bg-gradient-to-r from-gray-800 via-gray-900 to-black shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            {/* Logo and Brand */}
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 bg-red-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">
                    Maysar Admin
                  </h1>
                  <p className="text-xs text-gray-300 opacity-90">
                    Platform Management
                  </p>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Admin Badge */}
              <div className="px-3 py-1 rounded-full text-xs font-semibold text-white border border-gray-600 bg-gray-700">
                Super Admin
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center border border-gray-600">
                  <span className="text-white font-semibold text-sm">
                    SA
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-white">
                    System Admin
                  </p>
                  <p className="text-xs text-gray-300 opacity-90">
                    Administrator
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
        {/* Fixed Admin Sidebar */}
        <nav className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 flex-shrink-0 sticky top-0 h-screen overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-red-500/30 hover:[&::-webkit-scrollbar-thumb]:bg-red-400/50">
          <div className="p-4">
            <h2 className="text-lg font-medium text-white mb-4">
              Admin Panel
            </h2>
            <ul className="space-y-2">
              {/* Platform Overview */}
              <li>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Platform Overview
                </h3>
              </li>
              <li>
                <Link
                  href="/admin"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Dashboard
                </Link>
              </li>

              {/* User Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  User Management
                </h3>
              </li>
              <li>
                <Link
                  href="/admin/admins"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/admins'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Admin Users
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/users"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/users'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Platform Users
                </Link>
              </li>

              {/* Business Partners */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Business Partners
                </h3>
              </li>
              <li>
                <Link
                  href="/admin/sellers"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/sellers'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Sellers
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/enablers"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/enablers'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Enablers
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/suppliers"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/suppliers'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Suppliers
                </Link>
              </li>

              {/* Operations & Logistics */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Operations & Logistics
                </h3>
              </li>
              <li>
                <Link
                  href="/admin/finance"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/finance'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Finance
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/shipping"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/shipping'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Shipping & Fulfillment
                </Link>
              </li>

              {/* Compliance & Security */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Compliance & Security
                </h3>
              </li>
              <li>
                <Link
                  href="/admin/kyc"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/kyc'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  KYC Management
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/compliance"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/compliance'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Compliance
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/audit"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/audit'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Audit Logs
                </Link>
              </li>

              {/* System Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  System Management
                </h3>
              </li>
              <li>
                <Link
                  href="/admin/system"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/system'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  System Config
                </Link>
              </li>
              <li>
                <Link
                  href="/admin/settings"
                  className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                    pathname === '/admin/settings'
                      ? 'bg-red-600 text-white font-medium'
                      : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                  }`}
                >
                  Settings
                </Link>
              </li>
            </ul>
          </div>
        </nav>

        {/* Scrollable Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-8 max-w-none">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function AdminLayout({ children }: AdminLayoutProps) {
  return <AdminLayoutContent>{children}</AdminLayoutContent>;
}
