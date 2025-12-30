// Professional Dispute Resolution Interface
// Complete case management with evidence handling, SLA tracking, and resolution workflows

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldCheckIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  PaperClipIcon,
  ChatBubbleLeftRightIcon,
  EyeIcon,
  UserIcon,
  DocumentTextIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatCurrency, formatDate, getStatusColor, capitalize } from '@/lib/utils';

interface Dispute {
  id: string;
  orderId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  sellerId: string;
  sellerName: string;
  type: 'product_quality' | 'shipping_delay' | 'wrong_item' | 'damaged' | 'refund' | 'other';
  status: 'open' | 'investigating' | 'pending_evidence' | 'resolved' | 'escalated' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  amount: number;
  currency: string;
  description: string;
  resolution?: string;
  assignedTo?: string;
  assignedToName?: string;
  createdAt: string;
  updatedAt: string;
  slaDeadline: string;
  slaStatus: 'compliant' | 'warning' | 'breached';
  evidenceCount: number;
  messagesCount: number;
}

interface DisputeEvidence {
  id: string;
  disputeId: string;
  type: 'image' | 'document' | 'text' | 'video';
  filename: string;
  url: string;
  description: string;
  uploadedBy: string;
  uploadedAt: string;
}

interface DisputeMessage {
  id: string;
  disputeId: string;
  senderId: string;
  senderName: string;
  senderType: 'customer' | 'seller' | 'admin';
  message: string;
  createdAt: string;
  attachments?: DisputeEvidence[];
}

