/**
 * User Domain Types
 * TypeScript types for the User Service domain
 */

/**
 * User roles in the system
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
 * User status in the system
 */
export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended',
  PENDING_VERIFICATION = 'pending_verification',
  DEACTIVATED = 'deactivated',
  LOCKED = 'locked'
}

/**
 * User metadata for tracking account information
 */
export interface UserMetadata {
  accountAge: number;
  loginAttempts: number;
  lastFailedLoginAttempt?: Date | undefined;
  accountLockedUntil?: Date | undefined;
  emailVerificationAttempts?: number | undefined;
  phoneVerificationAttempts?: number | undefined;
  passwordChangeRequired?: boolean | undefined;
  twoFactorEnabled?: boolean | undefined;
  lastPasswordChange?: Date | undefined;
  riskScore?: number | undefined;
  trustedDeviceCount?: number | undefined;
  suspiciousActivityCount?: number | undefined;
  accountRecoveryAttempts?: number | undefined;
  lastProfileUpdate?: Date | undefined;
  termsAcceptedVersion?: string | undefined;
  privacyPolicyAcceptedVersion?: string | undefined;
}

/**
 * User preferences
 */
export interface UserPreferences {
  theme: 'light' | 'dark' | 'system';
  notifications: {
    email: boolean;
    sms: boolean;
    push: boolean;
    marketing: boolean;
  };
  language: string;
  currency: string;
  timezone: string;
  dateFormat: string;
  timeFormat: string;
  accessibility: {
    highContrast: boolean;
    largeText: boolean;
    screenReader: boolean;
  };
}

/**
 * User security settings
 */
export interface UserSecuritySettings {
  twoFactorEnabled: boolean;
  trustedDevices: TrustedDevice[];
  loginAlerts: boolean;
  sessionTimeout: number;
  passwordHistory: string[];
  securityQuestions: SecurityQuestion[];
  biometricEnabled: boolean;
}

/**
 * Trusted device information
 */
export interface TrustedDevice {
  id: string;
  name: string;
  type: 'mobile' | 'desktop' | 'tablet' | 'web';
  os: string;
  browser?: string;
  ipAddress: string;
  location?: string;
  lastUsed: Date;
  isCurrent: boolean;
  trustedUntil: Date;
}

/**
 * Security question for account recovery
 */
export interface SecurityQuestion {
  id: string;
  question: string;
  answerHash: string;
  createdAt: Date;
}

/**
 * User session information
 */
export interface UserSession {
  id: string;
  userId: string;
  deviceId: string;
  ipAddress: string;
  userAgent: string;
  location?: string;
  loginTime: Date;
  lastActivity: Date;
  expiresAt: Date;
  isActive: boolean;
  refreshToken?: string;
}

/**
 * User audit log entry
 */
export interface UserAuditLog {
  id: string;
  userId: string;
  action: string;
  resource: string;
  oldValue?: any;
  newValue?: any;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

/**
 * User notification preferences
 */
export interface NotificationPreferences {
  email: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    categories: string[];
  };
  sms: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    categories: string[];
  };
  push: {
    enabled: boolean;
    frequency: 'immediate' | 'daily' | 'weekly' | 'never';
    categories: string[];
  };
}

/**
 * User business information
 */
export interface BusinessInfo {
  id: string;
  userId: string;
  businessName: string;
  businessType: string;
  registrationNumber?: string;
  taxId?: string;
  website?: string;
  description?: string;
  establishedDate?: Date;
  employeesCount?: number;
  annualRevenue?: number;
  businessAddress: Address;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verificationDate?: Date;
  documents: BusinessDocument[];
}

/**
 * Business document
 */
export interface BusinessDocument {
  id: string;
  type: 'registration' | 'tax' | 'identity' | 'bank' | 'other';
  fileName: string;
  fileUrl: string;
  mimeType: string;
  size: number;
  uploadedAt: Date;
  verifiedAt?: Date;
  verifiedBy?: string;
  status: 'pending' | 'verified' | 'rejected';
  rejectionReason?: string;
}

