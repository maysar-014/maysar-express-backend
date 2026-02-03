# Admin Console API Documentation

## Overview

The Admin Console API provides enterprise-grade endpoints for platform governance, user management, financial oversight, compliance monitoring, and system administration. Designed for administrators, moderators, and support staff with role-based access control.

**Base URL**: `http://localhost:3001/api`  
**Authentication**: Bearer Token (stored in `localStorage.admin_token`)  
**Content-Type**: `application/json`  
**Enterprise Features**: Multi-factor authentication, IP whitelisting, audit logging

## Response Format

All API responses follow a consistent enterprise format:

### Success Response Schema
```typescript
{
  success: boolean;
  data: T; // Response data type varies by endpoint
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

### Error Response Schema
```typescript
{
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: {
      requiredRole?: string;
      currentRole?: string;
      requiredPermissions?: string[];
      action?: string;
    };
    timestamp: string; // ISO 8601
    requestId?: string;
    userMessage?: string;
  };
}
```

## Authentication & Security

### Bearer Token Authentication
```http
Authorization: Bearer <admin_token>
```

**Token Storage**: `localStorage.admin_token`  
**Session Management**: Automatic logout on 401 responses  
**Multi-Factor Authentication**: Required for sensitive operations  
**IP Whitelisting**: Configurable per admin user

### Role-Based Access Control

| Role | Permissions | Description |
|------|-------------|-------------|
| `super_admin` | All operations | Full platform access |
| `admin` | Users, Finance, KYC, Compliance | Core administrative functions |
| `manager` | Users, Reports, System monitoring | Management oversight |
| `moderator` | Users, KYC verification | Content and user moderation |
| `support` | Read-only access, basic user support | Customer support operations |

## API Endpoints

### 1. Dashboard API

#### Get Dashboard Metrics
```http
GET /admin/dashboard
```

**Description**: Retrieve comprehensive platform metrics and system health.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    totalUsers: {
      count: number;
      growth: number;
      trend: 'up' | 'down' | 'stable';
    };
    activeUsers: {
      count: number;
      growth: number;
      trend: 'up' | 'down' | 'stable';
    };
    totalRevenue: {
      amount: number;
      currency: string;
      formatted: string;
      growth: number;
      trend: 'up' | 'down' | 'stable';
    };
    monthlyRevenue: {
      amount: number;
      currency: string;
      formatted: string;
      growth: number;
      trend: 'up' | 'down' | 'stable';
    };
    totalOrders: {
      count: number;
      growth: number;
      trend: 'up' | 'down' | 'stable';
    };
    pendingOrders: {
      count: number;
      growth: number;
      trend: 'up' | 'down' | 'stable';
    };
    systemHealth: {
      status: 'Healthy' | 'Warning' | 'Critical';
      uptime: number;
      responseTime: number;
      activeServices: {
        active: number;
        total: number;
      };
    };
    recentActivity: Array<{
      id: string;
      type: string;
      description: string;
      timestamp: string; // ISO 8601
      user?: string;
      amount?: string;
    }>;
    performanceOverview: {
      apiUptime: {
        value: number;
        unit: string;
        status: 'excellent' | 'good' | 'warning' | 'critical';
      };
      avgResponseTime: {
        value: number;
        unit: string;
        status: 'excellent' | 'good' | 'warning' | 'critical';
      };
      cacheEfficiency: {
        value: number;
        unit: string;
        status: 'excellent' | 'good' | 'warning' | 'critical';
      };
    };
  };
}
```

### 2. Admin Users Management

#### Get All Admin Users
```http
GET /admin/admin-users
```

**Description**: Retrieve all administrative users with roles and security settings.

