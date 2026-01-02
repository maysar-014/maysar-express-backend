"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, formatCurrency, capitalize } from '@/lib/utils';

interface ApprovalRequest {
  id: string;
  type: 'admin_creation' | 'user_suspension' | 'financial_transaction' | 'system_config' | 'bulk_operation' | 'security_action';
  title: string;
  description: string;
  requestedBy: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
  requestedAt: string;
  status: 'pending' | 'approved' | 'rejected' | 'expired';
  priority: 'low' | 'medium' | 'high' | 'critical';
  approvals: {
    approverId: string;
    approverName: string;
    approverEmail: string;
    approvedAt: string;
    comments?: string;
  }[];
  requiredApprovals: number;
  currentApprovals: number;
  expiresAt: string;
  metadata: Record<string, unknown>;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  businessImpact: string;
  technicalDetails: Record<string, unknown>;
}

interface ApprovalRule {
  id: string;
  name: string;
  type: string;
  requiredApprovals: number;
  approverRoles: string[];
  conditions: Record<string, unknown>;
  enabled: boolean;
  createdAt: string;
}

export default function ApprovalWorkflowPage() {
  const [activeTab, setActiveTab] = useState<'pending' | 'history' | 'rules'>('pending');
  const [selectedRequest, setSelectedRequest] = useState<ApprovalRequest | null>(null);
  const [showCreateRule, setShowCreateRule] = useState(false);

  // Fetch approval requests
  const { data: requestsData, isLoading: requestsLoading, refetch: refetchRequests } = useQuery({
    queryKey: ['approval-requests'],
    queryFn: () => apiService.approvals.getRequests(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });

  // Fetch approval rules
  const { data: rulesData, isLoading: rulesLoading, refetch: refetchRules } = useQuery({
    queryKey: ['approval-rules'],
    queryFn: () => apiService.approvals.getRules(),
    staleTime: 5 * 60 * 1000,
  });

  const requests = requestsData?.data || [];
  const rules = rulesData?.data || [];

  // Mutations
  const approveRequestMutation = useMutation({
    mutationFn: ({ id, comments }: { id: string; comments?: string }) =>
      apiService.approvals.approve(id, comments),
    onSuccess: () => {
      toast.success('Request approved successfully');
      refetchRequests();
      setSelectedRequest(null);
    },
    onError: () => {
      toast.error('Failed to approve request');
    },
  });

  const rejectRequestMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      apiService.approvals.reject(id, reason),
    onSuccess: () => {
      toast.success('Request rejected');
      refetchRequests();
      setSelectedRequest(null);
    },
    onError: () => {
      toast.error('Failed to reject request');
    },
  });

  const createRuleMutation = useMutation({
    mutationFn: (ruleData: Partial<ApprovalRule>) =>
      apiService.approvals.createRule(ruleData),
    onSuccess: () => {
      toast.success('Approval rule created successfully');
      refetchRules();
      setShowCreateRule(false);
    },
    onError: () => {
      toast.error('Failed to create approval rule');
    },
  });

  // Request columns
  const requestColumns: Column<ApprovalRequest>[] = [
    {
      key: 'requestedAt',
      header: 'Requested',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'financial_transaction' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'security_action' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
          value === 'system_config' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'title',
      header: 'Request',
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xs">
            {row.description}
          </div>
        </div>
      ),
    },
    {
      key: 'requestedBy',
      header: 'Requested By',
      render: (value) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value.name}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{value.role}</div>
        </div>
      ),
    },
    {
      key: 'priority',
      header: 'Priority',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'high' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
          value === 'medium' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
        }`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'currentApprovals',
      header: 'Approvals',
      render: (value, row) => (
        <div className="text-center">
          <div className={`text-lg font-bold ${
            value >= row.requiredApprovals ? 'text-green-600' : 'text-gray-600'
          }`}>
            {value}/{row.requiredApprovals}
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
            <div
              className={`h-2 rounded-full ${
                value >= row.requiredApprovals ? 'bg-green-500' : 'bg-blue-500'
              }`}
              style={{ width: `${(value / row.requiredApprovals) * 100}%` }}
            ></div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'expired' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        }`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'expiresAt',
      header: 'Expires',
      render: (value) => {
        const isExpired = new Date(value) < new Date();
        return (
          <span className={isExpired ? 'text-red-600 font-medium' : 'text-gray-600'}>
            {formatDate(value)}
          </span>
        );
      },
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedRequest(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Review
          </button>
          {row.status === 'pending' && row.currentApprovals < row.requiredApprovals && (
            <>
              <button
                onClick={() => approveRequestMutation.mutate({ id: row.id })}
                className="text-green-600 hover:text-green-900 text-sm font-medium"
              >
                Approve
              </button>
              <button
                onClick={() => {
                  const reason = prompt('Rejection reason:');
                  if (reason) rejectRequestMutation.mutate({ id: row.id, reason });
                }}
                className="text-red-600 hover:text-red-900 text-sm font-medium"
              >
                Reject
              </button>
            </>
          )}
        </div>
      ),
    },
  ];

  // Rule columns
  const ruleColumns: Column<ApprovalRule>[] = [
    {
      key: 'name',
      header: 'Rule Name',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {value}
        </span>
      ),
    },
    {
      key: 'requiredApprovals',
      header: 'Required Approvals',
      render: (value) => (
        <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'approverRoles',
      header: 'Approver Roles',
      render: (value: string[]) => (
        <div className="flex flex-wrap gap-1">
          {value.map((role, index) => (
            <span
              key={index}
              className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
            >
              {role}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: 'enabled',
      header: 'Status',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {value ? 'Active' : 'Inactive'}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (value) => formatDate(value),
    },
  ];

  const pendingRequests = requests.filter((req: ApprovalRequest) => req.status === 'pending');
  const criticalRequests = pendingRequests.filter((req: ApprovalRequest) => req.priority === 'critical');

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Approval Workflow Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Two-person approval system for critical operations
          </p>
        </div>

        <div className="flex items-center space-x-3">
          {activeTab === 'rules' && (
            <button
              onClick={() => setShowCreateRule(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              Create Rule
            </button>
          )}
          <button
            onClick={() => {
              refetchRequests();
              refetchRules();
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Critical Alerts */}
      {criticalRequests.length > 0 && (
        <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-red-500 rounded-full mr-3 animate-pulse"></div>
            <div>
              <h3 className="text-red-800 dark:text-red-300 font-medium">
                {criticalRequests.length} Critical Approval{criticalRequests.length > 1 ? 's' : ''} Pending
              </h3>
              <p className="text-red-700 dark:text-red-400 text-sm">
                Immediate attention required for high-priority requests
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Pending Approvals
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {pendingRequests.length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Critical Priority
            </dt>
            <dd className="text-lg font-semibold text-red-600">
              {criticalRequests.length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Approved Today
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {requests.filter((req: ApprovalRequest) => 
                req.status === 'approved' && 
                new Date(req.requestedAt).toDateString() === new Date().toDateString()
              ).length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Active Rules
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {rules.filter((rule: ApprovalRule) => rule.enabled).length}
            </dd>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Pending Requests ({pendingRequests.length})
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'history'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            All Requests ({requests.length})
          </button>
          <button
            onClick={() => setActiveTab('rules')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'rules'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Approval Rules ({rules.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'pending' && (
        <DataTable
          data={pendingRequests}
          columns={requestColumns}
          searchable={true}
          searchPlaceholder="Search pending requests..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={requestsLoading}
          emptyMessage="No pending approval requests"
          className="shadow-sm"
        />
      )}

      {activeTab === 'history' && (
        <DataTable
          data={requests}
          columns={requestColumns}
          searchable={true}
          searchPlaceholder="Search all requests..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={requestsLoading}
          emptyMessage="No approval requests found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'rules' && (
        <DataTable
          data={rules}
          columns={ruleColumns}
          searchable={true}
          searchPlaceholder="Search approval rules..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={rulesLoading}
          emptyMessage="No approval rules found"
          className="shadow-sm"
        />
      )}

      {/* Request Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setSelectedRequest(null)}></div>
            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-medium text-gray-900 dark:text-white">
                  Approval Request Details
                </h3>
                <button
                  onClick={() => setSelectedRequest(null)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Request Type
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {capitalize(selectedRequest.type.replace('_', ' '))}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Title
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {selectedRequest.title}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Description
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {selectedRequest.description}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Business Impact
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {selectedRequest.businessImpact}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Priority
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {capitalize(selectedRequest.priority)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Risk Level
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {capitalize(selectedRequest.riskLevel)}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Requested By
                    </label>
                    <div className="mt-1">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedRequest.requestedBy.name}
                      </p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        {selectedRequest.requestedBy.email} • {selectedRequest.requestedBy.role}
                      </p>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Approval Progress
                    </label>
                    <div className="mt-2">
                      <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400 mb-1">
                        <span>Approvals</span>
                        <span>{selectedRequest.currentApprovals}/{selectedRequest.requiredApprovals}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            selectedRequest.currentApprovals >= selectedRequest.requiredApprovals ? 'bg-green-500' : 'bg-blue-500'
                          }`}
                          style={{ width: `${(selectedRequest.currentApprovals / selectedRequest.requiredApprovals) * 100}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Approvals Received
                    </label>
                    <div className="space-y-2">
                      {selectedRequest.approvals.map((approval, index) => (
                        <div key={index} className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium text-green-800 dark:text-green-300">
                                {approval.approverName}
                              </p>
                              <p className="text-sm text-green-600 dark:text-green-400">
                                {approval.approverEmail}
                              </p>
                            </div>
                            <span className="text-xs text-green-600 dark:text-green-400">
                              {formatDate(approval.approvedAt)}
                            </span>
                          </div>
                          {approval.comments && (
                            <p className="mt-2 text-sm text-green-700 dark:text-green-300">
                              "{approval.comments}"
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Requested At
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDate(selectedRequest.requestedAt)}
                      </p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Expires At
                      </label>
                      <p className="mt-1 text-sm text-gray-900 dark:text-white">
                        {formatDate(selectedRequest.expiresAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {selectedRequest.status === 'pending' && selectedRequest.currentApprovals < selectedRequest.requiredApprovals && (
                <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200 dark:border-gray-700 mt-6">
                  <button
                    onClick={() => {
                      const reason = prompt('Rejection reason:');
                      if (reason) rejectRequestMutation.mutate({ id: selectedRequest.id, reason });
                    }}
                    className="px-4 py-2 text-sm font-medium text-red-700 bg-red-100 border border-red-300 rounded-md hover:bg-red-200 dark:bg-red-900 dark:border-red-700 dark:text-red-300 dark:hover:bg-red-800"
                  >
                    Reject Request
                  </button>
                  <button
                    onClick={() => {
                      const comments = prompt('Approval comments (optional):');
                      approveRequestMutation.mutate({ id: selectedRequest.id, comments: comments || undefined });
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                  >
                    Approve Request
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}