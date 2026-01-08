# Courier Console API Documentation

بسم الله الرحمن الرحيم

## Overview

The Courier Console API provides comprehensive endpoints for managing courier operations, real-time tracking, delivery management, and performance monitoring within the Maysar Digital Community Trade Network.

**Base URL**: `http://localhost:3015/api/courier`  
**Version**: v1.0  
**Authentication**: JWT Bearer Token  
**Content-Type**: `application/json`

---

## Table of Contents

1. [Authentication](#authentication)
2. [Delivery Management](#delivery-management)
3. [Route & Navigation](#route--navigation)
4. [Real-time Tracking](#real-time-tracking)
5. [Performance Monitoring](#performance-monitoring)
6. [Earnings Management](#earnings-management)
7. [Vehicle Management](#vehicle-management)
8. [Account & KYC](#account--kyc)
9. [Training & Development](#training--development)
10. [Issue Reporting](#issue-reporting)
11. [Communication](#communication)
12. [Error Handling](#error-handling)

---

## Authentication

All API requests require authentication using JWT Bearer tokens.

### Headers
```http
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

### Error Response
```json
{
  "success": false,
  "error": {
    "code": "UNAUTHORIZED",
    "message": "Invalid or expired token"
  }
}
```

---

## Delivery Management

### Get Available Deliveries
Retrieve deliveries available for assignment.

**Endpoint**: `GET /deliveries/available`

**Response**:
```json
{
  "success": true,
  "data": [],
  "count": 0,
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 0
  }
}
```

### Get Active Deliveries
Retrieve currently assigned deliveries with comprehensive details.

**Endpoint**: `GET /deliveries/active`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "DEL-001",
      "type": "Pickup",
      "location": "Kariakoo Market, Dar es Salaam",
      "customer": "Amina Hassan",
      "eta": "14:30",
      "packageType": "Electronics",
      "weight": "2.5kg",
      "requiredAction": "Order Current Status As Seen to Buyer",
      "riskFlags": ["Fragile"],
      "status": "assigned",
      "priority": "high",
      "specialInstructions": "Handle with care - fragile electronics"
    }
  ]
}
```

### Accept Delivery Assignment
Accept a delivery assignment.

**Endpoint**: `POST /deliveries/:id/accept`

**Parameters**:
- `id` (string, required): Delivery ID

**Response**:
```json
{
  "success": true,
  "data": {
    "deliveryId": "DEL-001",
    "status": "accepted",
    "acceptedAt": "2025-01-07T10:30:00Z",
    "estimatedCompletion": "2025-01-07T15:30:00Z"
  }
}
```

### Update Delivery Status
Update the status of an active delivery.

**Endpoint**: `PUT /deliveries/:id/status`

**Parameters**:
- `id` (string, required): Delivery ID

**Request Body**:
```json
{
  "status": "in_progress",
  "location": {
    "lat": -6.7924,
    "lng": 39.2083
  },
  "notes": "En route to pickup location"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "deliveryId": "DEL-001",
    "status": "in_progress",
    "updatedAt": "2025-01-07T11:00:00Z"
  }
}
```

### Complete Delivery
Mark delivery as completed (awaiting buyer confirmation).

**Endpoint**: `POST /deliveries/:id/complete`

**Parameters**:
- `id` (string, required): Delivery ID

**Response**:
```json
{
  "success": true,
  "data": {
    "deliveryId": "DEL-001",
    "completedAt": "2025-01-07T14:45:00Z",
    "status": "awaiting_buyer_confirmation",
    "nextStep": "Buyer will be notified to confirm receipt"
  }
}
```

---

## Route & Navigation

### Get Current Route
Retrieve current route with real-time tracking data.

**Endpoint**: `GET /routes/current`

**Response**:
```json
{
  "success": true,
  "data": {
    "id": "ROUTE-001",
    "name": "Kariakoo → Mikocheni → Masaki",
    "description": "3 deliveries: Electronics pickup, Documents delivery, Fashion delivery",
    "totalDistance": "24.5 km",
    "distanceCovered": "8.2 km",
    "distanceRemaining": "16.3 km",
    "totalEstimatedTime": "45 mins",
    "timeRemaining": "28 mins",
    "currentLocation": "Ali Hassan Mwinyi Road, approaching Mikocheni",
    "nextDestination": "Mikocheni Plaza",
    "progress": 33,
    "trafficStatus": "Moderate traffic on main routes",
    "waypoints": [
      {
        "id": "wp-1",
        "location": "Kariakoo Market",
        "fullAddress": "Kariakoo Market, Msimbazi Street, Dar es Salaam, Tanzania",
        "coordinates": {
          "lat": -6.8235,
          "lng": 39.2695
        },
        "landmark": "Near Central Railway Station",
        "district": "Ilala",
        "status": "completed",
        "eta": "14:30",
        "deliveryType": "pickup",
        "customer": "Amina Hassan"
      }
    ]
  }
}
```

### Get Route Adherence
Retrieve route performance and adherence metrics.

**Endpoint**: `GET /routes/adherence`

**Response**:
```json
{
  "success": true,
  "data": {
    "onRoutePercentage": 94,
    "gpsAccuracy": "High (±3m)",
    "speedCompliance": 87,
    "deviationCount": 2,
    "averageSpeed": "35 km/h",
    "trafficDelays": "5 mins"
  }
}
```

### Optimize Route
Request route optimization based on current conditions.

**Endpoint**: `POST /routes/optimize`

**Request Body**:
```json
{
  "deliveries": ["DEL-001", "DEL-002", "DEL-003"],
  "preferences": {
    "prioritizeTime": true,
    "avoidTolls": false,
    "avoidHighways": false
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "routeId": "ROUTE-002",
    "optimizationSavings": {
      "timeSaved": "12 mins",
      "distanceSaved": "3.2 km",
      "fuelSaved": "0.8L"
    },
    "waypoints": [],
    "estimatedDuration": "33 mins"
  }
}
```

---

## Real-time Tracking

### Update Location
Update courier's current location.

**Endpoint**: `PUT /location`

**Request Body**:
```json
{
  "lat": -6.7924,
  "lng": 39.2083,
  "timestamp": "2025-01-07T12:00:00Z",
  "accuracy": 5,
  "speed": 25,
  "heading": 180
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "lat": -6.7924,
    "lng": 39.2083,
    "updated": true,
    "routeRecalculated": false
  }
}
```

### Get GPS Status
Retrieve current GPS and tracking status.

**Endpoint**: `GET /gps/status`

**Response**:
```json
{
  "success": true,
  "data": {
    "active": true,
    "accuracy": "High (±3m)",
    "lastUpdate": "2025-01-07T12:00:00Z",
    "satelliteCount": 12,
    "signalStrength": "Strong"
  }
}
```

---

## Performance Monitoring

### Get Performance Overview
Retrieve comprehensive performance metrics.

**Endpoint**: `GET /performance/overview`

**Response**:
```json
{
  "success": true,
  "data": {
    "onTimeDelivery": {
      "level": "Good",
      "trend": "stable",
      "percentage": 94
    },
    "acceptanceConsistency": {
      "level": "Good",
      "trend": "improving",
      "percentage": 87
    },
    "issueReportingQuality": {
      "level": "Needs Work",
      "trend": "improving",
      "percentage": 72
    },
    "safetyCompliance": {
      "level": "Good",
      "trend": "stable",
      "percentage": 96
    }
  }
}
```

### Get Performance Hints
Retrieve actionable performance improvement suggestions.

**Endpoint**: `GET /performance/hints`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "metric": "Issue Reporting Quality",
      "hint": "Report issues immediately when they occur to improve resolution accuracy",
      "action": "Early reporting helps the system provide better support",
      "priority": "medium"
    }
  ]
}
```

### Get Performance Insights
Retrieve detailed performance analysis and trends.

**Endpoint**: `GET /performance/insights`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "period": "Last 7 days",
      "insight": "Consistent on-time performance noted",
      "impact": "Positive",
      "suggestion": "Maintain current delivery speed standards",
      "trend": "stable"
    }
  ]
}
```

---

## Earnings Management

### Get Today's Earnings
Retrieve detailed earnings breakdown for current day.

**Endpoint**: `GET /earnings/today`

**Response**:
```json
{
  "success": true,
  "data": {
    "total": 42300,
    "breakdown": {
      "base": 28000,
      "distance": 8500,
      "time": 3800,
      "weightBonus": 1200,
      "heavyItemBonus": 800
    },
    "deliveryCount": 12,
    "hoursWorked": 8.5
  }
}
```

### Get Pending Earnings
Retrieve earnings awaiting payout.

**Endpoint**: `GET /earnings/pending`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "description": "Base rate for 28 deliveries",
      "amount": 28000,
      "date": "2025-01-07"
    },
    {
      "description": "Distance bonus (124km)",
      "amount": 8500,
      "date": "2025-01-07"
    }
  ],
  "totalPending": 42300
}
```

### Get Payout History
Retrieve historical payout records.

**Endpoint**: `GET /earnings/payout-history`

**Query Parameters**:
- `limit` (number, optional): Number of records to return (default: 20)
- `offset` (number, optional): Number of records to skip (default: 0)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "period": "Jan 6, 2026",
      "amount": 156750,
      "status": "Completed",
      "payoutMethod": "Mobile Money",
      "transactionId": "TXN-123456",
      "breakdown": {
        "base": 112000,
        "distance": 29800,
        "time": 12950,
        "bonuses": 2000
      }
    }
  ]
}
```

### Request Payout
Request payout of pending earnings.

**Endpoint**: `POST /earnings/payout`

**Request Body**:
```json
{
  "amount": 50000,
  "method": "mobile_money",
  "accountDetails": {
    "phoneNumber": "+255123456789",
    "provider": "M-Pesa"
  }
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "payoutId": "PAYOUT-123",
    "amount": 50000,
    "status": "processing",
    "estimatedCompletion": "2025-01-07T18:00:00Z"
  }
}
```

---

## Vehicle Management

### Get Vehicle Overview
Retrieve comprehensive vehicle information.

**Endpoint**: `GET /vehicle/overview`

**Response**:
```json
{
  "success": true,
  "data": {
    "registeredVehicle": "Motorcycle - Honda CB300R",
    "maxAllowedWeight": "50kg",
    "verificationStatus": "Verified",
    "registrationNumber": "TZS 123 AB",
    "insuranceExpiry": "2026-08-15",
    "lastInspection": "2025-12-01",
    "nextInspection": "2026-06-01",
    "fuelType": "Petrol",
    "engineCapacity": "300cc"
  }
}
```

### Get Vehicle Maintenance
Retrieve maintenance status and history.

**Endpoint**: `GET /vehicle/maintenance`

**Response**:
```json
{
  "success": true,
  "data": {
    "lastInspection": "2025-12-01",
    "nextInspection": "2026-06-01",
    "overallStatus": "Compliant",
    "maintenanceAlerts": [],
    "serviceHistory": [
      {
        "date": "2025-12-01",
        "type": "Annual Inspection",
        "status": "Passed",
        "cost": 50000
      }
    ]
  }
}
```

### Get Delivery Eligibility
Check vehicle eligibility for different delivery types.

**Endpoint**: `GET /vehicle/eligibility`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "type": "Standard Deliveries",
      "eligible": true,
      "maxWeight": "50kg",
      "maxDimensions": "60x40x40cm"
    },
    {
      "type": "Heavy Item Deliveries",
      "eligible": true,
      "maxWeight": "50kg",
      "restrictions": ["No oversized items"]
    },
    {
      "type": "Oversized Items",
      "eligible": false,
      "reason": "Vehicle capacity exceeded"
    }
  ]
}
```

---

## Account & KYC

### Get Account Status
Retrieve account verification and compliance status.

**Endpoint**: `GET /account/status`

**Response**:
```json
{
  "success": true,
  "data": {
    "overall": "Verified",
    "lastVerification": "2025-11-15",
    "nextReview": "2026-05-15",
    "riskLevel": "Low",
    "complianceScore": 96,
    "restrictions": []
  }
}
```

### Get Account Documents
Retrieve document verification status.

**Endpoint**: `GET /account/documents`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "national_id",
      "name": "National ID",
      "status": "Verified",
      "expiry": "2030-01-15",
      "lastUpdated": "2025-11-15",
      "required": true,
      "documentNumber": "****1234"
    }
  ]
}
```

### Upload Document
Upload or update account documents.

**Endpoint**: `POST /account/documents/:id/upload`

**Parameters**:
- `id` (string, required): Document type ID

**Request**: Multipart form data with file

**Response**:
```json
{
  "success": true,
  "data": {
    "documentId": "national_id",
    "uploadId": "UPLOAD-123",
    "status": "uploaded",
    "verificationStatus": "pending"
  }
}
```

---

## Training & Development

### Get Training Modules
Retrieve available training modules.

**Endpoint**: `GET /training/modules`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "module-1",
      "title": "Getting Started as a Courier",
      "description": "Learn the basics of the Maysar courier platform and your responsibilities.",
      "duration": "15 mins",
      "difficulty": "Beginner",
      "category": "Onboarding",
      "progress": 100,
      "topics": [
        "Platform Overview",
        "Account Setup",
        "Vehicle Registration",
        "First Delivery"
      ]
    }
  ]
}
```

### Get Training Progress
Retrieve overall training progress.

**Endpoint**: `GET /training/progress`

**Response**:
```json
{
  "success": true,
  "data": {
    "completedModules": ["module-1"],
    "overallProgress": 33,
    "totalModules": 3,
    "certificationsEarned": 1,
    "nextRecommendedModule": "module-2"
  }
}
```

### Get Training Achievements
Retrieve earned achievements and badges.

**Endpoint**: `GET /training/achievements`

**Response**:
```json
{
  "success": true,
  "data": {
    "learning": [
      {
        "id": "first-steps",
        "title": "First Steps",
        "description": "Complete the Getting Started training module",
        "icon": "✓",
        "unlocked": true,
        "category": "Learning",
        "requirement": "Complete Getting Started module",
        "earnedDate": "2025-01-01"
      }
    ],
    "performance": [
      {
        "id": "consistent-courier",
        "title": "Reliability Champion",
        "description": "Maintain 95%+ on-time delivery rate",
        "icon": "TARGET",
        "unlocked": false,
        "category": "Performance",
        "requirement": "95%+ on-time rate for 30 days",
        "progress": 87
      }
    ]
  }
}
```

---

## Issue Reporting

### Get Issue Types
Retrieve available issue categories for reporting.

**Endpoint**: `GET /issues/types`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "customer_unavailable",
      "title": "Customer Not Available",
      "description": "Recipient is not present at delivery location",
      "severity": "medium",
      "estimatedResolutionTime": "30 mins"
    }
  ]
}
```