**Query Parameters**:
- `page` (number): Page number for pagination
- `limit` (number): Items per page (max 100)
- `role` (string): Filter by admin role
- `status` (string): Filter by status (active, suspended, deactivated)
- `search` (string): Search by name or email

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    stats: {
      totalAdmins: number;
      activeAdmins: number;
      mfaEnabled: number;
      superAdmins: number;
    };
    admins: Array<{
      id: string;
      name: string;
      email: string;
      role: 'Super Admin' | 'Admin' | 'Manager' | 'Moderator' | 'Support';
      status: 'Active' | 'Suspended' | 'Deactivated';
      mfa: boolean;
      ipWhitelist: string[];
      lastLogin: string; // ISO 8601
      createdAt: string; // ISO 8601
    }>;
    roles: Record<string, {
      permissions: string[];
    }>;
  };
}
```

#### Create Admin User
```http
POST /admin/admins
```

**Request Schema**:
```typescript
{
  email: string;
  firstName: string;
  lastName: string;
  role: 'support' | 'moderator' | 'manager' | 'admin' | 'super_admin';
}
```

#### Update Admin User
```http
PATCH /admin/admins/{id}
```

**Request Schema**:
```typescript
{
  firstName?: string;
  lastName?: string;
  role?: 'support' | 'moderator' | 'manager' | 'admin' | 'super_admin';
  status?: 'active' | 'suspended' | 'deactivated';
  permissions?: Record<string, boolean>;
  ipWhitelist?: string[];
}
```

#### Delete Admin User
```http
DELETE /admin/admins/{id}
```

#### Enable MFA
```http
POST /admin/admins/{id}/mfa/enable
```

#### Disable MFA
```http
POST /admin/admins/{id}/mfa/disable
```

#### Update IP Whitelist
```http
PATCH /admin/admins/{id}/ip-whitelist
```

**Request Schema**:
```typescript
{
  ipWhitelist: string[];
}
```

### 3. Platform Users Management

#### Get Platform Users
```http
GET /admin/platform-users
```

**Description**: Retrieve all platform users (customers, sellers, enablers, suppliers).

**Query Parameters**:
- `tab` (string): users, sessions, security
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Active, Inactive, Suspended, Pending
- `kycLevel` (string): Level 0, Level 1, Level 2, Level 3
- `riskScore` (string): Low, Medium, High, Critical
- `search` (string): Search by name, email, or phone

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    stats: {
      totalUsers: number;
      activeUsers: number;
      suspended: number;
      activeSessions: number;
      securityEvents: number;
    };
    users?: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      status: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
      kycLevel: 'Level 0' | 'Level 1' | 'Level 2' | 'Level 3';
      riskScore: 'Low' | 'Medium' | 'High' | 'Critical';
      verification: 'Verified' | 'Pending' | 'Rejected' | 'Not Started';
      joinedAt: string; // ISO 8601
      lastActive: string; // ISO 8601
      location: string;
      totalOrders: number;
      totalSpent: number;
    }>;
    sessions?: Array<{
      id: string;
      userId: string;
      userName: string;
      device: string;
      location: string;
      ipAddress: string;
      startTime: string; // ISO 8601
      lastActivity: string; // ISO 8601
      status: 'Active' | 'Expired' | 'Terminated';
    }>;
    securityEvents?: Array<{
      id: string;
      userId: string;
      userName: string;
      eventType: string;
      severity: 'Low' | 'Medium' | 'High' | 'Critical';
      description: string;
      timestamp: string; // ISO 8601
      ipAddress: string;
      status: 'Open' | 'Investigating' | 'Resolved';
    }>;
    filters: {
      status: string[];
      kycLevel: string[];
      riskScore: string[];
      verification: string[];
    };
  };
}
```

#### Suspend User
```http
POST /admin/users/{id}/suspend
```

**Request Schema**:
```typescript
{
  reason: string;
  duration?: number; // days
}
```

#### Activate User
```http
POST /admin/users/{id}/activate
```

#### Reset User Password
```http
POST /admin/users/{id}/reset-password
```

#### Delete User
```http
DELETE /admin/users/{id}
```

**Request Schema**:
```typescript
{
  reason: string;
}
```

#### Update User
```http
PATCH /admin/users/{id}
```

**Request Schema**:
```typescript
{
  name?: string;
  email?: string;
  phone?: string;
  status?: 'Active' | 'Inactive' | 'Suspended';
  kycLevel?: 'Level 0' | 'Level 1' | 'Level 2' | 'Level 3';
}
```

### 4. Sellers Management

#### Get All Sellers
```http
GET /admin/sellers
```

**Description**: Comprehensive seller management with tier distribution and performance metrics.

