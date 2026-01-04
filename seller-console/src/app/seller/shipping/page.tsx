'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiService } from '@/lib/api';
import { getSeller } from '@/lib/permissions';

export default function ShippingPage() {
  const [activeTab, setActiveTab] = useState('rates');
  const [currentPage, setCurrentPage] = useState(0);
  const [zonesPage, setZonesPage] = useState(0);
  const itemsPerPage = 10;
  const zonesPerPage = 15;
  const seller = getSeller();

  const { data: shippingData, isLoading } = useQuery({
    queryKey: ['shipping', seller?.id],
    queryFn: () => apiService.getShippingData(),
    staleTime: 30 * 1000,
    enabled: !!seller?.id,
  });

  const { data: shipmentsData } = useQuery({
    queryKey: ['shipments', seller?.id],
    queryFn: () => apiService.getShipments(),
    staleTime: 30 * 1000,
    enabled: !!seller?.id,
  });

  const { data: shippingStatsData } = useQuery({
    queryKey: ['shipping-stats', seller?.id],
    queryFn: () => apiService.getShippingStats(),
    staleTime: 30 * 1000,
    enabled: !!seller?.id,
  });

  // Extract data from API responses
  const shippingRates = shippingData?.data?.data?.shippingRates || [];
  const shipments = shipmentsData?.data?.data?.shipments || [];
  const stats = shippingStatsData?.data?.data || {
    activeShipments: 0,
    deliveredToday: 0,
    avgDeliveryTime: '0',
    shippingCost: 0
  };

  // Debug logging
  console.log('Shipping data structure:', shippingData?.data);
  console.log('Extracted shipping rates:', shippingRates);
  console.log('Extracted stats:', stats);

  const totalPages = Math.ceil(shippingRates.length / itemsPerPage);
  const paginatedRates = shippingRates.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);
  const totalZonesPages = Math.ceil(shippingRates.length / zonesPerPage);
  const paginatedZones = shippingRates.slice(zonesPage * zonesPerPage, (zonesPage + 1) * zonesPerPage);

  const getShipmentStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'in_transit': return 'bg-blue-100 text-blue-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Shipping & Fulfillment</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">Manage shipping rates, carriers, and track deliveries</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Export Shipments
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Create Shipment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Shipments</p>
          <p className="text-2xl font-bold text-blue-600">{stats.activeShipments}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">In transit</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Delivered Today</p>
          <p className="text-2xl font-bold text-green-600">{stats.deliveredToday}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Completed</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg Delivery Time</p>
          <p className="text-2xl font-bold text-purple-600">{stats.avgDeliveryTime} days</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This month</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Shipping Cost</p>
          <p className="text-2xl font-bold text-orange-600">TZS {(stats.shippingCost || 0).toLocaleString()}</p>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">This month</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-8 px-6">
            {[
              { id: 'rates', label: 'Shipping Rates' },
              { id: 'shipments', label: 'Active Shipments' },
              { id: 'zones', label: 'Delivery Zones' }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'rates' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tanzania Regional Shipping Rates</h3>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm">
                  Add New Rate
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Region</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Weight Range</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Rate</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Carrier</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Delivery</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {paginatedRates.map((rate) => (
                      <tr key={rate.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{rate.region}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{rate.weightRange}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">TZS {rate.rate.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{rate.carrier}</td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{rate.deliveryDays} days</td>
                        <td className="px-4 py-2">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                            <button className="text-red-600 hover:text-red-800 text-xs">Delete</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                  Showing {currentPage * itemsPerPage + 1} to {Math.min((currentPage + 1) * itemsPerPage, shippingRates.length)} of {shippingRates.length} regions
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
                    disabled={currentPage === 0}
                    className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Previous
                  </button>
                  <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                    Page {currentPage + 1} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(Math.min(totalPages - 1, currentPage + 1))}
                    disabled={currentPage === totalPages - 1}
                    className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'shipments' && (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Active Shipments</h3>
                <div className="flex space-x-2">
                  <input
                    type="text"
                    placeholder="Search by tracking number..."
                    className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  />
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Order</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Customer</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Tracking Number</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Carrier</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Est. Delivery</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {shipments.map((shipment) => (
                      <tr key={shipment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-sm font-medium text-blue-600">{shipment.orderNumber}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{shipment.customer}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{shipment.trackingNumber}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{shipment.carrier}</td>
                        <td className="px-4 py-2">
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${getShipmentStatusColor(shipment.status)}`}>
                            {shipment.status.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{new Date(shipment.estimatedDelivery).toLocaleDateString()}</td>
                        <td className="px-4 py-2">
                          <div className="flex space-x-2">
                            <button className="text-blue-600 hover:text-blue-800 text-xs">Track</button>
                            <button className="text-green-600 hover:text-green-800 text-xs">Update</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'zones' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Tanzania Delivery Zones</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h4 className="font-medium text-gray-900 dark:text-white">All Tanzania Regions</h4>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      Showing {zonesPage * zonesPerPage + 1}-{Math.min((zonesPage + 1) * zonesPerPage, shippingRates.length)} of {shippingRates.length}
                    </div>
                  </div>
                  <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                    {paginatedZones.map((region) => (
                      <div key={region.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <span className="font-medium text-gray-900 dark:text-white text-sm">{region.region}</span>
                          <button className="text-blue-600 hover:text-blue-800 text-xs">Edit</button>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {region.deliveryDays} business days • TZS {region.rate.toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center justify-between pt-2">
                    <button
                      onClick={() => setZonesPage(Math.max(0, zonesPage - 1))}
                      disabled={zonesPage === 0}
                      className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                      Page {zonesPage + 1} of {totalZonesPages}
                    </span>
                    <button
                      onClick={() => setZonesPage(Math.min(totalZonesPages - 1, zonesPage + 1))}
                      disabled={zonesPage === totalZonesPages - 1}
                      className="px-4 py-2 text-sm bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
                    >
                      Next
                    </button>
                  </div>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 dark:text-white mb-4">Coverage Statistics</h4>
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Total Regions Covered</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{shippingRates.length}/31</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Average Delivery Time</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{stats.avgDeliveryTime} days</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Same Day Delivery</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{shippingRates.filter(r => r.deliveryDays === 'Same day').length} regions</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Express Zones</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{shippingRates.filter(r => r.carrier === 'Express').length} regions</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Mainland Regions</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{shippingRates.filter(r => !r.region.includes('Zanzibar') && !r.region.includes('Pemba')).length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-600 dark:text-gray-400">Island Regions</span>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">{shippingRates.filter(r => r.region.includes('Zanzibar') || r.region.includes('Pemba')).length}</span>
                    </div>
                  </div>
                  <div className="mt-4 h-32 bg-gray-200 dark:bg-gray-600 rounded-lg flex items-center justify-center">
                    <p className="text-gray-500 dark:text-gray-400 text-sm">Tanzania Map Placeholder</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}