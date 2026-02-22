"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { formatDate, capitalize } from '@/lib/utils';

interface KYCVerification {
  id: string;
  userId: string;
  userEmail: string;
  documentType: 'passport' | 'national_id' | 'drivers_license' | 'business_registration';
  status: 'pending' | 'under_review' | 'approved' | 'rejected';
  submittedAt: string;
  reviewedAt?: string;
  reviewerId?: string;
  riskScore?: number;
  notes?: string;
}

interface KYCReport {
  id: string;
  period: string;
  status: 'draft' | 'pending_review' | 'approved' | 'submitted';
  generatedAt: string;
  submittedAt?: string;
  fileUrl?: string;
  verificationCount: number;
  approvalRate: number;
}

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'kyc' | 'reports' | 'dashboard'>('dashboard');
  const [selectedVerification, setSelectedVerification] = useState<KYCVerification | null>(null);

  // Fetch KYC compliance data
  const { data: complianceData, isLoading, refetch } = useQuery({
    queryKey: ['kyc-compliance'],
    queryFn: () => fetch('http://localhost:3001/api/admin/compliance/kyc').then(res => res.json()),
    staleTime: 30 * 1000,
  });

  const kycVerifications = complianceData?.data?.kycVerifications || [];
  const reports = complianceData?.data?.reports || [];
  const stats = complianceData?.data?.stats || {};
  const recentActivity = complianceData?.data?.recentActivity || [];

  // Mutations
  const processKYCMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: string; notes?: string }) =>
      Promise.resolve({ success: true }),
    onSuccess: () => {
      toast.success('KYC verification processed');
      refetch();
      setSelectedVerification(null);
    },
    onError: () => {
      toast.error('Failed to process KYC verification');
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: (reportType: string) => Promise.resolve({ success: true }),
    onSuccess: () => {
      toast.success('KYC report generation started');
      refetch();
    },
    onError: () => {
      toast.error('Failed to generate report');
    },
  });

  // KYC columns
  const kycColumns: Column<KYCVerification>[] = [
    {
      key: 'submittedAt',
      header: 'Date',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'userEmail',
      header: 'User',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">ID: {row.userId}</div>
        </div>
      ),
    },
    {
      key: 'documentType',
      header: 'Document Type',
      sortable: true,
      render: (value) => (
        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'approved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'under_review' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      sortable: true,
      render: (value) => value ? (
        <span className={`font-medium ${
          value >= 80 ? 'text-red-600' :
          value >= 60 ? 'text-orange-600' :
          value >= 40 ? 'text-yellow-600' :
          'text-green-600'
        }`}>
          {value}
        </span>
      ) : <span className="text-gray-400">-</span>,
    },
    {
      key: 'reviewerId',
      header: 'Reviewer',
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {value || 'Unassigned'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <button
          onClick={() => setSelectedVerification(row)}
          className="text-blue-600 hover:text-blue-900 text-sm font-medium"
        >
          Review
        </button>
      ),
    },
  ];

  // Report columns
  const reportColumns: Column<KYCReport>[] = [
    {
      key: 'generatedAt',
      header: 'Generated',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'period',
      header: 'Period',
      sortable: true,
      render: (value) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">{value}</span>
      ),
    },
    {
      key: 'verificationCount',
      header: 'Verifications',
      sortable: true,
      render: (value) => (
        <span className="font-medium text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'approvalRate',
      header: 'Approval Rate',
      sortable: true,
      render: (value) => (
        <span className={`font-medium ${
          value >= 95 ? 'text-green-600' :
          value >= 85 ? 'text-yellow-600' :
          'text-red-600'
        }`}>
          {value}%
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'submitted' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'approved' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'pending_review' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          {row.fileUrl && (
            <a
              href={row.fileUrl}
              className="text-blue-600 hover:text-blue-900 text-sm font-medium"
              target="_blank"
              rel="noopener noreferrer"
            >
              Download
            </a>
          )}
          <button className="text-green-600 hover:text-green-900 text-sm font-medium">
            View
          </button>
        </div>
      ),
    },
  ];

  const pendingKYC = kycVerifications.filter((v: KYCVerification) => v.status === 'pending');
  const underReviewKYC = kycVerifications.filter((v: KYCVerification) => v.status === 'under_review');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            KYC Compliance
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Know Your Customer verification and monitoring
          </p>
        </div>
        <button
          onClick={() => generateReportMutation.mutate('kyc_monthly')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          Generate KYC Report
        </button>
      </div>

      {/* KYC KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending KYC</dt>
          <dd className="text-2xl font-bold text-yellow-600">{stats.pendingKyc || 0}</dd>
          <div className="text-sm text-gray-600 mt-1">
            {stats.underReview || 0} under review
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Approved Today</dt>
          <dd className="text-2xl font-bold text-green-600">{stats.approvedToday || 0}</dd>
          <div className="text-sm text-gray-600 mt-1">
            {stats.rejectedToday || 0} rejected
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Approval Rate</dt>
          <dd className="text-2xl font-bold text-green-600">{stats.approvalRate || 0}%</dd>
          <div className="text-sm text-green-600 mt-1">+{stats.rateGrowth || 0}% vs last month</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Avg Review Time</dt>
          <dd className="text-2xl font-bold text-blue-600">{stats.avgReviewTime || 0}h</dd>
          <div className="text-sm text-gray-600 mt-1">Target: &lt;24h</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('kyc')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'kyc'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            KYC Verifications ({pendingKYC.length})
          </button>
          <button
            onClick={() => setActiveTab('reports')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'reports'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Reports ({reports.length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'dashboard' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              KYC Verification Status
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Pending Review</span>
                <span className="text-sm font-medium text-yellow-600">{stats.pendingKyc || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Under Review</span>
                <span className="text-sm font-medium text-blue-600">{stats.underReview || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Approved</span>
                <span className="text-sm font-medium text-green-600">{stats.approved || 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600 dark:text-gray-400">Rejected</span>
                <span className="text-sm font-medium text-red-600">{stats.rejected || 0}</span>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Recent Activity
            </h3>
            <div className="space-y-3">
              {recentActivity.map((activity: any, index: number) => (
                <div key={activity.id || index} className="flex items-center text-sm">
                  <div className={`w-2 h-2 rounded-full mr-3 ${
                    activity.type === 'approved' ? 'bg-green-500' :
                    activity.type === 'rejected' ? 'bg-red-500' :
                    activity.type === 'submitted' ? 'bg-blue-500' :
                    'bg-yellow-500'
                  }`}></div>
                  <span className="text-gray-600 dark:text-gray-400">{activity.description}</span>
                  <span className="ml-auto text-xs text-gray-500">{activity.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'kyc' && (
        <DataTable
          data={kycVerifications}
          columns={kycColumns}
          searchable={true}
          searchPlaceholder="Search KYC verifications..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={isLoading}
          emptyMessage="No KYC verifications found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'reports' && (
        <DataTable
          data={reports}
          columns={reportColumns}
          searchable={true}
          searchPlaceholder="Search KYC reports..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={isLoading}
          emptyMessage="No KYC reports found"
          className="shadow-sm"
        />
      )}

      {/* KYC Verification Modal */}
      {selectedVerification && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSelectedVerification(null)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
                Review KYC Verification
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Document Type: {capitalize(selectedVerification.documentType.replace('_', ' '))}
                  </label>
                  <label className="block text-sm text-gray-600 dark:text-gray-400">
                    User: {selectedVerification.userEmail}
                  </label>
                  {selectedVerification.riskScore && (
                    <label className="block text-sm text-gray-600 dark:text-gray-400">
                      Risk Score: {selectedVerification.riskScore}
                    </label>
                  )}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Review Notes
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={3}
                    placeholder="Add review notes..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedVerification(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => processKYCMutation.mutate({ id: selectedVerification.id, action: 'reject' })}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
                  >
                    Reject
                  </button>
                  <button
                    onClick={() => processKYCMutation.mutate({ id: selectedVerification.id, action: 'approve' })}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                  >
                    Approve
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
