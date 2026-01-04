# Seller Console API Documentation

## Overview

The Seller Console API provides comprehensive endpoints for managing e-commerce operations, including products, orders, customers, analytics, payments, and shipping. All endpoints follow RESTful conventions and return JSON responses.

**Base URL**: `http://localhost:3002/api`  
**Authentication**: Bearer Token (stored in `localStorage.seller_token`)  
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

**Token Storage**: `localStorage.seller_token`  
**Auto-redirect**: Unauthorized requests (401) automatically redirect to `/auth/login`

## API Endpoints

### 1. Dashboard API

#### Get Dashboard Data
```http
GET /seller/dashboard
```

**Description**: Retrieve comprehensive dashboard statistics and recent activity.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    stats: {
      totalProducts: number;
      activeProducts: number;
      totalOrders: number;
      pendingOrders: number;
      totalRevenue: number;
      monthlyRevenue: number;
      monthlyGrowth: string;
      totalCustomers: number;
      activeCustomers: number;
      averageRating: number;
      totalReviews: number;
      conversionRate: number;
      conversionGrowth: string;
      fulfillmentRate: number;
      returnsRate: number;
      customerRating: number;
    };
    recentOrders: Array<{
      id: string;
      customer: string;
      amount: number;
      status: string;
      date: string; // ISO 8601
    }>;
    topProducts: Array<{
      id: string;
      name: string;
      sales: number;
      revenue: number;
    }>;
    lowStockProducts: Array<{
      id: string;
      name: string;
      category: string;
      currentStock: number;
      minStock: number;
    }>;
  };
}
```

### 2. Products API

#### Get All Products
```http
GET /seller/products
```

**Description**: Retrieve all products with details including stock, pricing, and ratings.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    products: Array<{
      id: string;
      name: string;
      sku: string;
      category: string;
      price: number;
      stock: number;
      status: 'active' | 'inactive' | 'out_of_stock';
      rating: number;
      reviews: number;
      image: string;
      createdAt: string; // ISO 8601
    }>;
    categories: string[];
  };
}
```

#### Create Product
```http
POST /seller/products
```

**Request Schema**:
```typescript
{
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  sku?: string;
  images: string[];
  specifications?: Record<string, any>;
}
```

#### Update Product
```http
PUT /seller/products/{id}
```

**Request Schema**:
```typescript
{
  name?: string;
  description?: string;
  category?: string;
  price?: number;
  stock?: number;
  status?: 'active' | 'inactive' | 'out_of_stock';
  images?: string[];
  specifications?: Record<string, any>;
}
```

#### Delete Product
```http
DELETE /seller/products/{id}
```

**Product Status Values**:
- `active`: Product is live and available for purchase
- `inactive`: Product is hidden from customers
- `out_of_stock`: Product is visible but unavailable

### 3. Inventory API

#### Get Inventory Status
```http
GET /seller/inventory
```

**Description**: Retrieve detailed inventory information including stock levels, reservations, and movements.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    inventory: Array<{
      id: string;
      productId: string;
      productName: string;
      sku: string;
      currentStock: number;
      reservedStock: number;
      availableStock: number;
      reorderLevel: number;
      status: 'in_stock' | 'low_stock' | 'out_of_stock';
      lastUpdated: string; // ISO 8601
    }>;
    lowStockAlerts: Array<{
      productId: string;
      productName: string;
      currentStock: number;
      reorderLevel: number;
    }>;
    stockMovements: Array<{
      id: string;
      productName: string;
      type: 'sale' | 'adjustment' | 'restock' | 'return';
      quantity: number;
      date: string; // ISO 8601
    }>;
  };
}
```

#### Update Stock
```http
PATCH /seller/inventory/stock
```

**Request Schema**:
```typescript
{
  productId: string;
  quantity: number;
  operation: 'set' | 'add' | 'subtract';
  reason?: string;
}
```

### 4. Orders API

#### Get All Orders
```http
GET /seller/orders
```

**Description**: Retrieve comprehensive order information including customer details, items, and status.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    orders: Array<{
      id: string;
      orderNumber: string;
      customer: {
        name: string;
        email: string;
        phone: string;
      };
      items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        price: number;
        total: number;
      }>;
      totalAmount: number;
      status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
      paymentStatus: 'pending' | 'paid' | 'failed' | 'refunded';
      shippingAddress: string;
      orderDate: string; // ISO 8601
      estimatedDelivery?: string; // ISO 8601
      shippedDate?: string; // ISO 8601
      deliveredDate?: string; // ISO 8601
      cancelledDate?: string; // ISO 8601
      trackingNumber?: string;
    }>;
  };
}
```

