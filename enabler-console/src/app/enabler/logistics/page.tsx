'use client';

import { useState } from 'react';

export default function LogisticsSupport() {
  const [selectedDelivery, setSelectedDelivery] = useState(null);
  const [proofType, setProofType] = useState('photo');

  const deliveryTasks = [
    {
      id: 'LOG-001',
      orderId: 'ORD-2024-5678',
      customerName: 'Amina Hassan',
      customerPhone: '+255712345678',
      deliveryAddress: '123 Uhuru Street, Dar es Salaam CBD',
      coordinates: { lat: -1.2921, lng: 36.8219 },
      taskType: 'delivery-confirmation',
      priority: 'high',
      status: 'pending',
      estimatedEarnings: 25000,
      orderValue: 3500000,
      deliveryWindow: '2024-12-29 14:00 - 16:00',
      carrier: 'Sendy',
      trackingNumber: 'SND-2024-001',
      specialInstructions: 'Call customer before delivery, apartment building requires access code',
      proofRequired: ['photo', 'signature', 'gps'],
      createdAt: '2024-12-29 12:30'
    },
    {
      id: 'LOG-002',
      orderId: 'ORD-2024-5679',
      customerName: 'John Mwalimu',
      customerPhone: '+255723456789',
      deliveryAddress: '456 Nyerere Avenue, Mwanza',
      coordinates: { lat: -4.0435, lng: 39.6682 },
      taskType: 'failed-delivery',
      priority: 'high',
      status: 'pending',
      estimatedEarnings: 30000,
      orderValue: 2800000,
      deliveryWindow: '2024-12-29 10:00 - 12:00',
      carrier: 'DHL Tanzania',
      trackingNumber: 'G4S-2024-002',
      specialInstructions: 'Customer was not available, needs rescheduling',
      proofRequired: ['photo', 'customer-contact'],
      failureReason: 'Customer unavailable',
      createdAt: '2024-12-29 11:15'
    },
    {
      id: 'LOG-003',
      orderId: 'ORD-2024-5680',
      customerName: 'Grace Mbwana',
      customerPhone: '+255734567890',
      deliveryAddress: '789 Kilimanjaro Road, Arusha',
      coordinates: { lat: -0.0917, lng: 34.7680 },
      taskType: 'proof-collection',
      priority: 'medium',
      status: 'in-progress',
      estimatedEarnings: 20000,
      orderValue: 1900000,
      deliveryWindow: 'Completed',
      carrier: 'Tanzania Posts',
      trackingNumber: 'PK-2024-003',
      specialInstructions: 'Delivery completed but proof of service missing',
      proofRequired: ['photo', 'signature'],
      createdAt: '2024-12-29 09:45'
    }
  ];

  const completedTasks = [
    {
      id: 'LOG-004',
      orderId: 'ORD-2024-5677',
      customerName: 'Peter Mwanga',
      completedAt: '2024-12-28 15:30',
      taskType: 'delivery-confirmation',
      earnings: 25000,
      proofSubmitted: ['photo', 'signature', 'gps'],
      customerSatisfaction: 5
    },
    {
      id: 'LOG-005',
      orderId: 'ORD-2024-5676',
      customerName: 'Mary Mwalimu',
      completedAt: '2024-12-28 13:20',
      taskType: 'proof-collection',
      earnings: 20000,
      proofSubmitted: ['photo', 'signature'],
      customerSatisfaction: 4
    }
  ];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300';
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300';
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900/20 dark:text-gray-300';
    }
  };

  const handleStartTask = (taskId: string) => {
    console.log(`Starting logistics task ${taskId}`);
    // In production, this would update the status and assign the enabler
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Logistics Support</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Coordinate deliveries, collect proof of service, and resolve logistics issues
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-red-100 dark:bg-red-900/20 px-3 py-1 rounded-full text-red-800 dark:text-red-300 text-sm font-medium">
            {deliveryTasks.filter(t => t.status === 'pending').length} Pending Tasks
          </span>
          <span className="bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded-full text-green-800 dark:text-green-300 text-sm font-medium">
            TZS {deliveryTasks.reduce((sum, task) => sum + task.estimatedEarnings, 0).toLocaleString()} Potential Earnings
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Tasks</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {deliveryTasks.filter(t => t.status !== 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Completed Today</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{completedTasks.length}</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Resolution Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">35m</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">98%</p>
            </div>
          </div>
        </div>
      </div>

      {/* Active Logistics Tasks */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Active Logistics Tasks</h3>
        <div className="space-y-4">
          {deliveryTasks.map((task) => (
            <div key={task.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {task.orderId}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority} priority
                      </span>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500">{task.status}</span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Customer:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{task.customerName}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Task Type:</span>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {task.taskType.replace('-', ' ')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Carrier:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{task.carrier}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Order Value:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          TZS {task.orderValue.toLocaleString()}
                        </p>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex items-start space-x-2">
                        <div>
                          <p className="text-sm text-gray-900 dark:text-white">{task.deliveryAddress}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            Delivery Window: {task.deliveryWindow}
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <p className="text-sm text-gray-600 dark:text-gray-400">{task.specialInstructions}</p>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Tracking:</span>
                        <span className="font-medium text-gray-900 dark:text-white ml-1">{task.trackingNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                        <span className="font-medium text-gray-900 dark:text-white ml-1">{task.customerPhone}</span>
                      </div>
                      {task.failureReason && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Failure Reason:</span>
                          <span className="font-medium text-red-600 ml-1">{task.failureReason}</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="mt-3">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Proof Required:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {task.proofRequired.map((proof, index) => (
                          <span key={index} className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">
                            {proof.replace('-', ' ')}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0 text-right ml-4">
                  <div className="flex items-center text-green-600 mb-2">
                    <span className="text-lg font-bold">TZS {task.estimatedEarnings.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Created: {task.createdAt}
                  </p>
                  
                  <div className="space-y-2">
                    {task.status === 'pending' && (
                      <button 
                        onClick={() => handleStartTask(task.id)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Start Task
                      </button>
                    )}
                    {task.status === 'in-progress' && (
                      <button 
                        onClick={() => setSelectedDelivery(task)}
                        className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                      >
                        Submit Proof
                      </button>
                    )}
                    
                    <div className="flex space-x-1">
                      <button className="flex-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900/30">
                        Call
                      </button>
                      <button className="flex-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-900/30">
                        Map
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recently Completed */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recently Completed</h3>
        <div className="space-y-3">
          {completedTasks.map((task) => (
            <div key={task.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{task.orderId}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {task.customerName} • {task.taskType.replace('-', ' ')}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {task.proofSubmitted.map((proof, index) => (
                      <span key={index} className="bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 px-2 py-1 rounded text-xs">
                        {proof}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">TZS {task.earnings.toLocaleString()}</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>⭐ {task.customerSatisfaction}/5</span>
                  <span className="ml-2">{task.completedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Proof Submission Modal */}
      {selectedDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex justify-between items-center">
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Submit Proof of Service - {selectedDelivery.orderId}
                </h3>
                <button 
                  onClick={() => setSelectedDelivery(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ✕
                </button>
              </div>
            </div>
            
            <div className="p-6">
              {/* Proof Type Selector */}
              <div className="flex space-x-4 mb-6">
                <button
                  onClick={() => setProofType('photo')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    proofType === 'photo'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  📷 Photo Evidence
                </button>
                <button
                  onClick={() => setProofType('signature')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    proofType === 'signature'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  ✍️ Signature
                </button>
                <button
                  onClick={() => setProofType('gps')}
                  className={`px-4 py-2 rounded-lg text-sm font-medium ${
                    proofType === 'gps'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                  }`}
                >
                  📍 GPS Location
                </button>
              </div>

              {/* Photo Evidence */}
              {proofType === 'photo' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Photo Evidence</h4>
                  <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-8 text-center">
                    <p className="text-gray-600 dark:text-gray-400 mb-4">
                      Take photos of the delivered package and delivery location
                    </p>
                    <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Take Photo
                    </button>
                  </div>
                </div>
              )}

              {/* Signature */}
              {proofType === 'signature' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">Customer Signature</h4>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <div className="bg-gray-50 dark:bg-gray-700 h-40 rounded border-2 border-dashed border-gray-300 dark:border-gray-600 flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400">Signature pad area</p>
                    </div>
                    <div className="flex justify-between mt-4">
                      <button className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                        Clear
                      </button>
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                        Capture Signature
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* GPS Location */}
              {proofType === 'gps' && (
                <div className="space-y-4">
                  <h4 className="font-semibold text-gray-900 dark:text-white">GPS Location Verification</h4>
                  <div className="border border-gray-300 dark:border-gray-600 rounded-lg p-4">
                    <div className="bg-gray-50 dark:bg-gray-700 h-40 rounded flex items-center justify-center">
                      <p className="text-gray-500 dark:text-gray-400">Map showing current location</p>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Current Location:</span>
                        <span className="font-medium text-gray-900 dark:text-white">
                          {selectedDelivery.coordinates.lat}, {selectedDelivery.coordinates.lng}
                        </span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500 dark:text-gray-400">Accuracy:</span>
                        <span className="font-medium text-green-600">±5 meters</span>
                      </div>
                    </div>
                    <button className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors">
                      Capture GPS Location
                    </button>
                  </div>
                </div>
              )}

              {/* Additional Notes */}
              <div className="mt-6">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Additional Notes
                </label>
                <textarea 
                  rows={3}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded-md px-3 py-2 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  placeholder="Add any additional notes about the delivery..."
                />
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-3 mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button 
                  onClick={() => setSelectedDelivery(null)}
                  className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
                <button className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors">
                  Submit Proof
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}