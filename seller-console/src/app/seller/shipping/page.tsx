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
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Shipping & Fulfillment</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">Manage shipping rates, carriers, and track deliveries</p>
        </div>
        <div className="flex space-x-3">
          <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
            Export Shipments
          </button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            Create Shipment
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Active Shipments</p>
          <p className="text-xl font-bold text-blue-600">{stats.activeShipments}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">In transit</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Delivered Today</p>
          <p className="text-xl font-bold text-green-600">{stats.deliveredToday}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Completed</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Avg Delivery Time</p>
          <p className="text-xl font-bold text-purple-600">{stats.avgDeliveryTime} days</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This month</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Shipping Cost</p>
          <p className="text-xl font-bold text-orange-600">TZS {(stats.shippingCost || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">This month</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <nav className="flex space-x-6 px-4">
            {[
              { id: 'rates', label: 'Shipping Rates' },
              { id: 'shipments', label: 'Active Shipments' },
              { id: 'zones', label: 'Delivery Zones' }
            ].map((tab: any) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-1 border-b-2 font-medium text-sm ${
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

        <div className="p-4">
          {activeTab === 'overview' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Sales Trend</h3>
              <div className="h-64 bg-gray-50 dark:bg-gray-700 rounded-md flex items-center justify-center">
                <div className="text-center">
                  <p className="text-gray-500 dark:text-gray-400 text-sm mb-2">Sales Chart</p>
                  <div className="grid grid-cols-5 gap-2">
                    {salesData.map((day: any, index: number) => (
                      <div key={index} className="text-center">
                        <div 
                          className="bg-blue-500 rounded-t-sm mx-auto mb-1" 
                          style={{ 
                            width: '20px', 
                            height: `${Math.max(10, (day.sales / Math.max(...salesData.map((d: any) => d.sales))) * 100)}px` 
                          }}
                        ></div>
                        <p className="text-xs text-gray-600 dark:text-gray-400">{day.date.split('-')[2]}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'products' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Top Performing Products</h3>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-gray-50 dark:bg-gray-700">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Product</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Sales</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Revenue</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Growth</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {topProducts.map((product: any, index: number) => (
                      <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">{product.name}</td>
                        <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{product.sales}</td>
                        <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">TZS {product.revenue.toLocaleString()}</td>
                        <td className="px-4 py-2 text-sm text-green-600">+15.2%</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'customers' && (
            <div className="space-y-4">
              <h3 className="text-base font-semibold text-gray-900 dark:text-white">Customer Analytics</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Customer Acquisition</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">New Customers</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{customerInsights.newCustomers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Returning Customers</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{customerInsights.returningCustomers || 0}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Retention Rate</span>
                        <span className="text-sm font-medium text-green-600">{customerInsights.customerRetentionRate || 0}%</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-md p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Customer Value</h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Average CLV</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">TZS {(customerInsights.averageClv || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">New Customer CLV</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">TZS {(customerInsights.newCustomerClv || 0).toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Returning Customer CLV</span>
                        <span className="text-sm font-medium text-gray-900 dark:text-white">TZS {(customerInsights.returningCustomerClv || 0).toLocaleString()}</span>
                      </div>
                    </div>
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
