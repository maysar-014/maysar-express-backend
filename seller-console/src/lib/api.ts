import axios, { AxiosInstance, AxiosResponse, AxiosError } from 'axios';

// API Configuration
const API_BASE_URL = 'http://localhost:3002';
const API_VERSION = 'api';

// Logging utility
const log = {
  info: (message: string, data?: any) => console.log(`[API] ${message}`, data || ''),
  error: (message: string, error?: any) => console.error(`[API ERROR] ${message}`, error || ''),
  warn: (message: string, data?: any) => console.warn(`[API WARN] ${message}`, data || '')
};

// Create axios instance with default configuration
const apiClient: AxiosInstance = axios.create({
  baseURL: `${API_BASE_URL}/${API_VERSION}`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for authentication and logging
apiClient.interceptors.request.use(
  (config) => {
    log.info(`Making ${config.method?.toUpperCase()} request to: ${config.url}`);
    log.info('Request config:', { 
      baseURL: config.baseURL, 
      url: config.url, 
      method: config.method,
      timeout: config.timeout 
    });
    
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('seller_token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
        log.info('Added auth token to request');
      } else {
        log.warn('No auth token found in localStorage');
      }
    }
    return config;
  },
  (error) => {
    log.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and logging
apiClient.interceptors.response.use(
  (response: AxiosResponse) => {
    log.info(`✅ ${response.config.method?.toUpperCase()} ${response.config.url} - Status: ${response.status}`);
    log.info('Full response data:', response.data);
    return response;
  },
  (error: AxiosError) => {
    const { config, response, message } = error;
    
    log.error(`❌ ${config?.method?.toUpperCase()} ${config?.url} failed`);
    log.error('Error details:', {
      status: response?.status,
      statusText: response?.statusText,
      message: message,
      responseData: response?.data,
      requestURL: `${config?.baseURL}${config?.url}`
    });
    
    // Connection errors
    if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      log.error('🔌 Connection failed - Check if seller service is running on port 3002');
    }
    
    // Timeout errors
    if (error.code === 'ECONNABORTED') {
      log.error('⏱️ Request timeout - Service may be slow or unresponsive');
    }
    
    if (error.response?.status === 401) {
      log.warn('🔐 Unauthorized - Redirecting to login');
      if (typeof window !== 'undefined') {
        localStorage.removeItem('seller_token');
        localStorage.removeItem('seller_user');
        window.location.href = '/auth/login';
      }
    }
    
    return Promise.reject(error);
  }
);

// API Service Methods
export const apiService = {
  // Authentication utilities
  setAuthToken: (token: string) => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('seller_token', token);
      log.info('🔑 Auth token set successfully');
    }
  },
  
  clearAuthToken: () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('seller_token');
      localStorage.removeItem('seller_user');
      log.info('🚪 Auth token cleared');
    }
  },
  // Connection test utility
  testConnection: async () => {
    log.info('🔍 Testing connection to seller service...');
    try {
      const response = await apiClient.get('/health');
      log.info('✅ Connection test successful', response.data);
      return response;
    } catch (error) {
      log.error('❌ Connection test failed');
      log.error('Troubleshooting steps:');
      log.error('1. Check if seller service is running: curl http://localhost:3002/api/health');
      log.error('2. Verify port 3002 is not blocked by firewall');
      log.error('3. Check seller service logs for errors');
      throw error;
    }
  },
  // Dashboard
  getDashboard: () => apiClient.get('/seller/dashboard'),
  
  // Products
  getProducts: () => apiClient.get('/seller/products'),
  
  // Inventory
  getInventory: () => apiClient.get('/seller/inventory'),
  
  // Orders
  getOrders: () => apiClient.get('/seller/orders'),
  
  // Customers
  getCustomers: () => apiClient.get('/seller/customers'),
  
  // Reviews
  getReviews: () => apiClient.get('/seller/reviews'),
  
  // Enablers
  getEnablers: () => apiClient.get('/seller/enablers'),
  
  // Promotions
  getPromotions: () => apiClient.get('/seller/promotions'),
  
  // Payments
  getPayments: () => apiClient.get('/seller/payments'),
  
  // KYC
  getKYC: () => apiClient.get('/seller/kyc'),
  
  // Settings
  getSettings: () => apiClient.get('/seller/settings'),
  
  // Shipping & Fulfillment with enhanced logging
  getShippingData: async () => {
    log.info('🚚 Fetching shipping data...');
    try {
      const response = await apiClient.get('/seller/shipping');
      log.info('✅ Shipping data retrieved successfully');
      log.info('Shipping rates count:', response.data?.data?.shippingRates?.length || 0);
      return response;
    } catch (error) {
      log.error('❌ Failed to fetch shipping data', error);
      throw error;
    }
  },
  
  getShipments: async () => {
    log.info('📦 Fetching shipments...');
    try {
      const response = await apiClient.get('/seller/shipments');
      log.info('✅ Shipments retrieved successfully');
      log.info('Shipments count:', response.data?.data?.shipments?.length || 0);
      return response;
    } catch (error) {
      log.error('❌ Failed to fetch shipments', error);
      throw error;
    }
  },
  
  getShippingStats: async () => {
    log.info('📊 Fetching shipping statistics...');
    try {
      const response = await apiClient.get('/seller/shipping-stats');
      log.info('✅ Shipping stats retrieved successfully');
      log.info('Stats data:', response.data?.data);
      return response;
    } catch (error) {
      log.error('❌ Failed to fetch shipping stats', error);
      throw error;
    }
  },
  
  // Additional shipping methods for better API coverage
  getShippingRates: async (params?: any) => {
    log.info('💰 Fetching shipping rates...', params);
    try {
      const response = await apiClient.get('/seller/shipping/rates', { params });
      log.info('✅ Shipping rates retrieved successfully');
      return response;
    } catch (error) {
      log.error('❌ Failed to fetch shipping rates', error);
      throw error;
    }
  },
  
  getCarriers: async () => {
    log.info('🚛 Fetching carriers...');
    try {
      const response = await apiClient.get('/seller/shipping/carriers');
      log.info('✅ Carriers retrieved successfully');
      return response;
    } catch (error) {
      log.error('❌ Failed to fetch carriers', error);
      throw error;
    }
  },
  
  trackShipment: async (trackingNumber: string) => {
    log.info('🔍 Tracking shipment:', trackingNumber);
    try {
      const response = await apiClient.get(`/seller/shipping/track/${trackingNumber}`);
      log.info('✅ Shipment tracking retrieved successfully');
      return response;
    } catch (error) {
      log.error('❌ Failed to track shipment', error);
      throw error;
    }
  },
};

export { apiClient };