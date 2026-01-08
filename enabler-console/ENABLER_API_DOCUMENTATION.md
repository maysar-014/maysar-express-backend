# Enabler Console API Documentation

## Overview

The Enabler Console API provides comprehensive endpoints for managing enabler operations, focusing on sales support, buyer assistance, seller onboarding, training, performance tracking, and earnings management. All endpoints follow RESTful conventions and return JSON responses.

**Base URL**: `http://localhost:3014/api/enabler`  
**Authentication**: Bearer Token (stored in `localStorage.enabler_token`)  
**Content-Type**: `application/json`

## Response Format

All API responses follow a consistent format:

### Success Response Schema
```typescript
{
  success: boolean;
  data: T; // Response data type varies by endpoint
}
```

### Error Response Schema
```typescript
{
  success: boolean;
  error: {
    code: string;
    message: string;
    details?: Record<string, any>;
    timestamp: string; // ISO 8601
  };
}
```

## Authentication

The API uses Bearer token authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <your_token_here>
```

**Token Storage**: `localStorage.enabler_token`  
**Auto-redirect**: Unauthorized requests (401) automatically redirect to `/auth/login`

## API Endpoints

### 1. Dashboard API

#### Get Dashboard Data
```http
GET /enabler/dashboard
```

**Description**: Retrieve comprehensive dashboard statistics and activity overview.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    stats: {
      totalEarnings: number;
      tasksCompleted: number;
      completionRate: number;
      activeTasks: number;
      rankProgress: number;
      currentRank: string;
      nextRank: string;
    };
    recentTasks: Array<{
      id: string;
      type: string;
      status: 'completed' | 'in-progress' | 'pending';
      seller?: string;
      order?: string;
      time: string;
      earnings: number;
    }>;
    upcomingTasks: Array<{
      id: string;
      type: string;
      priority: 'high' | 'medium' | 'low';
      deadline: string;
      earnings: number;
    }>;
  };
}
```

### 2. Sales Support API

#### Get Sales Support Assignments
```http
GET /enabler/sales-support
```

**Description**: Retrieve available and active sales support assignments.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    activeSessions: Array<{
      id: string;
      seller: {
        name: string;
        id: string;
      };
      sellerName: string;
      priority: 'high' | 'medium' | 'low';
      status: 'pending' | 'in-progress' | 'completed';
      description: string;
      type: 'sales_support';
      product: string; // Single product name
      productPrice: number; // Product price
      deadline: string; // ISO 8601 date
      requirements: string[];
      earnings: number; // Commission per sale
      commission: string; // Percentage with %
      createdAt: string; // ISO 8601
    }>;
    completedSessions: Array<{
      id: string;
      sellerName: string;
      assignmentType: string;
      successRate: string;
      salesAchieved: number;
      targetSales: number;
      earnings: number;
      completedAt: string; // ISO 8601
    }>;
    stats: {
      averageRating: number;
      averageSessionDuration: string;
    };
  };
}
```

#### Accept Sales Assignment
```http
POST /enabler/sales-support/{assignmentId}/accept
```

**Description**: Accept a sales support assignment.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    assignmentId: string;
    status: 'accepted';
    startedAt: string; // ISO 8601
    estimatedEarnings: number;
  };
}
```

#### Update Sales Progress
```http
PATCH /enabler/sales-support/{assignmentId}/progress
```

**Request Schema**:
```typescript
{
  salesMade: number;
  notes?: string;
  customerContacts?: Array<{
    name: string;
    phone: string;
    status: 'contacted' | 'interested' | 'converted';
  }>;
}
```

### 3. Buyer Assistance API

#### Get Buyer Assistance Tasks
```http
GET /enabler/buyer-assistance
```

