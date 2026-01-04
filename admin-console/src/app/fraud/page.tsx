// Professional Fraud Detection Dashboard
// Advanced fraud monitoring with real-time alerts, pattern analysis, and investigation workflows

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ShieldExclamationIcon,
  ExclamationTriangleIcon,
  EyeIcon,
  ChartBarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ArrowPathIcon,
  BellAlertIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  UserIcon,
  CreditCardIcon,
  GlobeAltIcon,
  DevicePhoneMobileIcon,
  MapPinIcon,
  ArrowUpIcon,
  ArrowDownIcon,
} from '@heroicons/react/24/outline';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, formatCurrency, getStatusColor } from '@/lib/utils';

interface FraudAlert {
  id: string;
  type: 'transaction' | 'account' | 'device' | 'location' | 'pattern';
  severity: 'low' | 'medium' | 'high' | 'critical';
  riskScore: number;
  status: 'active' | 'investigating' | 'resolved' | 'dismissed';
  description: string;
  amount?: number;
  currency?: string;
  userId: string;
  userEmail: string;
  timestamp: string;
  location?: string;
  deviceInfo?: string;
  assignedTo?: string;
  resolution?: string;
}

interface FraudMetrics {
  totalAlerts: number;
  activeAlerts: number;
  resolvedToday: number;
  blockedTransactions: number;
  fraudulentAmount: number;
  detectionRate: number;
  falsePositiveRate: number;
}

interface FraudPattern {
  pattern: string;
  occurrences: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  trend: 'increasing' | 'decreasing' | 'stable';
  lastDetected: string;
  affectedUsers: number;
}

interface TransactionMonitor {
  id: string;
  userId: string;
  amount: number;
  currency: string;
  timestamp: string;
  riskScore: number;
  flags: string[];
  status: 'approved' | 'flagged' | 'blocked';
  merchant: string;
  location: string;
}

