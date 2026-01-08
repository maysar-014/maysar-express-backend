'use client';

import { useQuery } from '@tanstack/react-query';
import { apiService } from '@/lib/api';
import { getSeller } from '@/lib/permissions';
import { useState } from 'react';


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

export default function CustomersPage() {
  const seller = getSeller();

  const [showFormModal, setShowFormModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showNotesModal, setShowNotesModal] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [selectedCustomers, setSelectedCustomers] = useState<string[]>([]);
  const [segmentFilter, setSegmentFilter] = useState('All Segments');
  const [tagFilter, setTagFilter] = useState('All Tags');
  const [dateRange, setDateRange] = useState('All Time');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Status');
  const [typeFilter, setTypeFilter] = useState('All Types');
  const [customerDirectoryPage, setCustomerDirectoryPage] = useState(0);
  const [topCustomersPage, setTopCustomersPage] = useState(0);
  const customersPerPage = 10;

  const { data: customersData, isLoading } = useQuery({
    queryKey: ['customers'],
    queryFn: () => apiService.getCustomers(),
    staleTime: 30 * 1000,
  });

  const customers = customersData?.data?.data?.customers || [];
  const stats = customersData?.data?.data?.stats || {};

  // Filter customers based on search and filters
  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesSearch = searchTerm === '' || 
      customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      customer.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'All Status' || 
      customer.status.toLowerCase() === statusFilter.toLowerCase();
    
    const matchesType = typeFilter === 'All Types' || 
      customer.customerType.toLowerCase() === typeFilter.toLowerCase();
    
    return matchesSearch && matchesStatus && matchesType;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getCustomerTypeColor = (type: string) => {
    switch (type) {
      case 'premium': return 'bg-purple-100 text-purple-800';
      case 'regular': return 'bg-blue-100 text-blue-800';
      case 'new': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Management</h1>
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            Manage customer relationships and track engagement
          </p>
        </div>
        <div className="flex space-x-3">
          <button className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 text-sm">
            Export Customers
          </button>
          <button className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm">
            Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Total Customers</p>
          <p className="text-xl font-bold text-blue-600">{stats.totalCustomers || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">All time</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Active Customers</p>
          <p className="text-xl font-bold text-green-600">{stats.activeCustomers || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Currently engaged</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">New This Month</p>
          <p className="text-xl font-bold text-purple-600">{stats.newThisMonth || 0}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Recent signups</p>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <p className="text-xs font-medium text-gray-600 dark:text-gray-400 uppercase tracking-wider">Avg Lifetime Value</p>
          <p className="text-xl font-bold text-orange-600">TZS {(stats.averageLifetimeValue || 0).toLocaleString()}</p>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Per customer</p>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-md border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Customer Directory</h3>
            <div className="flex space-x-2">
              <input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option>All Status</option>
                <option>Active</option>
                <option>Inactive</option>
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option>All Types</option>
                <option>Premium</option>
                <option>Regular</option>
                <option>New</option>
              </select>
              <div className="flex space-x-1">
                <button
                  onClick={() => setCustomerDirectoryPage(Math.max(0, customerDirectoryPage - 1))}
                  disabled={customerDirectoryPage === 0}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
                >
                  Prev
                </button>
                <button
                  onClick={() => setCustomerDirectoryPage(customerDirectoryPage + 1)}
                  disabled={(customerDirectoryPage + 1) * customersPerPage >= filteredCustomers.length}
                  className="px-2 py-1 text-xs border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase min-w-[180px]">Customer</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Contact</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase min-w-[140px]">Orders</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Total Spent</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Last Order</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    Loading customers...
                  </td>
                </tr>
              ) : filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-gray-500 dark:text-gray-400">
                    {searchTerm || statusFilter !== 'All Status' || typeFilter !== 'All Types' 
                      ? 'No customers match your search criteria' 
                      : 'No customers found'}
                  </td>
                </tr>
              ) : (
                filteredCustomers
                  .slice(customerDirectoryPage * customersPerPage, (customerDirectoryPage + 1) * customersPerPage)
                  .map((customer: Customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-6 py-4 min-w-[180px]">
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{customer.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.location}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="text-sm text-gray-900 dark:text-white">{customer.email}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{customer.phone}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 min-w-[140px]">
                      <div>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{customer.totalOrders} orders</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">Avg: TZS {customer.averageOrderValue.toLocaleString()}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                      TZS {customer.totalSpent.toLocaleString()}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${getCustomerTypeColor(customer.customerType)}`}>
                        {customer.customerType}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-3 py-1 text-xs font-medium rounded-md whitespace-nowrap ${getStatusColor(customer.status)}`}>
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                      {new Date(customer.lastOrderDate).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button className="text-blue-600 hover:text-blue-800 text-sm">View</button>
                        <button className="text-green-600 hover:text-green-800 text-sm">Contact</button>
                        <button className="text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 text-sm">Edit</button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-4">Customer Insights</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">Premium Customers</span>
              <span className="text-lg font-bold text-purple-600">{customers.filter((c: any) => c.customerType === 'premium').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">Regular Customers</span>
              <span className="text-lg font-bold text-blue-600">{customers.filter((c: any) => c.customerType === 'regular').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">New Customers</span>
              <span className="text-lg font-bold text-yellow-600">{customers.filter((c: any) => c.customerType === 'new').length}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400 uppercase tracking-wider">Inactive Customers</span>
              <span className="text-lg font-bold text-red-600">{customers.filter((c: any) => c.status === 'inactive').length}</span>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-4 rounded-md border border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white">Top Customers</h3>
            <div className="flex space-x-2">
              <button
                onClick={() => setTopCustomersPage(Math.max(0, topCustomersPage - 1))}
                disabled={topCustomersPage === 0}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Prev
              </button>
              <button
                onClick={() => setTopCustomersPage(topCustomersPage + 1)}
                disabled={(topCustomersPage + 1) * 2 >= customers.length}
                className="px-2 py-1 text-xs border rounded disabled:opacity-50 text-gray-700 dark:text-gray-300"
              >
                Next
              </button>
            </div>
          </div>
          <div className="space-y-3">
            {customers
              .sort((a: any, b: any) => b.totalSpent - a.totalSpent)
              .slice(topCustomersPage * 2, (topCustomersPage + 1) * 2)
              .map((customer: Customer) => (
                <div key={customer.id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-md">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{customer.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{customer.totalOrders} orders</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">TZS {customer.totalSpent.toLocaleString()}</p>
                    <span className={`text-xs px-2 py-1 rounded-md ${getCustomerTypeColor(customer.customerType)}`}>
                      {customer.customerType}
                    </span>
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      </div>

    </div>
  );
}