**Query Parameters**:
- `tab` (string): overview, verification, performance, analytics
- `page` (number): Page number
- `limit` (number): Items per page
- `status` (string): Active, Inactive, Suspended, Pending
- `verificationStatus` (string): Verified, Pending, Rejected
- `search` (string): Search by business name or owner

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    tierDistribution: Record<string, {
      count: number;
      revenue: number;
      avgRating: number;
    }>;
    sellers: Array<{
      id: string;
      businessName: string;
      ownerName: string;
      email: string;
      phone: string;
      businessType: string;
      tier: string;
      status: 'Active' | 'Inactive' | 'Suspended' | 'Pending';
      kycStatus: 'Verified' | 'Pending' | 'Rejected';
      joinedAt: string; // ISO 8601
      location: string;
      metrics: {
        totalOrders: number;
        monthlyOrders: number;
        revenue: number;
        monthlyRevenue: number;
        rating: number;
        products: number;
        activeProducts: number;
        fulfillmentRate: number;
        responseTime: number;
        disputes: number;
        returns: number;
      };
    }>;
  };
}
```

#### Verify Seller
```http
POST /admin/sellers/{id}/verify
```

**Request Schema**:
```typescript
{
  decision: 'approve' | 'reject';
  notes?: string;
}
```

#### Update Seller Commission
```http
PATCH /admin/sellers/{id}/commission
```

**Request Schema**:
```typescript
{
  commissionRate: number;
}
```

#### Activate Seller
```http
POST /admin/sellers/{id}/activate
```

#### Suspend Seller
```http
POST /admin/sellers/{id}/suspend
```

**Request Schema**:
```typescript
{
  reason: string;
}
```

### 5. Enablers Management

#### Get All Enablers
```http
GET /admin/enablers
```

**Description**: Manage community enablers with performance tracking and tier progression.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    stats: {
      totalEnablers: number;
      activeEnablers: number;
      avgPerformance: number;
      performanceGrowth: number;
      totalEarnings: number;
      earningsGrowth: number;
      topTier: {
        directors: number;
        masters: number;
      };
    };
    tierDistribution: Record<string, {
      count: number;
    }>;
    enablers: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      tier: string;
      performance: number;
      orders: number;
      rating: number;
      earnings: number;
      status: 'Active' | 'Inactive' | 'Suspended';
      territory: string;
      joinedAt: string; // ISO 8601
      lastActive: string; // ISO 8601
    }>;
  };
}
```

### 6. Suppliers Management

#### Get All Suppliers
```http
GET /admin/suppliers
```

**Description**: Manage B2B suppliers with reliability tracking and performance metrics.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    stats: {
      totalSuppliers: number;
      activeSuppliers: number;
      avgReliability: number;
      reliabilityGrowth: number;
      supplyVolume: number;
      volumeGrowth: number;
      topTier: {
        alliance: number;
        enterprise: number;
      };
    };
    tierDistribution: Record<string, {
      count: number;
    }>;
    suppliers: Array<{
      id: string;
      name: string;
      email: string;
      tier: string;
      categories: string[];
      productsSupplied: number;
      totalVolume: number;
      avgDeliveryTime: number;
      qualityRating: number;
      commissionEarned: number;
      status: 'active' | 'inactive' | 'suspended';
      joinedAt: string; // ISO 8601
      lastDelivery: string; // ISO 8601
      reliabilityScore: number;
      regions: string[];
    }>;
  };
}
```

### 7. Financial Management

#### Get Financial Overview
```http
GET /admin/finance
```

**Description**: Comprehensive financial dashboard with revenue tracking, payment gateways, and commission management.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    stats: {
      totalRevenue: {
        amount: number;
        formatted: string;
        growth: number;
      };
      platformCommissions: {
        amount: number;
        formatted: string;
        growth: number;
      };
      activeGateways: {
        count: number;
        avgSuccess: number;
      };
      pendingChargebacks: {
        count: number;
        totalExposure: number;
        formattedExposure: string;
      };
    };
    revenueTrend: Array<{
      date: string; // ISO 8601 date
      totalRevenue: number;
      commissions: number;
      platformFees: number;
      refunds: number;
      chargebacks: number;
      netRevenue: number;
    }>;
    gateways: Array<{
      id: string;
      name: string;
      provider: string;
      status: 'active' | 'inactive' | 'maintenance';
      transactionFee: number;
      monthlyFee: number;
      successRate: number;
      avgProcessingTime: number;
      totalVolume: number;
      totalTransactions: number;
      lastHealthCheck: string; // ISO 8601
    }>;
    chargebacks: Array<{
      id: string;
      transactionId: string;
      orderId: string;
      customerId: string;
      sellerId: string;
      amount: number;
      reason: string;
      status: 'pending' | 'disputed' | 'won' | 'lost';
      createdAt: string; // ISO 8601
      dueDate: string; // ISO 8601
      evidence: string[];
      responseSubmitted: boolean;
    }>;
    commissions: Array<{
      id: string;
      name: string;
      role: 'seller' | 'enabler' | 'supplier';
      tier: string;
      category: string;
      commissionRate: number;
      minimumAmount: number;
      maximumAmount: number | null;
      effectiveFrom: string; // ISO 8601
      effectiveTo: string | null; // ISO 8601
      isActive: boolean;
    }>;
  };
}
```

