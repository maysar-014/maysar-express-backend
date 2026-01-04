"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService, apiClient } from '@/lib/api';
import { formatDate, formatCurrency, capitalize } from '@/lib/utils';

interface GDPRRequest {
  id: string;
  userId: string;
  userEmail: string;
  requestType: 'access' | 'portability' | 'rectification' | 'erasure' | 'restriction';
  status: 'pending' | 'in_progress' | 'completed' | 'rejected';
  requestedAt: string;
  completedAt?: string;
  assignedTo?: string;
  notes?: string;
}

interface AMLAlert {
  id: string;
  entityId: string;
  entityType: 'user' | 'seller' | 'transaction';
  alertType: 'suspicious_transaction' | 'high_risk_country' | 'pep_match' | 'sanctions_match';
  riskScore: number;
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  createdAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  description: string;
}

interface ComplianceReport {
  id: string;
  reportType: 'tcra_quarterly' | 'tra_monthly' | 'bot_annual' | 'fiu_suspicious' | 'brela_annual' | 'tcaa_compliance';
  period: string;
  status: 'draft' | 'pending_review' | 'approved' | 'submitted';
  generatedAt: string;
  submittedAt?: string;
  fileUrl?: string;
  complianceScore: number;
  regulatoryBody: 'TCRA' | 'TRA' | 'BOT' | 'FIU' | 'BRELA' | 'TCAA';
  submissionDeadline: string;
}

