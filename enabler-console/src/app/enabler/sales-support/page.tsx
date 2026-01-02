'use client';

import { useState } from 'react';

export default function SalesSupport() {
  const [selectedAssignment, setSelectedAssignment] = useState(null);

  const salesAssignments = [
    {
      id: 'SA-001',
      sellerId: 'SEL-001',
      sellerName: 'TechStore Tanzania',
      sellerPhone: '+255712345678',
      assignmentType: 'product-promotion',
      priority: 'high',
      status: 'pending',
      estimatedEarnings: 50000,
      commission: '5%',
      targetSales: 10000000,
      currentSales: 2500000,
      products: ['Smartphones', 'Laptops', 'Accessories'],
      deadline: '2024-12-31',
      description: 'Help promote electronics during holiday season',
      requirements: ['Product knowledge', 'Customer outreach', 'Sales tracking'],
      createdAt: '2024-12-29 14:00'
    },
    {
      id: 'SA-002',
      sellerId: 'SEL-002',
      sellerName: 'Fashion Hub',
      sellerPhone: '+255723456789',
      assignmentType: 'customer-acquisition',
      priority: 'medium',
      status: 'in-progress',
      estimatedEarnings: 35000,
      commission: '3%',
      targetSales: 8000000,
      currentSales: 4200000,
      products: ['Dresses', 'Shoes', 'Handbags'],
      deadline: '2024-12-30',
      description: 'Acquire new customers for fashion products',
      requirements: ['Social media promotion', 'Customer referrals', 'Follow-up calls'],
      createdAt: '2024-12-29 12:30'
    },
    {
      id: 'SA-003',
      sellerId: 'SEL-003',
      sellerName: 'Home Decor Plus',
      sellerPhone: '+255734567890',
      assignmentType: 'sales-consultation',
      priority: 'medium',
      status: 'pending',
      estimatedEarnings: 40000,
      commission: '4%',
      targetSales: 6000000,
      currentSales: 0,
      products: ['Furniture', 'Lighting', 'Decorations'],
      deadline: '2025-01-05',
      description: 'Provide sales consultation and customer support',
      requirements: ['Product expertise', 'Customer consultation', 'Order processing'],
      createdAt: '2024-12-29 11:15'
    }
  ];

  const completedAssignments = [
    {
      id: 'SA-004',
      sellerName: 'Organic Farms Ltd',
      assignmentType: 'product-promotion',
      completedAt: '2024-12-28 18:30',
      earnings: 45000,
      salesAchieved: 12500000,
      targetSales: 10000000,
      successRate: '125%'
    },
    {
      id: 'SA-005',
      sellerName: 'Sports Equipment Co',
      assignmentType: 'customer-acquisition',
      completedAt: '2024-12-27 16:45',
      earnings: 30000,
      salesAchieved: 7800000,
      targetSales: 8000000,
      successRate: '97.5%'
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

  const handleStartAssignment = (assignmentId: string) => {
    console.log(`Starting sales assignment ${assignmentId}`);
    // In production, this would update the status and assign the enabler
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Sales Support</h1>
          <p className="text-gray-600 dark:text-gray-400 mt-1">
            Help sellers boost their sales and earn commission-based rewards
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <span className="bg-blue-100 dark:bg-blue-900/20 px-3 py-1 rounded-full text-blue-800 dark:text-blue-300 text-sm font-medium">
            {salesAssignments.filter(a => a.status === 'pending').length} Available Assignments
          </span>
          <span className="bg-green-100 dark:bg-green-900/20 px-3 py-1 rounded-full text-green-800 dark:text-green-300 text-sm font-medium">
            TZS {salesAssignments.reduce((sum, assignment) => sum + assignment.estimatedEarnings, 0).toLocaleString()} Potential Earnings
          </span>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Active Assignments</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {salesAssignments.filter(a => a.status !== 'completed').length}
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Avg. Commission</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">4.2%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Success Rate</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">96%</p>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600 dark:text-gray-400">Total Sales Supported</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">TZS 45K</p>
            </div>
          </div>
        </div>
      </div>

      {/* Sales Assignments */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Available Sales Assignments</h3>
        <div className="space-y-4">
          {salesAssignments.map((assignment) => (
            <div key={assignment.id} className="border border-gray-200 dark:border-gray-600 rounded-lg p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {assignment.sellerName}
                      </h4>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(assignment.priority)}`}>
                        {assignment.priority} priority
                      </span>
                      <div className="flex items-center">
                        <span className="text-xs text-gray-500">{assignment.status}</span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{assignment.description}</p>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Assignment Type:</span>
                        <p className="font-medium text-gray-900 dark:text-white capitalize">
                          {assignment.assignmentType.replace('-', ' ')}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Target Sales:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          TZS {assignment.targetSales.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Current Progress:</span>
                        <p className="font-medium text-gray-900 dark:text-white">
                          TZS {assignment.currentSales.toLocaleString()}
                        </p>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Deadline:</span>
                        <p className="font-medium text-gray-900 dark:text-white">{assignment.deadline}</p>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Products:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {assignment.products.map((product, index) => (
                          <span key={index} className="bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 px-2 py-1 rounded text-xs">
                            {product}
                          </span>
                        ))}
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <span className="text-gray-500 dark:text-gray-400 text-sm">Requirements:</span>
                      <div className="flex flex-wrap gap-2 mt-1">
                        {assignment.requirements.map((req, index) => (
                          <span key={index} className="bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 px-2 py-1 rounded text-xs">
                            {req}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-3">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>Sales Progress</span>
                        <span>{Math.round((assignment.currentSales / assignment.targetSales) * 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-green-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min((assignment.currentSales / assignment.targetSales) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="flex-shrink-0 text-right ml-4">
                  <div className="flex items-center text-green-600 mb-2">
                    <span className="text-lg font-bold">TZS {assignment.estimatedEarnings.toLocaleString()}</span>
                  </div>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">
                    {assignment.commission} commission
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
                    Created: {assignment.createdAt}
                  </p>
                  
                  <div className="space-y-2">
                    {assignment.status === 'pending' && (
                      <button 
                        onClick={() => handleStartAssignment(assignment.id)}
                        className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                      >
                        Accept Assignment
                      </button>
                    )}
                    {assignment.status === 'in-progress' && (
                      <button className="w-full px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm">
                        Continue Sales
                      </button>
                    )}
                    
                    <div className="flex space-x-1">
                      <button className="flex-1 px-3 py-1 bg-green-100 dark:bg-green-900/20 text-green-800 dark:text-green-300 rounded text-xs hover:bg-green-200 dark:hover:bg-green-900/30">
                        Call Seller
                      </button>
                      <button className="flex-1 px-3 py-1 bg-blue-100 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded text-xs hover:bg-blue-200 dark:hover:bg-blue-900/30">
                        View Products
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
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recently Completed Assignments</h3>
        <div className="space-y-3">
          {completedAssignments.map((assignment) => (
            <div key={assignment.id} className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-900/10 rounded-lg">
              <div className="flex items-center space-x-3">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">{assignment.sellerName}</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    {assignment.assignmentType.replace('-', ' ')} • {assignment.successRate} success rate
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Sales: TZS {assignment.salesAchieved.toLocaleString()} / TZS {assignment.targetSales.toLocaleString()}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm font-medium text-green-600">TZS {assignment.earnings.toLocaleString()}</p>
                <p className="text-xs text-gray-500 dark:text-gray-400">{assignment.completedAt}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Future Note */}
      <div className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <div className="flex items-start space-x-3">
          <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/20 rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-blue-600 text-sm">💡</span>
          </div>
          <div>
            <h4 className="font-semibold text-blue-900 dark:text-blue-300 mb-1">Future Enhancement</h4>
            <p className="text-blue-800 dark:text-blue-400 text-sm">
              A dedicated <strong>Seller Console</strong> will be created to enable direct collaboration between sellers and enablers, 
              allowing sellers to post sales assignments, track progress, and manage enabler partnerships.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}