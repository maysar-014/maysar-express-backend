'use client';

import { useState } from 'react';

interface FulfillmentOrder {
  id: string;
  retailer: string;
  orderDate: string;
  requiredDate: string;
  status: 'pending' | 'preparing' | 'ready' | 'shipped' | 'delivered';
  items: { name: string; quantity: number; packed: number }[];
  shippingAddress: string;
  trackingNumber?: string;
  carrier?: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

interface LogisticsPartner {
  id: string;
  name: string;
  type: 'courier' | 'freight' | 'express';
  coverage: string[];
  rating: number;
  avgDeliveryTime: number;
  costPerKg: number;
  status: 'active' | 'inactive';
}

const mockOrders: FulfillmentOrder[] = [
  {
    id: 'FO-2024-001',
    retailer: 'Shoppers Plaza Dar es Salaam',
    orderDate: '2024-01-15',
    requiredDate: '2024-01-18',
    status: 'preparing',
    items: [
      { name: 'Coca Cola 500ml', quantity: 48, packed: 48 },
      { name: 'Azam Cooking Oil 1L', quantity: 24, packed: 20 }
    ],
    shippingAddress: 'Shoppers Plaza, Msimbazi Street, Dar es Salaam',
    priority: 'high'
  },
  {
    id: 'FO-2024-002',
    retailer: 'Quality Mart Mwanza',
    orderDate: '2024-01-14',
    requiredDate: '2024-01-19',
    status: 'ready',
    items: [
      { name: 'Pembe Flour 2kg', quantity: 30, packed: 30 },
      { name: 'Rice 5kg', quantity: 20, packed: 20 }
    ],
    shippingAddress: 'Quality Mart, Kenyatta Road, Mwanza',
    priority: 'medium'
  },
  {
    id: 'FO-2024-003',
    retailer: 'City Center Arusha',
    orderDate: '2024-01-13',
    requiredDate: '2024-01-17',
    status: 'shipped',
    items: [
      { name: 'Kilimanjaro Water 1.5L', quantity: 100, packed: 100 }
    ],
    shippingAddress: 'City Center Mall, Sokoine Road, Arusha',
    trackingNumber: 'TZ123456789',
    carrier: 'DHL Tanzania',
    priority: 'urgent'
  }
];

const mockPartners: LogisticsPartner[] = [
  {
    id: '1',
    name: 'DHL Tanzania',
    type: 'express',
    coverage: ['Dar es Salaam', 'Arusha', 'Mwanza', 'Dodoma'],
    rating: 4.8,
    avgDeliveryTime: 1,
    costPerKg: 2500,
    status: 'active'
  },
  {
    id: '2',
    name: 'Posta Tanzania',
    type: 'courier',
    coverage: ['All Regions'],
    rating: 4.2,
    avgDeliveryTime: 3,
    costPerKg: 1200,
    status: 'active'
  },
  {
    id: '3',
    name: 'Fastjet Cargo',
    type: 'freight',
    coverage: ['Dar es Salaam', 'Mwanza', 'Kilimanjaro'],
    rating: 4.5,
    avgDeliveryTime: 2,
    costPerKg: 1800,
    status: 'active'
  }
];

export default function FulfillmentPage() {
  const [selectedStatus, setSelectedStatus] = useState<string>('all');
  const [selectedOrder, setSelectedOrder] = useState<FulfillmentOrder | null>(null);
  const [activeTab, setActiveTab] = useState<'orders' | 'partners' | 'tracking'>('orders');

  const filteredOrders = selectedStatus === 'all' 
    ? mockOrders 
    : mockOrders.filter(order => order.status === selectedStatus);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'preparing': return 'bg-blue-100 text-blue-800';
      case 'ready': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-purple-100 text-purple-800';
      case 'delivered': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPackingProgress = (items: FulfillmentOrder['items']) => {
    const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
    const packedItems = items.reduce((sum, item) => sum + item.packed, 0);
    return Math.round((packedItems / totalItems) * 100);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Fulfillment & Logistics</h1>
        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
          Create Shipment
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Orders</h3>
          <p className="text-2xl font-bold text-yellow-600 mt-2">{mockOrders.filter(o => o.status === 'pending').length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">In Preparation</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">{mockOrders.filter(o => o.status === 'preparing').length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Ready to Ship</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">{mockOrders.filter(o => o.status === 'ready').length}</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">In Transit</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">{mockOrders.filter(o => o.status === 'shipped').length}</p>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { key: 'orders', label: 'Fulfillment Orders' },
            { key: 'partners', label: 'Logistics Partners' },
            { key: 'tracking', label: 'Shipment Tracking' }
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.key
                  ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                  : 'border-transparent text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Fulfillment Orders Tab */}
      {activeTab === 'orders' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Orders</option>
              <option value="pending">Pending</option>
              <option value="preparing">Preparing</option>
              <option value="ready">Ready to Ship</option>
              <option value="shipped">Shipped</option>
            </select>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 dark:bg-gray-700">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Order ID</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Retailer</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Required Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Packing Progress</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Priority</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {filteredOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{order.id}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">{order.retailer}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">{order.requiredDate}</td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-blue-600 h-2 rounded-full"
                            style={{ width: `${getPackingProgress(order.items)}%` }}
                          ></div>
                        </div>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{getPackingProgress(order.items)}%</span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(order.priority)}`}>
                          {order.priority.charAt(0).toUpperCase() + order.priority.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(order.status)}`}>
                          {order.status.charAt(0).toUpperCase() + order.status.slice(1)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <button
                          onClick={() => setSelectedOrder(order)}
                          className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-3"
                        >
                          View
                        </button>
                        {order.status === 'ready' && (
                          <button className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300">
                            Ship
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Partners Tab */}
      {activeTab === 'partners' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {mockPartners.map((partner) => (
              <div key={partner.id} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex justify-between items-start mb-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{partner.name}</h3>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    partner.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}>
                    {partner.status.charAt(0).toUpperCase() + partner.status.slice(1)}
                  </span>
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Type:</span>
                    <span className="text-sm text-gray-900 dark:text-white capitalize">{partner.type}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Rating:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{partner.rating}/5.0</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Avg Delivery:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{partner.avgDeliveryTime} days</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Cost/kg:</span>
                    <span className="text-sm text-gray-900 dark:text-white">TZS {partner.costPerKg.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">Coverage:</span>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{partner.coverage.join(', ')}</p>
                  </div>
                </div>
                <div className="flex space-x-2 mt-4">
                  <button className="flex-1 px-3 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
                    Select
                  </button>
                  <button className="flex-1 px-3 py-2 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700">
                    Details
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Shipment Tracking Tab */}
      {activeTab === 'tracking' && (
        <div className="space-y-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Track Shipment</h3>
            <div className="flex space-x-4 mb-6">
              <input
                type="text"
                placeholder="Enter tracking number..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                Track
              </button>
            </div>
            
            {/* Sample tracking result */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
              <div className="flex justify-between items-center mb-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white">Tracking: TZ123456789</h4>
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                  In Transit
                </span>
              </div>
              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Package picked up</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Jan 13, 2024 - 10:30 AM</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">In transit to Arusha</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Jan 13, 2024 - 2:15 PM</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">Out for delivery</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Jan 14, 2024 - 8:00 AM</p>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <div className="w-3 h-3 bg-gray-300 rounded-full"></div>
                  <div>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivered</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Expected: Jan 14, 2024</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Order Details - {selectedOrder.id}</h3>
              <button
                onClick={() => setSelectedOrder(null)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                Close
              </button>
            </div>
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Retailer</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedOrder.retailer}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Required Date</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedOrder.requiredDate}</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Items</label>
                <div className="space-y-2">
                  {selectedOrder.items.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <span className="text-sm text-gray-900 dark:text-white">{item.name}</span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{item.packed}/{item.quantity} packed</span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Shipping Address</label>
                <p className="text-sm text-gray-900 dark:text-white">{selectedOrder.shippingAddress}</p>
              </div>
              {selectedOrder.trackingNumber && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Tracking Number</label>
                  <p className="text-sm text-gray-900 dark:text-white">{selectedOrder.trackingNumber}</p>
                </div>
              )}
              <div className="flex space-x-4 mt-6">
                {selectedOrder.status === 'preparing' && (
                  <button className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
                    Mark Ready
                  </button>
                )}
                {selectedOrder.status === 'ready' && (
                  <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                    Create Shipment
                  </button>
                )}
                <button className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700">
                  Print Packing List
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}