#### Update Order Status
```http
PATCH /seller/orders/{id}/status
```

**Request Schema**:
```typescript
{
  status: 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';
  trackingNumber?: string;
  notes?: string;
}
```

#### Cancel Order
```http
POST /seller/orders/{id}/cancel
```

**Request Schema**:
```typescript
{
  reason: string;
  refundAmount?: number;
}
```

### 5. Customers API

#### Get All Customers
```http
GET /seller/customers
```

**Description**: Retrieve customer information including purchase history and analytics.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    customers: Array<{
      id: string;
      name: string;
      email: string;
      phone: string;
      location: string;
      totalOrders: number;
      totalSpent: number;
      averageOrderValue: number;
      lastOrderDate: string; // ISO 8601
      status: 'active' | 'inactive';
      joinedDate: string; // ISO 8601
      customerType: 'new' | 'regular' | 'premium' | 'vip';
      notes?: string;
    }>;
    stats: {
      totalCustomers: number;
      activeCustomers: number;
      newThisMonth: number;
      averageSatisfaction: number;
      totalRevenue: number;
      averageLifetimeValue: number;
    };
  };
}
```

#### Add Customer Note
```http
POST /seller/customers/{id}/notes
```

**Request Schema**:
```typescript
{
  note: string;
  isPrivate: boolean;
}
```

#### Update Customer Status
```http
PATCH /seller/customers/{id}/status
```

**Request Schema**:
```typescript
{
  status: 'active' | 'inactive' | 'blocked';
  reason?: string;
}
```

### 6. Reviews API

#### Get Product Reviews
```http
GET /seller/reviews
```

**Description**: Retrieve customer reviews and ratings for products.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    reviews: Array<{
      id: string;
      productId: string;
      productName: string;
      customer: string;
      rating: number; // 1-5
      comment: string;
      date: string; // ISO 8601
      status: 'published' | 'pending' | 'rejected';
    }>;
    stats: {
      totalReviews: number;
      averageRating: number;
      ratingDistribution: {
        1: number;
        2: number;
        3: number;
        4: number;
        5: number;
      };
    };
  };
}
```

#### Respond to Review
```http
POST /seller/reviews/{id}/respond
```

**Request Schema**:
```typescript
{
  response: string;
  isPublic: boolean;
}
```

#### Report Review
```http
POST /seller/reviews/{id}/report
```

**Request Schema**:
```typescript
{
  reason: 'inappropriate' | 'fake' | 'spam' | 'offensive';
  details?: string;
}
```

### 7. Analytics API

#### Get Sales Analytics
```http
GET /seller/analytics
```

**Description**: Retrieve comprehensive sales analytics and customer insights.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    salesData: Array<{
      date: string; // ISO 8601 date
      sales: number;
      orders: number;
    }>;
    topProducts: Array<{
      name: string;
      sales: number;
      revenue: number;
    }>;
    customerInsights: {
      newCustomers: number;
      returningCustomers: number;
      customerRetentionRate: number;
      clvData: {
        averageClv: number;
        newCustomerClv: number;
        returningCustomerClv: number;
        retentionRate: number;
      };
    };
  };
}
```

### 8. Payments API

#### Get Payment Information
```http
GET /seller/payments
```

**Description**: Retrieve payment transactions, balance, and payout information.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    balance: {
      available: number;
      pending: number;
      totalFees: number;
      successRate: number;
    };
    transactions: Array<{
      id: string;
      orderNumber: string;
      customer: string;
      amount: number;
      method: 'M-Pesa' | 'Airtel Money' | 'Bank Transfer' | 'Credit Card';
      status: 'completed' | 'pending' | 'failed';
      date: string; // ISO 8601
      fee: number;
      reference: string;
    }>;
    payouts: Array<{
      id: string;
      amount: number;
      method: 'Bank Transfer' | 'M-Pesa';
      status: 'completed' | 'processing' | 'scheduled' | 'failed';
      date: string; // ISO 8601
      reference: string;
      bankAccount?: string;
      phoneNumber?: string;
      processingFee: number;
    }>;
    analytics: {
      nextPayout: {
        date: string; // ISO 8601
        amount: number;
      };
      averageTransaction: {
        amount: number;
        growth: number;
        period: string;
      };
      failedTransactions: {
        rate: number;
        change: number;
        period: string;
      };
      volumeTrend: Array<{
        date: string; // ISO 8601 date
        volume: number;
        transactions: number;
      }>;
    };
    stats: {
      totalTransactions: number;
      completedTransactions: number;
      pendingTransactions: number;
      failedTransactions: number;
      totalVolume: number;
      totalFees: number;
      averageTransactionValue: number;
      paymentSuccessRate: number;
    };
  };
}
```

