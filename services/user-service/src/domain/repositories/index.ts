import { User, UserRole, UserStatus } from '../entities/user.entity';
import { UserPreferences } from '../types/user.types';

/**
 * User Address interface for repository operations
 */
export interface UserAddress {
  id: string;
  userId: string;
  type: 'home' | 'work' | 'billing' | 'shipping';
  street: string;
  // Tanzania canonical hierarchy (preferred over city)
  ward?: string;
  district?: string;
  region?: string;
  // Legacy / international
  city?: string;
  state?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User Repository Interface
 * Defines the contract for user data access operations
 */
export interface IUserRepository {
  // Core User Operations
  /**
   * Find user by ID
   */
  findById(id: string): Promise<User | null>;

  /**
   * Find user by email
   */
  findByEmail(email: string): Promise<User | null>;

  /**
   * Find user by phone number
   */
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;

  /**
   * Create a new user
   */
  create(user: User): Promise<User>;

  /**
   * Update an existing user
   */
  update(user: User): Promise<User>;

  /**
   * Delete a user
   */
  delete(id: string): Promise<void>;

  // Search and Filtering
  /**
   * Search users by email or name
   */
  search(query: string, limit?: number, offset?: number): Promise<User[]>;

  /**
   * Find users by role
   */
  findByRole(role: UserRole): Promise<User[]>;

  /**
   * Find users by status
   */
  findByStatus(status: UserStatus): Promise<User[]>;

  // Existence Checks
  /**
   * Check if email exists
   */
  emailExists(email: string): Promise<boolean>;

  /**
   * Check if phone number exists
   */
  phoneExists(phoneNumber: string): Promise<boolean>;

  /**
   * Check if public user code exists
   */
  publicCodeExists(code: string): Promise<boolean>;

  // Analytics and Reporting
  /**
   * Get user count by status
   */
  getUserCountByStatus(): Promise<Record<UserStatus, number>>;

  /**
   * Get user registration statistics
   */
  getUserRegistrationStats(startDate: Date, endDate: Date): Promise<{
    totalRegistrations: number;
    registrationsByRole: Record<UserRole, number>;
    registrationsByDay: Array<{ date: string; count: number }>;
  }>;

  // Authentication-Related Operations
  /**
   * Update user password hash
   */
  updatePassword(userId: string, passwordHash: string): Promise<void>;

  /**
   * Update user status
   */
  updateStatus(userId: string, status: UserStatus): Promise<void>;

  /**
   * Update email verification status
   */
  updateEmailVerification(userId: string, verified: boolean): Promise<void>;

  /**
   * Update phone verification status
   */
  updatePhoneVerification(userId: string, verified: boolean): Promise<void>;

  /**
   * Record successful login
   */
  recordSuccessfulLogin(userId: string): Promise<void>;

  /**
   * Record failed login attempt
   */
  recordFailedLogin(userId: string): Promise<void>;

  /**
   * Update user role
   */
  updateRole(userId: string, role: UserRole): Promise<void>;

  // User Addresses
  /**
   * Get user addresses
   */
  getUserAddresses(userId: string): Promise<UserAddress[]>;

  /**
   * Create user address
   */
  createUserAddress(userId: string, address: Omit<UserAddress, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<UserAddress>;

  /**
   * Update user address
   */
  updateUserAddress(userId: string, addressId: string, updates: Partial<UserAddress>): Promise<UserAddress>;

  /**
   * Delete user address
   */
  deleteUserAddress(userId: string, addressId: string): Promise<void>;

  /**
   * Set default address
   */
  setDefaultAddress(userId: string, addressId: string): Promise<void>;

  // User Preferences
  /**
   * Get user preferences
   */
  getUserPreferences(userId: string): Promise<UserPreferences>;

  /**
   * Update user preferences
   */
  updateUserPreferences(userId: string, preferences: Partial<UserPreferences>): Promise<UserPreferences>;

  // Bulk Operations
  /**
   * Bulk update user status
   */
  bulkUpdateStatus(userIds: string[], status: UserStatus): Promise<{ successCount: number; failures: Array<{ userId: string; error: string }> }>;

  /**
   * Bulk delete users
   */
  bulkDelete(userIds: string[]): Promise<{ successCount: number; failures: Array<{ userId: string; error: string }> }>;

  // Audit and Security
  /**
   * Get user security events
   */
  getUserSecurityEvents(userId: string, limit?: number): Promise<Array<{
    id: string;
    action: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    timestamp: Date;
    metadata?: Record<string, any>;
  }>>;

  /**
   * Record security event
   */
  recordSecurityEvent(userId: string, event: {
    action: string;
    ipAddress?: string;
    userAgent?: string;
    success: boolean;
    metadata?: Record<string, any>;
  }): Promise<void>;

  // Data Export and Compliance
  /**
   * Export user data (GDPR compliance)
   */
  exportUserData(userId: string): Promise<{
    user: User;
    addresses: UserAddress[];
    preferences: UserPreferences;
    securityEvents: Array<any>;
    orders?: any[]; // Would be from Order Service
  }>;

  // Health and Maintenance
  /**
   * Get repository health status
   */
  getHealthStatus(): Promise<{
    status: 'healthy' | 'degraded' | 'unhealthy';
    details: Record<string, any>;
  }>;

  /**
   * Cleanup old data (GDPR compliance)
   */
  cleanupOldData(olderThanDays: number): Promise<{
    deletedUsers: number;
    deletedAddresses: number;
    deletedSecurityEvents: number;
  }>;
}
