/**
 * Shared contracts for User Service communication
 * These interfaces define the API boundaries between User Service and other services
 */

// ============================================================================
// SHARED DOMAIN TYPES
// ============================================================================

/**
 * User roles available in the system
 */
export enum UserRole {
  BUYER = 'buyer',
  SELLER = 'seller',
  SUPPLIER = 'supplier',
  COURIER = 'courier',
  ENABLER = 'enabler',
  SYSTEM = 'system'
}

/**
 * Check if user role is eligible for payouts
 */
export function isPayoutEligibleRole(role: UserRole): boolean {
  return role !== UserRole.BUYER;
}

/**
 * User account status
 */
export enum UserStatus {
  PENDING_VERIFICATION = 'pending_verification',
  ACTIVE = 'active',
  SUSPENDED = 'suspended',
  DEACTIVATED = 'deactivated',
  LOCKED = 'locked'
}

/**
 * User preferences interface
 */
export interface UserPreferences {
  language: string;
  timezone: string;
  notificationsEnabled: boolean;
}

/**
 * Minimal user information for authentication flows
 */
export interface AuthUserInfo {
  id: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}

// ============================================================================
// REQUEST/RESPONSE DTOs
// ============================================================================

/**
 * User registration request
 */
export interface CreateUserRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  role?: UserRole;
}

/**
 * User profile update request
 */
export interface UpdateUserRequest {
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  avatar?: string;
}

/**
 * User search request
 */
export interface UserSearchRequest {
  query?: string;
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  limit?: number;
  offset?: number;
}

/**
 * User address creation request
 */
export interface CreateUserAddressRequest {
  type?: 'home' | 'work' | 'billing' | 'shipping';
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  isDefault?: boolean;
}

/**
 * User preferences update request
 */
export interface UpdateUserPreferencesRequest {
  language?: string;
  timezone?: string;
  notificationsEnabled?: boolean;
}

/**
 * Login activity record request
 */
export interface RecordLoginActivityRequest {
  successful: boolean;
  ipAddress?: string;
  userAgent?: string;
  timestamp?: Date;
}

// ============================================================================
// RESPONSE DTOs
// ============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
  data: T;
  meta: {
    requestId: string;
    timestamp: string;
    service: string;
    version: string;
  };
}

/**
 * Standard error response
 */
export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  meta: {
    requestId: string;
    timestamp: string;
    service: string;
    version: string;
  };
}

/**
 * Complete user profile response
 */
export interface UserResponse {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  dateOfBirth?: string;
  avatar?: string;
  role: UserRole;
  status: UserStatus;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  emailVerifiedAt?: string;
  phoneVerifiedAt?: string;
  language: string;
  timezone: string;
  notificationsEnabled: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
}

/**
 * User address response
 */
export interface UserAddressResponse {
  id: string;
  userId: string;
  type: 'home' | 'work' | 'billing' | 'shipping';
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  country: string;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/**
 * User search results response
 */
export interface UserSearchResponse {
  users: UserResponse[];
  total: number;
  limit: number;
  offset: number;
}

/**
 * User statistics response
 */
export interface UserStatsResponse {
  stats: Record<UserStatus, number>;
  total: number;
}

// ============================================================================
// EVENT TYPES
// ============================================================================

/**
 * User registered event
 */
export interface UserRegisteredEvent {
  event: 'user.registered';
  data: {
    userId: string;
    email: string;
    role: UserRole;
    timestamp: string;
  };
}

/**
 * User profile updated event
 */
export interface UserProfileUpdatedEvent {
  event: 'user.profile.updated';
  data: {
    userId: string;
    changes: string[];
    timestamp: string;
  };
}

/**
 * User verified event
 */
export interface UserVerifiedEvent {
  event: 'user.verified';
  data: {
    userId: string;
    verificationType: 'email' | 'phone';
    timestamp: string;
  };
}

/**
 * User status changed event
 */
export interface UserStatusChangedEvent {
  event: 'user.status.changed';
  data: {
    userId: string;
    oldStatus: UserStatus;
    newStatus: UserStatus;
    reason?: string;
    timestamp: string;
  };
}

/**
 * Union type for all user service events
 */
export type UserServiceEvent =
  | UserRegisteredEvent
  | UserProfileUpdatedEvent
  | UserVerifiedEvent
  | UserStatusChangedEvent;

// ============================================================================
// SERVICE INTERFACES
// ============================================================================

/**
 * User Service client interface for other services
 */
export interface IUserServiceClient {
  // User queries
  getUserById(userId: string): Promise<UserResponse>;
  getUserByEmail(email: string): Promise<UserResponse>;
  searchUsers(request: UserSearchRequest): Promise<UserSearchResponse>;

