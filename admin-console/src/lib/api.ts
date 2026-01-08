// Maysar Admin Console API Service
// Enterprise-grade API communication layer with authentication and error handling

import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';
const API_VERSION = 'api';

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/${API_VERSION}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication
apiClient.interceptors.request.use(
  (config) => {
    // Get token from localStorage (client-side only)
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('admin_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response: AxiosResponse) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      if (typeof window !== 'undefined') {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_user');
        window.location.href = '/auth/login';
      }
    }

    // Enhance error with user-friendly message
    const enhancedError = {
      ...error,
      userMessage: getUserFriendlyErrorMessage(error),
    };

    return Promise.reject(enhancedError);
  }
);

// Error message helper
function getUserFriendlyErrorMessage(error: AxiosError): string {
  if (error.response?.status === 400) {
    return 'Invalid request. Please check your input and try again.';
  }
  if (error.response?.status === 403) {
    return 'You do not have permission to perform this action.';
  }
  if (error.response?.status === 404) {
    return 'The requested resource was not found.';
  }
  if (error.response?.status === 500) {
    return 'A server error occurred. Please try again later.';
  }
  if (error.code === 'NETWORK_ERROR') {
    return 'Network error. Please check your connection and try again.';
  }
  return 'An unexpected error occurred. Please try again.';
}