### Report Issue
Report a delivery or operational issue.

**Endpoint**: `POST /issues/report`

**Request Body**:
```json
{
  "type": "customer_unavailable",
  "deliveryId": "DEL-001",
  "description": "Customer not answering phone or door",
  "location": {
    "lat": -6.7924,
    "lng": 39.2083
  },
  "severity": "medium"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "issueId": "ISSUE-123",
    "type": "customer_unavailable",
    "reportedAt": "2025-01-07T14:30:00Z",
    "status": "reported",
    "ticketNumber": "TKT-456",
    "estimatedResolution": "2025-01-07T15:00:00Z"
  }
}
```

---

## Communication

### Send Message to Customer
Send message to delivery customer.

**Endpoint**: `POST /messages/:customerId`

**Parameters**:
- `customerId` (string, required): Customer ID

**Request Body**:
```json
{
  "message": "I'm approaching your location. Please be ready for delivery.",
  "type": "delivery_update",
  "deliveryId": "DEL-001"
}
```

**Response**:
```json
{
  "success": true,
  "data": {
    "messageId": "MSG-123",
    "sent": true,
    "deliveredAt": "2025-01-07T14:30:00Z",
    "readStatus": "pending"
  }
}
```

### Get Message History
Retrieve message conversation history.

**Endpoint**: `GET /messages`