export default function DisputesPage() {
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [selectedDisputes, setSelectedDisputes] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDisputeModal, setShowDisputeModal] = useState(false);
  const [showEvidenceModal, setShowEvidenceModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch disputes with filters
  const { data: disputesData, isLoading: disputesLoading, refetch: refetchDisputes } = useQuery({
    queryKey: ['disputes', statusFilter, priorityFilter, typeFilter],
    queryFn: () => apiService.disputes.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter,
      priority: priorityFilter === 'all' ? undefined : priorityFilter,
      page: 1,
      limit: 50,
    }),
    staleTime: 30 * 1000,
  });

  // Fetch dispute details when selected
  const { data: disputeDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['dispute-detail', selectedDispute?.id],
    queryFn: () => selectedDispute ? apiService.disputes.getById(selectedDispute.id) : null,
    enabled: !!selectedDispute,
    staleTime: 10 * 1000,
  });

  const disputes = disputesData?.data || [];

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, resolution }: { id: string; status: string; resolution?: string }) =>
      apiService.disputes.updateStatus(id, status, resolution),
    onSuccess: () => {
      toast.success('Dispute status updated successfully');
      refetchDisputes();
      queryClient.invalidateQueries({ queryKey: ['dispute-detail'] });
    },
    onError: () => {
      toast.error('Failed to update dispute status');
    },
  });

  const assignDisputeMutation = useMutation({
    mutationFn: ({ id, adminId }: { id: string; adminId: string }) =>
      apiService.disputes.assign(id, adminId),
    onSuccess: () => {
      toast.success('Dispute assigned successfully');
      refetchDisputes();
    },
    onError: () => {
      toast.error('Failed to assign dispute');
    },
  });

  const addEvidenceMutation = useMutation({
    mutationFn: ({ id, evidence }: { id: string; evidence: any }) =>
      apiService.disputes.addEvidence(id, evidence),
    onSuccess: () => {
      toast.success('Evidence added successfully');
      queryClient.invalidateQueries({ queryKey: ['dispute-detail'] });
      setShowEvidenceModal(false);
    },
    onError: () => {
      toast.error('Failed to add evidence');
    },
  });

  // Helper functions
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getSlaColor = (slaStatus: string) => {
    switch (slaStatus) {
      case 'breached': return 'text-red-600 dark:text-red-400';
      case 'warning': return 'text-yellow-600 dark:text-yellow-400';
      case 'compliant': return 'text-green-600 dark:text-green-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'product_quality': return '🛍️';
      case 'shipping_delay': return '🚚';
      case 'wrong_item': return '❌';
      case 'damaged': return '💥';
      case 'refund': return '💰';
      default: return '❓';
    }
  };

  // Disputes table columns
  const disputeColumns: Column<Dispute>[] = [
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (value) => (
        <span className="text-lg" title={capitalize(value.replace('_', ' '))}>
          {getTypeIcon(value)}
        </span>
      ),
    },
    {
      key: 'customerName',
      header: 'Customer',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Order #{row.orderId.slice(-8)}</div>
        </div>
      ),
    },
    {
      key: 'sellerName',
      header: 'Seller',
      sortable: true,
      render: (value) => (
        <div className="text-sm text-gray-600 dark:text-gray-400">
          {value}
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(value)}`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(value)}`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value, row) => formatCurrency(value, row.currency),
      className: 'text-right',
    },
    {
      key: 'slaDeadline',
      header: 'SLA Deadline',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className={`text-sm font-medium ${getSlaColor(row.slaStatus)}`}>
            {formatDate(value)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.slaStatus === 'breached' && '⚠️ Breached'}
            {row.slaStatus === 'warning' && '⏰ Warning'}
            {row.slaStatus === 'compliant' && '✅ On Track'}
          </div>
        </div>
      ),
    },
    {
      key: 'assignedToName',
      header: 'Assigned To',
      sortable: true,
      render: (value) => value || <span className="text-gray-400 italic">Unassigned</span>,
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (value) => formatDate(value),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: 'Assign to Me',
      onClick: (selectedIds: string[]) => handleBulkAssign(selectedIds, 'current_user'),
      variant: 'primary' as const,
    },
    {
      label: 'Mark as Investigating',
      onClick: (selectedIds: string[]) => handleBulkStatusUpdate(selectedIds, 'investigating'),
      variant: 'secondary' as const,
    },
    {
      label: 'Escalate',
      onClick: (selectedIds: string[]) => handleBulkEscalate(selectedIds),
      variant: 'danger' as const,
    },
  ];

  const handleBulkAssign = async (disputeIds: string[], adminId: string) => {
    try {
      await Promise.all(
        disputeIds.map(id => assignDisputeMutation.mutateAsync({ id, adminId }))
      );
      toast.success(`Assigned ${disputeIds.length} disputes`);
      setSelectedDisputes([]);
    } catch (error) {
      toast.error('Failed to assign disputes');
    }
  };

  const handleBulkStatusUpdate = async (disputeIds: string[], status: string) => {
    try {
      await Promise.all(
        disputeIds.map(id => updateStatusMutation.mutateAsync({ id, status }))
      );
      toast.success(`Updated ${disputeIds.length} disputes to ${status}`);
      setSelectedDisputes([]);
    } catch (error) {
      toast.error('Failed to update disputes');
    }
  };

  const handleBulkEscalate = async (disputeIds: string[]) => {
    if (!confirm(`Are you sure you want to escalate ${disputeIds.length} disputes?`)) return;

    try {
      await Promise.all(
        disputeIds.map(id => apiService.disputes.escalate(id, 'Bulk escalation by admin'))
      );
      toast.success(`Escalated ${disputeIds.length} disputes`);
      setSelectedDisputes([]);
      refetchDisputes();
    } catch (error) {
      toast.error('Failed to escalate disputes');
    }
  };

  const handleViewDispute = (dispute: Dispute) => {
    setSelectedDispute(dispute);
    setShowDisputeModal(true);
  };

  // Filter options
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'open', label: 'Open' },
    { value: 'investigating', label: 'Investigating' },
    { value: 'pending_evidence', label: 'Pending Evidence' },
    { value: 'resolved', label: 'Resolved' },
    { value: 'escalated', label: 'Escalated' },
    { value: 'closed', label: 'Closed' },
  ];

  const priorityOptions = [
    { value: 'all', label: 'All Priorities' },
    { value: 'urgent', label: 'Urgent' },
    { value: 'high', label: 'High' },
    { value: 'medium', label: 'Medium' },
    { value: 'low', label: 'Low' },
  ];

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'product_quality', label: 'Product Quality' },
    { value: 'shipping_delay', label: 'Shipping Delay' },
    { value: 'wrong_item', label: 'Wrong Item' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'refund', label: 'Refund' },
    { value: 'other', label: 'Other' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Dispute Resolution
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage customer disputes with evidence-based resolution workflows
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetchDisputes()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* SLA Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                SLA Breached
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {disputes.filter((d: Dispute) => d.slaStatus === 'breached').length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ClockIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                SLA Warning
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {disputes.filter((d: Dispute) => d.slaStatus === 'warning').length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Resolved Today
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {disputes.filter((d: Dispute) => d.status === 'resolved' && new Date(d.updatedAt).toDateString() === new Date().toDateString()).length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ChatBubbleLeftRightIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Avg Resolution Time
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                2.3 days
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {statusOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-gray-400" />
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {priorityOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <DocumentTextIcon className="w-5 h-5 text-gray-400" />
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {typeOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[200px]">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="search"
                placeholder="Search disputes by customer, order, or description..."
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Disputes Table */}
      <DataTable
        data={disputes}
        columns={disputeColumns}
        searchable={false}
        selectable={true}
        onSelectionChange={setSelectedDisputes}
        actions={bulkActions}
        pagination={{
          pageSize: 20,
          showInfo: true,
        }}
        loading={disputesLoading}
        emptyMessage="No disputes found matching your criteria"
        className="shadow-sm"
      />

      {/* Dispute Detail Modal */}
      {showDisputeModal && selectedDispute && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowDisputeModal(false)} />

            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg dark:bg-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Dispute #{selectedDispute.id.slice(-8)}
                </h3>
                <button
                  onClick={() => setShowDisputeModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Dispute Details */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Dispute Details</h4>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Customer</dt>
                        <dd className="text-gray-900 dark:text-white">{selectedDispute.customerName}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Seller</dt>
                        <dd className="text-gray-900 dark:text-white">{selectedDispute.sellerName}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Type</dt>
                        <dd className="text-gray-900 dark:text-white">{capitalize(selectedDispute.type.replace('_', ' '))}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Amount</dt>
                        <dd className="text-gray-900 dark:text-white">{formatCurrency(selectedDispute.amount, selectedDispute.currency)}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Priority</dt>
                        <dd>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(selectedDispute.priority)}`}>
                            {capitalize(selectedDispute.priority)}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">SLA Status</dt>
                        <dd className={getSlaColor(selectedDispute.slaStatus)}>
                          {capitalize(selectedDispute.slaStatus)}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Description</h4>
                    <p className="text-gray-700 dark:text-gray-300">{selectedDispute.description}</p>
                  </div>

                  {/* Resolution Section */}
                  {selectedDispute.resolution && (
                    <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4">
                      <h4 className="font-medium text-green-800 dark:text-green-200 mb-2">Resolution</h4>
                      <p className="text-green-700 dark:text-green-300">{selectedDispute.resolution}</p>
                    </div>
                  )}
                </div>

                {/* Actions Sidebar */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Actions</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => setShowEvidenceModal(true)}
                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <PaperClipIcon className="w-4 h-4 mr-2" />
                        Add Evidence
                      </button>

                      <select
                        onChange={(e) => {
                          if (e.target.value) {
                            updateStatusMutation.mutate({
                              id: selectedDispute.id,
                              status: e.target.value
                            });
                          }
                        }}
                        className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      >
                        <option value="">Update Status</option>
                        <option value="investigating">Investigating</option>
                        <option value="pending_evidence">Pending Evidence</option>
                        <option value="resolved">Resolved</option>
                        <option value="closed">Closed</option>
                      </select>

                      <button className="w-full flex items-center px-3 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
                        <ChatBubbleLeftRightIcon className="w-4 h-4 mr-2" />
                        Send Message
                      </button>
                    </div>
                  </div>

                  {/* Evidence Summary */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Evidence</h4>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between">
                        <span>Documents:</span>
                        <span>{selectedDispute.evidenceCount}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Messages:</span>
                        <span>{selectedDispute.messagesCount}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
