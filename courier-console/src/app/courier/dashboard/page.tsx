'use client';

import { useState, useEffect } from 'react';
import { courierApi } from '@/lib/api';

export default function CourierDashboard() {
  const [dashboardData, setDashboardData] = useState(null);
  const [criticalAlerts, setCriticalAlerts] = useState([]);
  const [courierStatus, setCourierStatus] = useState(null);

  useEffect(() => {
    const fetchDashboardData = async () => {
      const [dashData, alertsData, statusData] = await Promise.all([
        courierApi.getDashboard(),
        courierApi.getCriticalAlerts(),
        courierApi.getCourierStatus()
      ]);
      setDashboardData(dashData.data);
      setCriticalAlerts(alertsData.data || []);
      setCourierStatus(statusData.data);
    };
    fetchDashboardData();
  }, []);
  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Dashboard</h1>
        <div className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">
          Operational snapshot
        </div>
      </div>

      {/* Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Courier Status</h3>
          <p className="text-xl font-bold text-green-600 mt-1">{courierStatus?.status || 'Loading...'}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{courierStatus?.statusMessage || 'Fetching status...'}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Vehicle Type</h3>
          <p className="text-xl font-bold text-blue-600 mt-1">{courierStatus?.vehicleType || 'Loading...'}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{courierStatus?.vehicleCapacity || 'Fetching vehicle details...'}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Behavior Level</h3>
          <p className="text-xl font-bold text-purple-600 mt-1">{courierStatus?.behaviorLevel || 'Loading...'}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">{courierStatus?.behaviorDescription || 'Retrieving performance data...'}</p>
        </div>
      </div>

      {/* Today's Operational Data */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Today's Deliveries</h3>
          <p className="text-xl font-bold text-blue-600 mt-1">{dashboardData?.completedDeliveries ?? 0}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Automatically assigned</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Active Deliveries</h3>
          <p className="text-xl font-bold text-orange-600 mt-1">{dashboardData?.activeDeliveries ?? 0}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Currently in progress</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Today's Earnings</h3>
          <p className="text-xl font-bold text-green-600 mt-1">TZS {(dashboardData?.todayEarnings ?? 0).toLocaleString()}</p>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">Automatically calculated</p>
        </div>
      </div>

      {/* Critical Alerts */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">Critical Alerts</h2>
          <p className="text-xs text-gray-600 dark:text-gray-400">System-detected issues requiring attention</p>
        </div>
        <div className="p-4">
          <div className="space-y-3">
            {Array.isArray(criticalAlerts) && criticalAlerts.length > 0 ? criticalAlerts.map((alert, index) => (
              <div key={index} className={`p-3 rounded-md ${
                alert.priority === 'high' ? 'bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-800' :
                alert.priority === 'medium' ? 'bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-800' :
                'bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800'
              }`}>
                <h4 className={`text-sm font-medium uppercase tracking-wider ${
                  alert.priority === 'high' ? 'text-red-900 dark:text-red-100' :
                  alert.priority === 'medium' ? 'text-yellow-900 dark:text-yellow-100' :
                  'text-blue-900 dark:text-blue-100'
                }`}>{alert.title}</h4>
                <p className={`text-xs ${
                  alert.priority === 'high' ? 'text-red-800 dark:text-red-200' :
                  alert.priority === 'medium' ? 'text-yellow-800 dark:text-yellow-200' :
                  'text-blue-800 dark:text-blue-200'
                }`}>{alert.message}</p>
                <p className={`text-xs mt-1 ${
                  alert.priority === 'high' ? 'text-red-700 dark:text-red-300' :
                  alert.priority === 'medium' ? 'text-yellow-700 dark:text-yellow-300' :
                  'text-blue-700 dark:text-blue-300'
                }`}>{alert.timestamp || alert.details}</p>
              </div>
            )) : (
              <div className="p-3 bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-800 rounded-md">
                <p className="text-sm text-green-800 dark:text-green-200">No critical alerts at this time</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