**Query Parameters**:
- `customerId` (string, optional): Filter by customer
- `deliveryId` (string, optional): Filter by delivery
- `limit` (number, optional): Number of messages (default: 50)

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "MSG-123",
      "customerId": "CUST-456",
      "message": "I'm approaching your location",
      "type": "delivery_update",
      "timestamp": "2025-01-07T14:30:00Z",
      "status": "delivered"
    }
  ]
}
```

---

## Support System

### Get Support Tickets
Retrieve support tickets and their status.

**Endpoint**: `GET /support/tickets`

**Response**:
```json
{
  "success": true,
  "data": [
    {
      "id": "TICKET-001",
      "subject": "Delivery Route Optimization Issue",
      "status": "open",
      "priority": "high",
      "createdAt": "2025-01-06T14:30:00Z",
      "lastUpdate": "2025-01-06T16:45:00Z",
      "category": "Technical",
      "description": "Route optimization not working correctly",
      "responses": [
        {
          "id": "RESP-001",
          "author": "Technical Team",
          "message": "Fix has been deployed",
          "timestamp": "2025-01-06T16:45:00Z",
          "type": "support"
        }
      ]
    }
  ]
}
```

---

## Error Handling

### Standard Error Response Format

```json
{
  "success": false,
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable error message",
    "details": {
      "field": "Specific field error details"
    },
    "timestamp": "2025-01-07T12:00:00Z",
    "requestId": "REQ-123456"
  }
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `UNAUTHORIZED` | 401 | Invalid or expired authentication token |
| `FORBIDDEN` | 403 | Insufficient permissions for requested action |
| `NOT_FOUND` | 404 | Requested resource not found |
| `VALIDATION_ERROR` | 400 | Request validation failed |
| `RATE_LIMIT_EXCEEDED` | 429 | Too many requests in time window |
| `INTERNAL_ERROR` | 500 | Internal server error |
| `SERVICE_UNAVAILABLE` | 503 | Service temporarily unavailable |

