'use client';

import { useState } from 'react';
import { 
  HandRaisedIcon,
  CreditCardIcon,
  ShoppingCartIcon,
  PhoneIcon,
  ChatBubbleLeftRightIcon,
  CheckCircleIcon,
  ClockIcon,
  ExclamationTriangleIcon,
  UserIcon,
  CurrencyDollarIcon
} from '@heroicons/react/24/outline';

export default function BuyerAssistance() {
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [assistanceType, setAssistanceType] = useState('all');

  const assistanceRequests = [
    {
      id: 'BA-001',
      buyerName: 'John Mwangi',
      buyerPhone: '+254712345678',
      buyerEmail: 'john.mwangi@email.com',
      issueType: 'payment-setup',
      priority: 'high',
      status: 'pending',
      createdAt: '2024-12-29 11:30',
      estimatedEarnings: 20.00,
      description: 'First-time buyer needs help setting up M-Pesa payment method',
      orderValue: 2500.00,
      paymentMethod: 'M-Pesa',
      previousAttempts: 0,
      location: 'Nairobi, Kenya',
      preferredContact: 'phone',
      urgency: 'immediate'
    },
    {
      id: 'BA-002',
      buyerName: 'Grace Akinyi',
      buyerPhone: '+254723456789',
      buyerEmail: 'grace.akinyi@email.com',
      issueType: 'order-help',
      priority: 'medium',
      status: 'in-progress',
      createdAt: '2024-12-29 10:15',
      estimatedEarnings: 15.00,
      description: 'Buyer confused about order tracking and delivery options',
      orderValue: 1800.00,
      orderId: 'ORD-2024-5678',
      previousAttempts: 1,
      location: 'Mombasa, Kenya',
      preferredContact: 'chat',
      urgency: 'normal'
    },
    {
      id: 'BA-003',
      buyerName: 'Peter Kimani',
      buyerPhone: '+254734567890',
      buyerEmail: 'peter.kimani@email.com',
      issueType: 'payment-issue',
      priority: 'high',
      status: 'pending',
      createdAt: '2024-12-29 09:45',
      estimatedEarnings: 25.00,
      description: 'Payment failed multiple times, buyer needs assistance with card verification',
      orderValue: 3200.00,
      paymentMethod: 'Credit Card',
      previousAttempts: 3,
      location: 'Kisumu, Kenya',
      preferredContact: 'phone',
      urgency: 'immediate'
    },
    {
      id: 'BA-004',
      buyerName: 'Mary Wanjiru',
      buyerPhone: '+254745678901',
      buyerEmail: 'mary.wanjiru@email.com',
      issueType: 'first-order',
      priority: 'medium',
      status: 'pending',
      createdAt: '2024-12-29 08:30',
      estimatedEarnings: 18.00,
      description: 'New user needs guidance through first purchase process',
      orderValue: 1500.00,
      previousAttempts: 0,
      location: 'Nakuru, Kenya',
      preferredContact: 'chat',
      urgency: 'normal'
    }
  ];

  const completedAssistance = [
    {
      id: 'BA-005',
      buyerName: 'David Ochieng',
      completedAt: '2024-12-28 16:20',
      issueType: 'payment-setup',
      earnings: 20.00,
      resolutionTime: '25 minutes',
      satisfaction: 5
    },
    {
      id: 'BA-006',
      buyerName: 'Sarah Njeri',
      completedAt: '2024-12-28 14:45',
      issueType: 'order-help',
      earnings: 15.00,
      resolutionTime: '18 minutes',
      satisfaction: 4
    }
  ];

  const getIssueIcon = (issueType: string) => {
    switch (issueType) {
      case 'payment-setup':
      case 'payment-issue':
        return <CreditCardIcon className="h-6 w-6 text-green-600" />;
      case 'order-help':
        return <ShoppingCartIcon className="h-6 w-6 text-blue-600" />;
      case 'first-order':
        return <UserIcon className="h-6 w-6 text-purple-600" />;
      default:
        return <HandRaisedIcon className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircleIcon className="h-5 w-5 text-green-500" />;
      case 'in-progress':
        return <ClockIcon className="h-5 w-5 text-yellow-500" />;
      case 'pending':
        return <ExclamationTriangleIcon className="h-5 w-5 text-red-500" />;
      default:
        return <ClockIcon className="h-5 w-5 text-gray-400" />;
    }
  };

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

  const filteredRequests = assistanceRequests.filter(request => {
    if (assistanceType === 'all') return true;
    return request.issueType === assistanceType;
  });

  const handleStartAssistance = (requestId: string) => {
    console.log(`Starting assistance for ${requestId}`);
    // In production, this would update the status and assign the enabler
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Buyer Assistance</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Help buyers with payments, orders, and platform navigation
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-red-100 dark:bg-red-900/20 px-3 py-1 rounded-full text-red-800 dark:text-red-300 text-sm font-medium">
            {assistanceRequests.filter(r => r.status === 'pending').length} Urgent Requests
          </span>
          <span className="bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded-full text-green-800 dark:text-green-300 text-sm font-medium">
            KES {assistanceRequests.reduce((sum, req) => sum + req.estimatedEarnings, 0)} Potential Earnings
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Requests</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {assistanceRequests.filter(r => r.status !== 'completed').length}
              </p>
            </div>
            <HandRaisedIcon className="h-8 w-8 text-blue-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Response Time</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">12m</p>
            </div>
            <ClockIcon className="h-8 w-8 text-green-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">96%</p>
            </div>
            <CheckCircleIcon className="h-8 w-8 text-purple-500" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Satisfaction</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">4.8/5</p>
            </div>
            <HandRaisedIcon className="h-8 w-8 text-yellow-500" />
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setAssistanceType('all')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              assistanceType === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            All Requests
          </button>
          <button
            onClick={() => setAssistanceType('payment-setup')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              assistanceType === 'payment-setup'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Payment Setup
          </button>
          <button
            onClick={() => setAssistanceType('payment-issue')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              assistanceType === 'payment-issue'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Payment Issues
          </button>
          <button
            onClick={() => setAssistanceType('order-help')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              assistanceType === 'order-help'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            Order Help
          </button>
          <button
            onClick={() => setAssistanceType('first-order')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              assistanceType === 'first-order'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
            }`}
          >
            First-Time Buyers
          </button>
        </div>
      </div>

      {/* Assistance Requests */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Active Assistance Requests</h3>
        <div className="space-y-4">
          {filteredRequests.map((request) => (
            <div key={request.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/20 rounded-lg flex items-center justify-center">
                    {getIssueIcon(request.issueType)}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {request.buyerName}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(request.priority)}`}>
                        {request.priority} priority
                      </span>
                      <div className="flex items-center">
                        {getStatusIcon(request.status)}
                      </div>
                      {request.urgency === 'immediate' && (
                        <span className="bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300 px-2 py-1 rounded-full text-xs font-medium animate-pulse">
                          🚨 Urgent
                        </span>
                      )}
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{request.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Issue Type:</span>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {request.issueType.replace('-', ' ')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Order Value:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          KES {request.orderValue?.toLocaleString() || 'N/A'}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Location:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{request.location}</p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Preferred Contact:</span>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">{request.preferredContact}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Phone:</span>
                        <span className="font-medium text-gray-900 dark:text-white ml-1">{request.buyerPhone}</span>
                      </div>
                      {request.orderId && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Order ID:</span>
                          <span className="font-medium text-gray-900 dark:text-white ml-1">{request.orderId}</span>
                        </div>
                      )}
                      {request.previousAttempts > 0 && (
                        <div>
                          <span className="text-gray-500 dark:text-gray-400">Previous Attempts:</span>
                          <span className="font-medium text-red-600 ml-1">{request.previousAttempts}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0 text-right ml-4">
                  <div className="flex items-center text-green-600 mb-2">
                    <CurrencyDollarIcon className="h-5 w-5 mr-1" />
                    <span className="text-lg font-bold">KES {request.estimatedEarnings}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Created: {request.createdAt}
                  </p>
                  
                  <div className="space-y-2">
                    {request.status === 'pending' && (
                      <button 
                        onClick={() => handleStartAssistance(request.id)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Start Assistance
                      </button>
                    )}
                    {request.status === 'in-progress' && (
                      <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                        Continue Session
                      </button>
                    )}
                    
                    <div className="flex space-x-1">
                      <button className="flex-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900/30">
                        <PhoneIcon className="h-4 w-4 inline mr-1" />
                        Call
                      </button>
                      <button className="flex-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-900/30">
                        <ChatBubbleLeftRightIcon className="h-4 w-4 inline mr-1" />
                        Chat
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
          {completedAssistance.map((assistance) => (
            <div key={assistance.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <CheckCircleIcon className="h-6 w-6 text-green-500" />
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{assistance.buyerName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {assistance.issueType.replace('-', ' ')} • Resolved in {assistance.resolutionTime}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">+KES {assistance.earnings}</p>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  <span>⭐ {assistance.satisfaction}/5</span>
                  <span className="ml-2">{assistance.completedAt}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <button className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-colors">
            <CreditCardIcon className="h-8 w-8 text-blue-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-blue-900 dark:text-blue-300">Payment Guide</p>
          </button>
          <button className="p-4 bg-green-50 dark:bg-green-900/20 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 transition-colors">
            <ShoppingCartIcon className="h-8 w-8 text-green-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-900 dark:text-green-300">Order Tutorial</p>
          </button>
          <button className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/30 transition-colors">
            <PhoneIcon className="h-8 w-8 text-purple-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-purple-900 dark:text-purple-300">Call Center</p>
          </button>
          <button className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/30 transition-colors">
            <ChatBubbleLeftRightIcon className="h-8 w-8 text-orange-600 mx-auto mb-2" />
            <p className="text-sm font-medium text-orange-900 dark:text-orange-300">Live Chat</p>
          </button>
        </div>
      </div>
    </div>
  );
}