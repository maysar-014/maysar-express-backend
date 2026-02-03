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
        
        // Transform new API response format
        const routeInfo = routeData?.data || {};
        const adherenceInfo = adherenceData?.data || {};
        const gpsInfo = gpsData?.data || {};
        
        // Transform route data
        const transformedRoute = {
          id: routeInfo.courierId || 'route_001',
          name: 'Active Route',
          description: 'Current delivery route',
          currentLocation: 'Loading...',
          distanceCovered: '0 km',
          distanceRemaining: '0 km',
          timeRemaining: '0 mins',
          progress: 0,
          nextDestination: 'Loading...',
          trafficStatus: 'Checking traffic...',
          waypoints: routeInfo.activeRoutes?.map((route: any, index: number) => ({
            id: route.routeId || `waypoint_${index}`,
            location: route.nextStop || `Stop ${index + 1}`,
            district: 'Unknown District',
            fullAddress: 'Loading address...',
            landmark: 'Loading landmark...',
            eta: route.estimatedCompletion ? new Date(route.estimatedCompletion).toLocaleTimeString() : 'TBD',
            status: route.status === 'in_progress' ? 'current' : route.status === 'completed' ? 'completed' : 'upcoming',
            coordinates: { lat: 0, lng: 0 }
          })) || []
        };
        
        // Transform adherence data
        const transformedAdherence = {
          onRoutePercentage: Math.round(Math.random() * 100), // Placeholder
          gpsAccuracy: 'High',
          speedCompliance: Math.round(Math.random() * 100)
        };
        
        // Transform GPS data
        const transformedGps = {
          active: gpsInfo.locations?.length > 0 ? true : null,
          status: gpsInfo.locations?.length > 0 ? 'Active' : 'Checking GPS connection...'
        };
        
        setCurrentRoute(transformedRoute);
        setRouteAdherence(transformedAdherence);
        setGpsStatus(transformedGps);
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

  const handleNavigateToLocation = (waypoint) => {
    if (waypoint.coordinates) {
      const googleMapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${waypoint.coordinates.lat},${waypoint.coordinates.lng}&travelmode=driving`;
      window.open(googleMapsUrl, '_blank');
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
              {Array.isArray(currentRoute?.waypoints) ? currentRoute.waypoints.map((waypoint, index) => (
                <span key={waypoint.id}>
                  <span className={`${
                    waypoint.status === 'completed' ? 'text-green-600' :
                    waypoint.status === 'current' ? 'text-blue-600 font-bold' :
                    'text-gray-500'
                  }`}>
                    {waypoint.location}
                  </span>
                  {index < currentRoute.waypoints.length - 1 && <span className="text-gray-400 mx-1">→</span>}
                </span>
              )) : currentRoute.name || currentRoute.id}
            </h2>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">{currentRoute.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
              <div>
                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wider">Current Location</p>
                <p className="font-medium text-gray-900 dark:text-white">{currentRoute.currentLocation || 'Loading...'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wider">Distance Covered</p>
                <p className="font-medium text-green-600">{currentRoute.distanceCovered || '0 km'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wider">Distance Remaining</p>
                <p className="font-medium text-orange-600">{currentRoute.distanceRemaining || '0 km'}</p>
              </div>
              <div>
                <p className="text-gray-500 dark:text-gray-400 uppercase tracking-wider">Time Remaining</p>
                <p className="font-medium text-blue-600">{currentRoute.timeRemaining || '0 mins'}</p>
              </div>
            </div>
            <div className="mt-3">
              <div className="flex justify-between text-xs mb-1">
                <span className="text-gray-500">Route Progress</span>
                <span className="text-gray-900 dark:text-white font-medium">{currentRoute.progress || 0}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                  style={{ width: `${currentRoute.progress || 0}%` }}
                ></div>
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
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Delivery Locations</h3>
          {Array.isArray(currentRoute?.waypoints) ? currentRoute.waypoints.map((waypoint, index) => (
            <div 
              key={waypoint.id} 
              className="border border-gray-200 dark:border-gray-700 rounded p-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
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
                    <div className="flex items-center space-x-2 mb-1">
                      <h4 className="font-medium text-gray-900 dark:text-white text-sm">{waypoint.location}</h4>
                      <span className="text-xs text-gray-500 dark:text-gray-400">{waypoint.district}</span>
                    </div>
                    <p className="text-xs text-gray-600 dark:text-gray-400 mb-1">{waypoint.fullAddress}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-500">{waypoint.landmark}</p>
                    <div className="flex items-center space-x-3 mt-2">
                      <span className="text-xs text-gray-500">ETA: {waypoint.eta}</span>
                      <span className={`px-2 py-1 text-xs rounded ${
                        waypoint.status === 'completed'
                          ? 'bg-green-100 text-green-800'
                          : waypoint.status === 'current'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {waypoint.status === 'completed' ? 'Completed' : waypoint.status === 'current' ? 'Current' : 'Upcoming'}
                      </span>
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => handleNavigateToLocation(waypoint)}
                  className="px-3 py-1 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded"
                >
                  Navigate
                </button>
              </div>
            </div>
          )) : null}
        </div>

        {/* Navigation Actions */}
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gray-200 dark:border-gray-600">
          <div className="text-xs text-gray-600 dark:text-gray-400">
            Next: {currentRoute.nextDestination || 'Loading...'} - {currentRoute.trafficStatus || 'Checking traffic...'}
          </div>
          <div className="text-xs text-gray-500">
            Last updated: {new Date().toLocaleTimeString()}
          </div>
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
