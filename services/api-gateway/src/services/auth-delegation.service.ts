/**
 * Auth Delegation Service
 * 
 * Handles communication with the Auth Service for authentication validation.
 * This service implements the delegation pattern to maintain separation of
 * concerns between the Gateway and Auth Service.
 */

import axios, { AxiosInstance, AxiosResponse } from 'axios';
import { GatewayError } from '../types';
import { AuthDelegationConfig } from './auth-delegation.config';

export interface AuthValidationRequest {
  token: string;
  scopes?: string[];
  roles?: string[];
}

export interface AuthValidationResponse {
  valid: boolean;
  error?: string;
  context?: AuthContext;
}

export interface AuthContext {
  userId: string;
  email: string;
  role: string;
  roles: string[];
  permissions: string[];
  sessionId: string;
  token: string;
  expiresAt: Date;
}

export interface AuthDelegationOptions {
  scopes?: string[];
  roles?: string[];
  timeout?: number;
  cacheTTL?: number;
}

export class AuthDelegationService {
  private httpClient: AxiosInstance;
  private config: AuthDelegationConfig;
  private cache: Map<string, CachedAuthResult> = new Map();

  constructor(config?: Partial<AuthDelegationConfig>) {
    this.config = new AuthDelegationConfig(config);
    this.httpClient = this.createHttpClient();
  }

  async validateToken(
    token: string, 
    options: AuthDelegationOptions = {}
  ): Promise<AuthValidationResponse> {
    try {
      // Check cache first
      const cachedResult = this.getCachedResult(token);
      if (cachedResult) {
        return cachedResult;
      }

      // Validate token with Auth Service
      const response = await this.httpClient.post<AuthValidationResponse>(
        '/auth/validate',
        {
          token,
          scopes: options.scopes || [],
          roles: options.roles || [],
        },
        {
          timeout: options.timeout || this.config.timeout,
        }
      );

      const result = response.data;

      // Cache the result if valid
      if (result.valid && result.context) {
        this.setCachedResult(token, result, options.cacheTTL || this.config.cacheTTL);
      }

      return result;

    } catch (error) {
      console.error('Auth delegation service error:', error);
      return this.handleAuthError(error);
    }
  }

  async refreshSession(token: string): Promise<AuthValidationResponse> {
    try {
      const response = await this.httpClient.post<AuthValidationResponse>(
        '/auth/refresh',
        { token },
        { timeout: this.config.timeout }
      );

      const result = response.data;

      // Update cache with refreshed session
      if (result.valid && result.context) {
        this.setCachedResult(token, result, this.config.cacheTTL);
      }

      return result;

    } catch (error) {
      console.error('Auth session refresh error:', error);
      return this.handleAuthError(error);
    }
  }

  async revokeSession(token: string): Promise<boolean> {
    try {
      await this.httpClient.post(
        '/auth/revoke',
        { token },
        { timeout: this.config.timeout }
      );

      // Remove from cache
      this.cache.delete(token);
      return true;

    } catch (error) {
      console.error('Auth session revoke error:', error);
      return false;
    }
  }

  private createHttpClient(): AxiosInstance {
    const client = axios.create({
      baseURL: this.config.authServiceUrl,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Maysar-API-Gateway/1.0.0',
      },
    });

    // Add request interceptor for logging
    client.interceptors.request.use(
      (config) => {
        console.debug(`Auth Service Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Auth Service Request Error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    client.interceptors.response.use(
      (response) => {
        console.debug(`Auth Service Response: ${response.status}`);
        return response;
      },
      (error) => {
        console.error('Auth Service Response Error:', error.response?.status, error.message);
        return Promise.reject(error);
      }
    );

    return client;
  }

  private getCachedResult(token: string): AuthValidationResponse | null {
    const cached = this.cache.get(token);
    if (!cached) return null;

    if (Date.now() > cached.expiresAt) {
      this.cache.delete(token);
      return null;
    }

    return cached.result;
  }

  private setCachedResult(token: string, result: AuthValidationResponse, ttl: number): void {
    const expiresAt = Date.now() + ttl;
    this.cache.set(token, {
      result,
      expiresAt,
    });

    // Clean up expired cache entries periodically
    if (this.cache.size > this.config.maxCacheSize) {
      this.cleanupCache();
    }
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [token, cached] of this.cache.entries()) {
      if (now > cached.expiresAt) {
        this.cache.delete(token);
      }
    }
  }

  private handleAuthError(error: any): AuthValidationResponse {
    if (error.response) {
      // Auth Service returned an error response
      const status = error.response.status;
      const message = error.response.data?.message || 'Authentication failed';
      
      if (status === 401) {
        return {
          valid: false,
          error: 'Invalid or expired token',
        };
      } else if (status === 403) {
        return {
          valid: false,
          error: 'Insufficient permissions',
        };
      } else {
        return {
          valid: false,
          error: `Auth service error: ${message}`,
        };
      }
    } else if (error.code === 'ECONNREFUSED' || error.code === 'ENOTFOUND') {
      // Auth Service is unavailable
      return {
        valid: false,
        error: 'Authentication service unavailable',
      };
    } else {
      // Other errors
      return {
        valid: false,
        error: 'Authentication validation failed',
      };
    }
  }

  // Health check for Auth Service
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.httpClient.get('/health', {
        timeout: 5000,
      });
      return response.status === 200;
    } catch (error) {
      console.error('Auth Service health check failed:', error);
      return false;
    }
  }

  // Get service status and metrics
  getServiceStatus(): ServiceStatus {
    return {
      healthy: this.cache.size > 0, // Basic health check
      cacheSize: this.cache.size,
      maxCacheSize: this.config.maxCacheSize,
      cacheHitRate: this.getCacheHitRate(),
      lastHealthCheck: new Date(),
    };
  }

  private getCacheHitRate(): number {
    // This would need to be implemented with proper cache hit/miss tracking
    return 0;
  }
}

interface CachedAuthResult {
  result: AuthValidationResponse;
  expiresAt: number;
}

interface ServiceStatus {
  healthy: boolean;
  cacheSize: number;
  maxCacheSize: number;
  cacheHitRate: number;
  lastHealthCheck: Date;
}