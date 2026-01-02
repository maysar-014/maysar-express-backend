'use client';

import { getSeller } from '@/lib/permissions';

export default function OrdersPage() {
  const seller = getSeller();

  const orders = [
    { id: 'ORD-2024-5678', customer: 'John Mwalimu', items: 2, total: 125000, status: 'processing', date: '2024-12-30 10:30', shipping: 'Standard' },
    { id: 'ORD-2024-5679', customer: 'Amina Hassan', items: 1, total: 89000, status: 'shipped', date: '2024-12-30 09:15', shipping: 'Express' },
    { id: 'ORD-2024-5680', customer: 'Peter Mwanga', items: 3, total: 156000, status: 'delivered', date: '2024-12-29 16:45', shipping: 'Standard' },
    { id: 'ORD-2024-5681', customer: 'Grace Mbwana', items: 1, total: 78000, status: 'pending', date: '2024-12-29 14:20', shipping: 'Express' },
    { id: 'ORD-2024-5682', customer: 'Hassan Juma', items: 2, total: 245000, status: 'cancelled', date: '2024-12-28 11:30', shipping: 'Standard' }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'bg-green-100 text-green-800';
      case 'shipped': return 'bg-blue-100 text-blue-800';
      case 'processing': return 'bg-yellow-100 text-yellow-800';
      case 'pending': return 'bg-gray-100 text-gray-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
  const totalRevenue = orders.filter(o => o.status !== 'cancelled').reduce((sum, o) => sum + o.total, 0);
  const averageOrderValue = totalRevenue / orders.filter(o => o.status !== 'cancelled').length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Manage and track your customer orders
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50">
            Export Orders
          </button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
            Process Orders
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Total Orders</p>
          <p className="text-2xl font-bold text-gray-900">{totalOrders}</p>
          <p className="text-sm text-gray-500 mt-1">All time</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Pending Orders</p>
          <p className="text-2xl font-bold text-yellow-600">{pendingOrders}</p>
          <p className="text-sm text-gray-500 mt-1">Need attention</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Total Revenue</p>
          <p className="text-2xl font-bold text-green-600">TZS {totalRevenue.toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">From completed orders</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <p className="text-sm font-medium text-gray-600">Average Order Value</p>
          <p className="text-2xl font-bold text-blue-600">TZS {Math.round(averageOrderValue).toLocaleString()}</p>
          <p className="text-sm text-gray-500 mt-1">Per order</p>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-gray-900">Order Management</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Search orders..."
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm"
              />
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>All Status</option>
                <option>Pending</option>
                <option>Processing</option>
                <option>Shipped</option>
                <option>Delivered</option>
                <option>Cancelled</option>
              </select>
              <select className="px-3 py-2 border border-gray-300 rounded-lg text-sm">
                <option>Last 30 days</option>
                <option>Last 7 days</option>
                <option>Today</option>
                <option>Custom range</option>
              </select>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Order ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Items</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Shipping</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {orders.map((order) => (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <p className="font-medium text-blue-600">{order.id}</p>
                  </td>
                  <td className="px-6 py-4">
                    <p className="font-medium text-gray-900">{order.customer}</p>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.items} items</td>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900">
                    TZS {order.total.toLocaleString()}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(order.status)}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-900">{order.shipping}</td>
                  <td className="px-6 py-4 text-sm text-gray-500">{order.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex space-x-2">
                      <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                      {(order.status === 'pending' || order.status === 'processing') && (
                        <button className="text-green-600 hover:text-green-800 text-sm">Process</button>
                      )}
                      <button className="text-gray-600 hover:text-gray-800 text-sm">Print</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Order Status Distribution</h3>
          <div className="space-y-3">
            {['pending', 'processing', 'shipped', 'delivered', 'cancelled'].map((status) => {
              const count = orders.filter(o => o.status === status).length;
              const percentage = (count / totalOrders) * 100;
              return (
                <div key={status} className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(status)}`}>
                      {status}
                    </span>
                    <span className="text-sm text-gray-600">{count} orders</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-20 bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full"
                        style={{ width: `${percentage}%` }}
                      ></div>
                    </div>
                    <span className="text-sm text-gray-500">{percentage.toFixed(1)}%</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Order Activity</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">ORD-2024-5680 delivered</p>
                <p className="text-xs text-gray-500">Peter Mwanga • TZS 156,000</p>
              </div>
              <span className="text-xs text-green-600">2 hours ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">ORD-2024-5679 shipped</p>
                <p className="text-xs text-gray-500">Amina Hassan • TZS 89,000</p>
              </div>
              <span className="text-xs text-blue-600">4 hours ago</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-yellow-50 rounded-lg">
              <div>
                <p className="text-sm font-medium text-gray-900">ORD-2024-5678 processing</p>
                <p className="text-xs text-gray-500">John Mwalimu • TZS 125,000</p>
              </div>
              <span className="text-xs text-yellow-600">6 hours ago</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}