import { UserRole, UserStatus } from '../../domain/entities/user.entity';

/**
 * Authentication DTOs - Data Transfer Objects for API communication
 * These define the structure of data exchanged between API and application layers
 */

// Request DTOs

export interface LoginRequest {
  email: string;
  password: string;
  totpCode?: string; // For two-factor authentication
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role?: UserRole;
  phoneNumber?: string;
  acceptTerms: boolean;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface VerifyEmailRequest {
  token: string;
}

export interface VerifyPhoneRequest {
  code: string;
}

export interface EnableTwoFactorRequest {
  password: string; // For verification
}

export interface VerifyTwoFactorRequest {
  code: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

// Admin DTOs

export interface CreateUserRequest {
  email: string;
  password: string;
  role: UserRole;
  phoneNumber?: string;
  sendWelcomeEmail?: boolean;
}

export interface UpdateUserRequest {
  email?: string;
  role?: UserRole;
  status?: UserStatus;
  phoneNumber?: string;
}

export interface ChangeUserRoleRequest {
  newRole: UserRole;
  reason?: string;
}

export interface ManageUserStatusRequest {
  action: 'suspend' | 'reactivate' | 'deactivate' | 'unlock';
  reason?: string;
}

// Response DTOs

export interface AuthResponse {
  success: boolean;
  message: string;
  user?: UserResponse;
  accessToken?: string;
  refreshToken?: string;
  requiresTwoFactor?: boolean;
  locked?: boolean;
  expiresIn?: number; // seconds
}

export interface UserResponse {
  id: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  phoneNumber?: string;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  twoFactorEnabled: boolean;
  lastLoginAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface RegisterResponse {
  success: boolean;
  message: string;
  user?: UserResponse;
  requiresEmailVerification?: boolean;
  requiresPhoneVerification?: boolean;
  verificationTokenSent?: boolean;
}

export interface PasswordResetResponse {
  success: boolean;
  message: string;
  resetTokenSent?: boolean;
}

export interface TwoFactorSetupResponse {
  success: boolean;
  message: string;
  qrCodeUrl?: string;
  backupCodes?: string[];
  secret?: string; // Only for development/testing
}

export interface TwoFactorVerifyResponse {
  success: boolean;
  message: string;
  backupCodesUsed?: number;
}

export interface VerificationResponse {
  success: boolean;
  message: string;
  verified: boolean;
}

// Admin Response DTOs

export interface UserListResponse {
  users: UserResponse[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserManagementResponse {
  success: boolean;
  message: string;
  user?: UserResponse;
}

export interface UserStatsResponse {
  totalUsers: number;
  activeUsers: number;
  suspendedUsers: number;
  pendingVerification: number;
  recentRegistrations: number; // Last 24 hours
  recentLogins: number; // Last 24 hours
  usersByRole: Record<UserRole, number>;
  usersByStatus: Record<UserStatus, number>;
}

export interface AuditLogResponse {
  logs: Array<{
    id: string;
    timestamp: string;
    userId?: string;
    email?: string;
    action: string;
    ipAddress: string;
    userAgent: string;
    success: boolean;
    reason?: string;
    metadata?: Record<string, any>;
  }>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface SecurityEventsResponse {
  events: Array<{
    id: string;
    timestamp: string;
    userId?: string;
    email?: string;
    action: string;
    ipAddress: string;
    success: boolean;
    reason?: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
  }>;
  summary: {
    totalEvents: number;
    criticalEvents: number;
    failedLogins: number;
    suspiciousActivities: number;
  };
}

// Error Response DTOs

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface ErrorResponse {
  success: false;
  error: string;
  message: string;
  code: string;
  details?: ValidationError[];
  requestId?: string;
  timestamp: string;
}

// Health Check DTOs

export interface HealthResponse {
  service: string;
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  version: string;
  uptime: number;
  database: {
    status: 'connected' | 'disconnected';
    latency?: number;
  };
  cache: {
    status: 'connected' | 'disconnected';
    latency?: number;
  };
  messaging: {
    status: 'connected' | 'disconnected';
  };
}

export interface MetricsResponse {
  users: {
    total: number;
    active: number;
    newToday: number;
    newThisWeek: number;
  };
  authentication: {
    totalLogins: number;
    failedLogins: number;
    successfulLogins: number;
    averageResponseTime: number;
  };
  security: {
    activeSessions: number;
    lockedAccounts: number;
    twoFactorEnabled: number;
    passwordResets: number;
  };
  performance: {
    averageResponseTime: number;
    requestsPerSecond: number;
    errorRate: number;
    uptime: number;
  };
}