### 9. KYC API

#### Get KYC Information
```http
GET /seller/kyc
```

**Description**: Retrieve Know Your Customer verification status and requirements.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    kycStatus: {
      level: 'Level 1' | 'Level 2' | 'Level 3';
      status: 'verified' | 'pending' | 'rejected';
      verifiedDate?: string; // ISO 8601
      overallProgress: number; // 0-100
      nextReviewDate?: string; // ISO 8601
    };
    personalInfo: {
      fullName: string;
      nationalId: string;
      dateOfBirth: string; // ISO 8601 date
      phoneNumber: string;
      email: string;
      address: string;
      city: string;
      region: string;
      verificationStatus: 'verified' | 'pending' | 'rejected';
    };
    businessInfo: {
      businessName: string;
      businessType: string;
      businessRegistration: string;
      tinNumber: string;
      businessAddress: string;
      businessPhone: string;
      businessEmail: string;
      website?: string;
      yearEstablished: string;
      numberOfEmployees: string;
      verificationStatus: 'verified' | 'pending' | 'rejected';
    };
    documents: Array<{
      type: string;
      status: 'verified' | 'pending' | 'rejected' | 'not_uploaded';
      uploadDate?: string; // ISO 8601
      verifiedDate?: string; // ISO 8601
      fileName?: string;
      required: boolean;
      rejectionReason?: string;
    }>;
    bankDetails: {
      bankName: string;
      accountNumber: string;
      accountName: string;
      branchCode: string;
      swiftCode: string;
      verificationStatus: 'verified' | 'pending' | 'rejected';
      verifiedDate?: string; // ISO 8601
    };
    requirements: {
      currentLevel: string;
      nextLevel?: string;
      requiredDocuments: string[];
      benefits: {
        current: string[];
        nextLevel?: string[];
      };
      transactionLimits: {
        daily: number;
        monthly: number;
        perTransaction: number;
      };
    };
  };
}
```

#### Submit KYC Information
```http
POST /seller/kyc/submit
```

**Request Schema**:
```typescript
{
  personalInfo: {
    fullName: string;
    nationalId: string;
    dateOfBirth: string; // ISO 8601 date
    phoneNumber: string;
    email: string;
    address: string;
    city: string;
    region: string;
  };
  businessInfo: {
    businessName: string;
    businessType: string;
    businessRegistration: string;
    tinNumber: string;
    businessAddress: string;
    businessPhone: string;
    businessEmail: string;
    website?: string;
    yearEstablished: string;
    numberOfEmployees: string;
  };
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
    branchCode: string;
    swiftCode: string;
  };
}
```

#### Update KYC Information
```http
PUT /seller/kyc/update
```

**Request Schema**:
```typescript
{
  personalInfo?: {
    fullName?: string;
    nationalId?: string;
    dateOfBirth?: string; // ISO 8601 date
    phoneNumber?: string;
    email?: string;
    address?: string;
    city?: string;
    region?: string;
  };
  businessInfo?: {
    businessName?: string;
    businessType?: string;
    businessRegistration?: string;
    tinNumber?: string;
    businessAddress?: string;
    businessPhone?: string;
    businessEmail?: string;
    website?: string;
    yearEstablished?: string;
    numberOfEmployees?: string;
  };
  bankDetails?: {
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
    branchCode?: string;
    swiftCode?: string;
  };
}
```

#### Upload KYC Document
```http
POST /seller/kyc/documents
```

**Request Schema**:
```typescript
{
  documentType: 'National ID Front' | 'National ID Back' | 'Business License' | 'TIN Certificate' | 'Bank Statement' | 'Business Permit';
  file: File; // Multipart form data
  description?: string;
}
```

#### Delete KYC Document
```http
DELETE /seller/kyc/documents/{documentId}
```

### 10. Settings API

#### Get Account Settings
```http
GET /seller/settings
```

**Description**: Retrieve account settings and preferences.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    profile: {
      businessName: string;
      ownerName: string;
      email: string;
      phone: string;
      address: string;
      businessType: string;
      taxId: string;
    };
    preferences: {
      notifications: {
        email: boolean;
        sms: boolean;
        push: boolean;
      };
      language: string;
      currency: string;
      timezone: string;
    };
  };
}
```