/**
 * User address
 */
export interface Address {
  id: string;
  userId: string;
  type: 'billing' | 'shipping' | 'business' | 'home';
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
  createdAt: Date;
  updatedAt: Date;
}

/**
 * User KYC (Know Your Customer) information
 */
export interface KYCInfo {
  id: string;
  userId: string;
  documentType: 'passport' | 'national_id' | 'drivers_license';
  documentNumber: string;
  documentFrontUrl: string;
  documentBackUrl?: string;
  selfieUrl: string;
  issuedDate: Date;
  expiryDate: Date;
  issuingCountry: string;
  verificationStatus: 'pending' | 'verified' | 'rejected';
  verifiedAt?: Date;
  verifiedBy?: string;
  rejectionReason?: string;
  riskLevel: 'low' | 'medium' | 'high';
}

/**
 * User account limits and quotas
 */
export interface AccountLimits {
  id: string;
  userId: string;
  dailyTransactionLimit: number;
  monthlyTransactionLimit: number;
  maxConcurrentSessions: number;
  maxTrustedDevices: number;
  maxAddresses: number;
  maxBusinesses: number;
  currentDailyTransactions: number;
  currentMonthlyTransactions: number;
  currentSessionCount: number;
  currentDeviceCount: number;
  currentAddressCount: number;
  currentBusinessCount: number;
  lastResetDate: Date;
}

/**
 * User activity metrics
 */
export interface UserActivityMetrics {
  id: string;
  userId: string;
  loginCount: number;
  lastLoginDate: Date;
  averageSessionDuration: number;
  pageViews: number;
  actionsPerformed: number;
  lastActivityDate: Date;
  activeDaysThisMonth: number;
  activeDaysThisYear: number;
  peakUsageHours: number[];
  featureUsage: Record<string, number>;
  engagementScore: number;
}

/**
 * User privacy settings
 */
export interface PrivacySettings {
  id: string;
  userId: string;
  profileVisibility: 'public' | 'private' | 'friends_only';
  emailVisibility: 'public' | 'private';
  phoneVisibility: 'public' | 'private';
  locationSharing: boolean;
  dataSharing: boolean;
  marketingConsent: boolean;
  analyticsConsent: boolean;
  thirdPartySharing: boolean;
  lastUpdated: Date;
}

/**
 * User support tickets
 */
export interface SupportTicket {
  id: string;
  userId: string;
  subject: string;
  description: string;
  category: 'technical' | 'billing' | 'account' | 'general';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  assignedTo?: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  resolution?: string;
  messages: SupportMessage[];
}

/**
 * Support message
 */
export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderType: 'user' | 'agent';
  message: string;
  attachments?: string[];
  createdAt: Date;
}

/**
 * User referral information
 */
export interface ReferralInfo {
  id: string;
  userId: string;
  referralCode: string;
  referredBy?: string;
  referralDate?: Date;
  referredUsers: string[];
  earnedRewards: number;
  pendingRewards: number;
  referralStatus: 'active' | 'inactive';
  lastReferralDate?: Date;
}

/**
 * User subscription information
 */
export interface UserSubscription {
  id: string;
  userId: string;
  planId: string;
  planName: string;
  status: 'active' | 'inactive' | 'cancelled' | 'expired';
  startDate: Date;
  endDate?: Date;
  billingCycle: 'monthly' | 'yearly';
  amount: number;
  currency: string;
  nextBillingDate: Date;
  autoRenew: boolean;
  paymentMethodId?: string;
  lastPaymentDate?: Date;
  cancellationReason?: string;
  cancelledAt?: Date;
}

/**
 * User analytics data
 */
export interface UserAnalytics {
  id: string;
  userId: string;
  pageViews: number;
  sessionDuration: number;
  bounceRate: number;
  conversionRate: number;
  lastAnalyticsUpdate: Date;
  behaviorPatterns: Record<string, any>;
  preferences: Record<string, any>;
  engagementMetrics: Record<string, number>;
}