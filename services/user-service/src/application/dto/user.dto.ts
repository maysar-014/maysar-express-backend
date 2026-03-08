import { UserStatus, UserRole } from '../../domain/types/user.types';
import { Address } from '../../domain/value-objects/address.value-object';

/**
 * User DTO for creating a new user
 */
export interface CreateUserDto {
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: Date;
  role: UserRole;
  preferredLanguage?: string;
  preferredCurrency?: string;
  addresses?: Address[];
  businessId?: string;
}

/**
 * User DTO for updating user profile
 */
export interface UpdateUserProfileDto {
  firstName?: string;
  lastName?: string;
  dateOfBirth?: Date;
  preferredLanguage?: string;
  preferredCurrency?: string;
  profilePicture?: string;
}

/**
 * User DTO for updating user metadata
 */
export interface UpdateUserMetadataDto {
  loginAttempts?: number;
  riskScore?: number;
  accountAge?: number;
  lastFailedLoginAttempt?: Date;
  accountLockedUntil?: Date;
}

/**
 * User DTO for adding an address
 */
export interface AddAddressDto {
  type: string;
  isPrimary: boolean;
  street: string;
  city: string;
  state?: string;
  postalCode: string;
  country: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * User DTO for updating an address
 */
export interface UpdateAddressDto {
  id: string;
  type?: string;
  isPrimary?: boolean;
  street?: string;
  city?: string;
  state?: string;
  postalCode?: string;
  country?: string;
  coordinates?: {
    latitude: number;
    longitude: number;
  };
}

/**
 * User DTO for user search criteria
 */
export interface UserSearchDto {
  email?: string;
  phoneNumber?: string;
  firstName?: string;
  lastName?: string;
  role?: UserRole;
  status?: UserStatus;
  businessId?: string;
  dateOfBirth?: {
    from?: Date;
    to?: Date;
  };
  createdAt?: {
    from?: Date;
    to?: Date;
  };
  lastLoginAt?: {
    from?: Date;
    to?: Date;
  };
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

/**
 * User DTO for user response
 */
export interface UserResponseDto {
  id: string;
  email: string;
  phoneNumber: string;
  firstName: string;
  lastName: string;
  fullName: string;
  dateOfBirth?: Date;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  profilePicture?: string;
  preferredLanguage: string;
  preferredCurrency: string;
  addresses: Address[];
  businessId?: string;
  metadata: {
    accountAge: number;
    loginAttempts: number;
    lastFailedLoginAttempt?: Date;
    accountLockedUntil?: Date;
  };
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User DTO for user summary (lightweight version)
 */
export interface UserSummaryDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  preferredLanguage: string;
  preferredCurrency: string;
  businessId?: string;
  lastLoginAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User DTO for authentication response
 */
export interface AuthUserDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  status: UserStatus;
  emailVerified: boolean;
  phoneVerified: boolean;
  preferredLanguage: string;
  preferredCurrency: string;
  businessId?: string;
  lastLoginAt?: Date;
  addresses: Address[];
}

/**
 * User DTO for bulk operations
 */
export interface BulkUserOperationDto {
  userIds: string[];
  operation: 'activate' | 'deactivate' | 'suspend' | 'verifyEmail' | 'verifyPhone';
  reason?: string;
  metadata?: Record<string, unknown>;
}

/**
 * User DTO for user statistics
 */
export interface UserStatisticsDto {
  totalUsers: number;
  activeUsers: number;
  inactiveUsers: number;
  suspendedUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  newUsersThisMonth: number;
  averageAccountAge: number;
  userGrowthRate: {
    daily: number;
    weekly: number;
    monthly: number;
  };
}

/**
 * User DTO for user activity
 */
export interface UserActivityDto {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  lastLoginAt?: Date;
  lastActivityAt?: Date;
  loginCount: number;
  failedLoginAttempts: number;
  riskScore: number;
  isActive: boolean;
  isVerified: boolean;
  recentActivity: {
    action: string;
    timestamp: Date;
    ipAddress?: string;
    userAgent?: string;
  }[];
}

/**
 * User DTO for user verification
 */
export interface UserVerificationDto {
  userId: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  identityVerified: boolean;
  businessVerified: boolean;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationAttempts: number;
  lastVerificationAttempt?: Date;
  verificationDocuments?: string[];
}

/**
 * User DTO for user preferences
 */
export interface UserPreferencesDto {
  userId: string;
  preferredLanguage: string;
  preferredCurrency: string;
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    marketing: boolean;
  };
  privacy: {
    profileVisible: boolean;
    emailVisible: boolean;
    phoneVisible: boolean;
    locationVisible: boolean;
  };
  theme: {
    darkMode: boolean;
    fontSize: 'small' | 'medium' | 'large';
    layout: 'compact' | 'comfortable';
  };
}
