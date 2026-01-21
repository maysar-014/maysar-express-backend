import axios, { AxiosInstance, AxiosResponse } from 'axios';
import * as CircuitBreaker from 'opossum';
import { logger } from '../services/logger.service';

/**
 * User Service Client Configuration
 */
interface UserServiceClientConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  circuitBreaker: {
    timeout: number;
    errorThresholdPercentage: number;
    resetTimeout: number;
  };
}

/**
 * Circuit breaker for User Service calls
 */
class UserServiceCircuitBreaker {
  private breaker: CircuitBreaker;

  constructor(private config: UserServiceClientConfig) {
    this.breaker = new CircuitBreaker(async (fn: Function, ...args: any[]) => {
      return await fn(...args);
    }, {
      timeout: config.circuitBreaker.timeout,
      errorThresholdPercentage: config.circuitBreaker.errorThresholdPercentage,
      resetTimeout: config.circuitBreaker.resetTimeout,
      name: 'user-service-circuit-breaker'
    });

    // Circuit breaker event handlers
    this.breaker.on('open', () => {
      logger.warn('User Service circuit breaker opened');
    });

    this.breaker.on('close', () => {
      logger.info('User Service circuit breaker closed');
    });

    this.breaker.on('halfOpen', () => {
      logger.info('User Service circuit breaker half-open');
    });

    this.breaker.on('fallback', (result) => {
      logger.warn('User Service fallback triggered', { result });
    });
  }

  /**
   * Execute function with circuit breaker protection
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    return this.breaker.fire(fn);
  }

  /**
   * Get circuit breaker stats
   */
  getStats() {
    return {
      state: this.breaker.opened ? 'open' : this.breaker.halfOpen ? 'half-open' : 'closed',
      failures: this.breaker.stats.failures,
      successes: this.breaker.stats.successes,
      rejections: this.breaker.stats.rejections,
      timeouts: this.breaker.stats.timeouts
    };
  }
}

/**
 * User Service Client
 * HTTP client for communicating with the User Service
 */
export class UserServiceClient {
  private httpClient: AxiosInstance;
  private circuitBreaker: UserServiceCircuitBreaker;

  constructor(private config: UserServiceClientConfig) {
    this.httpClient = axios.create({
      baseURL: config.baseUrl,
      timeout: config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'User-Agent': 'auth-service/1.0.0'
      }
    });

    this.circuitBreaker = new UserServiceCircuitBreaker(config);

    // Request interceptor for logging
    this.httpClient.interceptors.request.use(
      (config) => {
        logger.debug('User Service request', {
          method: config.method?.toUpperCase(),
          url: config.url,
          timeout: config.timeout
        });
        return config;
      },
      (error) => {
        logger.error('User Service request error', { error });
        return Promise.reject(error);
      }
    );

    // Response interceptor for logging
    this.httpClient.interceptors.response.use(
      (response) => {
        logger.debug('User Service response', {
          status: response.status,
          url: response.config.url,
          duration: response.headers['x-response-time']
        });
        return response;
      },
      (error) => {
        logger.error('User Service response error', {
          status: error.response?.status,
          url: error.config?.url,
          message: error.message
        });
        return Promise.reject(error);
      }
    );
  }

  /**
   * Find user by ID
   */
  async findUserById(userId: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response: AxiosResponse = await this.httpClient.get(`/api/v1/users/${userId}`);
      return response.data.data?.user;
    });
  }

  /**
   * Find user by email
   */
  async findUserByEmail(email: string): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response: AxiosResponse = await this.httpClient.get('/api/v1/users/search', {
        params: { query: email, emailVerified: 'true' }
      });

      const users = response.data.data?.users || [];
      return users.find((user: any) => user.email === email) || null;
    });
  }

  /**
   * Create new user
   */
  async createUser(userData: {
    email: string;
    password: string;
    firstName?: string;
    lastName?: string;
    phoneNumber?: string;
    dateOfBirth?: string;
    role?: string;
  }): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response: AxiosResponse = await this.httpClient.post('/api/v1/users', userData);
      return response.data.data?.user;
    });
  }

  /**
   * Update user profile
   */
  async updateUser(userId: string, updates: any): Promise<any> {
    return this.circuitBreaker.execute(async () => {
      const response: AxiosResponse = await this.httpClient.put(`/api/v1/users/${userId}`, updates);
      return response.data.data?.user;
    });
  }

  /**
   * Verify user email
   */
  async verifyEmail(userId: string, verificationToken: string): Promise<boolean> {
    return this.circuitBreaker.execute(async () => {
      const response: AxiosResponse = await this.httpClient.post(`/api/v1/users/${userId}/verify-email`, {
        verificationToken
      });
      return response.data.data?.emailVerified || false;
    });
  }

  /**
   * Update user password (for password reset)
   */
  async updatePassword(userId: string, newPasswordHash: string): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      // This would be a specialized endpoint for auth service
      await this.httpClient.patch(`/api/v1/users/${userId}/password`, {
        passwordHash: newPasswordHash
      });
    });
  }

  /**
   * Record successful login
   */
  async recordSuccessfulLogin(userId: string): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      // This would update last login timestamp
      await this.httpClient.patch(`/api/v1/users/${userId}/login-success`);
    });
  }

  /**
   * Record failed login attempt
   */
  async recordFailedLogin(userId: string): Promise<void> {
    return this.circuitBreaker.execute(async () => {
      // This would increment failed login attempts
      await this.httpClient.patch(`/api/v1/users/${userId}/login-failure`);
    });
  }

  /**
   * Check if email exists
   */
  async emailExists(email: string): Promise<boolean> {
    try {
      return await this.circuitBreaker.execute(async () => {
        const response: AxiosResponse = await this.httpClient.get('/api/v1/users/search', {
          params: { query: email, limit: 1 }
        });
        return (response.data.data?.users?.length || 0) > 0;
      });
    } catch (error) {
      logger.warn('Email existence check failed', { email, error });
      return false; // Default to false on error for security
    }
  }

  /**
   * Search users (admin function)
   */
  async searchUsers(query: string, limit: number = 50): Promise<any[]> {
    return this.circuitBreaker.execute(async () => {
      const response: AxiosResponse = await this.httpClient.get('/api/v1/users/search', {
        params: { query, limit }
      });
      return response.data.data?.users || [];
    });
  }

  /**
   * Get circuit breaker stats
   */
  getCircuitBreakerStats() {
    return this.circuitBreaker.getStats();
  }

  /**
   * Health check for User Service
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response: AxiosResponse = await this.httpClient.get('/health', {
        timeout: 5000
      });
      return response.status === 200;
    } catch (error) {
      logger.error('User Service health check failed', { error });
      return false;
    }
  }
}

/**
 * Create User Service client with default configuration
 */
export function createUserServiceClient(baseUrl?: string): UserServiceClient {
  const config: UserServiceClientConfig = {
    baseUrl: baseUrl || process.env.USER_SERVICE_URL || 'http://localhost:3001',
    timeout: parseInt(process.env.USER_SERVICE_TIMEOUT || '10000'),
    retries: parseInt(process.env.USER_SERVICE_RETRIES || '3'),
    circuitBreaker: {
      timeout: parseInt(process.env.USER_SERVICE_CIRCUIT_TIMEOUT || '30000'),
      errorThresholdPercentage: parseFloat(process.env.USER_SERVICE_ERROR_THRESHOLD || '50'),
      resetTimeout: parseInt(process.env.USER_SERVICE_RESET_TIMEOUT || '30000')
    }
  };

  return new UserServiceClient(config);
}