**Description**: Retrieve buyer assistance requests and support tasks.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    activeTasks: Array<{
      id: string;
      buyer: {
        name: string;
        phone: string;
        location: string;
      };
      requestType: 'product_inquiry' | 'purchase_support' | 'complaint_resolution';
      priority: 'high' | 'medium' | 'low';
      status: 'pending' | 'in-progress' | 'resolved';
      description: string;
      products: string[];
      estimatedTime: string;
      earnings: number;
      createdAt: string; // ISO 8601
      deadline: string; // ISO 8601
    }>;
    completedTasks: Array<{
      id: string;
      buyerName: string;
      taskType: string;
      resolution: string;
      rating: number;
      earnings: number;
      completedAt: string; // ISO 8601
    }>;
    stats: {
      totalAssisted: number;
      averageRating: number;
      resolutionRate: number;
    };
  };
}
```

#### Accept Buyer Assistance Task
```http
POST /enabler/buyer-assistance/{taskId}/accept
```

#### Complete Buyer Assistance Task
```http
POST /enabler/buyer-assistance/{taskId}/complete
```

**Request Schema**:
```typescript
{
  resolution: string;
  notes?: string;
  followUpRequired: boolean;
}
```

### 4. Seller Onboarding API

#### Get Seller Onboarding Tasks
```http
GET /enabler/seller-onboarding
```

**Description**: Retrieve seller onboarding and training assignments.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    pendingOnboarding: Array<{
      id: string;
      seller: {
        name: string;
        businessName: string;
        phone: string;
        email: string;
        location: string;
      };
      onboardingStage: 'initial_contact' | 'documentation' | 'training' | 'verification' | 'activation';
      priority: 'high' | 'medium' | 'low';
      assignedDate: string; // ISO 8601
      deadline: string; // ISO 8601
      earnings: number;
      requirements: string[];
      notes?: string;
    }>;
    activeOnboarding: Array<{
      id: string;
      sellerName: string;
      stage: string;
      progress: number; // 0-100
      nextStep: string;
      earnings: number;
    }>;
    completedOnboarding: Array<{
      id: string;
      sellerName: string;
      completedAt: string;
      finalStage: string;
      earnings: number;
      rating: number;
    }>;
    stats: {
      totalOnboarded: number;
      successRate: number;
      averageTime: string;
    };
  };
}
```

#### Update Onboarding Progress
```http
PATCH /enabler/seller-onboarding/{onboardingId}/progress
```

**Request Schema**:
```typescript
{
  stage: 'initial_contact' | 'documentation' | 'training' | 'verification' | 'activation';
  progress: number; // 0-100
  notes: string;
  nextSteps?: string[];
}
```

### 5. Training API

#### Get Training Modules
```http
GET /enabler/training
```

**Description**: Retrieve available training modules and progress.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    availableModules: Array<{
      id: string;
      title: string;
      description: string;
      category: 'sales' | 'customer_service' | 'platform';
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      duration: string;
      prerequisites: string[];
      rewards: {
        points: number;
        certificate: boolean;
        rankProgress: number;
      };
      status: 'available' | 'in_progress' | 'completed' | 'locked';
    }>;
    inProgress: Array<{
      id: string;
      title: string;
      progress: number; // 0-100
      timeSpent: string;
      lastAccessed: string; // ISO 8601
    }>;
    completed: Array<{
      id: string;
      title: string;
      completedAt: string; // ISO 8601
      score: number;
      certificate: string; // URL
    }>;
    stats: {
      totalCompleted: number;
      totalPoints: number;
      currentRank: string;
      nextRankRequirement: number;
    };
  };
}
```

#### Start Training Module
```http
POST /enabler/training/{moduleId}/start
```

#### Complete Training Module
```http
POST /enabler/training/{moduleId}/complete
```

**Request Schema**:
```typescript
{
  score: number; // 0-100
  timeSpent: number; // minutes
  answers?: Record<string, any>;
}
```

### 6. Performance API

#### Get Performance Metrics
```http
GET /enabler/performance
```

**Description**: Retrieve comprehensive performance analytics and rankings.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    overview: {
      currentRank: string;
      rankProgress: number;
      totalPoints: number;
      completionRate: number;
      averageRating: number;
      totalEarnings: number;
    };
    metrics: {
      salesSupport: {
        totalAssignments: number;
        completedAssignments: number;
        successRate: number;
        averageCommission: number;
        totalSalesGenerated: number;
      };
      buyerAssistance: {
        totalAssisted: number;
        resolutionRate: number;
        averageRating: number;
        responseTime: string;
      };
      training: {
        modulesCompleted: number;
        averageScore: number;
        certificatesEarned: number;
        skillsAcquired: string[];
      };
    };
    rankings: {
      overall: number;
      category: Record<string, number>;
      regional: number;
    };
    achievements: Array<{
      id: string;
      title: string;
      description: string;
      earnedAt: string; // ISO 8601
      category: string;
    }>;
    goals: Array<{
      id: string;
      title: string;
      target: number;
      current: number;
      deadline: string; // ISO 8601
      reward: string;
    }>;
  };
}
```