export default function FraudPage() {
    const [page1, setPage1] = useState(0);
  const [page2, setPage2] = useState(0);
const [selectedTimeframe, setSelectedTimeframe] = useState('24h');
  const [selectedAlert, setSelectedAlert] = useState<FraudAlert | null>(null);
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [alertFilter, setAlertFilter] = useState('all');
  const [severityFilter, setSeverityFilter] = useState('all');
  const queryClient = useQueryClient();

  // Mock data for demonstration (API methods don't exist yet)
  const metricsLoading = false;
  const alertsLoading = false;
  const patternsLoading = false;
  const transactionsLoading = false;

  const refetchMetrics = () => {
  const [cardPage1, setCardPage1] = useState(0);
  const [cardPage2, setCardPage2] = useState(0);
};

  const fraudMetrics: FraudMetrics = {
    totalAlerts: 47,
    activeAlerts: 12,
    resolvedToday: 8,
    blockedTransactions: 23,
    fraudulentAmount: 15420.50,
    detectionRate: 94.2,
    falsePositiveRate: 3.1
  };

  // Mock alert data
  const alerts: FraudAlert[] = [
    {
      id: '1',
      type: 'transaction',
      severity: 'high',
      riskScore: 85,
      status: 'active',
      description: 'Unusual transaction pattern detected - multiple high-value purchases in short time',
      amount: 2500.00,
      currency: 'USD',
      userId: 'usr_12345678',
      userEmail: 'john.doe@example.com',
      timestamp: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      location: 'New York, US',
      deviceInfo: 'Chrome on Windows'
    },
    {
      id: '2',
      type: 'account',
      severity: 'critical',
      riskScore: 95,
      status: 'investigating',
      description: 'Account compromise suspected - login from unusual location',
      userId: 'usr_87654321',
      userEmail: 'jane.smith@example.com',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      location: 'Moscow, RU',
      deviceInfo: 'Unknown device'
    }
  ];

  // Mock pattern data
  const patterns: FraudPattern[] = [
    {
      pattern: 'Rapid successive transactions',
      occurrences: 15,
      riskLevel: 'high',
      trend: 'increasing',
      lastDetected: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      affectedUsers: 8
    },
    {
      pattern: 'Login from new device',
      occurrences: 32,
      riskLevel: 'medium',
      trend: 'stable',
      lastDetected: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      affectedUsers: 12
    }
  ];

  // Mock transaction data
  const transactions: TransactionMonitor[] = [
    {
      id: 'txn_1',
      userId: 'usr_12345678',
      amount: 299.99,
      currency: 'USD',
      timestamp: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      riskScore: 75,
      flags: ['high_amount', 'unusual_time'],
      status: 'flagged',
      merchant: 'Electronics Store',
      location: 'New York, US'
    },
    {
      id: 'txn_2',
      userId: 'usr_87654321',
      amount: 49.99,
      currency: 'USD',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      riskScore: 25,
      flags: [],
      status: 'approved',
      merchant: 'Coffee Shop',
      location: 'San Francisco, US'
    }
  ];

  // Mock mutations (API methods don't exist yet)
  const updateAlertStatusMutation = {
    mutate: () => toast.success('Alert status updated successfully')
  };

  const assignAlertMutation = {
    mutate: () => toast.success('Alert assigned successfully')
  };

  // Helper functions
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'low': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getAlertTypeIcon = (type: string) => {
    const iconClass = "w-4 h-4";
    switch (type) {
      case 'transaction': return <CreditCardIcon className={iconClass} />;
      case 'account': return <UserIcon className={iconClass} />;
      case 'device': return <DevicePhoneMobileIcon className={iconClass} />;
      case 'location': return <MapPinIcon className={iconClass} />;
      case 'pattern': return <ChartBarIcon className={iconClass} />;
      default: return <ExclamationTriangleIcon className={iconClass} />;
    }
  };

  const getRiskScoreColor = (score: number) => {
    if (score >= 80) return 'text-red-600 dark:text-red-400';
    if (score >= 60) return 'text-orange-600 dark:text-orange-400';
    if (score >= 40) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-green-600 dark:text-green-400';
  };

  // Prepare chart data
  const alertTrendData = [
    { time: '00:00', alerts: 2, blocked: 1 },
    { time: '04:00', alerts: 5, blocked: 2 },
    { time: '08:00', alerts: 12, blocked: 4 },
    { time: '12:00', alerts: 18, blocked: 7 },
    { time: '16:00', alerts: 15, blocked: 5 },
    { time: '20:00', alerts: 8, blocked: 3 },
  ];

  const severityDistribution = [
    { name: 'Critical', value: alerts.filter(a => a.severity === 'critical').length, color: '#EF4444' },
    { name: 'High', value: alerts.filter(a => a.severity === 'high').length, color: '#F59E0B' },
    { name: 'Medium', value: alerts.filter(a => a.severity === 'medium').length, color: '#EAB308' },
    { name: 'Low', value: alerts.filter(a => a.severity === 'low').length, color: '#3B82F6' },
  ];

  // Fraud alerts table columns
  const alertColumns: Column<FraudAlert>[] = [
    {
      key: 'type',
      header: 'Type',
      sortable: true,
      render: (value) => (
        <div className="flex items-center">
          {getAlertTypeIcon(value)}
          <span className="ml-2 capitalize">{value}</span>
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
      key: 'riskScore',
      header: 'Risk Score',
      sortable: true,
      render: (value) => (
        <span className={`font-medium ${getRiskScoreColor(value)}`}>
          {value}/100
        </span>
      ),
    },
    {
      key: 'userEmail',
      header: 'User',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">ID: {row.userId.slice(-8)}</div>
        </div>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (value) => (
        <div className="max-w-xs truncate text-sm text-gray-600 dark:text-gray-400">
          {value}
        </div>
      ),
    },
    {
      key: 'amount',
      header: 'Amount',
      sortable: true,
      render: (value, row) => value ? formatCurrency(value, row.currency) : '-',
      className: 'text-right',
    },
    {
      key: 'timestamp',
      header: 'Detected',
      sortable: true,
      render: (value) => formatDate(value),
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
  ];

  // Transaction monitoring columns
  const transactionColumns: Column<TransactionMonitor>[] = [
    {
      key: 'userId',
      header: 'User',
      render: (value) => (
        <span className="font-mono text-sm">{value.slice(-8)}</span>
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
      key: 'merchant',
      header: 'Merchant',
      render: (value) => (
        <span className="text-sm">{value}</span>
      ),
    },
    {
      key: 'riskScore',
      header: 'Risk Score',
      sortable: true,
      render: (value) => (
        <span className={`font-medium ${getRiskScoreColor(value)}`}>
          {value}/100
        </span>
      ),
    },
    {
      key: 'flags',
      header: 'Flags',
      render: (value) => (
        <div className="flex flex-wrap gap-1">
          {value.slice(0, 2).map((flag: string, index: number) => (
            <span key={index} className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
              {flag}
            </span>
          ))}
          {value.length > 2 && (
            <span className="px-2 py-1 text-xs bg-gray-100 text-gray-800 rounded-full">
              +{value.length - 2}
            </span>
          )}
        </div>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'blocked' ? 'bg-red-100 text-red-800' :
          value === 'flagged' ? 'bg-yellow-100 text-yellow-800' :
          'bg-green-100 text-green-800'
        }`}>
          {value.charAt(0).toUpperCase() + value.slice(1)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Fraud Detection Dashboard
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Real-time fraud monitoring with advanced pattern analysis and automated alerts
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
            <option value="30d">Last 30 Days</option>
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

      {/* Fraud Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ShieldExclamationIcon className="w-8 h-8 text-red-600 dark:text-red-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Active Alerts
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {fraudMetrics.activeAlerts}
              </dd>
              <div className="text-sm text-red-600 dark:text-red-400">
                {alerts.filter(a => a.severity === 'critical').length} critical
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <CheckCircleIcon className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Resolved Today
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {fraudMetrics.resolvedToday}
              </dd>
              <div className="text-sm text-green-600 dark:text-green-400">
                {fraudMetrics.detectionRate.toFixed(1)}% detection rate
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <XCircleIcon className="w-8 h-8 text-orange-600 dark:text-orange-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Blocked Transactions
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {fraudMetrics.blockedTransactions}
              </dd>
              <div className="text-sm text-orange-600 dark:text-orange-400">
                {formatCurrency(fraudMetrics.fraudulentAmount)} prevented
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <BellAlertIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                False Positive Rate
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {fraudMetrics.falsePositiveRate.toFixed(1)}%
              </dd>
              <div className="text-sm text-blue-600 dark:text-blue-400">
                Target: <5%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Fraud Alert Trends */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Fraud Alert Trends
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={alertTrendData}>
                <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Area
                  type="monotone"
                  dataKey="alerts"
                  stackId="1"
                  stroke="#EF4444"
                  fill="#EF4444"
                  fillOpacity={0.6}
                  name="Alerts"
                />
                <Area
                  type="monotone"
                  dataKey="blocked"
                  stackId="2"
                  stroke="#F59E0B"
                  fill="#F59E0B"
                  fillOpacity={0.6}
                  name="Blocked"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Alert Severity Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Alert Severity Distribution
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={severityDistribution}
                  cx="50%"
                  cy="50%"
                  outerRadius={100}
                  dataKey="value"
                  label={({ name, value }: { name: string; value: number }) => value > 0 ? `${name}: ${value}` : ''}
                >
                  {severityDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
            <select
              value={alertFilter}
              onChange={(e) => setAlertFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Statuses</option>
              <option value="active">Active</option>
              <option value="investigating">Investigating</option>
              <option value="resolved">Resolved</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <ExclamationTriangleIcon className="w-5 h-5 text-gray-400" />
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="all">All Severities</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
            </select>
          </div>

          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="search"
                placeholder="Search alerts by user, description, or transaction ID..."
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Fraud Alerts Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Fraud Alerts ({alerts.length})
          </h3>
          <div className="flex items-center space-x-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Auto-refreshing every 30 seconds
            </span>
          </div>
        </div>

        <DataTable
          data={alerts}
          columns={alertColumns}
          searchable={false}
          selectable={true}
          pagination={{
            pageSize: 15,
            showInfo: true,
          }}
          loading={alertsLoading}
          emptyMessage="No fraud alerts found matching your criteria"
          className="shadow-sm"
        />
      </div>

      {/* Transaction Monitoring */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white">
            Transaction Monitoring
          </h3>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Real-time transaction risk assessment
          </div>
        </div>

        <DataTable
          data={transactions.slice(0, 10)}
          columns={transactionColumns}
          searchable={false}
          selectable={false}
          pagination={false}
          loading={transactionsLoading}
          emptyMessage="No transactions to monitor"
        />
      </div>

      {/* Fraud Patterns Analysis */}
      {patterns.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
            Emerging Fraud Patterns
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {patterns.slice(0, 6).map((pattern: FraudPattern) => (
              <div key={pattern.pattern} className="p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-gray-900 dark:text-white">{pattern.pattern}</span>
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    pattern.riskLevel === 'critical' ? 'bg-red-100 text-red-800' :
                    pattern.riskLevel === 'high' ? 'bg-orange-100 text-orange-800' :
                    pattern.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                    'bg-blue-100 text-blue-800'
                  }`}>
                    {pattern.riskLevel}
                  </span>
                </div>
                <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                  {pattern.occurrences} occurrences • {pattern.affectedUsers} users affected
                </div>
                <div className="flex items-center text-xs text-gray-500 dark:text-gray-400">
                  {pattern.trend === 'increasing' && <ArrowUpIcon className="w-3 h-3 text-red-500 mr-1" />}
                  {pattern.trend === 'decreasing' && <ArrowDownIcon className="w-3 h-3 text-green-500 mr-1" />}
                  Trend: {pattern.trend}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