export default function CompliancePage() {
  const [activeTab, setActiveTab] = useState<'gdpr' | 'aml' | 'reports' | 'dashboard'>('dashboard');
  const [selectedRequest, setSelectedRequest] = useState<GDPRRequest | null>(null);
  const [selectedAlert, setSelectedAlert] = useState<AMLAlert | null>(null);

  // Fetch compliance data
  const { data: complianceData, isLoading, refetch } = useQuery({
    queryKey: ['compliance'],
    queryFn: () => fetch('http://localhost:3001/api/admin/compliance').then(res => res.json()),
    staleTime: 30 * 1000,
  });

  const gdprRequests = complianceData?.data?.gdprRequests || [];
  const amlAlerts = complianceData?.data?.amlAlerts || [];
  const reports = complianceData?.data?.reports || [];
  const stats = complianceData?.data?.stats || {};
  const tanzanianRegulators = complianceData?.data?.tanzanianRegulators || {};
  const recentActivity = complianceData?.data?.recentActivity || [];

  // Mutations
  const processGDPRMutation = useMutation({
    mutationFn: ({ id, action, notes }: { id: string; action: string; notes?: string }) =>
      Promise.resolve({ success: true }),
    onSuccess: () => {
      toast.success('GDPR request processed');
      refetch();
      setSelectedRequest(null);
    },
    onError: () => {
      toast.error('Failed to process GDPR request');
    },
  });

  const resolveAMLMutation = useMutation({
    mutationFn: ({ id, resolution, notes }: { id: string; resolution: string; notes: string }) =>
      Promise.resolve({ success: true }),
    onSuccess: () => {
      toast.success('AML alert resolved');
      refetch();
      setSelectedAlert(null);
    },
    onError: () => {
      toast.error('Failed to resolve AML alert');
    },
  });

  const generateReportMutation = useMutation({
    mutationFn: (reportType: string) => Promise.resolve({ success: true }),
    onSuccess: () => {
      toast.success('Report generation started');
      refetch();
    },
    onError: () => {
      toast.error('Failed to generate report');
    },
  });

  // GDPR columns
  const gdprColumns: Column<GDPRRequest>[] = [
    {
      key: 'requestedAt',
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
      key: 'requestType',
      header: 'Request Type',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'erasure' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'access' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'portability' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        }`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'in_progress' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'rejected' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
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
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedRequest(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Process
          </button>
        </div>
      ),
    },
  ];

  // AML columns
  const amlColumns: Column<AMLAlert>[] = [
    {
      key: 'createdAt',
      header: 'Date',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'entityId',
      header: 'Entity',
      render: (value, row) => (
        <div>
          <div className="font-mono text-sm text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{capitalize(row.entityType)}</div>
        </div>
      ),
    },
    {
      key: 'alertType',
      header: 'Alert Type',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'sanctions_match' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'pep_match' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
          value === 'suspicious_transaction' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        }`}>
          {value.replace('_', ' ').toUpperCase()}
        </span>
      ),
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          <span className={`font-medium ${
            value >= 80 ? 'text-red-600' :
            value >= 60 ? 'text-orange-600' :
            value >= 40 ? 'text-yellow-600' :
            'text-green-600'
          }`}>
            {value}
          </span>
          <div className="ml-2 w-16 bg-gray-200 rounded-full h-2">
            <div
              className={`h-2 rounded-full ${
                value >= 80 ? 'bg-red-500' :
                value >= 60 ? 'bg-orange-500' :
                value >= 40 ? 'bg-yellow-500' :
                'bg-green-500'
              }`}
              style={{ width: `${value}%` }}
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
          value === 'resolved' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'investigating' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'false_positive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300' :
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
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
          <button
            onClick={() => setSelectedAlert(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Investigate
          </button>
        </div>
      ),
    },
  ];

  // Report columns
  const reportColumns: Column<ComplianceReport>[] = [
    {
      key: 'generatedAt',
      header: 'Generated',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'reportType',
      header: 'Report Type',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {value.replace('_', ' ').toUpperCase()}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.regulatoryBody}
          </div>
        </div>
      ),
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
      key: 'complianceScore',
      header: 'Score',
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

  const pendingGDPR = gdprRequests.filter((req: GDPRRequest) => req.status === 'pending');
  const openAML = amlAlerts.filter((alert: AMLAlert) => alert.status === 'open');
  const avgComplianceScore = reports.length > 0 
    ? reports.reduce((sum: number, r: ComplianceReport) => sum + r.complianceScore, 0) / reports.length 
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Compliance & Regulatory
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            GDPR compliance, AML/KYC monitoring, and regulatory reporting
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <select className="px-3 py-2 border border-gray-300 rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 dark:text-white">
            <option value="tcra_quarterly">TCRA Quarterly Report</option>
            <option value="tra_monthly">TRA Monthly VAT Report</option>
            <option value="bot_annual">BOT Annual Compliance</option>
            <option value="fiu_suspicious">FIU Suspicious Activity</option>
            <option value="brela_annual">BRELA Annual Return</option>
            <option value="tcaa_compliance">TCAA Competition Report</option>
          </select>
          <button
            onClick={() => generateReportMutation.mutate('tcra_quarterly')}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Generate Report
          </button>
        </div>
      </div>

      {/* Compliance KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Pending GDPR</dt>
          <dd className="text-2xl font-bold text-yellow-600">{stats.pendingGdpr || 0}</dd>
          <div className="text-sm text-gray-600 mt-1">
            {stats.gdprCompleted || 0} completed
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Open AML Alerts</dt>
          <dd className="text-2xl font-bold text-red-600">{stats.openAmlAlerts || 0}</dd>
          <div className="text-sm text-gray-600 mt-1">
            {stats.highRiskAml || 0} high risk
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Compliance Score</dt>
          <dd className="text-2xl font-bold text-green-600">{stats.complianceScore || 0}%</dd>
          <div className="text-sm text-green-600 mt-1">+{stats.scoreGrowth || 0}% vs last period</div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <dt className="text-sm font-medium text-gray-500 dark:text-gray-400">Reports Due</dt>
          <dd className="text-2xl font-bold text-orange-600">{stats.reportsDue || 0}</dd>
          <div className="text-sm text-gray-600 mt-1">Next: {stats.nextReport || 'TRA VAT (15th)'}</div>
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
            onClick={() => setActiveTab('gdpr')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'gdpr'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            GDPR Requests ({pendingGDPR.length})
          </button>
          <button
            onClick={() => setActiveTab('aml')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'aml'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            AML Alerts ({openAML.length})
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
              Tanzania Regulatory Compliance Status
            </h3>
            <div className="space-y-4">
              {Object.entries(tanzanianRegulators).map(([key, regulator]: [string, any]) => (
                <div key={key} className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">{regulator.name}</span>
                  <span className={`text-sm font-medium ${
                    regulator.score >= 95 ? 'text-green-600' : 
                    regulator.score >= 90 ? 'text-yellow-600' : 'text-red-600'
                  }`}>{regulator.score}%</span>
                </div>
              ))}
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
                    activity.type === 'report_submitted' ? 'bg-green-500' :
                    activity.type === 'audit_due' ? 'bg-yellow-500' :
                    activity.type === 'report_generated' ? 'bg-blue-500' :
                    'bg-green-500'
                  }`}></div>
                  <span className="text-gray-600 dark:text-gray-400">{activity.description}</span>
                  <span className="ml-auto text-xs text-gray-500">{activity.timestamp}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'gdpr' && (
        <DataTable
          data={gdprRequests}
          columns={gdprColumns}
          searchable={true}
          searchPlaceholder="Search GDPR requests..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={isLoading}
          emptyMessage="No GDPR requests found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'aml' && (
        <DataTable
          data={amlAlerts}
          columns={amlColumns}
          searchable={true}
          searchPlaceholder="Search AML alerts..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={isLoading}
          emptyMessage="No AML alerts found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'reports' && (
        <DataTable
          data={reports}
          columns={reportColumns}
          searchable={true}
          searchPlaceholder="Search compliance reports..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={isLoading}
          emptyMessage="No compliance reports found"
          className="shadow-sm"
        />
      )}

      {/* GDPR Request Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSelectedRequest(null)}></div>
          <div className="relative bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <h3 className="text-xl font-medium text-gray-900 dark:text-white mb-4">
                Process GDPR Request
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Request Type: {capitalize(selectedRequest.requestType)}
                  </label>
                  <label className="block text-sm text-gray-600 dark:text-gray-400">
                    User: {selectedRequest.userEmail}
                  </label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Processing Notes
                  </label>
                  <textarea
                    className="w-full px-3 py-2 border border-gray-300 rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                    rows={3}
                    placeholder="Add processing notes..."
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    onClick={() => setSelectedRequest(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => processGDPRMutation.mutate({ id: selectedRequest.id, action: 'complete' })}
                    className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                  >
                    Complete
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