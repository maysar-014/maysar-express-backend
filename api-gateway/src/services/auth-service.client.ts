/**
 * Auth Service Client
 * 
 * Client for communicating with the Auth Service for authentication validation
 * Implements service-to-service communication patterns per Integration Constitution
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { AuthContext, AuthConfig } from '../types';
import { gatewayConfig } from '../config';

export interface AuthValidationRequest {
  token: string;
  serviceId?: string;
  requestId?: string;
}

export interface AuthValidationResponse {
  valid: boolean;
  payload?: any;
  error?: string;
  expiresAt?: number;
  issuedAt?: number;
}

export interface TokenBlacklistRequest {
  token: string;
  reason?: string;
  userId?: string;
}

export interface TokenBlacklistResponse {
  blacklisted: boolean;
  error?: string;
}

export class AuthServiceClient {
  private client: AxiosInstance;
  private config: AuthConfig;

  constructor(config?: Partial<AuthConfig>) {
    this.config = {
      baseUrl: gatewayConfig.authServiceUrl,
      timeout: gatewayConfig.authServiceTimeout,
      retryAttempts: gatewayConfig.authServiceRetryAttempts,
      retryDelay: gatewayConfig.authServiceRetryDelay,
      ...config,
    };

    this.client = axios.create({
      baseURL: this.config.baseUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Maysar-API-Gateway/1.0.0',
      },
    });

    // Add request interceptor for service-to-service authentication
    this.client.interceptors.request.use(
      (config) => {
        // Add service authentication headers
        config.headers['X-Service-Key'] = this.config.serviceKey;
        config.headers['X-Service-Id'] = this.config.serviceId;
        config.headers['X-Request-ID'] = this.generateRequestId();
        return config;
      },
      (error) => Promise.reject(error)
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      async (error) => {
        if (error.response?.status === 401) {
          // Service authentication failed, retry with fresh credentials
          return this.handleServiceAuthFailure(error);
        }
        return Promise.reject(error);
      }
    );
  }

  /**
   * Validate JWT token with Auth Service
   */
  async validateToken(token: string): Promise<AuthValidationResponse> {
    const request: AuthValidationRequest = {
      token,
      serviceId: this.config.serviceId,
      requestId: this.generateRequestId(),
    };

    try {
      const response = await this.makeRequestWithRetry<AuthValidationResponse>({
        method: 'POST',
        url: '/api/v1/auth/validate',
        data: request,
      });

      return response.data;
    } catch (error) {
      console.error('Auth service validation failed:', error);
      return {
        valid: false,
        error: 'Authentication service unavailable',
      };
    }
  }

  /**
   * Check if token is blacklisted
   */
  async checkTokenBlacklist(token: string): Promise<{ isBlacklisted: boolean }> {
    try {
      const response = await this.makeRequestWithRetry<{ isBlacklisted: boolean }>({
        method: 'POST',
        url: '/api/v1/auth/check-blacklist',
        data: { token },
      });

      return response.data;
    } catch (error) {
      console.error('Auth service blacklist check failed:', error);
      return { isBlacklisted: false }; // Fail open for availability
    }
  }

  /**
   * Blacklist a token (for logout, security incidents, etc.)
   */
  async blacklistToken(request: TokenBlacklistRequest): Promise<TokenBlacklistResponse> {
    try {
      const response = await this.makeRequestWithRetry<TokenBlacklistResponse>({
        method: 'POST',
        url: '/api/v1/auth/blacklist',
        data: request,
      });

      return response.data;
    } catch (error) {
      console.error('Auth service token blacklist failed:', error);
      return {
        blacklisted: false,
        error: 'Failed to blacklist token',
      };
    }
  }

  /**
   * Refresh a token
   */
  async refreshAuthToken(refreshToken: string): Promise<AuthValidationResponse> {
    try {
      const response = await this.makeRequestWithRetry<AuthValidationResponse>({
        method: 'POST',
        url: '/api/v1/auth/refresh',
        data: {
          refreshToken,
          serviceId: this.config.serviceId,
          requestId: this.generateRequestId(),
        },
      });

      return response.data;
    } catch (error) {
      console.error('Auth service token refresh failed:', error);
      return {
        valid: false,
        error: 'Token refresh failed',
      };
    }
  }

  /**
   * Get user permissions for authorization
   */
  async getUserPermissions(userId: string): Promise<{ permissions: string[]; roles: string[] }> {
    try {
      const response = await this.makeRequestWithRetry<{ permissions: string[]; roles: string[] }>({
        method: 'GET',
        url: `/api/v1/auth/permissions/${userId}`,
      });

      return response.data;
    } catch (error) {
      console.error('Auth service permissions fetch failed:', error);
      return { permissions: [], roles: [] };
    }
  }

  /**
   * Make HTTP request with retry logic
   */
  private async makeRequestWithRetry<T>(config: any): Promise<AxiosResponse<T>> {
    let lastError: any;

    for (let attempt = 0; attempt <= this.config.retryAttempts; attempt++) {
      try {
        const response = await this.client.request<T>(config);
        return response;
      } catch (error) {
        lastError = error;

        if (attempt === this.config.retryAttempts) {
          throw error;
        }

        // Wait before retrying
        await this.delay(this.config.retryDelay * Math.pow(2, attempt));
      }
    }

    throw lastError;
  }

  /**
   * Handle service authentication failure
   */
  private async handleServiceAuthFailure(error: any): Promise<AxiosResponse> {
    console.error('Service authentication failed, attempting to refresh service credentials');
    
    // In a real implementation, you would refresh service credentials here
    // For now, we'll just retry once with the same credentials
    
    const originalRequest = error.config;
    if (!originalRequest._retry) {
      originalRequest._retry = true;
      return this.client.request(originalRequest);
    }

    throw error;
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `gateway-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay utility function
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Health check for Auth Service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.client.get('/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('Auth service health check failed:', error);
      return false;
    }
  }
}

// Default auth service client instance
export const authServiceClient = new AuthServiceClient();