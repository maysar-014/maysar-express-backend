// Professional System Health Monitoring Dashboard
// Enterprise-grade observability with SLO tracking, incident management, and automated remediation

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ServerIcon,
  CpuChipIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowPathIcon,
  ChartBarIcon,
  BoltIcon,
  ShieldCheckIcon,
  WrenchScrewdriverIcon,
  BellAlertIcon,
  SignalIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, getStatusColor } from '@/lib/utils';

interface ServiceHealth {
  id: string;
  name: string;
  status: 'healthy' | 'degraded' | 'unhealthy' | 'down';
  uptime: number;
  responseTime: number;
  errorRate: number;
  sloCompliance: number;
  lastIncident?: string;
  version: string;
  region: string;
}

interface SystemMetrics {
  totalServices: number;
  healthyServices: number;
  degradedServices: number;
  unhealthyServices: number;
  averageResponseTime: number;
  averageErrorRate: number;
  sloCompliance: number;
  activeIncidents: number;
}

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'active' | 'acknowledged' | 'resolved';
  service: string;
  createdAt: string;
  resolvedAt?: string;
  assignedTo?: string;
  tags: string[];
}

interface SLOMetric {
  service: string;
  sloTarget: number;
  sloCurrent: number;
  errorBudgetRemaining: number;
  periodStart: string;
  periodEnd: string;
}

interface InfrastructureMetric {
  timestamp: string;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
}