### 7. Earnings API

#### Get Payment History
```http
GET /enabler/payments
```

**Description**: Retrieve payment history and earnings summary.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    summary: {
      thisMonthEarnings: number;
      completedTasks: number;
      totalEarnings: number;
      averageTaskEarning: number;
      pendingPayments: number;
    };
    payments: Array<{
      id: string;
      taskId: string;
      taskTitle: string;
      taskType: 'sales_support' | 'buyer_assistance' | 'seller_onboarding';
      amount: number;
      status: 'completed' | 'pending' | 'processing' | 'failed';
      completedDate: string; // ISO 8601
      paidDate?: string; // ISO 8601
      paymentMethod: 'escrow' | 'direct';
      reference?: string;
    }>;
    paymentMethods: Array<{
      type: 'mobile_money' | 'bank_account';
      details: string;
      isDefault: boolean;
    }>;
    analytics: {
      monthlyTrend: Array<{
        month: string;
        earnings: number;
        tasks: number;
      }>;
      categoryBreakdown: Record<string, number>;
    };
  };
}
```

#### Request Payout
```http
POST /enabler/payments/payout
```

**Request Schema**:
```typescript
{
  amount: number;
  paymentMethod: 'mobile_money' | 'bank_account';
  accountDetails: {
    phoneNumber?: string;
    bankAccount?: string;
    accountName?: string;
  };
}
```

### 8. Tasks API

#### Get All Tasks
```http
GET /enabler/tasks
```

**Description**: Retrieve all tasks across different categories.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    tasks: Array<{
      id: string;
      title: string;
      type: 'sales_support' | 'buyer_assistance' | 'seller_onboarding' | 'training';
      priority: 'high' | 'medium' | 'low';
      status: 'available' | 'assigned' | 'in_progress' | 'completed' | 'cancelled';
      description: string;
      requirements: string[];
      estimatedTime: string;
      earnings: number;
      deadline: string; // ISO 8601
      location?: string;
      assignedAt?: string; // ISO 8601
      createdAt: string; // ISO 8601
    }>;
    filters: {
      types: string[];
      priorities: string[];
      statuses: string[];
      locations: string[];
    };
    stats: {
      totalTasks: number;
      availableTasks: number;
      activeTasks: number;
      completedTasks: number;
      totalEarnings: number;
    };
  };
}
```

#### Accept Task
```http
POST /enabler/tasks/{taskId}/accept
```

#### Complete Task
```http
POST /enabler/tasks/{taskId}/complete
```

**Request Schema**:
```typescript
{
  notes: string;
  proof?: string; // Base64 image or file URL
  rating?: number; // Self-assessment
}
```

### 9. Profile API

#### Get Profile Information
```http
GET /enabler/profile
```