### Rate Limiting

- **Rate Limit**: 1000 requests per hour per courier
- **Burst Limit**: 100 requests per minute
- **Headers**: 
  - `X-RateLimit-Limit`: Total requests allowed
  - `X-RateLimit-Remaining`: Requests remaining
  - `X-RateLimit-Reset`: Time when limit resets

---

## SDK Examples

### JavaScript/TypeScript
```typescript
import { CourierAPI } from '@maysar/courier-sdk';

const courier = new CourierAPI({
  baseURL: 'http://localhost:3015/api/courier',
  token: 'your-jwt-token'
});

// Get active deliveries
const deliveries = await courier.deliveries.getActive();

// Update location
await courier.location.update({
  lat: -6.7924,
  lng: 39.2083
});

// Complete delivery
await courier.deliveries.complete('DEL-001');
```

### Python
```python
from maysar_courier import CourierClient

client = CourierClient(
    base_url='http://localhost:3015/api/courier',
    token='your-jwt-token'
)

# Get current route
route = client.routes.get_current()

# Report issue
issue = client.issues.report({
    'type': 'customer_unavailable',
    'delivery_id': 'DEL-001',
    'description': 'Customer not available'
})
```

---

## Webhooks

### Delivery Status Updates
Receive real-time delivery status updates.

**Endpoint**: Your configured webhook URL  
**Method**: POST  
**Headers**: 
- `X-Maysar-Signature`: HMAC signature for verification
- `X-Maysar-Event`: Event type

**Payload**:
```json
{
  "event": "delivery.status_updated",
  "data": {
    "deliveryId": "DEL-001",
    "status": "completed",
    "timestamp": "2025-01-07T14:30:00Z",
    "courierId": "COURIER-123"
  }
}
```

---

## Changelog

### Version 1.0.0 (2025-01-07)
- Initial API release
- Complete delivery management system
- Real-time route tracking
- Performance monitoring
- Earnings management
- Vehicle and account management
- Training system integration

---

**Built with ❤️ for the Maysar Digital Community Trade Network**

*For technical support, contact: api-support@maysar.com*