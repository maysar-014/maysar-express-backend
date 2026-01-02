'use client';

export default function CourierDashboard() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Courier Dashboard</h1>
        <div className="text-sm text-gray-600 dark:text-gray-400">
          Today: January 15, 2024
        </div>
      </div>

      {/* Today's Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's Deliveries</h3>
          <p className="text-2xl font-bold text-blue-600 mt-2">12</p>
          <p className="text-sm text-green-600 mt-1">+3 from yesterday</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending Pickups</h3>
          <p className="text-2xl font-bold text-orange-600 mt-2">5</p>
          <p className="text-sm text-gray-500 mt-1">Next pickup: 2:30 PM</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Today's Earnings</h3>
          <p className="text-2xl font-bold text-green-600 mt-2">TZS 45,600</p>
          <p className="text-sm text-green-600 mt-1">+12% from average</p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-6 rounded-lg border border-gray-200 dark:border-gray-700">
          <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Delivery Rating</h3>
          <p className="text-2xl font-bold text-purple-600 mt-2">4.8/5</p>
          <p className="text-sm text-gray-500 mt-1">Based on 156 reviews</p>
        </div>
      </div>

      {/* Active Deliveries */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Active Deliveries</h2>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {[
              { id: 'DEL-001', customer: 'Amina Hassan', address: 'Kinondoni, Dar es Salaam', status: 'In Transit', time: '2:45 PM', priority: 'High' },
              { id: 'DEL-002', customer: 'John Mwanga', address: 'Ilala, Dar es Salaam', status: 'Pickup', time: '3:15 PM', priority: 'Medium' },
              { id: 'DEL-003', customer: 'Grace Mollel', address: 'Temeke, Dar es Salaam', status: 'Scheduled', time: '4:00 PM', priority: 'Low' }
            ].map((delivery) => (
              <div key={delivery.id} className="flex justify-between items-center p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div>
                  <h3 className="font-medium text-gray-900 dark:text-white">{delivery.id}</h3>
                  <p className="text-sm text-gray-600 dark:text-gray-400">{delivery.customer}</p>
                  <p className="text-xs text-gray-500 dark:text-gray-500">{delivery.address}</p>
                </div>
                <div className="text-right">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    delivery.status === 'In Transit' ? 'bg-blue-100 text-blue-800' :
                    delivery.status === 'Pickup' ? 'bg-orange-100 text-orange-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {delivery.status}
                  </span>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{delivery.time}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
          <div className="space-y-3">
            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
              Start Next Delivery
            </button>
            <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
              Mark Delivered
            </button>
            <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">
              Report Issue
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">This Week</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Deliveries:</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">67</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Earnings:</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">TZS 234,500</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Distance:</span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">342 km</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Vehicle Status</h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Fuel Level:</span>
              <span className="text-sm font-semibold text-green-600">78%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Maintenance:</span>
              <span className="text-sm font-semibold text-yellow-600">Due in 5 days</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600 dark:text-gray-400">Insurance:</span>
              <span className="text-sm font-semibold text-green-600">Valid</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}