**Description**: Retrieve enabler profile and account information.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    personal: {
      fullName: string;
      email: string;
      phone: string;
      dateOfBirth: string; // ISO 8601 date
      nationalId: string;
      address: string;
      city: string;
      region: string;
      profileImage?: string;
    };
    enablerInfo: {
      enablerId: string;
      joinedDate: string; // ISO 8601
      currentRank: string;
      rankProgress: number;
      totalPoints: number;
      specializations: string[];
      languages: string[];
      availability: {
        days: string[];
        hours: string;
        timezone: string;
      };
    };
    verification: {
      identityVerified: boolean;
      phoneVerified: boolean;
      emailVerified: boolean;
      backgroundCheckStatus: 'pending' | 'approved' | 'rejected';
      documentsSubmitted: string[];
    };
    preferences: {
      taskTypes: string[];
      maxDistance: number; // km
      notifications: {
        email: boolean;
        sms: boolean;
        push: boolean;
      };
      language: string;
      currency: string;
    };
    stats: {
      totalEarnings: number;
      tasksCompleted: number;
      averageRating: number;
      successRate: number;
      responseTime: string;
    };
  };
}
```

#### Update Profile
```http
PUT /enabler/profile
```

**Request Schema**:
```typescript
{
  personal?: {
    fullName?: string;
    email?: string;
    phone?: string;
    address?: string;
    city?: string;
    region?: string;
  };
  enablerInfo?: {
    specializations?: string[];
    languages?: string[];
    availability?: {
      days?: string[];
      hours?: string;
      timezone?: string;
    };
  };
  preferences?: {
    taskTypes?: string[];
    maxDistance?: number;
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
    language?: string;
    currency?: string;
  };
}
```

### 10. KYC API

#### Get KYC Status
```http
GET /enabler/kyc
```

**Description**: Retrieve Know Your Customer verification status.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    status: {
      level: 'Level 1' | 'Level 2' | 'Level 3';
      status: 'verified' | 'pending' | 'rejected';
      verifiedDate?: string; // ISO 8601
      overallProgress: number; // 0-100
    };
    documents: Array<{
      type: 'National ID' | 'Passport' | 'Driver License' | 'Utility Bill' | 'Bank Statement';
      status: 'verified' | 'pending' | 'rejected' | 'not_uploaded';
      uploadDate?: string; // ISO 8601
      verifiedDate?: string; // ISO 8601
      rejectionReason?: string;
      required: boolean;
    }>;
    requirements: {
      currentLevel: string;
      nextLevel?: string;
      benefits: {
        current: string[];
        nextLevel?: string[];
      };
      taskLimits: {
        daily: number;
        monthly: number;
        maxEarnings: number;
      };
    };
  };
}
```

#### Submit KYC Document
```http
POST /enabler/kyc/documents
```

**Request Schema**:
```typescript
{
  documentType: 'National ID' | 'Passport' | 'Driver License' | 'Utility Bill' | 'Bank Statement';
  file: File; // Multipart form data
  description?: string;
}
```

### 11. Trust Reports API

#### Get Trust Reports
```http
GET /enabler/trust-reports
```

**Description**: Retrieve trust and safety reports.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    reports: Array<{
      id: string;
      type: 'seller_issue' | 'buyer_complaint' | 'platform_issue' | 'safety_concern';
      title: string;
      description: string;
      status: 'submitted' | 'under_review' | 'resolved' | 'closed';
      priority: 'high' | 'medium' | 'low';
      submittedAt: string; // ISO 8601
      resolvedAt?: string; // ISO 8601
      response?: string;
      evidence?: string[];
    }>;
    stats: {
      totalReports: number;
      resolvedReports: number;
      averageResolutionTime: string;
      trustScore: number;
    };
  };
}
```

#### Submit Trust Report
```http
POST /enabler/trust-reports
```

**Request Schema**:
```typescript
{
  type: 'seller_issue' | 'buyer_complaint' | 'platform_issue' | 'safety_concern';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  evidence?: string[]; // File URLs or base64
  relatedTaskId?: string;
}
```

### 13. Shop API

#### Get Shop Products
```http
GET /enabler/shop
```

**Description**: Retrieve products available for promotion with support expiry tracking.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    products: Array<{
      id: string;
      name: string;
      price: number;
      category: string;
      commission: string; // Percentage (e.g., "5")
      views: number;
      sellerName: string;
      expiryDate: string; // ISO 8601 date - support assignment expiry
      image: string;
    }>;
    stats: {
      totalProducts: number;
      activeProducts: number; // Products with active support
      expiringSoon: number; // Support expiring within 30 days
      totalViews: number;
    };
  };
}
```

