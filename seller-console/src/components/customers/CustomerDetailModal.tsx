import React from 'react';

interface Customer {
  id: string;
  name: string;
  email: string;
  phone: string;
  location: string;
  status: 'active' | 'inactive';
  customerType: 'premium' | 'regular' | 'new';
  totalOrders: number;
  totalSpent: number;
  averageOrderValue: number;
  lastOrderDate: string;
  joinDate: string;
  lifetimeValue: number;
  segment: string;
  tags: string[];
  notes?: string;
}

interface CustomerDetailModalProps {
  customer: Customer | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (customer: Customer) => void;
  onViewNotes: (customer: Customer) => void;
}

export function CustomerDetailModal({ customer, isOpen, onClose, onEdit, onViewNotes }: CustomerDetailModalProps) {
  if (!customer) return null;

  const getStatusColor = (status: string) => {
    return status === 'active'
      ? 'bg-green-600 text-green-100'
      : 'bg-red-600 text-red-100';
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'premium': return 'bg-purple-600 text-purple-100';
      case 'regular': return 'bg-blue-600 text-blue-100';
      case 'new': return 'bg-yellow-600 text-yellow-100';
      default: return 'bg-gray-600 text-gray-100';
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-full items-center justify-center p-4 text-center">
        <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
        <div className="relative transform overflow-hidden rounded-md bg-gray-800 text-left shadow-2xl w-full max-w-4xl border border-gray-700">
          <div className="bg-gray-800 px-6 py-4 border-b border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 rounded-md bg-blue-600 flex items-center justify-center text-white font-bold text-lg">
                  {customer.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">{customer.name}</h2>
                  <div className="flex space-x-3 mt-1">
                    <span className={`px-3 py-1 text-xs font-medium rounded-md ${getStatusColor(customer.status)}`}>
                      {customer.status}
                    </span>
                    <span className={`px-3 py-1 text-xs font-medium rounded-md ${getCustomerTypeColor(customer.customerType)}`}>
                      {customer.customerType}
                    </span>
                  </div>
                </div>
              </div>
              <button
                type="button"
                className="text-gray-400 hover:text-white text-2xl leading-none"
                onClick={onClose}
              >
                ×
              </button>
            </div>
          </div>

          <div className="px-6 py-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Contact Information */}
              <div className="bg-gray-700 rounded-md p-5">
                <h4 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider">Contact Information</h4>
                <div className="space-y-3">
                  <div className="flex items-start text-sm">
                    <span className="text-gray-400 mr-3 w-16 text-right font-medium">Email:</span>
                    <span className="text-gray-200">{customer.email}</span>
                  </div>
                  <div className="flex items-start text-sm">
                    <span className="text-gray-400 mr-3 w-16 text-right font-medium">Phone:</span>
                    <span className="text-gray-200">{customer.phone}</span>
                  </div>
                  <div className="flex items-start text-sm">
                    <span className="text-gray-400 mr-3 w-16 text-right font-medium">Location:</span>
                    <span className="text-gray-200">{customer.location}</span>
                  </div>
                </div>
              </div>

              {/* Customer Stats */}
              <div className="bg-gray-700 rounded-md p-5">
                <h4 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider">Customer Statistics</h4>
                <div className="grid grid-cols-2 gap-6">
                  <div className="text-center">
                    <div className="text-2xl font-bold text-blue-400 mb-1">{customer.totalOrders}</div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Total Orders</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-green-400 mb-1">
                      TZS {(customer.totalSpent || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Total Spent</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-purple-400 mb-1">
                      TZS {(customer.averageOrderValue || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Avg Order</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-orange-400 mb-1">
                      {(customer.lifetimeValue || 0).toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-400 uppercase tracking-wider">Lifetime Value</div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-gray-700 rounded-md p-5 lg:col-span-2">
                <h4 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider">Recent Activity</h4>
                <div className="space-y-4">
                  <div className="flex items-center justify-between py-4 px-5 bg-gray-600 rounded-md">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-600 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold text-sm">O</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Last Order</div>
                        <div className="text-xs text-gray-400">Order #{Math.floor(Math.random() * 10000)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-medium text-white">
                        TZS {(customer.averageOrderValue || 0).toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-400">
                        {new Date(customer.lastOrderDate).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between py-4 px-5 bg-gray-600 rounded-md">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-600 rounded-md flex items-center justify-center">
                        <span className="text-white font-bold text-sm">J</span>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">Joined Platform</div>
                        <div className="text-xs text-gray-400">Member since</div>
                      </div>
                    </div>
                    <div className="text-sm text-gray-200">
                      {new Date(customer.joinDate).toLocaleDateString()}
                    </div>
                  </div>
                </div>
              </div>

              {/* Segmentation */}
              <div className="bg-gray-700 rounded-md p-5">
                <h4 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider">Segmentation</h4>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Segment</span>
                    <div className="mt-1">
                      <span className="px-3 py-1 text-sm font-medium bg-indigo-600 text-white rounded-md">
                        {customer.segment}
                      </span>
                    </div>
                  </div>
                  <div>
                    <span className="text-xs text-gray-400 uppercase tracking-wider">Tags</span>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {(customer.tags || []).map((tag, index) => (
                        <span key={index} className="px-3 py-1 text-xs font-medium bg-gray-600 text-gray-200 rounded-md">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-gray-700 rounded-md p-5">
                <h4 className="text-sm font-medium text-gray-300 mb-4 uppercase tracking-wider">Quick Actions</h4>
                <div className="space-y-3">
                  <button
                    onClick={() => onEdit(customer)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 hover:text-white rounded-md transition-colors duration-200"
                  >
                    Edit Customer
                  </button>
                  <button
                    onClick={() => onViewNotes(customer)}
                    className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 hover:text-white rounded-md transition-colors duration-200"
                  >
                    View Notes
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 hover:text-white rounded-md transition-colors duration-200">
                    Send Message
                  </button>
                  <button className="w-full text-left px-4 py-2 text-sm text-gray-200 hover:bg-gray-600 hover:text-white rounded-md transition-colors duration-200">
                    Create Order
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