  // User mutations
  createUser(request: CreateUserRequest): Promise<UserResponse>;
  updateUser(userId: string, request: UpdateUserRequest): Promise<UserResponse>;
  deleteUser(userId: string): Promise<void>;

  // Verification
  verifyUserEmail(userId: string): Promise<UserResponse>;
  verifyUserPhone(userId: string): Promise<UserResponse>;

  // Addresses
  getUserAddresses(userId: string): Promise<UserAddressResponse[]>;
  createUserAddress(userId: string, request: CreateUserAddressRequest): Promise<UserAddressResponse>;
  updateUserAddress(userId: string, addressId: string, request: Partial<CreateUserAddressRequest>): Promise<UserAddressResponse>;
  deleteUserAddress(userId: string, addressId: string): Promise<void>;

  // Preferences
  getUserPreferences(userId: string): Promise<UserPreferences>;
  updateUserPreferences(userId: string, request: UpdateUserPreferencesRequest): Promise<UserPreferences>;

  // Auth-related operations
  recordLoginActivity(userId: string, request: RecordLoginActivityRequest): Promise<void>;
  updateUserStatus(userId: string, status: UserStatus, reason?: string): Promise<UserResponse>;

  // Statistics
  getUserStats(): Promise<UserStatsResponse>;
}

// ============================================================================
// ERROR CODES
// ============================================================================

/**
 * Standardized error codes for User Service
 */
export enum UserServiceErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  INVALID_EMAIL = 'INVALID_EMAIL',
  INVALID_PHONE = 'INVALID_PHONE',
  WEAK_PASSWORD = 'WEAK_PASSWORD',

  // Resource errors
  USER_NOT_FOUND = 'USER_NOT_FOUND',
  USER_ALREADY_EXISTS = 'USER_ALREADY_EXISTS',
  EMAIL_ALREADY_EXISTS = 'EMAIL_ALREADY_EXISTS',
  PHONE_ALREADY_EXISTS = 'PHONE_ALREADY_EXISTS',
  ADDRESS_NOT_FOUND = 'ADDRESS_NOT_FOUND',

  // Authorization errors
  INSUFFICIENT_PERMISSIONS = 'INSUFFICIENT_PERMISSIONS',
  USER_NOT_VERIFIED = 'USER_NOT_VERIFIED',

  // Business logic errors
  USER_SUSPENDED = 'USER_SUSPENDED',
  USER_DEACTIVATED = 'USER_DEACTIVATED',
  ACCOUNT_LOCKED = 'ACCOUNT_LOCKED',

  // System errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  EXTERNAL_SERVICE_ERROR = 'EXTERNAL_SERVICE_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED'
}

// ============================================================================
// CONFIGURATION
// ============================================================================

/**
 * User Service configuration interface
 */
export interface UserServiceConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
  circuitBreakerThreshold: number;
  serviceToken: string;
}

/**
 * Default configuration values
 */
export const DEFAULT_USER_SERVICE_CONFIG: Partial<UserServiceConfig> = {
  timeout: 3000,
  retryAttempts: 2,
  circuitBreakerThreshold: 5
};

// ============================================================================
// UTILITY TYPES
// ============================================================================

/**
 * Makes specific properties optional in a type
 */
export type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;

/**
 * Makes specific properties required in a type
 */
export type RequiredBy<T, K extends keyof T> = T & Required<Pick<T, K>>;

/**
 * User creation data (without system-generated fields)
 */
export type UserCreationData = Omit<UserResponse, 'id' | 'createdAt' | 'updatedAt' | 'emailVerifiedAt' | 'phoneVerifiedAt' | 'lastLoginAt'>;

/**
 * User update data (all fields optional except id)
 */
export type UserUpdateData = Partial<Omit<UserResponse, 'id' | 'createdAt' | 'emailVerifiedAt' | 'phoneVerifiedAt' | 'lastLoginAt'>>;