### 8. Compliance Management

#### Get Compliance Dashboard
```http
GET /admin/compliance
```

**Description**: Comprehensive compliance monitoring for GDPR, AML, and regulatory requirements.

**Query Parameters**:
- `tab` (string): dashboard, gdpr, aml, reports

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    stats: {
      pendingGdpr: number;
      gdprCompleted: number;
      openAmlAlerts: number;
      highRiskAml: number;
      complianceScore: number;
      scoreGrowth: number;
      reportsDue: number;
      nextReport: string;
    };
    gdprRequests: Array<{
      id: string;
      type: string;
      customer: string;
      status: 'pending' | 'in_progress' | 'completed';
      requestDate: string; // ISO 8601
      dueDate: string; // ISO 8601
      completedDate?: string; // ISO 8601
    }>;
    amlAlerts: Array<{
      id: string;
      type: string;
      entity: string;
      riskLevel: 'low' | 'medium' | 'high';
      amount: number;
      alertDate: string; // ISO 8601
      description: string;
    }>;
    reports: Array<{
      id: string;
      name: string;
      type: 'regulatory' | 'tax' | 'aml' | 'privacy';
      status: 'pending' | 'due_soon' | 'in_progress' | 'completed';
      dueDate: string; // ISO 8601
      completedDate?: string; // ISO 8601
      description: string;
    }>;
    tanzanianRegulators: Record<string, {
      name: string;
      score: number;
    }>;
  };
}
```

### 9. KYC Management

#### Get KYC Submissions
```http
GET /admin/kyc
```

**Description**: Manage Know Your Customer verification submissions.

**Query Parameters**:
- `tab` (string): pending, approved, rejected, flagged
- `riskLevel` (string): low, medium, high, critical
- `search` (string): Search by name or email
- `status` (string): pending, approved, rejected, flagged

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    users: Array<{
      id: string;
      userId: string;
      userName: string;
      email: string;
      status: 'pending' | 'approved' | 'rejected' | 'flagged';
      riskLevel: 'low' | 'medium' | 'high' | 'critical';
      submittedAt: string; // ISO 8601
    }>;
    stats: {
      pending: number;
      approved: number;
      rejected: number;
    };
  };
}
```

#### Bulk KYC Actions
```http
POST /admin/kyc/bulk-actions
```

**Request Schema**:
```typescript
{
  action: 'approve' | 'reject' | 'flag' | 'suspend';
  userIds: number[];
}
```

#### Approve KYC
```http
PUT /admin/kyc/{id}/approve
```

#### Reject KYC
```http
PUT /admin/kyc/{id}/reject
```

**Request Schema**:
```typescript
{
  reason: string;
}
```

#### Flag KYC
```http
PUT /admin/kyc/{id}/flag
```

**Request Schema**:
```typescript
{
  reason: string;
}
```

#### Suspend KYC
```http
PUT /admin/kyc/{id}/suspend
```

**Request Schema**:
```typescript
{
  reason: string;
}
```

### 10. Audit Logs

#### Get Audit Logs
```http
GET /admin/audit/logs
```

**Description**: Comprehensive audit trail for all administrative actions.

**Query Parameters**:
- `userId` (string): Filter by user ID
- `action` (string): Filter by action type
- `resource` (string): Filter by resource type
- `startDate` (string): Start date (ISO 8601)
- `endDate` (string): End date (ISO 8601)
- `page` (number): Page number
- `limit` (number): Items per page

