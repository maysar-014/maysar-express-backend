'use client';

import { ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTheme, ThemeProvider } from '@/lib/theme-context';

interface CourierLayoutProps {
  children: ReactNode;
}

function CourierLayoutContent({ children }: CourierLayoutProps) {
  const pathname = usePathname();
  const { theme, setTheme } = useTheme();

  const navItems = [
    { href: '/courier/dashboard', label: 'Dashboard' },
    { href: '/courier/deliveries', label: 'Active Deliveries' },
    { href: '/courier/routes', label: 'Route & Navigation' },
    { href: '/courier/issues', label: 'Issue Reporting' },
    { href: '/courier/vehicle', label: 'Vehicle Management' },
    { href: '/courier/performance', label: 'Performance & Behavior' },
    { href: '/courier/earnings', label: 'Earnings' },
    { href: '/courier/kyc', label: 'Account & KYC' },
    { href: '/courier/support', label: 'Support' },
    { href: '/courier/settings', label: 'Settings' },
    { href: '/courier/training', label: 'Training Modules' },
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
                <div className="w-8 h-8 bg-orange-600 rounded-lg flex items-center justify-center shadow-md">
                  <span className="text-white font-bold text-lg">M</span>
                </div>
                <div>
                  <h1 className="text-lg font-bold text-white">
                    Maysar Courier
                  </h1>
                  <p className="text-xs text-gray-300 opacity-90">
                    Logistics Execution Platform
                  </p>
                </div>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center space-x-4">
              {/* Status Badge */}
              <div className="px-3 py-1 rounded-full text-xs font-semibold text-white border border-gray-600 bg-gray-700">
                Active Courier
              </div>

              {/* User Menu */}
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 bg-gray-700 rounded-full flex items-center justify-center border border-gray-600">
                  <span className="text-white font-semibold text-sm">
                    JM
                  </span>
                </div>
                <div className="hidden md:block">
                  <p className="text-sm font-medium text-white">
                    Juma Mwalimu
                  </p>
                  <p className="text-xs text-gray-300 opacity-90">
                    Courier Account
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
        {/* Fixed Courier Sidebar */}
        <nav className="w-64 bg-gradient-to-b from-gray-800 to-gray-900 border-r border-gray-700 flex-shrink-0 sticky top-0 h-screen overflow-y-auto [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:bg-orange-500/30 hover:[&::-webkit-scrollbar-thumb]:bg-orange-400/50">
          <div className="p-4">
            <h2 className="text-lg font-medium text-white mb-4">
              Courier Hub
            </h2>
            <ul className="space-y-2">
              {/* Execution Core */}
              <li>
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Execution Core
                </h3>
              </li>
              {navItems.slice(0, 4).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                      pathname === item.href
                        ? 'bg-orange-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}

              {/* Operations Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Operations Management
                </h3>
              </li>
              {navItems.slice(4, 6).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                      pathname === item.href
                        ? 'bg-orange-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}

              {/* Financial Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Financial Management
                </h3>
              </li>
              {navItems.slice(6, 7).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                      pathname === item.href
                        ? 'bg-orange-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}

              {/* Account Management */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Account Management
                </h3>
              </li>
              {navItems.slice(7, 8).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                      pathname === item.href
                        ? 'bg-orange-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}

              {/* Additional Support */}
              <li className="pt-4">
                <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
                  Support & Resources
                </h3>
              </li>
              {navItems.slice(8).map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`block px-3 py-2 text-sm rounded-md transition-colors ${
                      pathname === item.href
                        ? 'bg-orange-600 text-white font-medium'
                        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
                    }`}
                  >
                    {item.label}
                  </Link>
                </li>
              ))}
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

export default function CourierLayout({ children }: CourierLayoutProps) {
  return (
    <ThemeProvider>
      <CourierLayoutContent>{children}</CourierLayoutContent>
    </ThemeProvider>
  );
}
