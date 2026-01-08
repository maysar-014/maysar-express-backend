'use client';

import { useState, useEffect } from 'react';
import { courierApi } from '@/lib/api';

export default function RouteNavigationPage() {
  const [gpsStatus, setGpsStatus] = useState(null);
  const [currentRoute, setCurrentRoute] = useState(null);
  const [routeAdherence, setRouteAdherence] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchRouteData = async () => {
      try {
        setLoading(true);
        const [routeData, adherenceData, gpsData] = await Promise.all([
          courierApi.getCurrentRoute(),
          courierApi.getRouteAdherence(),
          courierApi.getGpsStatus()
        ]);
        setCurrentRoute(routeData.data);
        setRouteAdherence(adherenceData.data);
        setGpsStatus(gpsData.data);
        setError(null);
      } catch (err) {
        console.error('Failed to fetch route data:', err);
        setError('Failed to load route data');
      } finally {
        setLoading(false);
      }
    };

    fetchRouteData();
  }, []);

  const handleReroute = async () => {
    try {
      await courierApi.requestReroute();
      setCurrentRoute(prev => ({
        ...prev,
        trafficStatus: 'Rerouting due to heavy traffic...',
        waypoints: prev.waypoints.map(w =>
          w.status === 'upcoming' ? { ...w, eta: '15:45' } : w
        ),
        estimatedTime: '52 mins'
      }));
    } catch (err) {
      console.error('Failed to request reroute:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-orange-600 mx-auto"></div>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Loading route data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-2 px-3 py-1 text-xs bg-orange-600 text-white rounded hover:bg-orange-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!currentRoute) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Route & Navigation</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            Smart route optimization with traffic-aware guidance
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Guided movement - GPS mandatory
        </div>
      </div>

      {/* Current Route Status */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-2">
              Active Route: {currentRoute.id}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div>
                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wider">Distance</p>
                <p className="font-medium text-gray-900 dark:text-white">{currentRoute.distance}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estimated Time</p>
                <p className="font-medium text-gray-900 dark:text-white">{currentRoute.estimatedTime}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wider">Traffic Status</p>
                <p className="font-medium text-orange-600">{currentRoute.trafficStatus}</p>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${
              gpsStatus?.active === null ? 'bg-yellow-500' :
              gpsStatus?.active ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            <span className="text-xs font-medium text-gray-900 dark:text-white uppercase tracking-wider">
              GPS {gpsStatus?.active === null ? 'Connecting...' : gpsStatus?.active ? 'Active' : 'Inactive'}
            </span>
          </div>
        </div>

        {/* Route Waypoints */}
        <div className="space-y-2">
          {Array.isArray(currentRoute?.waypoints) ? currentRoute.waypoints.map((waypoint, index) => (
            <div key={waypoint.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
              <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                waypoint.status === 'completed'
                  ? 'bg-green-500 text-white'
                  : waypoint.status === 'current'
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-300 text-gray-700'
              }`}>
                {waypoint.status === 'completed' ? '✓' : index + 1}
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white text-sm">{waypoint.location}</p>
                {waypoint.eta && (
                  <p className="text-xs text-gray-600 dark:text-gray-400">ETA: {waypoint.eta}</p>
                )}
              </div>
              <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                waypoint.status === 'completed'
                  ? 'bg-green-100 text-green-800'
                  : waypoint.status === 'current'
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {waypoint.status === 'completed' ? 'Completed' : waypoint.status === 'current' ? 'Current' : 'Upcoming'}
              </div>
            </div>
          )) : null}
        </div>

        {/* Navigation Actions */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Navigation auto-launched • Route automatically selected
          </div>
          <button
            onClick={handleReroute}
            className="px-3 py-2 bg-orange-600 text-white text-xs font-medium rounded-md hover:bg-orange-700"
          >
            Request Reroute
          </button>
        </div>
      </div>

      {/* Route Performance */}
      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-4">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider mb-3">Route Adherence</h3>
        <div className="space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">On-route percentage</span>
            <span className="text-xs font-medium text-green-600">{routeAdherence?.onRoutePercentage || 0}%</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">GPS accuracy</span>
            <span className="text-xs font-medium text-green-600">{routeAdherence?.gpsAccuracy || 'Unknown'}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-xs text-gray-600 dark:text-gray-400 uppercase tracking-wider">Speed compliance</span>
            <span className="text-xs font-medium text-yellow-600">{routeAdherence?.speedCompliance || 0}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
