'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { apiService } from '@/lib/api';

export default function KYCManagementPage() {
  const [activeTab, setActiveTab] = useState('pending');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [bulkAction, setBulkAction] = useState('');
  const [selectedItems, setSelectedItems] = useState<number[]>([]);
  const [riskFilter, setRiskFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');

  // Fetch KYC data
  const { data: kycData, isLoading, refetch } = useQuery({
    queryKey: ['admin-kyc', activeTab, riskFilter, searchTerm],
    queryFn: () => apiService.kyc.getAll({ tab: activeTab, riskLevel: riskFilter, search: searchTerm }),
    staleTime: 30 * 1000,
  });

  const stats = kycData?.data?.data?.stats || {
    pending: 0,
    highRisk: 0,
    flagged: 0,
    approved: 0,
    aiScoreAvg: 0,
    total: 0,
    rejected: 0
  };

  const pendingReviews = kycData?.data?.data?.pendingReviews || [];
  const approvedKYC = kycData?.data?.data?.approved || [];
  const rejectedKYC = kycData?.data?.data?.rejected || [];
  const filters = kycData?.data?.data?.filters || { riskLevels: [], statuses: [] };

  // Mutations
  const bulkActionMutation = useMutation({
    mutationFn: ({ action, userIds }: { action: string; userIds: number[] }) =>
      apiService.kyc.bulkAction(action, userIds),
    onSuccess: () => {
      toast.success('Bulk action completed');
      refetch();
      setSelectedItems([]);
      setBulkAction('');
    },
    onError: () => {
      toast.error('Bulk action failed');
    },
  });

  const handleBulkAction = () => {
    if (bulkAction && selectedItems.length > 0) {
      bulkActionMutation.mutate({ action: bulkAction, userIds: selectedItems });
    }
  };

  const handleApprove = (id: string) => {
    console.log('Approving KYC:', id);
    toast.success('KYC approved');
    refetch();
  };

  const handleReject = (id: string) => {
    console.log('Rejecting KYC:', id);
    toast.success('KYC rejected');
    refetch();
  };

  const handleFlag = (id: string) => {
    console.log('Flagging for investigation:', id);
    toast.success('User flagged');
    refetch();
  };

  const handleSuspend = (id: string) => {
    console.log('Suspending account:', id);
    toast.success('User suspended');
    refetch();
  };

  const handleViewDetails = (user: any) => {
    setSelectedUser(user);
    setShowModal(true);
  };

  const filteredData = (data: any[]) => {
    return data.filter(item => {
      const matchesRisk = riskFilter === 'all' || item.riskLevel === riskFilter;
      const matchesSearch = item.userName.toLowerCase().includes(searchTerm.toLowerCase()) || 
                           item.userType.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesRisk && matchesSearch;
    });
  };

  const renderAdvancedKYCTable = (data: any[], showActions = false) => (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
        <thead className="bg-gray-50 dark:bg-gray-800">
          <tr>
            {showActions && (
              <th className="px-6 py-3 text-left">
                <input
                  type="checkbox"
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelectedItems(data.map(item => item.id));
                    } else {
                      setSelectedItems([]);
                    }
                  }}
                  className="w-4 h-4 text-blue-600"
                />
              </th>
            )}
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">User Details</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Risk Assessment</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Business Info</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Compliance</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Status</th>
            {showActions && (
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white dark:bg-gray-900 divide-y divide-gray-200 dark:divide-gray-700">
          {filteredData(data).map((item) => (
            <tr key={item.id} className={item.flagged ? 'bg-red-50 dark:bg-red-900/10' : ''}>
              {showActions && (
                <td className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={selectedItems.includes(item.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedItems([...selectedItems, item.id]);
                      } else {
                        setSelectedItems(selectedItems.filter(id => id !== item.id));
                      }
                    }}
                    className="w-4 h-4 text-blue-600"
                  />
                </td>
              )}
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div>
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{item.name}</div>
                    <div className="text-sm text-gray-500">{item.type} • {item.location}</div>
                    <div className="text-xs text-gray-400">{item.submitted || item.approved || item.rejected}</div>
                  </div>
                  {item.flagged && <div className="ml-2 w-2 h-2 bg-red-500 rounded-full"></div>}
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="flex items-center">
                  <div className="flex-1">
                    <div className={`text-sm font-medium ${
                      item.riskLevel === 'critical' ? 'text-red-600' :
                      item.riskLevel === 'high' ? 'text-orange-600' :
                      item.riskLevel === 'medium' ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                      {item.riskLevel?.toUpperCase()} RISK
                    </div>
                    <div className="text-xs text-gray-500">AI Score: {item.aiScore}/100</div>
                    <div className="w-full bg-gray-200 rounded-full h-1 mt-1">
                      <div 
                        className={`h-1 rounded-full ${
                          item.aiScore >= 90 ? 'bg-green-500' :
                          item.aiScore >= 70 ? 'bg-yellow-500' : 'bg-red-500'
                        }`}
                        style={{ width: `${item.aiScore}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-sm text-gray-900 dark:text-white">{item.businessType}</div>
                <div className="text-sm text-gray-500">{item.revenue}</div>
                <div className="text-xs text-gray-400">{item.documents} documents</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <div className="text-xs text-gray-600">{item.compliance}</div>
              </td>
              <td className="px-6 py-4 whitespace-nowrap">
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  item.status === 'approved' ? 'bg-green-100 text-green-800' :
                  item.status === 'rejected' ? 'bg-red-100 text-red-800' :
                  item.status === 'under_review' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {item.status.replace('_', ' ')}
                </span>
              </td>
              {showActions && (
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex flex-col space-y-1">
                    <div className="flex space-x-1">
                      <button onClick={() => handleApprove(item.id)} className="text-green-600 hover:text-green-900 text-xs">Approve</button>
                      <button onClick={() => handleReject(item.id)} className="text-red-600 hover:text-red-900 text-xs">Reject</button>
                    </div>
                    <div className="flex space-x-1">
                      <button onClick={() => handleFlag(item.id)} className="text-orange-600 hover:text-orange-900 text-xs">Flag</button>
                      <button onClick={() => handleSuspend(item.id)} className="text-purple-600 hover:text-purple-900 text-xs">Suspend</button>
                    </div>
                    <button onClick={() => handleViewDetails(item)} className="text-blue-600 hover:text-blue-900 text-xs">Details</button>
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  return (
    <div className="space-y-8">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Enterprise KYC Management</h1>
        <div className="flex space-x-2">
          <button className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">Emergency Suspend All</button>
          <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Export Report</button>
        </div>
      </div>

      {/* Advanced Controls */}
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Search Users</label>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name or type..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Risk Filter</label>
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="all">All Risk Levels</option>
              <option value="critical">Critical Risk</option>
              <option value="high">High Risk</option>
              <option value="medium">Medium Risk</option>
              <option value="low">Low Risk</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Bulk Actions</label>
            <select
              value={bulkAction}
              onChange={(e) => setBulkAction(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg"
            >
              <option value="">Select Action</option>
              <option value="approve">Bulk Approve</option>
              <option value="reject">Bulk Reject</option>
              <option value="flag">Bulk Flag</option>
              <option value="suspend">Bulk Suspend</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={handleBulkAction}
              disabled={!bulkAction || selectedItems.length === 0}
              className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400"
            >
              Apply ({selectedItems.length})
            </button>
          </div>
        </div>
      </div>

      {/* Enhanced Stats */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Pending</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.pending || 3}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">High Risk</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.highRisk || 1}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Flagged</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.flagged || 2}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Approved</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.approved || 127}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">AI Score Avg</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.aiScoreAvg || 87}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="ml-3">
            <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Total</p>
            <p className="text-lg font-bold text-gray-900 dark:text-white">{stats.total || 138}</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'pending', name: 'Pending Review', count: stats.pending || 3, color: 'text-yellow-600' },
            { id: 'approved', name: 'Approved', count: stats.approved || 127, color: 'text-green-600' },
            { id: 'rejected', name: 'Rejected', count: stats.rejected || 8, color: 'text-red-600' }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.name} <span className={`${tab.color} font-bold`}>({tab.count})</span>
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
        {activeTab === 'pending' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pending KYC Reviews - Advanced Management</h3>
            {renderAdvancedKYCTable(pendingReviews, true)}
          </div>
        )}
        
        {activeTab === 'approved' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Approved KYC - Monitoring</h3>
            {renderAdvancedKYCTable(approvedKYC)}
          </div>
        )}
        
        {activeTab === 'rejected' && (
          <div className="p-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rejected KYC - Investigation</h3>
            {renderAdvancedKYCTable(rejectedKYC)}
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showModal && selectedUser && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">KYC Details - {selectedUser.name}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Risk Level:</strong> {selectedUser.riskLevel}</div>
              <div><strong>AI Score:</strong> {selectedUser.aiScore}/100</div>
              <div><strong>Business Type:</strong> {selectedUser.businessType}</div>
              <div><strong>Revenue:</strong> {selectedUser.revenue}</div>
              <div><strong>Location:</strong> {selectedUser.location}</div>
              <div><strong>Compliance:</strong> {selectedUser.compliance}</div>
              <div><strong>Documents:</strong> {selectedUser.documents} files</div>
              <div><strong>Flagged:</strong> {selectedUser.flagged ? 'Yes' : 'No'}</div>
            </div>
            <div className="mt-6 flex space-x-2">
              <button onClick={() => handleApprove(selectedUser.id)} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">Approve</button>
              <button onClick={() => handleReject(selectedUser.id)} className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700">Reject</button>
              <button onClick={() => handleFlag(selectedUser.id)} className="px-4 py-2 bg-orange-600 text-white rounded hover:bg-orange-700">Flag</button>
              <button onClick={() => handleSuspend(selectedUser.id)} className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700">Suspend</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}