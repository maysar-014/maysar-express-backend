"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, capitalize } from '@/lib/utils';

interface SecurityIncident {
  id: string;
  type: 'brute_force' | 'suspicious_login' | 'data_breach' | 'malware' | 'phishing' | 'ddos';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'false_positive';
  title: string;
  description: string;
  affectedUsers: string[];
  sourceIp: string;
  userAgent: string;
  detectedAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  evidence: Record<string, unknown>;
  mitigationSteps: string[];
}

interface SecurityAlert {
  id: string;
  rule: string;
  message: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  count: number;
  firstSeen: string;
  lastSeen: string;
  acknowledged: boolean;
}

export default function SecurityMonitoringPage() {
  const [activeTab, setActiveTab] = useState<'incidents' | 'alerts'>('incidents');
  const [selectedIncident, setSelectedIncident] = useState<SecurityIncident | null>(null);

  // Fetch security incidents
  const { data: incidentsData, isLoading: incidentsLoading, refetch: refetchIncidents } = useQuery({
    queryKey: ['security-incidents'],
    queryFn: () => apiService.security.getIncidents(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000, // Auto-refresh every minute
  });

  // Fetch security alerts
  const { data: alertsData, isLoading: alertsLoading, refetch: refetchAlerts } = useQuery({
    queryKey: ['security-alerts'],
    queryFn: () => apiService.security.getAlerts(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000, // Auto-refresh every 30 seconds
  });

  const incidents = incidentsData?.data || [];
  const alerts = alertsData?.data || [];

  // Mutations
  const updateIncidentMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SecurityIncident> }) =>
      apiService.security.updateIncident(id, data),
    onSuccess: () => {
      toast.success('Incident updated successfully');
      refetchIncidents();
      setSelectedIncident(null);
    },
    onError: () => {
      toast.error('Failed to update incident');
    },
  });

  const acknowledgeAlertMutation = useMutation({
    mutationFn: (alertId: string) => apiService.security.acknowledgeAlert(alertId),
    onSuccess: () => {
      toast.success('Alert acknowledged');
      refetchAlerts();
    },
    onError: () => {
      toast.error('Failed to acknowledge alert');
    },
  });

  // Incident columns
  const incidentColumns: Column<SecurityIncident>[] = [
    {
      key: 'detectedAt',
      header: 'Detected',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'data_breach' || value === 'malware' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'brute_force' || value === 'ddos' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
          'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
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
      key: 'title',
      header: 'Title',
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
      key: 'sourceIp',
      header: 'Source IP',
      render: (value) => (
        <span className="font-mono text-sm text-gray-600 dark:text-gray-400">{value}</span>
      ),
    },
    {
      key: 'affectedUsers',
      header: 'Affected Users',
      render: (value: string[]) => (
        <span className="text-sm text-gray-600 dark:text-gray-400">
          {value ? value.length : 0} users
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
            onClick={() => setSelectedIncident(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            View
          </button>
          {row.status === 'open' && (
            <button
              onClick={() => updateIncidentMutation.mutate({
                id: row.id,
                data: { status: 'investigating', assignedTo: 'current-user' }
              })}
              className="text-green-600 hover:text-green-900 text-sm font-medium"
            >
              Investigate
            </button>
          )}
        </div>
      ),
    },
  ];

  // Alert columns
  const alertColumns: Column<SecurityAlert>[] = [
    {
      key: 'lastSeen',
      header: 'Last Seen',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'rule',
      header: 'Rule',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {value}
        </span>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'critical' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'error' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300' :
          value === 'warning' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300'
        }`}>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'message',
      header: 'Message',
      render: (value) => (
        <div className="max-w-md text-gray-900 dark:text-white">{value}</div>
      ),
    },
    {
      key: 'count',
      header: 'Count',
      sortable: true,
      render: (value) => (
        <span className="font-semibold text-gray-900 dark:text-white">{value}</span>
      ),
    },
    {
      key: 'acknowledged',
      header: 'Status',
      render: (value, row) => (
        <div className="flex items-center space-x-2">
          {value ? (
            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
              Acknowledged
            </span>
          ) : (
            <button
              onClick={() => acknowledgeAlertMutation.mutate(row.id)}
              className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-800"
            >
              Acknowledge
            </button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Security Monitoring
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Real-time security incident monitoring and threat detection
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              refetchIncidents();
              refetchAlerts();
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Refresh
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Open Incidents
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {incidents.filter((incident: SecurityIncident) => incident.status === 'open').length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Critical Alerts
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {alerts.filter((alert: SecurityAlert) => alert.severity === 'critical' && !alert.acknowledged).length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Under Investigation
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {incidents.filter((incident: SecurityIncident) => incident.status === 'investigating').length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Resolved Today
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {incidents.filter((incident: SecurityIncident) => 
                incident.status === 'resolved' && 
                incident.resolvedAt && 
                new Date(incident.resolvedAt).toDateString() === new Date().toDateString()
              ).length}
            </dd>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('incidents')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'incidents'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Security Incidents ({incidents.length})
          </button>
          <button
            onClick={() => setActiveTab('alerts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'alerts'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Security Alerts ({alerts.filter((alert: SecurityAlert) => !alert.acknowledged).length})
          </button>
        </nav>
      </div>

      {/* Incidents Tab */}
      {activeTab === 'incidents' && (
        <DataTable
          data={incidents}
          columns={incidentColumns}
          searchable={true}
          searchPlaceholder="Search incidents..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={incidentsLoading}
          emptyMessage="No security incidents found"
          className="shadow-sm"
        />
      )}

      {/* Alerts Tab */}
      {activeTab === 'alerts' && (
        <DataTable
          data={alerts}
          columns={alertColumns}
          searchable={true}
          searchPlaceholder="Search alerts..."
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={alertsLoading}
          emptyMessage="No security alerts found"
          className="shadow-sm"
        />
      )}

      {/* Incident Detail Modal */}
      {selectedIncident && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setSelectedIncident(null)}></div>
            <div className="inline-block w-full max-w-2xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Security Incident Details
                </h3>
                <button
                  onClick={() => setSelectedIncident(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  ×
                </button>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Type
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {capitalize(selectedIncident.type.replace('_', ' '))}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Severity
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {capitalize(selectedIncident.severity)}
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Description
                  </label>
                  <p className="mt-1 text-sm text-gray-900 dark:text-white">
                    {selectedIncident.description}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Source IP
                    </label>
                    <p className="mt-1 text-sm font-mono text-gray-900 dark:text-white">
                      {selectedIncident.sourceIp}
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Detected At
                    </label>
                    <p className="mt-1 text-sm text-gray-900 dark:text-white">
                      {formatDate(selectedIncident.detectedAt)}
                    </p>
                  </div>
                </div>

                {selectedIncident.mitigationSteps && selectedIncident.mitigationSteps.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Mitigation Steps
                    </label>
                    <ul className="mt-1 text-sm text-gray-900 dark:text-white list-disc list-inside">
                      {selectedIncident.mitigationSteps.map((step, index) => (
                        <li key={index}>{step}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    onClick={() => setSelectedIncident(null)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Close
                  </button>
                  {selectedIncident.status !== 'resolved' && (
                    <button
                      onClick={() => updateIncidentMutation.mutate({
                        id: selectedIncident.id,
                        data: { status: 'resolved', resolvedAt: new Date().toISOString() }
                      })}
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                    >
                      Mark as Resolved
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}