// API Service Methods
export const apiService = {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) =>
      apiClient.post('/auth/login', credentials),

    logout: () =>
      apiClient.post('/auth/logout'),

    refreshToken: () =>
      apiClient.post('/auth/refresh'),

    getProfile: () =>
      apiClient.get('/auth/profile'),
  },

  // Dashboard Data
  getDashboardData: () => {
    console.log('Making request to:', `${API_BASE_URL}/${API_VERSION}/admin/dashboard`);
    return apiClient.get('/admin/dashboard');
  },

  getAlerts: () =>
    apiClient.get('/admin/alerts'),

  // Orders Management
  orders: {
    getAll: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      search?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) =>
      apiClient.get('/admin/orders', { params }),

    getById: (id: string) =>
      apiClient.get(`/admin/orders/${id}`),

    updateStatus: (id: string, status: string, reason?: string) =>
      apiClient.patch(`/admin/orders/${id}/status`, { status, reason }),

    cancel: (id: string, reason: string) =>
      apiClient.post(`/admin/orders/${id}/cancel`, { reason }),

    refund: (id: string, amount: number, reason: string) =>
      apiClient.post(`/admin/orders/${id}/refund`, { amount, reason }),
  },

  // Inventory Management
  inventory: {
    getStock: (params?: {
      warehouseId?: string;
      productId?: string;
      lowStock?: boolean;
      page?: number;
      limit?: number;
    }) =>
      apiClient.get('/admin/inventory/stock', { params }),

    updateStock: (productId: string, warehouseId: string, quantity: number) =>
      apiClient.patch('/admin/inventory/stock', { productId, warehouseId, quantity }),

    getWarehouses: () =>
      apiClient.get('/admin/inventory/warehouses'),

    createWarehouse: (warehouse: {
      name: string;
      location: string;
      capacity?: number;
    }) =>
      apiClient.post('/admin/inventory/warehouses', warehouse),

    getLowStockAlerts: () =>
      apiClient.get('/admin/inventory/alerts'),
  },

  // User Management
  users: {
    getAll: (params?: {
      page?: number;
      limit?: number;
      role?: string;
      search?: string;
      status?: string;
      sortBy?: string;
      sortOrder?: 'asc' | 'desc';
    }) =>
      apiClient.get('/admin/users', { params }),

    getById: (id: string) =>
      apiClient.get(`/admin/users/${id}`),

    update: (id: string, userData: unknown) =>
      apiClient.patch(`/admin/users/${id}`, userData),

    suspend: (id: string, reason: string, duration?: number) =>
      apiClient.post(`/admin/users/${id}/suspend`, { reason, duration }),

    activate: (id: string) =>
      apiClient.post(`/admin/users/${id}/activate`),

    resetPassword: (id: string) =>
      apiClient.post(`/admin/users/${id}/reset-password`),

    delete: (id: string, reason: string) =>
      apiClient.delete(`/admin/users/${id}`, { data: { reason } }),
  },

  // Seller Management
  sellers: {
    getAll: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      verificationStatus?: string;
      search?: string;
      tab?: string;
    }) =>
      apiClient.get('/admin/sellers', { params }),

    getById: (id: string) =>
      apiClient.get(`/admin/sellers/${id}`),

    verify: (id: string, decision: 'approve' | 'reject', notes?: string) =>
      apiClient.post(`/admin/sellers/${id}/verify`, { decision, notes }),

    suspend: (id: string, reason: string) =>
      apiClient.post(`/admin/sellers/${id}/suspend`, { reason }),

    updateCommission: (id: string, commissionRate: number) =>
      apiClient.patch(`/admin/sellers/${id}/commission`, { commissionRate }),

    activate: (id: string) =>
      apiClient.post(`/admin/sellers/${id}/activate`),
  },

  // Financial Management
  finance: {
    getRevenue: (params?: {
      startDate?: string;
      endDate?: string;
      groupBy?: 'day' | 'week' | 'month';
    }) =>
      apiClient.get('/admin/finance/revenue', { params }),

    getPayouts: (params?: {
      status?: string;
      page?: number;
      limit?: number;
      sellerId?: string;
    }) =>
      apiClient.get('/admin/finance/payouts', { params }),

    processPayout: (sellerId: string, amount: number) =>
      apiClient.post('/admin/finance/payouts', { sellerId, amount }),

    getFailedPayments: () =>
      apiClient.get('/admin/finance/failed-payments'),

    retryPayment: (paymentId: string) =>
      apiClient.post(`/admin/finance/payments/${paymentId}/retry`),

    getTransactions: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      type?: string;
      startDate?: string;
      endDate?: string;
    }) =>
      apiClient.get('/admin/finance/transactions', { params }),
  },

  // Dispute Resolution
  disputes: {
    getAll: (params?: {
      status?: string;
      page?: number;
      limit?: number;
      priority?: string;
    }) =>
      apiClient.get('/admin/disputes', { params }),

    getById: (id: string) =>
      apiClient.get(`/admin/disputes/${id}`),

    updateStatus: (id: string, status: string, resolution?: string) =>
      apiClient.patch(`/admin/disputes/${id}/status`, { status, resolution }),

    addEvidence: (id: string, evidence: {
      type: 'text' | 'image' | 'document';
      content: string;
      description?: string;
    }) =>
      apiClient.post(`/admin/disputes/${id}/evidence`, evidence),

    assign: (id: string, adminId: string) =>
      apiClient.post(`/admin/disputes/${id}/assign`, { adminId }),

    escalate: (id: string, reason: string) =>
      apiClient.post(`/admin/disputes/${id}/escalate`, { reason }),
  },

  // System Health & Monitoring
  system: {
    getHealth: () =>
      apiClient.get('/admin/system/health'),

    getMetrics: (service?: string) =>
      apiClient.get('/admin/system/metrics', { params: { service } }),

    getLogs: (params?: {
      service?: string;
      level?: string;
      startTime?: string;
      endTime?: string;
      limit?: number;
    }) =>
      apiClient.get('/admin/system/logs', { params }),

    restartService: (serviceName: string) =>
      apiClient.post(`/admin/system/services/${serviceName}/restart`),

    getServices: () =>
      apiClient.get('/admin/system/services'),

    getConfig: (params?: { tab?: string, search?: string }) =>
      apiClient.get('/admin/system/config', { params }),

    getFeatureFlags: () =>
      apiClient.get('/admin/system/feature-flags'),

    createFeatureFlag: (flagData: unknown) =>
      apiClient.post('/admin/system/feature-flags', flagData),

    toggleFeatureFlag: (id: string, enabled: boolean) =>
      apiClient.put(`/admin/system/feature-flags/${id}`, { enabled }),

    updateConfig: (key: string, value: string) =>
      apiClient.put(`/admin/system/config/${key}`, { value }),
  },

  // Audit Logs
  audit: {
    getLogs: (params?: {
      userId?: string;
      action?: string;
      resource?: string;
      startDate?: string;
      endDate?: string;
      page?: number;
      limit?: number;
    }) =>
      apiClient.get('/admin/audit/logs', { params }),

    getLogById: (id: string) =>
      apiClient.get(`/admin/audit/logs/${id}`),

    exportLogs: (params: {
      startDate: string;
      endDate: string;
      format?: 'csv' | 'json' | 'pdf';
    }) =>
      apiClient.get('/admin/audit/logs/export', {
        params,
        responseType: 'blob'
      }),
  },

  // Reports & Analytics
  reports: {
    getDashboardMetrics: () =>
      apiClient.get('/admin/reports/dashboard'),

    getSalesReport: (params: {
      startDate: string;
      endDate: string;
      groupBy?: 'day' | 'week' | 'month';
    }) =>
      apiClient.get('/admin/reports/sales', { params }),

    getUserActivityReport: (params: {
      startDate: string;
      endDate: string;
    }) =>
      apiClient.get('/admin/reports/user-activity', { params }),

    getInventoryReport: () =>
      apiClient.get('/admin/reports/inventory'),

    getFinancialReport: (params: {
      startDate: string;
      endDate: string;
      reportType: 'revenue' | 'payouts' | 'transactions';
    }) =>
      apiClient.get('/admin/reports/financial', { params }),

    exportReport: (reportType: string, format: 'csv' | 'pdf' | 'xlsx', params?: Record<string, unknown>) =>
      apiClient.get(`/admin/reports/export/${reportType}`, {
        params: { ...params, format },
        responseType: 'blob',
      }),
  },

  // Admin User Management
  admin: {
    getAdmins: (params?: {
      page?: number;
      limit?: number;
      status?: string;
      role?: string;
      search?: string;
    }) =>
      apiClient.get('/admin/admins', { params }),

    getAdminById: (id: string) =>
      apiClient.get(`/admin/admins/${id}`),

    createAdmin: (adminData: {
      email: string;
      firstName: string;
      lastName: string;
      role: 'support' | 'moderator' | 'manager' | 'admin' | 'super_admin';
    }) =>
      apiClient.post('/admin/admins', adminData),

    updateAdmin: (id: string, adminData: Partial<{
      firstName: string;
      lastName: string;
      role: 'support' | 'moderator' | 'manager' | 'admin' | 'super_admin';
      status: 'active' | 'suspended' | 'deactivated';
      permissions: Record<string, unknown>;
      ipWhitelist: string[];
    }>) =>
      apiClient.patch(`/admin/admins/${id}`, adminData),

    deleteAdmin: (id: string) =>
      apiClient.delete(`/admin/admins/${id}`),

    enableMFA: (id: string) =>
      apiClient.post(`/admin/admins/${id}/mfa/enable`),

    disableMFA: (id: string) =>
      apiClient.post(`/admin/admins/${id}/mfa/disable`),

    updateIPWhitelist: (id: string, ipWhitelist: string[]) =>
      apiClient.patch(`/admin/admins/${id}/ip-whitelist`, { ipWhitelist }),

    // Enabler Management
    getEnablers: () =>
      apiClient.get('/admin/enablers'),

    promoteEnabler: (id: string, newTier: string) =>
      apiClient.put(`/admin/enablers/${id}/promote`, { tier: newTier }),

    // Supplier Management
    getSuppliers: () =>
      apiClient.get('/admin/suppliers'),

    promoteSupplier: (id: string, newTier: string) =>
      apiClient.put(`/admin/suppliers/${id}/promote`, { tier: newTier }),
  },

  // Fraud Detection & Monitoring
  fraud: {
    getAlerts: (params?: {
      status?: string;
      severity?: string;
      page?: number;
      limit?: number;
    }) =>
      apiClient.get('/admin/fraud/alerts', { params }),

    getAlertById: (id: string) =>
      apiClient.get(`/admin/fraud/alerts/${id}`),

    updateAlertStatus: (id: string, status: string, notes?: string) =>
      apiClient.patch(`/admin/fraud/alerts/${id}/status`, { status, notes }),

    getPatterns: () =>
      apiClient.get('/admin/fraud/patterns'),

    getRiskScores: (params?: {
      userId?: string;
      threshold?: number;
    }) =>
      apiClient.get('/admin/fraud/risk-scores', { params }),

    blockUser: (userId: string, reason: string, duration?: number) =>
      apiClient.post('/admin/fraud/block-user', { userId, reason, duration }),

    unblockUser: (userId: string) =>
      apiClient.post('/admin/fraud/unblock-user', { userId }),
  },

  // KYC Management
  kyc: {
    getAll: (params?: {
      tab?: string;
      riskLevel?: string;
      search?: string;
      status?: string;
    }) =>
      apiClient.get('/admin/kyc', { params }),

    bulkAction: (action: string, userIds: number[]) =>
      apiClient.post('/admin/kyc/bulk-actions', { action, userIds }),

    approve: (id: string) =>
      apiClient.put(`/admin/kyc/${id}/approve`),

    reject: (id: string, reason: string) =>
      apiClient.put(`/admin/kyc/${id}/reject`, { reason }),

    flag: (id: string, reason: string) =>
      apiClient.put(`/admin/kyc/${id}/flag`, { reason }),

    suspend: (id: string, reason: string) =>
      apiClient.put(`/admin/kyc/${id}/suspend`, { reason }),

    getDetails: (id: string) =>
      apiClient.get(`/admin/kyc/${id}/details`),
  },

  // Compliance Management
  compliance: {
    getDashboard: (params?: { tab?: string }) =>
      apiClient.get('/admin/compliance', { params }),

    getGDPRRequests: () =>
      apiClient.get('/admin/compliance/gdpr'),

    getAMLAlerts: () =>
      apiClient.get('/admin/compliance/aml'),

    getComplianceReports: () =>
      apiClient.get('/admin/compliance/reports'),

    processGDPRRequest: (id: string, action: string, notes?: string) =>
      apiClient.post(`/admin/compliance/gdpr/${id}/process`, { action, notes }),

    resolveAMLAlert: (id: string, resolution: string, notes: string) =>
      apiClient.post(`/admin/compliance/aml/${id}/resolve`, { resolution, notes }),

    generateReport: (reportType: string) =>
      apiClient.post('/admin/compliance/reports/generate', { type: reportType }),
  },

  // Shipping & Fulfillment Management
  shipping: {
    getShippingData: () =>
      apiClient.get('/admin/shipping/rates'),

    getShipments: (params?: {
      status?: string;
      carrier?: string;
      page?: number;
      limit?: number;
    }) =>
      apiClient.get('/admin/shipping/shipments', { params }),

    getShippingStats: () =>
      apiClient.get('/admin/shipping/stats'),

    updateShippingRate: (id: string, rateData: {
      rate?: number;
      deliveryDays?: number;
      carrier?: string;
    }) =>
      apiClient.patch(`/admin/shipping/rates/${id}`, rateData),

    createShippingRate: (rateData: {
      region: string;
      weightRange: string;
      rate: number;
      deliveryDays: number;
      carrier: string;
    }) =>
      apiClient.post('/admin/shipping/rates', rateData),

    deleteShippingRate: (id: string) =>
      apiClient.delete(`/admin/shipping/rates/${id}`),

    updateShipment: (id: string, shipmentData: {
      status?: string;
      trackingNumber?: string;
      carrier?: string;
      estimatedDelivery?: string;
    }) =>
      apiClient.patch(`/admin/shipping/shipments/${id}`, shipmentData),
  },

  // Enabler Management
  enabler: {
    getMetrics: () =>
      apiClient.get('/enabler/metrics'),

    getTasks: () =>
      apiClient.get('/enabler/tasks'),

    getRecentActivity: () =>
      apiClient.get('/enabler/activity'),
  },
};

// Export axios instance for advanced usage
export { apiClient };

// Type definitions for API responses
export interface ApiResponse<T> {
  data: T;
  message?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}

export interface ApiError {
  message: string;
  code?: string;
  details?: unknown;
}
