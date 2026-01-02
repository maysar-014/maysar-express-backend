"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-hot-toast';
import { DataTable, Column } from '@/components/ui/DataTable';
import { apiService } from '@/lib/api';
import { formatDate, getStatusColor, capitalize } from '@/lib/utils';

interface AdminUser {
  id: string;
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  role: 'support' | 'moderator' | 'manager' | 'admin' | 'super_admin';
  status: 'active' | 'suspended' | 'deactivated';
  permissions: Record<string, unknown>;
  lastLoginAt?: string;
  mfaEnabled: boolean;
  ipWhitelist: string[];
  createdAt: string;
  updatedAt: string;
}

export default function AdminUsersPage() {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedAdmin, setSelectedAdmin] = useState<AdminUser | null>(null);
  const [selectedAdmins, setSelectedAdmins] = useState<string[]>([]);

  const queryClient = useQueryClient();

  // Fetch admin users
  const { data: adminsData, isLoading, refetch } = useQuery({
    queryKey: ['admin-users'],
    queryFn: () => apiService.admin.getAdmins(),
    staleTime: 30 * 1000, // 30 seconds
  });

  const admins = adminsData?.data || [];

  // Mutations
  const createAdminMutation = useMutation({
    mutationFn: (adminData: {
      email: string;
      firstName: string;
      lastName: string;
      role: AdminUser['role'];
    }) => apiService.admin.createAdmin(adminData),
    onSuccess: () => {
      toast.success('Admin user created successfully');
      refetch();
      setShowCreateModal(false);
    },
    onError: () => {
      toast.error('Failed to create admin user');
    },
  });

  const updateAdminMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<AdminUser> }) =>
      apiService.admin.updateAdmin(id, data),
    onSuccess: () => {
      toast.success('Admin user updated successfully');
      refetch();
      setShowEditModal(false);
      setSelectedAdmin(null);
    },
    onError: () => {
      toast.error('Failed to update admin user');
    },
  });

  const deleteAdminMutation = useMutation({
    mutationFn: (id: string) => apiService.admin.deleteAdmin(id),
    onSuccess: () => {
      toast.success('Admin user deleted successfully');
      refetch();
    },
    onError: () => {
      toast.error('Failed to delete admin user');
    },
  });

  // Table columns
  const columns: Column<AdminUser>[] = [
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (value, row) => (
        <div>
          <div className="font-medium text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">
            {row.firstName} {row.lastName}
          </div>
        </div>
      ),
    },
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (value) => (
        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
          value === 'super_admin' ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300' :
          value === 'admin' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300' :
          value === 'manager' ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300' :
          value === 'moderator' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300' :
          'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300'
        }`}>
          {capitalize(value.replace('_', ' '))}
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
      key: 'mfaEnabled',
      header: 'MFA',
      render: (value) => (
        <div className="flex items-center">
          {value ? (
            <div className="w-5 h-5 rounded-full bg-green-600"></div>
          ) : (
            <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
          )}
        </div>
      ),
    },
    {
      key: 'ipWhitelist',
      header: 'IP Whitelist',
      render: (value: string[]) => (
        <div className="text-xs text-gray-500 dark:text-gray-400">
          {value && value.length > 0 ? `${value.length} IPs` : 'None'}
        </div>
      ),
    },
    {
      key: 'lastLoginAt',
      header: 'Last Login',
      sortable: true,
      render: (value) => value ? formatDate(value) : 'Never',
    },
    {
      key: 'createdAt',
      header: 'Created',
      sortable: true,
      render: (value) => formatDate(value),
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (_, row) => (
        <div className="flex items-center space-x-2">
          <button
            onClick={() => handleEdit(row)}
            className="text-blue-600 hover:text-blue-900 text-sm font-medium"
          >
            Edit
          </button>
          <button
            onClick={() => handleMFAToggle(row.id, !row.mfaEnabled)}
            className="text-green-600 hover:text-green-900 text-sm font-medium"
          >
            {row.mfaEnabled ? 'Disable MFA' : 'Enable MFA'}
          </button>
        </div>
      ),
    },
  ];

  // MFA toggle mutation
  const toggleMFAMutation = useMutation({
    mutationFn: ({ id, enabled }: { id: string; enabled: boolean }) =>
      apiService.admin.toggleMFA(id, enabled),
    onSuccess: () => {
      toast.success('MFA settings updated successfully');
      refetch();
    },
    onError: () => {
      toast.error('Failed to update MFA settings');
    },
  });

  const handleMFAToggle = (adminId: string, enabled: boolean) => {
    toggleMFAMutation.mutate({ id: adminId, enabled });
  };

  // Bulk actions
  const bulkActions = [
    {
      label: 'Activate',
      onClick: (selectedIds: string[]) => handleBulkStatusUpdate(selectedIds, 'active'),
      variant: 'primary' as const,
    },
    {
      label: 'Suspend',
      onClick: (selectedIds: string[]) => handleBulkStatusUpdate(selectedIds, 'suspended'),
      variant: 'secondary' as const,
    },
    {
      label: 'Delete',
      onClick: (selectedIds: string[]) => handleBulkDelete(selectedIds),
      variant: 'danger' as const,
    },
  ];

  const handleBulkStatusUpdate = async (adminIds: string[], status: AdminUser['status']) => {
    try {
      await Promise.all(
        adminIds.map(id => updateAdminMutation.mutateAsync({ id, data: { status } }))
      );
      toast.success(`Updated ${adminIds.length} admin users`);
      setSelectedAdmins([]);
    } catch (error: unknown) {
      toast.error('Failed to update admin users');
    }
  };

  const handleBulkDelete = async (adminIds: string[]) => {
    if (!confirm(`Are you sure you want to delete ${adminIds.length} admin users?`)) return;

    try {
      await Promise.all(
        adminIds.map(id => deleteAdminMutation.mutateAsync(id))
      );
      toast.success(`Deleted ${adminIds.length} admin users`);
      setSelectedAdmins([]);
    } catch (error: unknown) {
      toast.error('Failed to delete admin users');
    }
  };

  const handleEdit = (admin: AdminUser) => {
    setSelectedAdmin(admin);
    setShowEditModal(true);
  };

  const roleOptions = [
    { value: 'support', label: 'Support' },
    { value: 'moderator', label: 'Moderator' },
    { value: 'manager', label: 'Manager' },
    { value: 'admin', label: 'Admin' },
    { value: 'super_admin', label: 'Super Admin' },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Admin User Management
          </h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
            Manage platform administrators and their access permissions
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => refetch()}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
          >
            Refresh
          </button>

          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
          >
            Add Admin
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Total Admins
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {admins.length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Active Admins
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {admins.filter((a: AdminUser) => a.status === 'active').length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                MFA Enabled
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {admins.filter((admin: AdminUser) => admin.mfaEnabled).length}
              </dd>
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center">
            <div>
              <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">
                Super Admins
              </dt>
              <dd className="text-lg font-semibold text-gray-900 dark:text-white">
                {admins.filter((admin: AdminUser) => admin.role === 'super_admin').length}
              </dd>
            </div>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <DataTable
        data={admins}
        columns={columns}
        searchable={true}
        searchPlaceholder="Search admins by email or name..."
        selectable={true}
        onSelectionChange={setSelectedAdmins}
        actions={bulkActions}
        pagination={{
          pageSize: 10,
          showInfo: true,
        }}
        loading={isLoading}
        emptyMessage="No admin users found"
        className="shadow-sm"
      />

      {/* Create Admin Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowCreateModal(false)}></div>
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Create New Admin User
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                createAdminMutation.mutate({
                  email: formData.get('email') as string,
                  firstName: formData.get('firstName') as string,
                  lastName: formData.get('lastName') as string,
                  role: formData.get('role') as AdminUser['role'],
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      name="email"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Role
                    </label>
                    <select
                      name="role"
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowCreateModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createAdminMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {createAdminMutation.isPending ? 'Creating...' : 'Create Admin'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Admin Modal */}
      {showEditModal && selectedAdmin && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowEditModal(false)}></div>
            <div className="inline-block w-full max-w-md p-6 my-8 overflow-hidden text-left align-middle transition-all transform bg-white dark:bg-gray-800 shadow-xl rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
                Edit Admin User
              </h3>
              <form onSubmit={(e) => {
                e.preventDefault();
                const formData = new FormData(e.target as HTMLFormElement);
                updateAdminMutation.mutate({
                  id: selectedAdmin.id,
                  data: {
                    firstName: formData.get('firstName') as string,
                    lastName: formData.get('lastName') as string,
                    role: formData.get('role') as AdminUser['role'],
                    status: formData.get('status') as AdminUser['status'],
                  },
                });
              }}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Email
                    </label>
                    <input
                      type="email"
                      defaultValue={selectedAdmin.email}
                      disabled
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-gray-100 py-2 px-3 text-sm dark:border-gray-600 dark:bg-gray-800 dark:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      First Name
                    </label>
                    <input
                      type="text"
                      name="firstName"
                      defaultValue={selectedAdmin.firstName}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Last Name
                    </label>
                    <input
                      type="text"
                      name="lastName"
                      defaultValue={selectedAdmin.lastName}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Role
                    </label>
                    <select
                      name="role"
                      defaultValue={selectedAdmin.role}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      {roleOptions.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                      Status
                    </label>
                    <select
                      name="status"
                      defaultValue={selectedAdmin.status}
                      required
                      className="mt-1 block w-full rounded-md border border-gray-300 bg-white py-2 px-3 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                    >
                      <option value="active">Active</option>
                      <option value="suspended">Suspended</option>
                      <option value="deactivated">Deactivated</option>
                    </select>
                  </div>
                </div>
                <div className="mt-6 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={updateAdminMutation.isPending}
                    className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {updateAdminMutation.isPending ? 'Updating...' : 'Update Admin'}
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