**Response Schema**:
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    userId: string;
    userEmail: string;
    action: string;
    resource: string;
    resourceId: string;
    timestamp: string; // ISO 8601
    ipAddress: string;
    userAgent: string;
    details: Record<string, any>;
    status: 'success' | 'failure' | 'warning';
  }>;
}
```

### 11. System Configuration

#### Get System Configuration
```http
GET /admin/system/config
```

**Description**: Manage system configuration and feature flags.

**Query Parameters**:
- `tab` (string): config, features, security
- `search` (string): Search configuration keys

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    configs: Array<{
      id: string;
      key: string;
      value: string;
      category: string;
      description: string;
      lastUpdated: string; // ISO 8601
    }>;
    featureFlags: Array<{
      id: string;
      name: string;
      description: string;
      enabled: boolean;
      rolloutPercentage: number;
      createdAt: string; // ISO 8601
      updatedAt: string; // ISO 8601
    }>;
    categories: string[];
  };
}
```

#### Update Configuration
```http
PUT /admin/system/config/{key}
```

**Request Schema**:
```typescript
{
  value: string;
}
```

#### Create Feature Flag
```http
POST /admin/system/feature-flags
```

**Request Schema**:
```typescript
{
  name: string;
  description: string;
  enabled: boolean;
  rolloutPercentage?: number;
}
```

#### Toggle Feature Flag
```http
PUT /admin/system/feature-flags/{id}
```

**Request Schema**:
```typescript
{
  enabled: boolean;
}
```

#### Restart Service
```http
POST /admin/system/services/{serviceName}/restart
```

### 12. System Health & Monitoring

#### Get System Health
```http
GET /admin/system/health
```

**Description**: Monitor system health and service status.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    status: 'healthy' | 'warning' | 'critical';
    uptime: number;
    services: Array<{
      name: string;
      status: 'healthy' | 'unhealthy';
      responseTime: number;
      lastCheck: string; // ISO 8601
    }>;
    metrics: {
      cpu: number;
      memory: number;
      disk: number;
      network: number;
    };
  };
}
```

### 13. Fraud Detection

#### Get Fraud Alerts
```http
GET /admin/fraud/alerts
```

**Description**: Monitor and manage fraud detection alerts.

**Query Parameters**:
- `status` (string): open, investigating, resolved, false_positive
- `severity` (string): low, medium, high, critical
- `page` (number): Page number
- `limit` (number): Items per page

**Response Schema**:
```typescript
{
  success: boolean;
  data: Array<{
    id: string;
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    entityId: string;
    entityType: string;
    riskScore: number;
    status: 'open' | 'investigating' | 'resolved' | 'false_positive';
    description: string;
    createdAt: string; // ISO 8601
    assignedTo?: string;
  }>;
}
```

## Error Handling

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Resource conflict (duplicate, etc.)
- `422 Unprocessable Entity`: Validation errors
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error
- `503 Service Unavailable`: Service temporarily unavailable

## Security Features

### Multi-Factor Authentication
- **TOTP Support**: Time-based one-time passwords
- **Backup Codes**: Emergency access codes
- **Device Trust**: Remember trusted devices

### IP Whitelisting
- **Per-Admin Configuration**: Individual IP restrictions
- **CIDR Support**: Network range specifications
- **Geographic Restrictions**: Country-based access control

## Rate Limiting

### Limits by Role

| Role | Requests/Hour | Burst Limit |
|------|---------------|-------------|
| `super_admin` | 10,000 | 100 |
| `admin` | 5,000 | 50 |
| `manager` | 3,000 | 30 |
| `moderator` | 2,000 | 20 |
| `support` | 1,000 | 10 |

### Headers
- `X-RateLimit-Limit`: Request limit per hour
- `X-RateLimit-Remaining`: Remaining requests
- `X-RateLimit-Reset`: Reset timestamp
- `X-RateLimit-Burst`: Burst limit

## SDK Integration

### TypeScript SDK

```typescript
import { apiService } from '@/lib/api';

// Dashboard data
const dashboard = await apiService.getDashboardData();

// User management
const users = await apiService.users.getAll({
  page: 1,
  limit: 50,
  status: 'active'
});

// Seller verification
await apiService.sellers.verify('seller-123', 'approve', 'All documents verified');
```

---

**Last Updated**: January 2024  
**API Version**: v1.0  
**Documentation Version**: 1.0.0  
**Enterprise Edition**: Full feature set with advanced security and compliance