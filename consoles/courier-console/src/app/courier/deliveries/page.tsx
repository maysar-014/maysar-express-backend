'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { courierApi } from '@/lib/api';

export default function ActiveDeliveriesPage() {
  const router = useRouter();
  const [currentDelivery, setCurrentDelivery] = useState<string | null>(null);
  const [deliveryStatus, setDeliveryStatus] = useState<{[key: string]: string}>({});
  const [deliveries, setDeliveries] = useState(null);

  useEffect(() => {
    const fetchDeliveries = async () => {
      try {
        const data = await courierApi.getActiveDeliveries();

        // Transform new API response format
        const deliveriesData = data?.data?.deliveries || [];

        // Filter for active/in-transit deliveries only
        const activeDeliveries = deliveriesData.filter((delivery: any) =>
          delivery.status === 'in_transit' || delivery.status === 'assigned'
        );

        // Transform deliveries to match expected format
        const transformedDeliveries = activeDeliveries.map((delivery: any) => ({
          id: delivery.deliveryId || delivery.id || 'DEL-' + Math.random().toString(36).substr(2, 9),
          type: delivery.status === 'assigned' ? 'Pickup' : 'Delivery',
          location: delivery.deliveryLocation || delivery.deliveryAddress || 'Location not available',
          customer: delivery.customerName || delivery.courier || 'Customer details pending',
          eta: delivery.estimatedDelivery ? new Date(delivery.estimatedDelivery).toLocaleTimeString() : 'ETA pending',
          packageType: 'Standard Package',
          weight: delivery.packageWeight ? `${delivery.packageWeight}kg` : 'Weight TBD',
          riskFlags: delivery.priority === 'high' ? ['High Priority'] : [],
          status: delivery.status
        }));

        setDeliveries(transformedDeliveries);
      } catch (error) {
        console.error('Error fetching deliveries:', error);
        setDeliveries([]);
      }
    };

    fetchDeliveries();
  }, []);

  const handleAction = async (deliveryId: string, action: string) => {
    if (action === 'start') {
      // Navigate to routes page for delivery navigation
      router.push(`/courier/routes?delivery=${deliveryId}`);
    } else if (action === 'complete') {
      try {
        await courierApi.completeDelivery(deliveryId);
        setDeliveryStatus(prev => ({ ...prev, [deliveryId]: 'Awaiting Buyer Confirmation' }));
        setCurrentDelivery(null);
      } catch (error) {
        console.error('Failed to complete delivery:', error);
      }
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white uppercase tracking-wider">Active Deliveries</h1>
          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 uppercase tracking-wider">
            Mark deliveries as completed - buyer confirms receipt
          </p>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">
          Execution core - one state at a time
        </div>
      </div>

      {/* Current Active Delivery */}
      {currentDelivery && (
        <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-md p-4">
          <h2 className="text-sm font-semibold text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-3">
            Current Active: {currentDelivery}
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h3 className="text-xs font-medium text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-2">Required Actions</h3>
              <div className="space-y-2">
                <button
                  onClick={() => handleAction(currentDelivery, 'complete')}
                  className="w-full px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 text-xs font-medium"
                >
                  Mark as Delivered
                </button>
              </div>
            </div>
            <div>
              <h3 className="text-xs font-medium text-blue-900 dark:text-blue-100 uppercase tracking-wider mb-2">Status</h3>
              <div className="space-y-1 text-xs text-blue-800 dark:text-blue-200">
                <p>GPS tracking active</p>
                <p>ETA monitoring enabled</p>
                <p>Manual status changes disabled</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Queue */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {Array.isArray(deliveries) ? deliveries.map((delivery) => (
          <div
            key={delivery.id}
            className={`bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700 p-3 ${
              currentDelivery === delivery.id ? 'ring-2 ring-blue-500' : ''
            }`}
          >
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-white uppercase tracking-wider">
                    {delivery.id}
                  </h3>
                  <span className={`px-1.5 py-0.5 text-xs font-medium rounded-full ${
                    delivery.type === 'Pickup'
                      ? 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-300'
                      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300'
                  }`}>
                    {delivery.type}
                  </span>
                </div>
                <p className="text-xs text-gray-600 dark:text-gray-400 truncate">{delivery.location}</p>
                <p className="text-xs text-gray-500 dark:text-gray-500 truncate">{delivery.customer}</p>
              </div>
              <div className="text-right">
                <p className="text-xs font-medium text-gray-900 dark:text-white">ETA: {delivery.eta}</p>
                <p className={`text-xs px-1.5 py-0.5 rounded-full mt-1 ${
                  deliveryStatus[delivery.id] === 'Awaiting Buyer Confirmation'
                    ? 'bg-yellow-100 text-yellow-800'
                    : deliveryStatus[delivery.id] === 'In Progress'
                    ? 'bg-blue-100 text-blue-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  {deliveryStatus[delivery.id] || 'Pending'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Package</p>
                <p className="text-xs font-medium text-gray-900 dark:text-white truncate">
                  {delivery.packageType}
                </p>
                <p className="text-xs text-gray-600 dark:text-gray-400">{delivery.weight}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 dark:text-gray-400 uppercase tracking-wider">Risk Flags</p>
                <div className="flex flex-wrap gap-1 mt-1">
                  {delivery.riskFlags.map((flag, index) => (
                    <span key={index} className="px-1.5 py-0.5 text-xs bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 rounded">
                      {flag}
                    </span>
                  ))}
                  {delivery.riskFlags.length === 0 && (
                    <span className="text-xs text-green-600">None</span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              {deliveryStatus[delivery.id] !== 'Awaiting Buyer Confirmation' && (
                <button
                  onClick={() => handleAction(delivery.id, 'start')}
                  disabled={currentDelivery && currentDelivery !== delivery.id}
                  className="px-2.5 py-1.5 bg-blue-600 text-white text-xs font-medium rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {currentDelivery === delivery.id ? 'Active' : 'Start'}
                </button>
              )}
              {deliveryStatus[delivery.id] === 'Awaiting Buyer Confirmation' && (
                <span className="px-2.5 py-1.5 bg-yellow-100 text-yellow-800 text-xs font-medium rounded">
                  Awaiting Confirmation
                </span>
              )}
            </div>
          </div>
        )) : null}
      </div>
    </div>
  );
}