#### Update Settings
```http
PUT /seller/settings
```

**Request Schema**:
```typescript
{
  profile?: {
    businessName?: string;
    ownerName?: string;
    email?: string;
    phone?: string;
    address?: string;
    businessType?: string;
    taxId?: string;
  };
  preferences?: {
    notifications?: {
      email?: boolean;
      sms?: boolean;
      push?: boolean;
    };
    language?: string;
    currency?: string;
    timezone?: string;
  };
}
```

### 11. Promotions API

#### Get Promotions
```http
GET /seller/promotions
```

**Description**: Retrieve promotional campaigns and discount information.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    promotions: Array<{
      id: string;
      name: string;
      discount: string;
      discountType: 'percentage' | 'fixed' | 'buy_one_get_one';
      discountValue: number;
      status: 'active' | 'scheduled' | 'ended' | 'paused';
      products: number;
      startDate: string; // ISO 8601
      endDate: string; // ISO 8601
      createdAt: string; // ISO 8601
      description: string;
      minOrderValue: number;
      maxDiscount: number;
      usageLimit: number;
      usedCount: number;
    }>;
    stats: {
      totalPromotions: number;
      activePromotions: number;
      scheduledPromotions: number;
      endedPromotions: number;
      totalSavings: number;
      averageDiscount: number;
    };
    tips: Array<{
      title: string;
      description: string;
      category: string;
    }>;
  };
}
```

#### Create Promotion
```http
POST /seller/promotions
```

**Request Schema**:
```typescript
{
  name: string;
  description: string;
  discountType: 'percentage' | 'fixed' | 'buy_one_get_one';
  discountValue: number;
  startDate: string; // ISO 8601
  endDate: string; // ISO 8601
  minOrderValue?: number;
  maxDiscount?: number;
  usageLimit?: number;
  products?: string[]; // Product IDs
}
```

#### Update Promotion
```http
PUT /seller/promotions/{id}
```

**Request Schema**:
```typescript
{
  name?: string;
  description?: string;
  status?: 'active' | 'scheduled' | 'ended' | 'paused';
  discountValue?: number;
  startDate?: string; // ISO 8601
  endDate?: string; // ISO 8601
  usageLimit?: number;
}
```

#### Delete Promotion
```http
DELETE /seller/promotions/{id}
```

### 12. Shipping API

#### Get Shipping Rates
```http
GET /seller/shipping
```

**Description**: Retrieve shipping rates for all Tanzania regions.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    shippingRates: Array<{
      id: number;
      region: string;
      weightRange: string;
      rate: number;
      carrier: 'Express' | 'Standard';
      deliveryDays: string;
    }>;
  };
}
```

#### Get Shipments
```http
GET /seller/shipments
```

**Description**: Retrieve active shipments and tracking information.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    shipments: Array<{
      id: number;
      orderNumber: string;
      customer: string;
      status: 'pending' | 'in_transit' | 'delivered' | 'failed' | 'returned';
      trackingNumber: string;
      carrier: string;
      estimatedDelivery: string; // ISO 8601 date
    }>;
  };
}
```

#### Get Shipping Statistics
```http
GET /seller/shipping-stats
```

**Description**: Retrieve shipping performance metrics.

**Response Schema**:
```typescript
{
  success: boolean;
  data: {
    activeShipments: number;
    deliveredToday: number;
    avgDeliveryTime: string;
    shippingCost: number;
  };
}
```

### 13. Enablers API

#### Get Enabler Products
```http
GET /seller/enablers
```

**Description**: Retrieve products available for enabler partnerships and rank information.

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
      stock: number;
    }>;
    enablerRanks: Array<{
      value: 'associate' | 'specialist' | 'senior' | 'expert' | 'master' | 'director';
      label: string;
      color: string;
    }>;
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
import { apiService } from '@/lib/api';

// Get dashboard data
const dashboard = await apiService.getDashboard();

// Get products
const products = await apiService.getProducts();

// Get shipping data
const shipping = await apiService.getShippingData();
```

### API Client Configuration

```typescript
const apiClient = axios.create({
  baseURL: 'http://localhost:3002/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-authentication
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('seller_token');
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
API_BASE_URL=http://localhost:3002
API_VERSION=api
TIMEOUT=30000
```

---

**Last Updated**: January 2024  
**API Version**: v1.0  
**Documentation Version**: 1.0.0