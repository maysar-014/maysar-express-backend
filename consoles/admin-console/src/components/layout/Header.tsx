// Professional Header Component for Maysar Admin Console
// Global search, notifications, user menu, and mobile navigation

import React, { useState } from 'react';
import {
  BellIcon,
  MagnifyingGlassIcon,
  Bars3Icon,
  UserCircleIcon,
  CogIcon,
  ArrowRightOnRectangleIcon,
  MoonIcon,
  SunIcon,
} from '@heroicons/react/24/outline';
import { Menu, MenuButton, MenuItems, MenuItem, MenuSeparator } from '@headlessui/react';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onMenuClick?: () => void;
}

export function Header({ onMenuClick }: HeaderProps) {
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [notifications] = useState([
    {
      id: 1,
      title: 'Low stock alert',
      message: 'Product XYZ is running low',
      time: '2 minutes ago',
      unread: true,
      type: 'warning'
    },
    {
      id: 2,
      title: 'New order received',
      message: 'Order #12345 needs processing',
      time: '5 minutes ago',
      unread: true,
      type: 'info'
    },
    {
      id: 3,
      title: 'Payment failed',
      message: 'Payment for order #12344 failed',
      time: '1 hour ago',
      unread: false,
      type: 'error'
    }
  ]);

  const unreadCount = notifications.filter(n => n.unread).length;

  const toggleTheme = () => {
    setIsDarkMode(!isDarkMode);
    // In a real app, you'd update the theme context here
    document.documentElement.classList.toggle('dark');
  };

  return (
    <header className="bg-white dark:bg-gray-800 shadow-sm border-b border-gray-200 dark:border-gray-700">
      <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left side - Mobile menu button and breadcrumbs */}
        <div className="flex items-center space-x-4">
          {/* Mobile menu button */}
          <button
            onClick={onMenuClick}
            className="lg:hidden rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
          >
            <Bars3Icon className="h-6 w-6" />
          </button>

          {/* Breadcrumbs could go here */}
          <div className="hidden sm:block">
            <nav className="flex" aria-label="Breadcrumb">
              <ol className="flex items-center space-x-2">
                <li>
                  <div className="text-sm text-gray-500 dark:text-gray-400">
                    Maysar Admin
                  </div>
                </li>
              </ol>
            </nav>
          </div>
        </div>

        {/* Center - Global Search */}
        <div className="flex-1 max-w-2xl mx-4 lg:mx-8">
          <div className="relative">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
            <input
              type="search"
              placeholder="Search orders, users, products..."
              className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:placeholder-gray-400 dark:focus:border-blue-400"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              <kbd className="hidden sm:inline-block pointer-events-none rounded border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-xs font-medium text-gray-500 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-400">
                ⌘K
              </kbd>
            </div>
          </div>
        </div>

        {/* Right side - Actions */}
        <div className="flex items-center space-x-4">
          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700"
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {isDarkMode ? (
              <SunIcon className="h-5 w-5" />
            ) : (
              <MoonIcon className="h-5 w-5" />
            )}
          </button>

          {/* Notifications */}
          <Menu as="div" className="relative">
            <MenuButton className="relative rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700">
              <BellIcon className="h-6 w-6" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-red-500 text-xs text-white flex items-center justify-center font-medium">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </MenuButton>

            <MenuItems className="absolute right-0 z-10 mt-2 w-80 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 dark:ring-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <h3 className="text-sm font-medium text-gray-900 dark:text-white">
                  Notifications
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  You have {unreadCount} unread notifications
                </p>
              </div>

              <div className="max-h-64 overflow-y-auto">
                {notifications.map((notification) => (
                  <MenuItem key={notification.id}>
                    {({ active }) => (
                      <div className={cn(
                        "px-4 py-3 cursor-pointer border-b border-gray-100 last:border-b-0 dark:border-gray-700",
                        active && "bg-gray-50 dark:bg-gray-700",
                        notification.unread && "bg-blue-50 dark:bg-blue-900/20"
                      )}>
                        <div className="flex items-start space-x-3">
                          <div className={cn(
                            "flex-shrink-0 w-2 h-2 rounded-full mt-2",
                            notification.type === 'warning' && "bg-yellow-400",
                            notification.type === 'error' && "bg-red-400",
                            notification.type === 'info' && "bg-blue-400"
                          )} />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                              {notification.title}
                            </p>
                            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                              {notification.message}
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {notification.time}
                            </p>
                          </div>
                        </div>
                      </div>
                    )}
                  </MenuItem>
                ))}
              </div>

              <div className="px-4 py-2 border-t border-gray-200 dark:border-gray-700">
                <button className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400">
                  View all notifications →
                </button>
              </div>
            </MenuItems>
          </Menu>

          {/* User Menu */}
          <Menu as="div" className="relative">
            <MenuButton className="flex items-center space-x-3 rounded-full p-2 hover:bg-gray-100 dark:hover:bg-gray-700">
              <UserCircleIcon className="h-8 w-8 text-gray-400" />
              <div className="hidden md:block text-left">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  Admin User
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  Administrator
                </div>
              </div>
            </MenuButton>

            <MenuItems className="absolute right-0 z-10 mt-2 w-56 origin-top-right rounded-lg bg-white py-1 shadow-lg ring-1 ring-black ring-opacity-5 dark:bg-gray-800 dark:ring-gray-700">
              <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
                <div className="flex items-center space-x-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                      A
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      Admin User
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      admin@maysar.com
                    </div>
                  </div>
                </div>
              </div>

              <MenuItem>
                {({ active }) => (
                  <a
                    href="#"
                    className={cn(
                      "flex items-center px-4 py-2 text-sm",
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    )}
                  >
                    <UserCircleIcon className="mr-3 h-4 w-4" />
                    Profile Settings
                  </a>
                )}
              </MenuItem>

              <MenuItem>
                {({ active }) => (
                  <a
                    href="#"
                    className={cn(
                      "flex items-center px-4 py-2 text-sm",
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    )}
                  >
                    <CogIcon className="mr-3 h-4 w-4" />
                    Preferences
                  </a>
                )}
              </MenuItem>

              <MenuSeparator />

              <MenuItem>
                {({ active }) => (
                  <button
                    className={cn(
                      "flex w-full items-center px-4 py-2 text-sm text-red-600 dark:text-red-400",
                      active ? 'bg-gray-100 dark:bg-gray-700' : ''
                    )}
                  >
                    <ArrowRightOnRectangleIcon className="mr-3 h-4 w-4" />
                    Sign Out
                  </button>
                )}
              </MenuItem>
            </MenuItems>
          </Menu>
        </div>
      </div>
    </header>
  );
}
