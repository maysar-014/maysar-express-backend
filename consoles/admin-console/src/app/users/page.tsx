// Professional User Management Interface
// Complete user administration with role management, permissions, and account lifecycle

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  UserIcon,
  UserPlusIcon,
  ShieldCheckIcon,
  KeyIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XCircleIcon,
  PencilIcon,
  EyeIcon,
  UserMinusIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  StarIcon,
  BriefcaseIcon,
  WrenchScrewdriverIcon,
  BuildingStorefrontIcon,
  UserGroupIcon,
  BoltIcon,
} from '@heroicons/react/24/outline';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, getStatusColor, capitalize } from '@/lib/utils';

interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'admin' | 'manager' | 'support' | 'seller' | 'customer' | 'enabler';
  status: 'active' | 'suspended' | 'inactive' | 'pending';
  lastLogin?: string;
  createdAt: string;
  updatedAt: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  permissions: string[];
  profileComplete: boolean;
}

interface UserActivity {
  id: string;
  userId: string;
  action: string;
  resource: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
}

interface RolePermissions {
  role: string;
  permissions: string[];
  description: string;
}

export default function UsersPage() {
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  // Fetch users with filters
  const { data: usersData, isLoading: usersLoading, refetch: refetchUsers } = useQuery({
    queryKey: ['users', statusFilter, roleFilter, searchQuery],
    queryFn: () => apiService.users.getAll({
      status: statusFilter === 'all' ? undefined : statusFilter,
      role: roleFilter === 'all' ? undefined : roleFilter,
      search: searchQuery || undefined,
      page: 1,
      limit: 50,
    }),
    staleTime: 30 * 1000,
  });

  // Fetch user activity logs
  const { data: activityData, isLoading: activityLoading } = useQuery({
    queryKey: ['user-activity', selectedUser?.id],
    queryFn: () => selectedUser ? apiService.audit.getLogs({ userId: selectedUser.id, limit: 20 }) : null,
    enabled: !!selectedUser,
    staleTime: 60 * 1000,
  });

  const users = usersData?.data || [];
  const userActivity = activityData?.data || [];

  // Mutations
  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, status, reason }: { userId: string; status: string; reason?: string }) =>
      status === 'suspended'
        ? apiService.users.suspend(userId, reason || 'Administrative action')
        : status === 'active'
        ? apiService.users.activate(userId)
        : apiService.users.update(userId, { status }),
    onSuccess: () => {
      toast.success('User status updated successfully');
      refetchUsers();
      queryClient.invalidateQueries({ queryKey: ['user-activity'] });
    },
    onError: () => {
      toast.error('Failed to update user status');
    },
  });

  const resetPasswordMutation = useMutation({
    mutationFn: (userId: string) => apiService.users.resetPassword(userId),
    onSuccess: () => {
      toast.success('Password reset email sent');
    },
    onError: () => {
      toast.error('Failed to reset password');
    },
  });

  const deleteUserMutation = useMutation({
    mutationFn: ({ userId, reason }: { userId: string; reason: string }) =>
      apiService.users.delete(userId, reason),
    onSuccess: () => {
      toast.success('User deleted successfully');
      refetchUsers();
      setSelectedUsers([]);
    },
    onError: () => {
      toast.error('Failed to delete user');
    },
  });

  // Helper functions
  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'manager': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
      case 'support': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'seller': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'customer': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
      case 'enabler': return 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  };

  const getRoleIcon = (role: string) => {
    const iconClass = "w-4 h-4";
    switch (role) {
      case 'admin': return <StarIcon className={iconClass} />;
      case 'manager': return <BriefcaseIcon className={iconClass} />;
      case 'support': return <WrenchScrewdriverIcon className={iconClass} />;
      case 'seller': return <BuildingStorefrontIcon className={iconClass} />;
      case 'customer': return <UserGroupIcon className={iconClass} />;
      case 'enabler': return <BoltIcon className={iconClass} />;
      default: return <UserIcon className={iconClass} />;
    }
  };

  // Users table columns
  const userColumns: Column<User>[] = [
    {
      key: 'firstName',
      header: 'User',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gray-200 dark:bg-gray-600">
              <span className="text-sm font-medium text-gray-600 dark:text-gray-300">
                {row.firstName?.[0]}{row.lastName?.[0]}
              </span>
            </div>
          </div>
          <div className="ml-3">
            <div className="font-medium text-gray-900 dark:text-white">
              {row.firstName} {row.lastName}
            </div>
            <div className="text-sm text-gray-500 dark:text-gray-400">
              {row.email}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(value)}`}>
          <span className="mr-1">{getRoleIcon(value)}</span>
          {capitalize(value)}
        </span>
      ),
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (value, row) => (
        <div className="flex items-center">
          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(value)}`}>
            {capitalize(value)}
          </span>
          {!row.emailVerified && (
            <ExclamationTriangleIcon className="w-4 h-4 ml-1 text-yellow-500" title="Email not verified" />
          )}
          {row.twoFactorEnabled && (
            <ShieldCheckIcon className="w-4 h-4 ml-1 text-green-500" title="2FA enabled" />
          )}
        </div>
      ),
    },
    {
      key: 'lastLogin',
      header: 'Last Login',
      sortable: true,
      render: (value) => value ? formatDate(value) : <span className="text-gray-400 italic">Never</span>,
    },
    {
      key: 'createdAt',
      header: 'Joined',
      sortable: true,
      render: (value) => formatDate(value),
    },
  ];

  // Bulk actions
  const bulkActions = [
    {
      label: 'Activate Users',
      onClick: (selectedIds: string[]) => handleBulkStatusUpdate(selectedIds, 'active'),
      variant: 'primary' as const,
    },
    {
      label: 'Suspend Users',
      onClick: (selectedIds: string[]) => handleBulkSuspend(selectedIds),
      variant: 'danger' as const,
    },
    {
      label: 'Reset Passwords',
      onClick: (selectedIds: string[]) => handleBulkPasswordReset(selectedIds),
      variant: 'secondary' as const,
    },
    {
      label: 'Delete Users',
      onClick: (selectedIds: string[]) => handleBulkDelete(selectedIds),
      variant: 'danger' as const,
    },
  ];

  const handleBulkStatusUpdate = async (userIds: string[], status: string) => {
    try {
      await Promise.all(
        userIds.map(id => updateUserStatusMutation.mutateAsync({ userId: id, status }))
      );
      toast.success(`Updated ${userIds.length} users`);
      setSelectedUsers([]);
    } catch (error) {
      toast.error('Failed to update users');
    }
  };

  const handleBulkSuspend = async (userIds: string[]) => {
    const reason = prompt('Enter suspension reason:');
    if (!reason) return;

    try {
      await Promise.all(
        userIds.map(id => updateUserStatusMutation.mutateAsync({ userId: id, status: 'suspended', reason }))
      );
      toast.success(`Suspended ${userIds.length} users`);
      setSelectedUsers([]);
    } catch (error) {
      toast.error('Failed to suspend users');
    }
  };

  const handleBulkPasswordReset = async (userIds: string[]) => {
    try {
      await Promise.all(
        userIds.map(id => resetPasswordMutation.mutateAsync(id))
      );
      toast.success(`Sent password reset emails to ${userIds.length} users`);
      setSelectedUsers([]);
    } catch (error) {
      toast.error('Failed to reset passwords');
    }
  };

  const handleBulkDelete = async (userIds: string[]) => {
    const reason = prompt('Enter deletion reason:');
    if (!reason) return;

    if (!confirm(`Are you sure you want to delete ${userIds.length} users? This action cannot be undone.`)) return;

    try {
      await Promise.all(
        userIds.map(id => deleteUserMutation.mutateAsync({ userId: id, reason }))
      );
      toast.success(`Deleted ${userIds.length} users`);
      setSelectedUsers([]);
    } catch (error) {
      toast.error('Failed to delete users');
    }
  };

  const handleViewUser = (user: User) => {
    setSelectedUser(user);
    setShowUserModal(true);
  };

  // Filter options
  const statusOptions = [
    { value: 'all', label: 'All Statuses' },
    { value: 'active', label: 'Active' },
    { value: 'suspended', label: 'Suspended' },
    { value: 'inactive', label: 'Inactive' },
    { value: 'pending', label: 'Pending' },
  ];

  const roleOptions = [
    { value: 'all', label: 'All Roles' },
    { value: 'admin', label: 'Admin' },
    { value: 'manager', label: 'Manager' },
    { value: 'support', label: 'Support' },
    { value: 'seller', label: 'Seller' },
    { value: 'customer', label: 'Customer' },
    { value: 'enabler', label: 'Enabler' },
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
            Comprehensive user administration with role management and account controls
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetchUsers()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            <ArrowPathIcon className="w-4 h-4 mr-2" />
            Refresh
          </button>

          <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700">
            <UserPlusIcon className="w-4 h-4 mr-2" />
            Add User
          </button>
        </div>
      </div>

      {/* User Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <UserIcon className="w-8 h-8 text-blue-600 dark:text-blue-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Total Users
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {users.length}
              </dd>
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
                Active Users
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {users.filter((u: User) => u.status === 'active').length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <ExclamationTriangleIcon className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
            </div>
            <div className="ml-4">
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Pending Verification
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {users.filter((u: User) => !u.emailVerified).length}
              </dd>
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
                2FA Enabled
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {users.filter((u: User) => u.twoFactorEnabled).length}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-wrap items-center gap-4">
          <div className="flex items-center space-x-2">
            <FunnelIcon className="w-5 h-5 text-gray-400" />
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
            <ShieldCheckIcon className="w-5 h-5 text-gray-400" />
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="rounded-md border border-gray-300 bg-white py-2 pl-3 pr-10 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            >
              {roleOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 min-w-[300px]">
            <div className="relative">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-2.5 text-gray-400" />
              <input
                type="search"
                placeholder="Search users by name, email, or ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-md border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <DataTable
        data={users}
        columns={userColumns}
        searchable={false}
        selectable={true}
        onSelectionChange={setSelectedUsers}
        actions={bulkActions}
        pagination={{
          pageSize: 20,
          showInfo: true,
        }}
        loading={usersLoading}
        emptyMessage="No users found matching your criteria"
        className="shadow-sm"
      />

      {/* User Detail Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowUserModal(false)} />

            <div className="inline-block w-full max-w-4xl p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white shadow-xl rounded-lg dark:bg-gray-800">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  User Details: {selectedUser.firstName} {selectedUser.lastName}
                </h3>
                <button
                  onClick={() => setShowUserModal(false)}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <XCircleIcon className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* User Information */}
                <div className="lg:col-span-2 space-y-6">
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Account Information</h4>
                    <dl className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Email</dt>
                        <dd className="text-gray-900 dark:text-white">{selectedUser.email}</dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Role</dt>
                        <dd>
                          <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(selectedUser.role)}`}>
                            <span className="mr-1">{getRoleIcon(selectedUser.role)}</span>
                            {capitalize(selectedUser.role)}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Status</dt>
                        <dd>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(selectedUser.status)}`}>
                            {capitalize(selectedUser.status)}
                          </span>
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Last Login</dt>
                        <dd className="text-gray-900 dark:text-white">
                          {selectedUser.lastLogin ? formatDate(selectedUser.lastLogin) : 'Never'}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">Email Verified</dt>
                        <dd>
                          {selectedUser.emailVerified ? (
                            <CheckCircleIcon className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="w-5 h-5 text-red-500" />
                          )}
                        </dd>
                      </div>
                      <div>
                        <dt className="font-medium text-gray-500 dark:text-gray-400">2FA Enabled</dt>
                        <dd>
                          {selectedUser.twoFactorEnabled ? (
                            <ShieldCheckIcon className="w-5 h-5 text-green-500" />
                          ) : (
                            <XCircleIcon className="w-5 h-5 text-gray-400" />
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>

                  {/* Recent Activity */}
                  <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Recent Activity</h4>
                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {userActivity.length > 0 ? (
                        userActivity.map((activity: UserActivity) => (
                          <div key={activity.id} className="flex items-start space-x-3 text-sm">
                            <div className="flex-shrink-0 w-2 h-2 bg-blue-500 rounded-full mt-2"></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-gray-900 dark:text-white">
                                <span className="font-medium">{activity.action}</span> on{' '}
                                <span className="font-medium">{activity.resource}</span>
                              </p>
                              <p className="text-gray-500 dark:text-gray-400 text-xs">
                                {formatDate(activity.timestamp)} • {activity.ipAddress}
                              </p>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 dark:text-gray-400 text-sm">No recent activity</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions Sidebar */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Quick Actions</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => resetPasswordMutation.mutate(selectedUser.id)}
                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                      >
                        <KeyIcon className="w-4 h-4 mr-2" />
                        Reset Password
                      </button>

                      {selectedUser.status === 'active' ? (
                        <button
                          onClick={() => updateUserStatusMutation.mutate({
                            userId: selectedUser.id,
                            status: 'suspended',
                            reason: 'Administrative suspension'
                          })}
                          className="w-full flex items-center px-3 py-2 text-sm font-medium text-yellow-700 bg-yellow-50 border border-yellow-300 rounded-md hover:bg-yellow-100 dark:bg-yellow-900 dark:border-yellow-600 dark:text-yellow-300"
                        >
                          <UserMinusIcon className="w-4 h-4 mr-2" />
                          Suspend User
                        </button>
                      ) : (
                        <button
                          onClick={() => updateUserStatusMutation.mutate({
                            userId: selectedUser.id,
                            status: 'active'
                          })}
                          className="w-full flex items-center px-3 py-2 text-sm font-medium text-green-700 bg-green-50 border border-green-300 rounded-md hover:bg-green-100 dark:bg-green-900 dark:border-green-600 dark:text-green-300"
                        >
                          <CheckCircleIcon className="w-4 h-4 mr-2" />
                          Activate User
                        </button>
                      )}

                      <button
                        onClick={() => {
                          const reason = prompt('Enter deletion reason:');
                          if (reason) {
                            deleteUserMutation.mutate({ userId: selectedUser.id, reason });
                          }
                        }}
                        className="w-full flex items-center px-3 py-2 text-sm font-medium text-red-700 bg-red-50 border border-red-300 rounded-md hover:bg-red-100 dark:bg-red-900 dark:border-red-600 dark:text-red-300"
                      >
                        <UserMinusIcon className="w-4 h-4 mr-2" />
                        Delete User
                      </button>
                    </div>
                  </div>

                  {/* Permissions */}
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
                    <h4 className="font-medium text-gray-900 dark:text-white mb-3">Permissions</h4>
                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                      {selectedUser.permissions.map((permission, index) => (
                        <div key={index} className="flex items-center">
                          <CheckCircleIcon className="w-4 h-4 text-green-500 mr-2" />
                          {permission}
                        </div>
                      ))}
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
