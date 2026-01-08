'use client';

import { useQuery } from '@tanstack/react-query';
import { useState } from 'react';
import { apiService } from '@/lib/api';
import { getSeller } from '@/lib/permissions';

export default function OrdersPage() {
  const seller = getSeller();
  const [recentOrdersPage, setRecentOrdersPage] = useState(0);

  const { data: ordersData, isLoading } = useQuery({
    queryKey: ['orders'],
    queryFn: () => apiService.getOrders(),
    staleTime: 30 * 1000,
  });

  const orders = ordersData?.data?.data?.orders || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'confirmed': return 'bg-cyan-100 text-cyan-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending').length;
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.totalAmount, 0);
  const averageOrderValue = totalRevenue / orders.filter(o => o.status !== 'cancelled').length || 0;

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Manage and track your customer orders
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
            Export Orders
          </button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            Process Orders
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Orders</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{totalOrders}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Pending Orders</p>
          <p className="text-xl font-bold text-yellow-600">{pendingOrders}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Need attention</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Revenue</p>
          <p className="text-xl font-bold text-green-600">TZS {totalRevenue.toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">From completed orders</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Average Order Value</p>
          <p className="text-xl font-bold text-blue-600">TZS {Math.round(averageOrderValue).toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per order</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Order Management</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Search orders..."
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <select className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white">
                <option>All Status</option>
                <option>Pending</option>
                <option>Confirmed</option>
                <option>Processing</option>
                <option>Shipped</option>
                <option>Delivered</option>
                <option>Cancelled</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[160px]">Order ID</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider min-w-[280px]">Customer</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Items</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Total</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Date</th>
                <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-4 py-2 min-w-[160px]">
                    <p className="font-medium text-blue-600 text-sm">{order.orderNumber}</p>
                  </td>
                  <td className="px-4 py-2 min-w-[280px]">
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white text-sm">{order.customer.name}</p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{order.items.length} items</td>
                  <td className="px-4 py-2 text-sm font-medium text-gray-900 dark:text-white">
                    TZS {order.totalAmount.toLocaleString()}
                  </td>
                  <td className="px-4 py-2">
                    <span className={`px-2 py-1 text-xs font-medium rounded-md whitespace-nowrap ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-500 dark:text-gray-400">{new Date(order.orderDate).toLocaleDateString()}</td>
                  <td className="px-4 py-2">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-xs">View</button>
                      {order.status === 'pending' && (
                        <button className="text-green-600 hover:text-green-800 text-xs">Process</button>
                      )}
                      <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-xs">Print</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Order Status Distribution</h3>
          <div className="space-y-3">
            {['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].map((status: string) => {
              const count = orders.filter((o: any) => o.status === status).length;
              const percentage = totalOrders > 0 ? (count / totalOrders) * 100 : 0;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 min-w-[140px]">
                    <span className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">{count} orders</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 dark:bg-gray-600 rounded-md h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-md"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500 dark:text-gray-400">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Recent Order Activity</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setRecentOrdersPage(Math.max(0, recentOrdersPage - 1))}
                disabled={recentOrdersPage === 0}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <button
                onClick={() => setRecentOrdersPage(recentOrdersPage + 1)}
                disabled={(recentOrdersPage + 1) * 2 >= orders.length}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {orders.slice(recentOrdersPage * 2, (recentOrdersPage + 1) * 2).map((order: any) => (
              <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                <div>
                  <p className="text-xs font-medium text-gray-900 dark:text-white">{order.orderNumber} {order.status}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">{order.customer.name} • TZS {order.totalAmount.toLocaleString()}</p>
                </div>
                <span className="text-xs text-blue-600">{new Date(order.orderDate).toLocaleDateString()}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
