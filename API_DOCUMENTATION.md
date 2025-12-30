# Maysar Digital Community Trade Network - API Documentation

## Overview

The Maysar Digital Community Trade Network is a comprehensive e-commerce platform built with microservices architecture. This documentation covers all API endpoints across all 13 microservices, providing complete integration guidance for developers.

## Table of Contents

1. [Architecture Overview](#architecture-overview)
2. [Authentication](#authentication)
3. [API Conventions](#api-conventions)
4. [Service APIs](#service-apis)
   - [Auth Service](#auth-service)
   - [Order Service](#order-service)
   - [Inventory Service](#inventory-service)
   - [Payment Service](#payment-service)
   - [Catalog Service](#catalog-service)
   - [Seller Service](#seller-service)
   - [Logistics Service](#logistics-service)
   - [Commission Service](#commission-service)
   - [Trust Service](#trust-service)
   - [Notification Service](#notification-service)
   - [Analytics Service](#analytics-service)
   - [Community Service](#community-service)
   - [Compliance Service](#compliance-service)
   - [Admin Service](#admin-service)
5. [Event Schema](#event-schema)
6. [Error Handling](#error-handling)
7. [Rate Limiting](#rate-limiting)
8. [SDKs and Tools](#sdks-and-tools)

## Architecture Overview

### Microservices Architecture

The platform consists of 13 independent microservices, each responsible for specific business domains:

- **Auth Service**: User authentication and authorization
- **Order Service**: Order lifecycle management
- **Inventory Service**: Stock management and reservations
- **Payment Service**: Payment processing and fraud detection
- **Catalog Service**: Product catalog and search
- **Seller Service**: Seller management and onboarding
- **Logistics Service**: Shipping and delivery tracking
- **Commission Service**: Revenue sharing and incentives
- **Trust Service**: Reviews and dispute resolution
- **Notification Service**: Multi-channel communication
- **Analytics Service**: Business intelligence and reporting
- **Community Service**: Social features and engagement
- **Compliance Service**: Regulatory compliance and KYC
- **Admin Service**: Administrative operations

### Event-Driven Communication

Services communicate asynchronously through events using Apache Kafka. All services publish and subscribe to domain events to maintain data consistency across the platform.

## Authentication

### JWT Token Authentication

All API endpoints require JWT token authentication except for public endpoints (login, registration, product catalog browsing).

```bash
Authorization: Bearer <jwt_token>
```

### Obtaining Tokens

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

Response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "expiresIn": 3600,
  "user": {
    "id": "user_123",
    "email": "user@example.com",
    "role": "buyer"
  }
}
```

### Token Refresh

```http
POST /api/auth/refresh
Authorization: Bearer <refresh_token>
```

## API Conventions

### HTTP Methods

- `GET` - Retrieve resources
- `POST` - Create resources
- `PUT` - Update resources (full update)
- `PATCH` - Update resources (partial update)
- `DELETE` - Delete resources

### Response Format

All responses follow a consistent JSON structure:

```json
{
  "success": true,
  "data": { ... },
  "message": "Optional message",
  "pagination": { ... },
  "timestamp": "2025-12-30T04:43:41.000Z"
}
```

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": { ... },
    "timestamp": "2025-12-30T04:43:41.000Z"
  }
}
```

### Pagination

For list endpoints, pagination is implemented using cursor-based pagination:

```http
GET /api/orders?pageSize=20&pageToken=abc123
```

Response:
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "pageSize": 20,
    "nextPageToken": "def456",
    "prevPageToken": "ghi789",
    "totalCount": 150
  }
}
```

### Filtering and Sorting

Most list endpoints support filtering and sorting:

```http
GET /api/orders?status=pending&sort=createdAt:desc&createdAfter=2025-01-01
```

## Service APIs

## Auth Service

**Base URL:** `https://api.maysar.com/auth`
**Port:** 3001

### User Registration

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123!",
  "firstName": "John",
  "lastName": "Doe",
  "userType": "buyer|seller",
  "phone": "+1234567890"
}
```

### User Login

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "securePassword123!"
}
```

### Password Reset

```http
POST /api/auth/forgot-password
Content-Type: application/json

{
  "email": "user@example.com"
}
```

```http
POST /api/auth/reset-password
Content-Type: application/json

{
  "token": "reset_token_here",
  "newPassword": "newSecurePassword123!"
}
```

### Profile Management

```http
GET /api/auth/profile
Authorization: Bearer <token>

PUT /api/auth/profile
Authorization: Bearer <token>
Content-Type: application/json

{
  "firstName": "John",
  "lastName": "Smith",
  "phone": "+1234567890",
  "preferences": {
    "notifications": true,
    "language": "en"
  }
}
```

### User Roles & Permissions

```http
GET /api/auth/roles
Authorization: Bearer <token>

POST /api/auth/users/{userId}/roles
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "role": "seller",
  "permissions": ["create_product", "manage_orders"]
}
```

## Order Service

**Base URL:** `https://api.maysar.com/orders`
**Port:** 3002

### Create Order

```http
POST /api/orders
Authorization: Bearer <token>
Content-Type: application/json

{
  "items": [
    {
      "productVariantId": "variant_123",
      "quantity": 2,
      "unitPrice": 29.99
    }
  ],
  "shippingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  },
  "billingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001",
    "country": "US"
  }
}
```

### Get Order Details

```http
GET /api/orders/{orderId}
Authorization: Bearer <token>
```

### Update Order Status

```http
PUT /api/orders/{orderId}/status
Authorization: Bearer <token>
Content-Type: application/json

{
  "status": "cancelled",
  "reason": "Customer request"
}
```

### Order History

```http
GET /api/orders?pageSize=20&pageToken=abc123&status=completed&createdAfter=2025-01-01
Authorization: Bearer <token>
```

### Order Fulfillment

```http
POST /api/orders/{orderId}/fulfill
Authorization: Bearer <seller_token>
Content-Type: application/json

{
  "trackingNumber": "1Z999AA1234567890",
  "carrier": "UPS",
  "estimatedDelivery": "2025-12-05"
}
```

## Inventory Service

**Base URL:** `https://api.maysar.com/inventory`
**Port:** 3003

### Stock Levels

```http
GET /api/inventory/stock/{productVariantId}
Authorization: Bearer <token>
```

Response:
```json
{
  "success": true,
  "data": {
    "productVariantId": "variant_123",
    "totalStock": 150,
    "availableStock": 145,
    "reservedStock": 5,
    "lowStockThreshold": 20,
    "warehouses": [
      {
        "warehouseId": "wh_nyc",
        "stock": 100,
        "location": "New York, NY"
      }
    ]
  }
}
```

### Stock Reservation

```http
POST /api/inventory/reservations
Authorization: Bearer <token>
Content-Type: application/json

{
  "productVariantId": "variant_123",
  "quantity": 2,
  "orderId": "order_456",
  "expiresAt": "2025-12-30T05:43:41.000Z"
}
```

### Manual Stock Adjustment

```http
PUT /api/inventory/stock/{productVariantId}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "warehouseId": "wh_nyc",
  "adjustment": -5,
  "reason": "Damaged goods",
  "reference": "incident_789"
}
```

### Inventory Count

```http
POST /api/inventory/counts
Authorization: Bearer <warehouse_staff_token>
Content-Type: application/json

{
  "warehouseId": "wh_nyc",
  "productVariants": [
    {
      "productVariantId": "variant_123",
      "countedQuantity": 95
    }
  ]
}
```

### Warehouse Management

```http
GET /api/inventory/warehouses
Authorization: Bearer <token>

POST /api/inventory/warehouses
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "West Coast DC",
  "location": {
    "address": "456 Industrial Blvd",
    "city": "Los Angeles",
    "state": "CA",
    "zipCode": "90210"
  },
  "capacity": 10000
}
```

## Payment Service

**Base URL:** `https://api.maysar.com/payments`
**Port:** 3004

### Process Payment

```http
POST /api/payments/process
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_123",
  "amount": 59.98,
  "currency": "USD",
  "paymentMethod": {
    "type": "credit_card",
    "cardNumber": "4111111111111111",
    "expiryMonth": 12,
    "expiryYear": 2026,
    "cvv": "123",
    "holderName": "John Doe"
  },
  "billingAddress": {
    "street": "123 Main St",
    "city": "New York",
    "state": "NY",
    "zipCode": "10001"
  }
}
```

### Payment Status

```http
GET /api/payments/{paymentId}
Authorization: Bearer <token>
```

### Refund Payment

```http
POST /api/payments/{paymentId}/refund
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 29.99,
  "reason": "Customer return",
  "orderId": "order_123"
}
```

### Fraud Assessment

```http
GET /api/payments/fraud-check
Authorization: Bearer <token>
Content-Type: application/json

{
  "amount": 999.99,
  "userId": "user_123",
  "ipAddress": "192.168.1.1",
  "userAgent": "Mozilla/5.0...",
  "billingAddress": { ... },
  "shippingAddress": { ... },
  "items": [...]
}
```

Response:
```json
{
  "success": true,
  "data": {
    "riskScore": 25,
    "riskLevel": "low",
    "recommendations": [
      "Additional verification required"
    ],
    "approved": true
  }
}
```

## Catalog Service

**Base URL:** `https://api.maysar.com/catalog`
**Port:** 3005

### Product Search

```http
GET /api/catalog/products/search?q=laptop&category=electronics&minPrice=500&maxPrice=2000&sort=price:asc&pageSize=20
```

### Product Details

```http
GET /api/catalog/products/{productId}
```

### Product Variants

```http
GET /api/catalog/products/{productId}/variants
```

### Categories

```http
GET /api/catalog/categories
GET /api/catalog/categories/{categoryId}/products
```

### Product Management (Sellers)

```http
POST /api/catalog/products
Authorization: Bearer <seller_token>
Content-Type: application/json

{
  "title": "Gaming Laptop",
  "description": "High-performance gaming laptop",
  "categoryId": "cat_electronics",
  "brand": "TechBrand",
  "variants": [
    {
      "sku": "GL-001",
      "attributes": {
        "color": "Black",
        "storage": "512GB SSD"
      },
      "price": 1299.99,
      "compareAtPrice": 1499.99,
      "inventory": {
        "quantity": 50,
        "policy": "deny"
      }
    }
  ],
  "images": [
    {
      "url": "https://cdn.maysar.com/products/gl001-1.jpg",
      "alt": "Gaming Laptop Front View"
    }
  ],
  "seo": {
    "metaTitle": "Gaming Laptop - High Performance",
    "metaDescription": "Buy the best gaming laptop with RTX graphics",
    "slug": "gaming-laptop-rtx"
  }
}
```

## Seller Service

**Base URL:** `https://api.maysar.com/sellers`
**Port:** 3006

### Seller Onboarding

```http
POST /api/sellers/onboard
Authorization: Bearer <token>
Content-Type: application/json

{
  "businessName": "Tech Solutions Inc",
  "businessType": "LLC",
  "taxId": "12-3456789",
  "businessAddress": {
    "street": "123 Business Ave",
    "city": "San Francisco",
    "state": "CA",
    "zipCode": "94105"
  },
  "contactPerson": {
    "firstName": "Jane",
    "lastName": "Smith",
    "phone": "+14155551234",
    "email": "jane@techsolutions.com"
  },
  "banking": {
    "accountNumber": "****1234",
    "routingNumber": "121000358",
    "accountType": "checking"
  }
}
```

### Seller Profile

```http
GET /api/sellers/profile
Authorization: Bearer <seller_token>

PUT /api/sellers/profile
Authorization: Bearer <seller_token>
Content-Type: application/json

{
  "businessName": "Tech Solutions Inc",
  "description": "Leading provider of tech solutions",
  "logo": "https://cdn.maysar.com/sellers/techsolutions-logo.jpg",
  "returnPolicy": "30-day returns accepted",
  "shippingPolicy": "Free shipping on orders over $50"
}
```

### Seller Dashboard

```http
GET /api/sellers/dashboard
Authorization: Bearer <seller_token>
```

Response includes:
- Sales metrics
- Order counts
- Revenue data
- Inventory status
- Performance ratings

### KYC Verification

```http
POST /api/sellers/kyc
Authorization: Bearer <seller_token>
Content-Type: application/json

{
  "documents": [
    {
      "type": "business_license",
      "fileUrl": "https://cdn.maysar.com/docs/license.pdf"
    },
    {
      "type": "tax_certificate",
      "fileUrl": "https://cdn.maysar.com/docs/tax.pdf"
    }
  ]
}
```

## Logistics Service

**Base URL:** `https://api.maysar.com/logistics`
**Port:** 3007

### Shipping Rates

```http
POST /api/logistics/rates
Authorization: Bearer <token>
Content-Type: application/json

{
  "origin": {
    "zipCode": "10001",
    "country": "US"
  },
  "destination": {
    "zipCode": "90210",
    "country": "US"
  },
  "packages": [
    {
      "weight": 2.5,
      "dimensions": {
        "length": 12,
        "width": 8,
        "height": 4
      }
    }
  ]
}
```

### Create Shipment

```http
POST /api/logistics/shipments
Authorization: Bearer <seller_token>
Content-Type: application/json

{
  "orderId": "order_123",
  "carrier": "UPS",
  "service": "ground",
  "packages": [...],
  "origin": {...},
  "destination": {...}
}
```

### Tracking Updates

```http
GET /api/logistics/shipments/{shipmentId}/tracking
Authorization: Bearer <token>

POST /api/logistics/shipments/{shipmentId}/tracking
Authorization: Bearer <carrier_token>
Content-Type: application/json

{
  "status": "in_transit",
  "location": "New York, NY",
  "description": "Package picked up",
  "timestamp": "2025-12-30T10:30:00Z"
}
```

### Delivery Confirmation

```http
POST /api/logistics/shipments/{shipmentId}/deliver
Authorization: Bearer <carrier_token>
Content-Type: application/json

{
  "deliveredAt": "2025-12-30T14:30:00Z",
  "deliveredTo": "John Doe",
  "signature": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...",
  "notes": "Left at front door"
}
```

## Commission Service

**Base URL:** `https://api.maysar.com/commissions`
**Port:** 3008

### Commission Structure

```http
GET /api/commissions/structure
Authorization: Bearer <seller_token>
```

### Earnings History

```http
GET /api/commissions/earnings?period=monthly&year=2025&month=12
Authorization: Bearer <seller_token>
```

### Payout Requests

```http
POST /api/commissions/payouts
Authorization: Bearer <seller_token>
Content-Type: application/json

{
  "amount": 1500.00,
  "currency": "USD",
  "method": "bank_transfer"
}
```

### Referral Program

```http
GET /api/commissions/referrals
Authorization: Bearer <token>

POST /api/commissions/referrals
Authorization: Bearer <token>
Content-Type: application/json

{
  "referralCode": "JOHNDOE123",
  "email": "friend@example.com",
  "message": "Check out this amazing platform!"
}
```

## Trust Service

**Base URL:** `https://api.maysar.com/trust`
**Port:** 3009

### Submit Review

```http
POST /api/trust/reviews
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_123",
  "productId": "product_456",
  "sellerId": "seller_789",
  "rating": 5,
  "title": "Excellent product!",
  "comment": "Fast shipping and great quality",
  "images": [
    "https://cdn.maysar.com/reviews/review123-1.jpg"
  ]
}
```

### Get Reviews

```http
GET /api/trust/reviews?productId=product_456&pageSize=10
GET /api/trust/reviews?sellerId=seller_789&pageSize=10
```

### Dispute Management

```http
POST /api/trust/disputes
Authorization: Bearer <token>
Content-Type: application/json

{
  "orderId": "order_123",
  "type": "product_quality",
  "description": "Product arrived damaged",
  "evidence": [
    {
      "type": "image",
      "url": "https://cdn.maysar.com/disputes/damage1.jpg",
      "description": "Damaged packaging"
    }
  ],
  "requestedResolution": "full_refund"
}
```

### Dispute Resolution

```http
PUT /api/trust/disputes/{disputeId}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "resolved",
  "resolution": "full_refund",
  "resolutionNotes": "Approved full refund due to product damage",
  "refundAmount": 59.99
}
```

## Notification Service

**Base URL:** `https://api.maysar.com/notifications`
**Port:** 3010

### Send Notification

```http
POST /api/notifications/send
Authorization: Bearer <service_token>
Content-Type: application/json

{
  "userId": "user_123",
  "type": "order_status_update",
  "channels": ["email", "sms", "push"],
  "template": "order_shipped",
  "data": {
    "orderId": "order_456",
    "trackingNumber": "1Z999AA1234567890",
    "carrier": "UPS"
  }
}
```

### Notification Templates

```http
GET /api/notifications/templates
Authorization: Bearer <admin_token>

POST /api/notifications/templates
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "order_shipped",
  "subject": "Your order has been shipped!",
  "channels": {
    "email": {
      "html": "<h1>Order Shipped</h1><p>Your order {{orderId}} has been shipped.</p>",
      "text": "Your order {{orderId}} has been shipped."
    },
    "sms": "Your order {{orderId}} has shipped. Track: {{trackingUrl}}",
    "push": {
      "title": "Order Shipped",
      "body": "Your order is on the way!",
      "data": { "orderId": "{{orderId}}" }
    }
  }
}
```

### User Preferences

```http
GET /api/notifications/preferences
Authorization: Bearer <token>

PUT /api/notifications/preferences
Authorization: Bearer <token>
Content-Type: application/json

{
  "email": {
    "order_updates": true,
    "promotions": false,
    "reviews": true
  },
  "sms": {
    "order_updates": true,
    "security": true
  },
  "push": {
    "all": true
  }
}
```

## Analytics Service

**Base URL:** `https://api.maysar.com/analytics`
**Port:** 3011

### Business Metrics

```http
GET /api/analytics/metrics?period=monthly&startDate=2025-01-01&endDate=2025-12-31
Authorization: Bearer <admin_token>
```

Response includes:
- Revenue metrics
- Order volumes
- User acquisition
- Product performance
- Geographic distribution

### Custom Reports

```http
POST /api/analytics/reports
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "name": "Q4 Performance Report",
  "type": "comprehensive",
  "filters": {
    "dateRange": {
      "start": "2025-10-01",
      "end": "2025-12-31"
    },
    "categories": ["electronics", "clothing"]
  },
  "metrics": [
    "revenue",
    "orders",
    "conversion_rate",
    "customer_lifetime_value"
  ],
  "format": "pdf"
}
```

### Real-time Dashboard

```http
GET /api/analytics/dashboard/realtime
Authorization: Bearer <admin_token>
```

Provides live metrics:
- Active users
- Orders per minute
- Revenue per hour
- System performance

## Community Service

**Base URL:** `https://api.maysar.com/community`
**Port:** 3012

### User Posts

```http
GET /api/community/posts?pageSize=20&sort=trending
POST /api/community/posts
Authorization: Bearer <token>
Content-Type: application/json

{
  "title": "Best gaming laptops 2025",
  "content": "Here are my recommendations...",
  "tags": ["gaming", "laptops", "reviews"],
  "images": [...]
}
```

### Comments and Interactions

```http
POST /api/community/posts/{postId}/comments
Authorization: Bearer <token>
Content-Type: application/json

{
  "content": "Great recommendations!",
  "parentCommentId": null
}
```

### Groups and Communities

```http
GET /api/community/groups
POST /api/community/groups
Authorization: Bearer <token>
Content-Type: application/json

{
  "name": "Gaming Enthusiasts",
  "description": "Discuss gaming gear and accessories",
  "category": "hobbies",
  "privacy": "public"
}
```

## Compliance Service

**Base URL:** `https://api.maysar.com/compliance`
**Port:** 3013

### KYC Verification

```http
POST /api/compliance/kyc
Authorization: Bearer <token>
Content-Type: application/json

{
  "userType": "seller",
  "documents": [
    {
      "type": "government_id",
      "fileUrl": "https://cdn.maysar.com/kyc/id_card.jpg"
    },
    {
      "type": "business_license",
      "fileUrl": "https://cdn.maysar.com/kyc/license.pdf"
    }
  ],
  "verificationType": "enhanced"
}
```

### GDPR Subject Rights

```http
POST /api/compliance/gdpr/subject-rights
Authorization: Bearer <token>
Content-Type: application/json

{
  "right": "access",
  "userId": "user_123",
  "reason": "Annual review"
}
```

### PCI DSS Compliance

```http
GET /api/compliance/pci/status
Authorization: Bearer <admin_token>
```

### Data Retention

```http
POST /api/compliance/retention/cleanup
Authorization: Bearer <system_token>
Content-Type: application/json

{
  "dataType": "kyc_documents",
  "olderThan": "2020-01-01",
  "reason": "GDPR compliance"
}
```

## Admin Service

**Base URL:** `https://api.maysar.com/admin`
**Port:** 3014

### User Management

```http
GET /api/admin/users?pageSize=50&status=active&role=seller
Authorization: Bearer <admin_token>

PUT /api/admin/users/{userId}
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "suspended",
  "suspensionReason": "Violation of terms",
  "suspensionEndDate": "2026-01-15"
}
```

### Order Management

```http
GET /api/admin/orders?status=disputed&pageSize=20
Authorization: Bearer <admin_token>

PUT /api/admin/orders/{orderId}/status
Authorization: Bearer <admin_token>
Content-Type: application/json

{
  "status": "cancelled",
  "adminNote": "Fraudulent order detected"
}
```

### System Health

```http
GET /api/admin/health
Authorization: Bearer <admin_token>
```

Response includes:
- Service status
- Database connectivity
- Queue health
- Error rates
- Performance metrics

### Audit Logs

```http
GET /api/admin/audit?userId=user_123&action=login&startDate=2025-12-01&endDate=2025-12-31
Authorization: Bearer <admin_token>
```

## Event Schema

### Event Structure

All events follow a consistent schema:

```json
{
  "eventId": "evt_1234567890",
  "eventVersion": "v1",
  "eventType": "OrderCreated",
  "producer": "order-service",
  "timestamp": "2025-12-30T04:43:41.000Z",
  "correlationId": "corr_123",
  "payload": {
    // Event-specific data
  },
  "metadata": {
    "userId": "user_123",
    "sessionId": "sess_456",
    "sourceIp": "192.168.1.1"
  }
}
```

### Core Events

#### Order Events
- `OrderCreated.v1`
- `OrderPaid.v1`
- `OrderShipped.v1`
- `OrderDelivered.v1`
- `OrderCancelled.v1`

#### Inventory Events
- `StockReserved.v1`
- `StockReleased.v1`
- `LowStockAlert.v1`
- `InventoryUpdated.v1`

#### Payment Events
- `PaymentProcessed.v1`
- `PaymentFailed.v1`
- `RefundProcessed.v1`

#### User Events
- `UserRegistered.v1`
- `UserVerified.v1`
- `UserProfileUpdated.v1`

## Error Handling

### HTTP Status Codes

- `200 OK` - Success
- `201 Created` - Resource created
- `204 No Content` - Success with no response body
- `400 Bad Request` - Invalid request data
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `409 Conflict` - Resource conflict
- `422 Unprocessable Entity` - Validation error
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error
- `502 Bad Gateway` - Gateway error
- `503 Service Unavailable` - Service temporarily unavailable

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "email",
      "issue": "Invalid email format"
    },
    "traceId": "trace_123456",
    "timestamp": "2025-12-30T04:43:41.000Z"
  }
}
```

### Common Error Codes

- `VALIDATION_ERROR` - Input validation failed
- `AUTHENTICATION_ERROR` - Invalid credentials
- `AUTHORIZATION_ERROR` - Insufficient permissions
- `RESOURCE_NOT_FOUND` - Requested resource doesn't exist
- `RESOURCE_CONFLICT` - Resource state conflict
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `SERVICE_UNAVAILABLE` - Service temporarily down
- `INTERNAL_ERROR` - Unexpected server error

## Rate Limiting

### Rate Limit Headers

All API responses include rate limiting headers:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640995200
X-RateLimit-Retry-After: 60
```

### Rate Limits by Endpoint Type

- **Authentication**: 5 requests per minute per IP
- **Public Catalog**: 100 requests per minute per IP
- **User Operations**: 100 requests per minute per user
- **Order Operations**: 50 requests per minute per user
- **Admin Operations**: 200 requests per minute per admin
- **File Uploads**: 10 requests per minute per user

### Rate Limit Exceeded Response

```json
{
  "success": false,
  "error": {
    "code": "RATE_LIMIT_EXCEEDED",
    "message": "Too many requests",
    "details": {
      "limit": 100,
      "remaining": 0,
      "reset": 1640995200,
      "retryAfter": 60
    }
  }
}
```

## SDKs and Tools

### Official SDKs

#### JavaScript/TypeScript SDK

```bash
npm install @maysar/sdk
```

```javascript
import { MaysarClient } from '@maysar/sdk';

const client = new MaysarClient({
  apiKey: 'your-api-key',
  baseUrl: 'https://api.maysar.com'
});

// Create an order
const order = await client.orders.create({
  items: [...],
  shippingAddress: {...}
});
```

#### Python SDK

```bash
pip install maysar-sdk
```

```python
from maysar import MaysarClient

client = MaysarClient(api_key='your-api-key')

# Get product catalog
products = client.catalog.list_products(category='electronics')
```

#### Go SDK

```bash
go get github.com/maysar/go-sdk
```

```go
import "github.com/maysar/go-sdk"

client := maysar.NewClient("your-api-key")

// Process payment
payment, err := client.Payments.Process(&maysar.PaymentRequest{
    OrderID: "order_123",
    Amount: 5999, // $59.99
    Currency: "USD",
})
```

### Postman Collection

Download the complete API collection for testing:

```bash
curl -O https://api-docs.maysar.com/postman/Maysar_Platform.postman_collection.json
```

### OpenAPI Specification

Access the OpenAPI 3.0 specification:

```bash
curl -O https://api-docs.maysar.com/openapi/maysar-platform.yaml
```

## Support

### Documentation

- **API Reference**: https://api-docs.maysar.com
- **Developer Guides**: https://developers.maysar.com
- **Status Page**: https://status.maysar.com

### Support Channels

- **Email**: api-support@maysar.com
- **Discord**: https://discord.gg/maysar
- **GitHub Issues**: https://github.com/maysar/platform/issues

### Service Level Agreements

- **API Availability**: 99.95% uptime SLA
- **Response Time**: P95 < 200ms for all endpoints
- **Support Response**: < 4 hours for critical issues
- **Incident Resolution**: < 2 hours for critical incidents

---

## Version History

- **v1.0.0** (2025-12-30): Initial comprehensive API documentation
  - Complete coverage of all 13 microservices
  - Authentication and authorization patterns
  - Event-driven architecture documentation
  - Error handling and rate limiting specifications
  - SDK examples and integration guides

---

*This documentation is maintained by the Maysar Platform Team. Last updated: December 30, 2025*