**Note**: Promotional content (WhatsApp messages, social media posts, SMS templates, tracking URLs, and QR codes) are generated client-side using the product data. The frontend automatically creates:
- Professional promotional templates
- Trackable referral URLs with enabler codes
- QR codes for offline promotion
- Copy-to-clipboard functionality
- Direct sharing to WhatsApp and SMS

### 14. Settings API

#### Get Settings
```http
GET /enabler/settings
```

**Description**: Retrieve account settings and preferences.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    account: {
      email: string;
      phone: string;
      language: string;
      timezone: string;
      currency: string;
    };
    notifications: {
      taskAssignments: boolean;
      paymentUpdates: boolean;
      trainingReminders: boolean;
      systemUpdates: boolean;
      marketingEmails: boolean;
      smsNotifications: boolean;
      pushNotifications: boolean;
    };
    privacy: {
      profileVisibility: 'public' | 'limited' | 'private';
      sharePerformanceStats: boolean;
      allowDirectContact: boolean;
    };
    work: {
      availability: {
        days: string[];
        startTime: string;
        endTime: string;
      };
      maxTasksPerDay: number;
      preferredTaskTypes: string[];
      workRadius: number; // km
    };
  };
}
```

#### Update Settings
```http
PUT /enabler/settings
```

**Request Schema**:
```typescript
{
  account?: {
    language?: string;
    timezone?: string;
    currency?: string;
  };
  notifications?: {
    taskAssignments?: boolean;
    paymentUpdates?: boolean;
    trainingReminders?: boolean;
    systemUpdates?: boolean;
    marketingEmails?: boolean;
    smsNotifications?: boolean;
    pushNotifications?: boolean;
  };
  privacy?: {
    profileVisibility?: 'public' | 'limited' | 'private';
    sharePerformanceStats?: boolean;
    allowDirectContact?: boolean;
  };
  work?: {
    availability?: {
      days?: string[];
      startTime?: string;
      endTime?: string;
    };
    maxTasksPerDay?: number;
    preferredTaskTypes?: string[];
    workRadius?: number;
  };
}
```

## Error Handling

### Common HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error Response Schema
```typescript
{
  success: false;
  error: {
    code: string;
    message: string;
    details?: {
      field?: string;
      reason?: string;
    };
    timestamp: string; // ISO 8601
  };
}
```

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per API key
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## SDK Integration

### TypeScript SDK Usage

```typescript
import { enablerApi } from '@/lib/api';

// Get dashboard data
const dashboard = await enablerApi.getDashboard();

// Get shop products
const shop = await enablerApi.getShop();

// Promotional content is generated client-side
// No API calls needed for promotion features
```

### API Client Configuration

```typescript
const apiClient = axios.create({
  baseURL: 'http://localhost:3014/api/enabler',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-authentication
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('enabler_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

## Testing & Development

### Connection Test
```http
GET /health
```

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    status: 'healthy' | 'unhealthy';
    timestamp: string; // ISO 8601
    services: Array<{
      name: string;
      status: 'up' | 'down';
    }>;
  };
}
```

### Environment Variables
```bash
ENABLER_API_BASE_URL=http://localhost:3014
API_VERSION=api/enabler
TIMEOUT=30000
```

---

**Last Updated**: January 2024  
**API Version**: v1.0  
**Documentation Version**: 1.0.0