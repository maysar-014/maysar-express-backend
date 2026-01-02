"use client";

import React, { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, formatCurrency, capitalize } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  dateOfBirth?: string;
  status: 'active' | 'suspended' | 'pending_verification' | 'deactivated' | 'banned';
  verificationStatus: {
    email: boolean;
    phone: boolean;
    identity: boolean;
    address: boolean;
  };
  riskScore: number;
  accountType: 'individual' | 'business';
  kycLevel: 'none' | 'basic' | 'enhanced' | 'full';
  lastLoginAt?: string;
  registeredAt: string;
  totalOrders: number;
  totalSpent: number;
  suspensionReason?: string;
  suspendedAt?: string;
  suspendedBy?: string;
  activeSessions: number;
  securityEvents: number;
  ipAddresses: string[];
  deviceFingerprints: string[];
}

interface SecurityEvent {
  id: string;
  userId: string;
  type: 'login_attempt' | 'password_change' | 'suspicious_activity' | 'device_change' | 'location_change';
  description: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  timestamp: string;
  resolved: boolean;
}

interface UserSession {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  startedAt: string;
  lastActivity: string;
  isActive: boolean;
  deviceType: 'desktop' | 'mobile' | 'tablet';
}

export default function UserManagementPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'sessions' | 'security'>('users');
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showSuspensionModal, setShowSuspensionModal] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    kycLevel: '',
    riskScore: '',
    verificationStatus: '',
  });

  // Fetch users
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['platform-users', filters],
    queryFn: () => apiService.users.getUsers(filters),
    staleTime: 30 * 1000,
  });

  // Fetch security events
  const { data: securityData, isLoading: securityLoading, refetch: refetchSecurity } = useQuery({
    queryKey: ['security-events'],
    queryFn: () => apiService.users.getSecurityEvents(),
    staleTime: 30 * 1000,
    refetchInterval: 60 * 1000,
  });

  // Fetch active sessions
  const { data: sessionsData, isLoading: sessionsLoading, refetch: refetchSessions } = useQuery({
    queryKey: ['user-sessions'],
    queryFn: () => apiService.users.getActiveSessions(),
    staleTime: 30 * 1000,
    refetchInterval: 30 * 1000,
  });

  const users = usersData?.data || [];
  const securityEvents = securityData?.data || [];
  const sessions = sessionsData?.data || [];

  // Mutations
  const suspendUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiService.users.suspendUser(userId, reason),
    onSuccess: () => {
      toast.success('User suspended successfully');
      refetchUsers();
      setShowSuspensionModal(false);
      setSelectedUser(null);
    },
    onError: () => {
      toast.error('Failed to suspend user');
    },
  });

  const reactivateUserMutation = useMutation({
    mutationFn: (userId: string) => apiService.users.reactivateUser(userId),
    onSuccess: () => {
      toast.success('User reactivated successfully');
      refetchUsers();
    },
    onError: () => {
      toast.error('Failed to reactivate user');
    },
  });

  const terminateSessionMutation = useMutation({
    mutationFn: (sessionId: string) => apiService.users.terminateSession(sessionId),
    onSuccess: () => {
      toast.success('Session terminated successfully');
      refetchSessions();
    },
    onError: () => {
      toast.error('Failed to terminate session');
    },
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: ({ userIds, action, data }: { userIds: string[]; action: string; data?: any }) =>
      apiService.users.bulkUpdate(userIds, action, data),
    onSuccess: (_, variables) => {
      toast.success(`Bulk ${variables.action} completed successfully`);
      refetchUsers();
      setSelectedUsers([]);
    },
    onError: () => {
      toast.error('Bulk operation failed');
    },
  });

  // User columns
  const userColumns: Column<User>[] = [
    {
      key: 'email',
      header: 'User',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.firstName} {row.lastName}
          </div>
          <div className="text-xs text-gray-400 dark:text-gray-500">
            ID: {row.id.substring(0, 8)}...
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
          value === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'suspended' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'pending_verification' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          value === 'banned' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
        </span>
      ),
    },
    {
      key: 'verificationStatus',
      header: 'Verification',
      render: (value) => (
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${value.email ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-xs">Email</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${value.identity ? 'bg-green-500' : 'bg-gray-300'}`}></div>
            <span className="text-xs">Identity</span>
          </div>
        </div>
      ),
    },
    {
      key: 'kycLevel',
      header: 'KYC Level',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'full' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          value === 'enhanced' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'basic' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {capitalize(value)}
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
      key: 'totalSpent',
      header: 'Total Spent',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">
            {formatCurrency(value)}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.totalOrders} orders
          </div>
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">
            {value ? formatDate(value) : 'Never'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {row.activeSessions} active sessions
          </div>
        </div>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setSelectedUser(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            View
          </button>
          {row.status === 'active' ? (
            <button
              onClick={() => {
                setSelectedUser(row);
                setShowSuspensionModal(true);
              }}
              className="text-red-600 hover:text-red-900 text-sm font-medium"
            >
              Suspend
            </button>
          ) : row.status === 'suspended' ? (
            <button
              onClick={() => reactivateUserMutation.mutate(row.id)}
              className="text-green-600 hover:text-green-900 text-sm font-medium"
            >
              Reactivate
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  // Security event columns
  const securityColumns: Column<SecurityEvent>[] = [
    {
      key: 'timestamp',
      header: 'Time',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'type',
      header: 'Event Type',
      sortable: true,
      render: (value) => (
        <span className="font-mono text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
          {value.replace('_', ' ')}
        </span>
      ),
    },
    {
      key: 'description',
      header: 'Description',
      render: (value) => (
        <div className="max-w-md text-gray-900 dark:text-white">{value}</div>
      ),
    },
    {
      key: 'riskLevel',
      header: 'Risk Level',
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
      key: 'ipAddress',
      header: 'IP Address',
      render: (value, row) => (
        <div>
          <div className="font-mono text-sm text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.location}</div>
        </div>
      ),
    },
    {
      key: 'resolved',
      header: 'Status',
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
        }`}>
          {value ? 'Resolved' : 'Open'}
        </span>
      ),
    },
  ];

  // Session columns
  const sessionColumns: Column<UserSession>[] = [
    {
      key: 'startedAt',
      header: 'Started',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'userId',
      header: 'User',
      render: (value) => {
        const user = users.find((u: User) => u.id === value);
        return user ? (
          <div>
            <div className="font-medium text-gray-900 dark:text-white">{user.email}</div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {user.firstName} {user.lastName}
            </div>
          </div>
        ) : (
          <span className="text-gray-500">Unknown User</span>
        );
      },
    },
    {
      key: 'ipAddress',
      header: 'Location',
      render: (value, row) => (
        <div>
          <div className="font-mono text-sm text-gray-900 dark:text-white">{value}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{row.location}</div>
        </div>
      ),
    },
    {
      key: 'deviceType',
      header: 'Device',
      render: (value, row) => (
        <div>
          <div className="text-sm text-gray-900 dark:text-white">{capitalize(value)}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-xs">
            {row.userAgent}
          </div>
        </div>
      ),
    },
    {
      key: 'lastActivity',
      header: 'Last Activity',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'isActive',
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
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        row.isActive ? (
          <button
            onClick={() => terminateSessionMutation.mutate(row.id)}
            className="text-red-600 hover:text-red-900 text-sm font-medium"
          >
            Terminate
          </button>
        ) : null
      ),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: 'Suspend Users',
      onClick: (selectedIds: string[]) => {
        const reason = prompt('Suspension reason:');
        if (reason) bulkUpdateMutation.mutate({ userIds: selectedIds, action: 'suspend', data: { reason } });
      },
      variant: 'danger' as const,
    },
    {
      label: 'Reactivate Users',
      onClick: (selectedIds: string[]) => bulkUpdateMutation.mutate({ userIds: selectedIds, action: 'reactivate' }),
      variant: 'primary' as const,
    },
    {
      label: 'Request KYC',
      onClick: (selectedIds: string[]) => bulkUpdateMutation.mutate({ userIds: selectedIds, action: 'request_kyc' }),
      variant: 'secondary' as const,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            User Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Platform-level customer user management and verification
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => {
              refetchUsers();
              refetchSecurity();
              refetchSessions();
            }}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Refresh All
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Total Users
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {users.length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Active Users
            </dt>
            <dd className="text-lg font-semibold text-green-600">
              {users.filter((user: User) => user.status === 'active').length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Suspended
            </dt>
            <dd className="text-lg font-semibold text-red-600">
              {users.filter((user: User) => user.status === 'suspended').length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Active Sessions
            </dt>
            <dd className="text-lg font-semibold text-gray-900 dark:text-white">
              {sessions.filter((session: UserSession) => session.isActive).length}
            </dd>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div>
            <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
              Security Events
            </dt>
            <dd className="text-lg font-semibold text-orange-600">
              {securityEvents.filter((event: SecurityEvent) => !event.resolved).length}
            </dd>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">Filters</h3>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="pending_verification">Pending Verification</option>
              <option value="deactivated">Deactivated</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              KYC Level
            </label>
            <select
              value={filters.kycLevel}
              onChange={(e) => setFilters({ ...filters, kycLevel: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All KYC Levels</option>
              <option value="none">None</option>
              <option value="basic">Basic</option>
              <option value="enhanced">Enhanced</option>
              <option value="full">Full</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Risk Score
            </label>
            <select
              value={filters.riskScore}
              onChange={(e) => setFilters({ ...filters, riskScore: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Risk Levels</option>
              <option value="low">Low (0-39)</option>
              <option value="medium">Medium (40-59)</option>
              <option value="high">High (60-79)</option>
              <option value="critical">Critical (80+)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Verification
            </label>
            <select
              value={filters.verificationStatus}
              onChange={(e) => setFilters({ ...filters, verificationStatus: e.target.value })}
              className="w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              <option value="">All Verification</option>
              <option value="verified">Fully Verified</option>
              <option value="partial">Partially Verified</option>
              <option value="unverified">Unverified</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-700">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('users')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'users'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Users ({users.length})
          </button>
          <button
            onClick={() => setActiveTab('sessions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'sessions'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Active Sessions ({sessions.filter((s: UserSession) => s.isActive).length})
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'security'
                ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'
            }`}
          >
            Security Events ({securityEvents.filter((e: SecurityEvent) => !e.resolved).length})
          </button>
        </nav>
      </div>

      {/* Content */}
      {activeTab === 'users' && (
        <DataTable
          data={users}
          columns={userColumns}
          searchable={true}
          searchPlaceholder="Search users by email, name, or ID..."
          selectable={true}
          onSelectionChange={setSelectedUsers}
          actions={bulkActions}
          pagination={{
            pageSize: 20,
            showInfo: true,
          }}
          loading={usersLoading}
          emptyMessage="No users found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'sessions' && (
        <DataTable
          data={sessions}
          columns={sessionColumns}
          searchable={true}
          searchPlaceholder="Search sessions..."
          pagination={{
            pageSize: 20,
            showInfo: true,
          }}
          loading={sessionsLoading}
          emptyMessage="No active sessions found"
          className="shadow-sm"
        />
      )}

      {activeTab === 'security' && (
        <DataTable
          data={securityEvents}
          columns={securityColumns}
          searchable={true}
          searchPlaceholder="Search security events..."
          pagination={{
            pageSize: 20,
            showInfo: true,
          }}
          loading={securityLoading}
          emptyMessage="No security events found"
          className="shadow-sm"
        />
      )}

      {/* Suspension Modal */}
      {showSuspensionModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowSuspensionModal(false)}></div>
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Suspend User Account
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                const reason = formData.get('reason') as string;
                suspendUserMutation.mutate({ userId: selectedUser.id, reason });
              }}>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                      User: <strong>{selectedUser.email}</strong>
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Suspension Reason
                    </label>
                    <textarea
                      name="reason"
                      required
                      rows={3}
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                      placeholder="Enter reason for suspension..."
                    />
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowSuspensionModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={suspendUserMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {suspendUserMutation.isPending ? 'Suspending...' : 'Suspend User'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}