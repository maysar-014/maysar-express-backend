# Seller Console API Documentation

## Overview

The Seller Console API provides comprehensive endpoints for managing e-commerce operations, including products, orders, customers, analytics, payments, and shipping. All endpoints follow RESTful conventions and return JSON responses.

**Base URL**: `http://localhost:3002/api`  
**Authentication**: Bearer Token (stored in `localStorage.seller_token`)  
**Content-Type**: `application/json`

## Response Format

All API responses follow a consistent format:

### Success Response
```json
{
  "success": true,
  "data": {
    // Response data here
  }
}
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Error description",
    "details": {}
  }
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

**Response**:
```json
{
  "success": true,
  "data": {
    "stats": {
      "totalProducts": 156,
      "activeProducts": 142,
      "totalOrders": 1247,
      "pendingOrders": 23,
      "totalRevenue": 245000,
      "monthlyRevenue": 18500,
      "monthlyGrowth": "+12.4%",
      "totalCustomers": 892,
      "activeCustomers": 456,
      "averageRating": 4.7,
      "totalReviews": 234,
      "conversionRate": 3.2,
      "conversionGrowth": "+0.8%",
      "fulfillmentRate": 98.5,
      "returnsRate": 2.1,
      "customerRating": 4.7
    },
    "recentOrders": [
      {
        "id": "ORD-001",
        "customer": "John Doe",
        "amount": 1250,
        "status": "pending",
        "date": "2024-01-15T10:30:00Z"
      }
    ],
    "topProducts": [
      {
        "id": "PROD-001",
        "name": "Wireless Headphones",
        "sales": 45,
        "revenue": 22500
      }
    ],
    "lowStockProducts": [
      {
        "id": "PROD-003",
        "name": "USB-C Charging Cable",
        "category": "Accessories",
        "currentStock": 0,
        "minStock": 15
      }
    ]
  }
}
```

### 2. Products API

#### Get All Products
```http
GET /seller/products
```

**Description**: Retrieve all products with details including stock, pricing, and ratings.

**Response**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "PROD-001",
        "name": "Wireless Bluetooth Headphones",
        "sku": "WBH-001",
        "category": "Electronics",
        "price": 500,
        "stock": 25,
        "status": "active",
        "rating": 4.8,
        "reviews": 45,
        "image": "/images/headphones.jpg",
        "createdAt": "2024-01-10T08:00:00Z"
      }
    ],
    "categories": ["Electronics", "Accessories", "Home & Garden", "Fashion", "Sports"]
  }
}
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

**Response**:
```json
{
  "success": true,
  "data": {
    "inventory": [
      {
        "id": "INV-001",
        "productId": "PROD-001",
        "productName": "Wireless Bluetooth Headphones",
        "sku": "WBH-001",
        "currentStock": 25,
        "reservedStock": 5,
        "availableStock": 20,
        "reorderLevel": 10,
        "status": "in_stock",
        "lastUpdated": "2024-01-15T10:30:00Z"
      }
    ],
    "lowStockAlerts": [
      {
        "productId": "PROD-003",
        "productName": "USB-C Charging Cable",
        "currentStock": 0,
        "reorderLevel": 15
      }
    ],
    "stockMovements": [
      {
        "id": "MOV-001",
        "productName": "Wireless Bluetooth Headphones",
        "type": "adjustment",
        "quantity": 25,
        "date": "2024-01-15T10:30:00Z"
      }
    ]
  }
}
```

**Inventory Status Values**:
- `in_stock`: Product has available inventory
- `low_stock`: Product is below reorder level
- `out_of_stock`: Product has zero inventory

**Stock Movement Types**:
- `sale`: Stock reduced due to order
- `adjustment`: Manual stock adjustment
- `restock`: Stock added through purchase
- `return`: Stock added due to return

### 4. Orders API

#### Get All Orders
```http
GET /seller/orders
```

**Description**: Retrieve comprehensive order information including customer details, items, and status.

**Response**:
```json
{
  "success": true,
  "data": {
    "orders": [
      {
        "id": "ORD-001",
        "orderNumber": "MYS-2024-001",
        "customer": {
          "name": "John Doe",
          "email": "john@example.com",
          "phone": "+255123456789"
        },
        "items": [
          {
            "productId": "PROD-001",
            "productName": "Wireless Bluetooth Headphones",
            "quantity": 2,
            "price": 500,
            "total": 1000
          }
        ],
        "totalAmount": 1250,
        "status": "pending",
        "paymentStatus": "paid",
        "shippingAddress": "Dar es Salaam, Tanzania",
        "orderDate": "2024-01-15T10:30:00Z",
        "estimatedDelivery": "2024-01-18T00:00:00Z"
      }
    ]
  }
}
```

**Order Status Values**:
- `pending`: Order received, awaiting processing
- `confirmed`: Order confirmed and being prepared
- `processing`: Order is being processed
- `shipped`: Order has been shipped
- `delivered`: Order successfully delivered
- `cancelled`: Order was cancelled

**Payment Status Values**:
- `pending`: Payment not yet processed
- `paid`: Payment completed successfully
- `failed`: Payment failed
- `refunded`: Payment was refunded

### 5. Customers API

#### Get All Customers
```http
GET /seller/customers
```

**Description**: Retrieve customer information including purchase history and analytics.

**Response**:
```json
{
  "success": true,
  "data": {
    "customers": [
      {
        "id": "CUST-001",
        "name": "John Doe",
        "email": "john@example.com",
        "phone": "+255123456789",
        "location": "Dar es Salaam, Tanzania",
        "totalOrders": 12,
        "totalSpent": 15600,
        "averageOrderValue": 1300,
        "lastOrderDate": "2024-01-15T10:30:00Z",
        "status": "active",
        "joinedDate": "2023-08-15T00:00:00Z",
        "customerType": "premium",
        "notes": "Frequent buyer, prefers express shipping"
      }
    ],
    "stats": {
      "totalCustomers": 8,
      "activeCustomers": 7,
      "newThisMonth": 2,
      "averageSatisfaction": 4.7,
      "totalRevenue": 66000,
      "averageLifetimeValue": 8250
    }
  }
}
```

**Customer Types**:
- `new`: Recently registered customer
- `regular`: Standard customer
- `premium`: High-value customer
- `vip`: Top-tier customer

**Customer Status**:
- `active`: Customer has recent activity
- `inactive`: Customer hasn't ordered recently

### 6. Reviews API

#### Get Product Reviews
```http
GET /seller/reviews
```

**Description**: Retrieve customer reviews and ratings for products.

**Response**:
```json
{
  "success": true,
  "data": {
    "reviews": [
      {
        "id": "REV-001",
        "productId": "PROD-001",
        "productName": "Wireless Bluetooth Headphones",
        "customer": "John Doe",
        "rating": 5,
        "comment": "Excellent sound quality and comfortable to wear!",
        "date": "2024-01-14T16:30:00Z",
        "status": "published"
      }
    ],
    "stats": {
      "totalReviews": 234,
      "averageRating": 4.7,
      "ratingDistribution": {
        "5": 156,
        "4": 45,
        "3": 23,
        "2": 8,
        "1": 2
      }
    }
  }
}
```

**Review Status Values**:
- `published`: Review is visible to customers
- `pending`: Review awaiting moderation
- `rejected`: Review was rejected

### 7. Analytics API

#### Get Sales Analytics
```http
GET /seller/analytics
```

**Description**: Retrieve comprehensive sales analytics and customer insights.

**Response**:
```json
{
  "success": true,
  "data": {
    "salesData": [
      {
        "date": "2024-01-01",
        "sales": 12500,
        "orders": 25
      }
    ],
    "topProducts": [
      {
        "name": "Wireless Headphones",
        "sales": 45,
        "revenue": 22500
      }
    ],
    "customerInsights": {
      "newCustomers": 23,
      "returningCustomers": 67,
      "customerRetentionRate": 74.2,
      "clvData": {
        "averageClv": 8250,
        "newCustomerClv": 3200,
        "returningCustomerClv": 12400,
        "retentionRate": 74.2
      }
    }
  }
}
```

### 8. Payments API

#### Get Payment Information
```http
GET /seller/payments
```

**Description**: Retrieve payment transactions, balance, and payout information.

**Response**:
```json
{
  "success": true,
  "data": {
    "balance": {
      "available": 1245000,
      "pending": 185000,
      "totalFees": 28500,
      "successRate": 96.8
    },
    "transactions": [
      {
        "id": "TXN-001",
        "orderNumber": "ORD-2024-001",
        "customer": "John Doe",
        "amount": 45000,
        "method": "M-Pesa",
        "status": "completed",
        "date": "2024-01-15T10:30:00Z",
        "fee": 900,
        "reference": "MP240115001"
      }
    ],
    "payouts": [
      {
        "id": "PAYOUT-001",
        "amount": 450000,
        "method": "Bank Transfer",
        "status": "completed",
        "date": "2024-01-10T00:00:00Z",
        "reference": "PO-2024-001",
        "bankAccount": "****1234",
        "processingFee": 2500
      }
    ],
    "analytics": {
      "nextPayout": {
        "date": "2024-01-20T00:00:00Z",
        "amount": 1245000
      },
      "averageTransaction": {
        "amount": 47333,
        "growth": 12,
        "period": "month"
      },
      "failedTransactions": {
        "rate": 3.2,
        "change": -0.8,
        "period": "month"
      },
      "volumeTrend": [
        {
          "date": "2024-01-01",
          "volume": 125000,
          "transactions": 28
        }
      ]
    },
    "stats": {
      "totalTransactions": 1247,
      "completedTransactions": 1205,
      "pendingTransactions": 23,
      "failedTransactions": 19,
      "totalVolume": 5890000,
      "totalFees": 118500,
      "averageTransactionValue": 47333,
      "paymentSuccessRate": 96.8
    }
  }
}
```

**Payment Methods**:
- `M-Pesa`: Mobile money (Vodacom)
- `Airtel Money`: Mobile money (Airtel)
- `Bank Transfer`: Direct bank transfer
- `Credit Card`: Card payments

**Transaction Status**:
- `completed`: Transaction successful
- `pending`: Transaction processing
- `failed`: Transaction failed

**Payout Status**:
- `completed`: Payout processed
- `processing`: Payout in progress
- `scheduled`: Payout scheduled
- `failed`: Payout failed

### 9. KYC API

#### Get KYC Information
```http
GET /seller/kyc
```

**Description**: Retrieve Know Your Customer verification status and requirements.

**Response**:
```json
{
  "success": true,
  "data": {
    "kycStatus": {
      "level": "Level 2",
      "status": "verified",
      "verifiedDate": "2023-12-15T10:00:00Z",
      "overallProgress": 85,
      "nextReviewDate": "2024-12-15T00:00:00Z"
    },
    "personalInfo": {
      "fullName": "John Smith",
      "nationalId": "19851234567890",
      "dateOfBirth": "1985-06-15",
      "phoneNumber": "+255712345678",
      "email": "john.smith@techstore.com",
      "address": "Plot 123, Msimbazi Street, Kariakoo",
      "city": "Dar es Salaam",
      "region": "Dar es Salaam",
      "verificationStatus": "verified"
    },
    "businessInfo": {
      "businessName": "Tech Electronics Store",
      "businessType": "Electronics",
      "businessRegistration": "BRELA-2020-123456",
      "tinNumber": "TIN-123-456-789",
      "businessAddress": "Shop 45, Kariakoo Market, Dar es Salaam",
      "businessPhone": "+255712345679",
      "businessEmail": "info@techstore.com",
      "website": "https://www.techstore.com",
      "yearEstablished": "2020",
      "numberOfEmployees": "5-10",
      "verificationStatus": "verified"
    },
    "documents": [
      {
        "type": "National ID Front",
        "status": "verified",
        "uploadDate": "2023-12-10T14:30:00Z",
        "verifiedDate": "2023-12-11T09:15:00Z",
        "fileName": "national_id_front.jpg",
        "required": true
      }
    ],
    "bankDetails": {
      "bankName": "CRDB Bank",
      "accountNumber": "0150123456789",
      "accountName": "Tech Electronics Store",
      "branchCode": "CRDB001",
      "swiftCode": "CORUTZTZ",
      "verificationStatus": "verified",
      "verifiedDate": "2023-12-13T11:30:00Z"
    },
    "complianceChecks": {
      "amlScreening": {
        "status": "passed",
        "checkedDate": "2023-12-15T08:00:00Z",
        "score": 95
      },
      "sanctionsList": {
        "status": "clear",
        "checkedDate": "2023-12-15T08:05:00Z"
      },
      "pepCheck": {
        "status": "clear",
        "checkedDate": "2023-12-15T08:10:00Z"
      },
      "creditCheck": {
        "status": "good",
        "score": 750,
        "checkedDate": "2023-12-15T08:15:00Z"
      }
    },
    "requirements": {
      "currentLevel": "Level 2",
      "nextLevel": "Level 3",
      "requiredDocuments": ["Tax Certificate", "Audited Financial Statements"],
      "benefits": {
        "current": [
          "Higher transaction limits (TZS 10M/month)",
          "Priority customer support",
          "Access to business loans",
          "Reduced transaction fees"
        ],
        "nextLevel": [
          "Unlimited transaction limits",
          "Dedicated account manager",
          "Advanced analytics tools",
          "White-label solutions"
        ]
      },
      "transactionLimits": {
        "daily": 500000,
        "monthly": 10000000,
        "perTransaction": 100000
      }
    },
    "riskAssessment": {
      "overallRisk": "low",
      "riskScore": 25,
      "factors": [
        {
          "factor": "Business Type",
          "risk": "low",
          "score": 10
        }
      ],
      "lastAssessment": "2023-12-15T10:00:00Z",
      "nextAssessment": "2024-06-15T00:00:00Z"
    }
  }
}
```

**KYC Levels**:
- `Level 1`: Basic verification
- `Level 2`: Enhanced verification
- `Level 3`: Premium verification

**Document Status**:
- `verified`: Document approved
- `pending`: Under review
- `rejected`: Document rejected
- `not_uploaded`: Document not provided

### 10. Settings API

#### Get Account Settings
```http
GET /seller/settings
```

**Description**: Retrieve account settings and preferences.

**Response**:
```json
{
  "success": true,
  "data": {
    "profile": {
      "businessName": "Tech Electronics Store",
      "ownerName": "John Smith",
      "email": "john@techstore.com",
      "phone": "+255123456789",
      "address": "Dar es Salaam, Tanzania",
      "businessType": "Electronics",
      "taxId": "TIN123456789"
    },
    "preferences": {
      "notifications": {
        "email": true,
        "sms": true,
        "push": true
      },
      "language": "en",
      "currency": "TSh",
      "timezone": "Africa/Dar_es_Salaam"
    }
  }
}
```

### 11. Promotions API

#### Get Promotions
```http
GET /seller/promotions
```

**Description**: Retrieve promotional campaigns and discount information.

**Response**:
```json
{
  "success": true,
  "data": {
    "promotions": [
      {
        "id": "PROMO-001",
        "name": "Summer Sale",
        "discount": "20%",
        "discountType": "percentage",
        "discountValue": 20,
        "status": "active",
        "products": 15,
        "startDate": "2024-07-01T00:00:00Z",
        "endDate": "2024-08-31T23:59:59Z",
        "createdAt": "2024-06-25T10:00:00Z",
        "description": "Beat the heat with our summer electronics sale!",
        "minOrderValue": 50000,
        "maxDiscount": 100000,
        "usageLimit": 1000,
        "usedCount": 234
      }
    ],
    "stats": {
      "totalPromotions": 3,
      "activePromotions": 1,
      "scheduledPromotions": 1,
      "endedPromotions": 1,
      "totalSavings": 2450000,
      "averageDiscount": 20
    },
    "tips": [
      {
        "title": "Seasonal Sales",
        "description": "Create promotions around holidays and seasons for maximum impact.",
        "category": "timing"
      }
    ]
  }
}
```

**Promotion Status**:
- `active`: Currently running
- `scheduled`: Scheduled for future
- `ended`: Promotion completed
- `paused`: Temporarily paused

**Discount Types**:
- `percentage`: Percentage discount
- `fixed`: Fixed amount discount
- `buy_one_get_one`: BOGO offers

### 12. Shipping API

#### Get Shipping Rates
```http
GET /seller/shipping
```

**Description**: Retrieve shipping rates for all Tanzania regions.

**Response**:
```json
{
  "success": true,
  "data": {
    "shippingRates": [
      {
        "id": 1,
        "region": "Arusha",
        "weightRange": "0-2kg",
        "rate": 7500,
        "carrier": "Express",
        "deliveryDays": "2-3"
      },
      {
        "id": 2,
        "region": "Dar es Salaam",
        "weightRange": "0-2kg",
        "rate": 2500,
        "carrier": "Standard",
        "deliveryDays": "Same day"
      }
    ]
  }
}
```

#### Get Shipments
```http
GET /seller/shipments
```

**Description**: Retrieve active shipments and tracking information.

**Response**:
```json
{
  "success": true,
  "data": {
    "shipments": [
      {
        "id": 1,
        "orderNumber": "ORD-2024-001",
        "customer": "John Doe",
        "status": "in_transit",
        "trackingNumber": "TRK123456",
        "carrier": "DHL",
        "estimatedDelivery": "2024-01-15"
      }
    ]
  }
}
```

#### Get Shipping Statistics
```http
GET /seller/shipping-stats
```

**Description**: Retrieve shipping performance metrics.

**Response**:
```json
{
  "success": true,
  "data": {
    "activeShipments": 24,
    "deliveredToday": 12,
    "avgDeliveryTime": "2.3",
    "shippingCost": 45000
  }
}
```

**Shipment Status**:
- `pending`: Awaiting pickup
- `in_transit`: Package in transit
- `delivered`: Successfully delivered
- `failed`: Delivery failed
- `returned`: Package returned

### 13. Enablers API

#### Get Enabler Products
```http
GET /seller/enablers
```

**Description**: Retrieve products available for enabler partnerships and rank information.

**Response**:
```json
{
  "success": true,
  "data": {
    "products": [
      {
        "id": "1",
        "name": "Samsung Galaxy A54",
        "price": 850000,
        "category": "Electronics",
        "stock": 25
      }
    ],
    "enablerRanks": [
      {
        "value": "associate",
        "label": "Associate",
        "color": "blue"
      },
      {
        "value": "specialist",
        "label": "Specialist",
        "color": "green"
      }
    ]
  }
}
```

**Enabler Ranks** (in ascending order):
- `associate`: Entry level
- `specialist`: Experienced
- `senior`: Advanced
- `expert`: Highly skilled
- `master`: Top performer
- `director`: Leadership level

## Error Handling

### Common HTTP Status Codes

- `200 OK`: Request successful
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required
- `403 Forbidden`: Access denied
- `404 Not Found`: Resource not found
- `429 Too Many Requests`: Rate limit exceeded
- `500 Internal Server Error`: Server error

### Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": {
      "field": "email",
      "reason": "Invalid email format"
    },
    "timestamp": "2024-01-15T10:30:00Z"
  }
}
```

## Rate Limiting

- **Rate Limit**: 1000 requests per hour per API key
- **Headers**: 
  - `X-RateLimit-Limit`: Request limit
  - `X-RateLimit-Remaining`: Remaining requests
  - `X-RateLimit-Reset`: Reset timestamp

## SDK Integration

### JavaScript/TypeScript

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

**Description**: Test API connectivity and service health.

### Environment Variables
```bash
API_BASE_URL=http://localhost:3002
API_VERSION=api
TIMEOUT=30000
```

### Debugging
- All requests are logged with timestamps
- Response data is logged for debugging
- Connection errors provide troubleshooting steps
- Authentication failures trigger automatic redirects

## Support

For API support and documentation updates:
- **Email**: api-support@maysar.com
- **Documentation**: Updated with each release
- **Status Page**: https://status.maysar.com
- **GitHub Issues**: Report bugs and feature requests

---

**Last Updated**: January 2024  
**API Version**: v1.0  
**Documentation Version**: 1.0.0