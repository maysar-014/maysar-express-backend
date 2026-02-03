// Professional Sidebar Component for Maysar Admin Console
// Enterprise navigation with role-based menu items and responsive design

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  HomeIcon,
  ShoppingBagIcon,
  CubeIcon,
  UsersIcon,
  CurrencyDollarIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  ChartBarIcon,
  CogIcon,
  DocumentTextIcon,
  XMarkIcon,
} from '@heroicons/react/24/outline';
import { cn } from '@/lib/utils';

// Navigation configuration with role-based access
const navigation = [
  {
    name: 'Dashboard',
    href: '/',
    icon: HomeIcon,
    description: 'Real-time operational overview',
    roles: ['admin', 'manager', 'support']
  },
  {
    name: 'Orders',
    href: '/orders',
    icon: ShoppingBagIcon,
    description: 'Order management & tracking',
    roles: ['admin', 'manager', 'support'],
    badge: 'priority'
  },
  {
    name: 'Inventory',
    href: '/inventory',
    icon: CubeIcon,
    description: 'Stock levels & warehouse management',
    roles: ['admin', 'manager', 'inventory'],
    badge: 'alerts'
  },
  {
    name: 'Users',
    href: '/users',
    icon: UsersIcon,
    description: 'Customer account management',
    roles: ['admin', 'manager', 'support']
  },
  {
    name: 'Sellers',
    href: '/sellers',
    icon: UsersIcon,
    description: 'Seller verification & management',
    roles: ['admin', 'manager', 'compliance'],
    badge: 'pending'
  },
  {
    name: 'Finance',
    href: '/finance',
    icon: CurrencyDollarIcon,
    description: 'Revenue, payouts & transactions',
    roles: ['admin', 'finance', 'manager']
  },
  {
    name: 'Disputes',
    href: '/disputes',
    icon: ShieldCheckIcon,
    description: 'Customer dispute resolution',
    roles: ['admin', 'support', 'compliance'],
    badge: 'urgent'
  },
  {
    name: 'Fraud',
    href: '/fraud',
    icon: ShieldExclamationIcon,
    description: 'Fraud detection & monitoring',
    roles: ['admin', 'compliance', 'security'],
    badge: 'alerts'
  },
  {
    name: 'Analytics',
    href: '/analytics',
    icon: ChartBarIcon,
    description: 'Business intelligence & reporting',
    roles: ['admin', 'manager', 'analyst']
  },
  {
    name: 'System',
    href: '/system',
    icon: CogIcon,
    description: 'System health & monitoring',
    roles: ['admin', 'devops']
  },
  {
    name: 'Audit',
    href: '/audit',
    icon: DocumentTextIcon,
    description: 'Compliance logs & audit trails',
    roles: ['admin', 'compliance', 'auditor']
  },
];

interface SidebarProps {
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ isOpen = true, onClose }: SidebarProps) {
  const pathname = usePathname();

  // Mock user role for demonstration
  const userRole = 'admin';

  // Filter navigation based on user role
  const filteredNavigation = navigation.filter(item =>
    item.roles.includes(userRole)
  );

  const sidebarContent = (
    <div className="flex h-full flex-col bg-white dark:bg-gray-800 shadow-xl">
      {/* Logo and Close Button */}
      <div className="flex h-16 shrink-0 items-center justify-between px-6 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <span className="text-sm font-bold text-white">M</span>
          </div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">
            Maysar
          </h1>
        </div>

        {/* Mobile close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden rounded-md p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <XMarkIcon className="h-6 w-6" />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-4 py-6">
        <ul className="space-y-2">
          {filteredNavigation.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;

            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onClose}
                  className={cn(
                    "group flex items-center rounded-lg px-3 py-3 text-sm font-medium transition-all duration-200",
                    isActive
                      ? "bg-blue-50 text-blue-700 shadow-sm dark:bg-blue-900/50 dark:text-blue-200"
                      : "text-gray-700 hover:bg-gray-50 hover:text-gray-900 dark:text-gray-300 dark:hover:bg-gray-700 dark:hover:text-white"
                  )}
                >
                  <Icon className={cn(
                    "mr-3 h-5 w-5 flex-shrink-0 transition-colors",
                    isActive
                      ? "text-blue-600 dark:text-blue-400"
                      : "text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-200"
                  )} />

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <span className="truncate">{item.name}</span>

                      {/* Badge for notifications/alerts */}
                      {item.badge && (
                        <span className={cn(
                          "ml-2 inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                          item.badge === 'urgent' && "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
                          item.badge === 'priority' && "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
                          item.badge === 'pending' && "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
                          item.badge === 'alerts' && "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200"
                        )}>
                          {item.badge === 'urgent' && '⚠️'}
                          {item.badge === 'priority' && '↑'}
                          {item.badge === 'pending' && '○'}
                          {item.badge === 'alerts' && '!'}
                        </span>
                      )}
                    </div>

                    <p className={cn(
                      "mt-0.5 text-xs truncate transition-colors",
                      isActive
                        ? "text-blue-600 dark:text-blue-300"
                        : "text-gray-500 group-hover:text-gray-600 dark:text-gray-400 dark:group-hover:text-gray-300"
                    )}>
                      {item.description}
                    </p>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>

        {/* Divider */}
        <div className="my-6 border-t border-gray-200 dark:border-gray-700" />

        {/* System Status */}
        <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700/50">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">
            System Status
          </h3>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">API Gateway</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Database</span>
              <span className="inline-flex items-center rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
                Healthy
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">Event Bus</span>
              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200">
                Degraded
              </span>
            </div>
          </div>
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-gray-200 p-4 dark:border-gray-700">
        <div className="flex items-center space-x-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
            <span className="text-xs font-medium text-gray-600 dark:text-gray-300">
              A
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate dark:text-white">
              Admin User
            </p>
            <p className="text-xs text-gray-500 truncate dark:text-gray-400">
              {userRole.charAt(0).toUpperCase() + userRole.slice(1)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar */}
      <div className={cn(
        "hidden lg:fixed lg:inset-y-0 lg:z-40 lg:flex lg:w-72 lg:flex-col lg:transition-transform lg:duration-300 lg:ease-in-out",
        !isOpen && "lg:-translate-x-full"
      )}>
        {sidebarContent}
      </div>

      {/* Mobile Sidebar Overlay */}
      {isOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={onClose} />
          <div className="fixed inset-y-0 left-0 flex w-full max-w-xs flex-col">
            {sidebarContent}
          </div>
        </div>
      )}
    </>
  );
}
