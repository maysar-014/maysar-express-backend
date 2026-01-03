"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function HomePage() {
  const router = useRouter();

  // Auto-redirect to admin dashboard after 3 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      router.push('/admin');
    }, 3000);

    return () => clearTimeout(timer);
  }, [router]);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
      <div className="max-w-md w-full bg-white dark:bg-gray-800 rounded-lg shadow-lg p-8 text-center">
        <div className="mb-6">
          <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl text-white">⚡</span>
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
            Maysar Admin Console
          </h1>
          <p className="text-gray-600 dark:text-gray-400">
            Enterprise E-Commerce Platform Administration
          </p>
        </div>

        <div className="space-y-4">
          <Link
            href="/admin"
            className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors duration-200"
          >
            Go to Admin Dashboard
          </Link>
          
          <div className="text-sm text-gray-500 dark:text-gray-400">
            Redirecting automatically in 3 seconds...
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
            <span>Platform Status: Online</span>
            <span>•</span>
            <span>Version 1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  );
}