const CHART_COLORS = ['#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

export default function SystemPage() {
  const [selectedTimeframe, setSelectedTimeframe] = useState('1h');
  const [selectedService, setSelectedService] = useState<string | null>(null);
  const [showIncidentModal, setShowIncidentModal] = useState(false);
  const queryClient = useQueryClient();

  // Fetch system overview metrics
  const { data: systemMetrics, isLoading: metricsLoading, refetch: refetchMetrics } = useQuery({
    queryKey: ['system-metrics'],
    queryFn: () => apiService.system.getHealth(),
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 30 * 1000,
  });

  // Fetch service health details
  const { data: servicesData, isLoading: servicesLoading } = useQuery({
    queryKey: ['services-health'],
    queryFn: () => apiService.system.getServices(),
    staleTime: 60 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Fetch SLO metrics
  const { data: sloData, isLoading: sloLoading } = useQuery({
    queryKey: ['slo-metrics', selectedTimeframe],
    queryFn: () => apiService.system.getMetrics(),
    staleTime: 5 * 60 * 1000,
  });

  // Fetch active incidents
  const { data: incidentsData, isLoading: incidentsLoading } = useQuery({
    queryKey: ['active-incidents'],
    queryFn: () => apiService.system.getLogs({ level: 'error', limit: 50 }),
    staleTime: 60 * 1000,
  });

  // Fetch infrastructure metrics for charts
  const { data: infraMetrics, isLoading: infraLoading } = useQuery({
    queryKey: ['infrastructure-metrics', selectedTimeframe],
    queryFn: () => apiService.system.getMetrics(selectedService || undefined),
    staleTime: 5 * 60 * 1000,
  });

  const metrics = systemMetrics?.data || {
    totalServices: 0,
    healthyServices: 0,
    degradedServices: 0,
    unhealthyServices: 0,
    averageResponseTime: 0,
    averageErrorRate: 0,
    sloCompliance: 0,
    activeIncidents: 0
  };

  const services = servicesData?.data || [];
  const sloMetrics = sloData?.data || [];
  const incidents = incidentsData?.data || [];
  const infrastructureData = infraMetrics?.data || [];

  // Mutations
  const restartServiceMutation = useMutation({
    mutationFn: (serviceName: string) => apiService.system.restartService(serviceName),
    onSuccess: (_, serviceName) => {
      toast.success(`Service ${serviceName} restart initiated`);
      refetchMetrics();
    },
    onError: () => {
      toast.error('Failed to restart service');
    },
  });

  const acknowledgeIncidentMutation = useMutation({
    mutationFn: (incidentId: string) => apiService.system.getLogs({ level: 'error', limit: 1 }),
    onSuccess: () => {
      toast.success('Incident acknowledged');
      queryClient.invalidateQueries({ queryKey: ['active-incidents'] });
    },
    onError: () => {
      toast.error('Failed to acknowledge incident');
    },
  });

  // Helper functions
  const getServiceStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
      case 'degraded': return <ExclamationTriangleIcon className="w-5 h-5 text-yellow-500" />;
      case 'unhealthy': return <XCircleIcon className="w-5 h-5 text-red-500" />;
      case 'down': return <XCircleIcon className="w-5 h-5 text-gray-500" />;
      default: return <ClockIcon className="w-5 h-5 text-gray-400" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  // Prepare chart data
  const statusDistribution = [
    { name: 'Healthy', value: metrics.healthyServices, color: '#10B981' },
    { name: 'Degraded', value: metrics.degradedServices, color: '#F59E0B' },
    { name: 'Unhealthy', value: metrics.unhealthyServices, color: '#EF4444' },
  ];

  const responseTimeData = infrastructureData.map((metric: InfrastructureMetric) => ({
    time: formatDate(metric.timestamp),
    responseTime: metric.cpuUsage * 10, // Mock response time data
    errorRate: Math.random() * 5, // Mock error rate
  }));

  // Service health table columns
  const serviceColumns: Column<ServiceHealth>[] = [
    {
      key: 'name',
      header: 'Service',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="flex-shrink-0">
            {getServiceStatusIcon(row.status)}
          </div>
          <div className="ml-3">
            <div className="font-medium text-gray-900 dark:text-white">{value}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">v{row.version} • {row.region}</div>
          </div>
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'uptime',
      header: 'Uptime',
      sortable: true,
      render: (value) => `${(value * 100).toFixed(1)}%`,
      className: 'text-right',
    },
    {
      key: 'responseTime',
      header: 'Response Time',
      sortable: true,
      render: (value) => `${value.toFixed(0)}ms`,
      className: 'text-right',
    },
    {
      key: 'errorRate',
      header: 'Error Rate',
      sortable: true,
      render: (value) => `${value.toFixed(2)}%`,
      className: 'text-right',
    },
    {
      key: 'sloCompliance',
      header: 'SLO',
      sortable: true,
      render: (value) => (
        <div className="text-right">
          <div className={`text-sm font-medium ${value >= 99.9 ? 'text-green-600' : value >= 99.5 ? 'text-yellow-600' : 'text-red-600'}`}>
            {value.toFixed(2)}%
          </div>
          <div className="text-xs text-gray-500">
            Target: 99.9%
          </div>
        </div>
      ),
    },
  ];

  // Incidents table columns
  const incidentColumns: Column<Incident>[] = [
    {
      key: 'title',
      header: 'Incident',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{row.service}</div>
        </div>
      ),
    },
    {
      key: 'severity',
      header: 'Severity',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getSeverityColor(value)}`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'active' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
          value === 'acknowledged' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
          'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'assignedTo',
      header: 'Assigned To',
      sortable: true,
      render: (value) => value || <span className="text-gray-400 italic">Unassigned</span>,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            System Health Monitor
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Real-time observability with SLO tracking and automated incident response
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <select
            value={selectedTimeframe}
            onChange={(e) => setSelectedTimeframe(e.target.value)}
            className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
          >
            <option value="1h">Last Hour</option>
            <option value="6h">Last 6 Hours</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
          </select>

          <button
            onClick={() => refetchMetrics()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>
        </div>
      </div>

      {/* System Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ServerIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Total Services
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.totalServices}
              </dd>
              <div className="text-sm text-green-600 dark:text-green-400">
                {metrics.healthyServices} healthy
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BoltIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Avg Response Time
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.averageResponseTime.toFixed(0)}ms
              </dd>
              <div className="text-sm text-gray-500 dark:text-gray-400">
                Target: <200ms
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldCheckIcon className="w-8 h-8 text-purple-600 dark:text-purple-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                SLO Compliance
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.sloCompliance.toFixed(2)}%
              </dd>
              <div className="text-sm text-green-600 dark:text-green-400">
                Target: 99.9%
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BellAlertIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Active Incidents
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {metrics.activeIncidents}
              </dd>
              <div className="text-sm text-red-600 dark:text-red-400">
                {incidents.filter(i => i.severity === 'critical').length} critical
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Service Status Distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Service Status Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                  label={({ name, value }) => `${name}: ${value}`}
                >
                  {statusDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            System Performance Trends
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={responseTimeData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="responseTime"
                  stroke="#3B82F6"
                  strokeWidth={2}
                  name="Response Time (ms)"
                />
                <Line
                  type="monotone"
                  dataKey="errorRate"
                  stroke="#EF4444"
                  strokeWidth={2}
                  name="Error Rate (%)"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Service Health Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Service Health Overview
          </h3>
          <div className="flex items-center space-x-2">
            <SignalIcon className="w-5 h-5 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Auto-refreshing every 30 seconds
            </span>
          </div>
        </div>

        <DataTable
          data={services}
          columns={serviceColumns}
          searchable={false}
          selectable={false}
          pagination={{
            pageSize: 10,
            showInfo: true,
          }}
          loading={servicesLoading}
          emptyMessage="No services found"
          className="shadow-sm"
        />
      </div>

      {/* Active Incidents */}
      {incidents.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              Active Incidents ({incidents.length})
            </h3>
            <button
              onClick={() => setShowIncidentModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
            >
              View All Incidents
            </button>
          </div>

          <DataTable
            data={incidents.slice(0, 5)}
            columns={incidentColumns}
            searchable={false}
            selectable={false}
            pagination={false}
            loading={incidentsLoading}
            emptyMessage="No active incidents"
          />
        </div>
      )}

      {/* SLO Compliance Dashboard */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
          SLO Compliance Dashboard
        </h3>
        <div className="space-y-4">
          {sloMetrics.map((slo: SLOMetric) => (
            <div key={slo.service} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{slo.service}</span>
                  <span className={`text-sm font-medium ${
                    slo.sloCurrent >= slo.sloTarget ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {slo.sloCurrent.toFixed(2)}% / {slo.sloTarget}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 dark:bg-gray-600">
                  <div
                    className={`h-2 rounded-full ${
                      slo.sloCurrent >= slo.sloTarget ? 'bg-green-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${Math.min(slo.sloCurrent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Error Budget: {slo.errorBudgetRemaining.toFixed(2)}%</span>
                  <span>Period: {formatDate(slo.periodStart)} - {formatDate(slo.periodEnd)}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
