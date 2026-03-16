# Logistics Frontend Integration Guide

## Overview

This document specifies how the **Logistics Frontend Application** (Courier Console) should integrate with the **Maysar Express Backend** Logistics Service. The backend expects a mobile-first Progressive Web App (PWA) designed for delivery couriers.

---

## Backend Service Details

**Service Name**: Logistics Service  
**Base URL**: `http://localhost:3000/api/logistics` (development)  
**Production URL**: `https://api.maysar.com/api/logistics`  
**Port**: 3000 (shared with all services)  
**Route Prefix**: `/api/logistics`

---

## Authentication

### Expected Authentication Flow

```typescript
// 1. Login Request
POST /api/auth/login
{
  "phone": "+255712345678",
  "password": "courier_password"
}

// Response
{
  "success": true,
  "data": {
    "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "userId": "user_123",
      "courierId": "courier_456",
      "role": "courier",
      "name": "John Doe"
    }
  }
}

// 2. Include token in all subsequent requests
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## Core Features & API Integration

### 1. Courier Dashboard

**Purpose**: Overview of courier's daily operations

**API Endpoints**:
```typescript
// Get courier profile and stats
GET /api/logistics/couriers/:courierId

Response:
{
  "success": true,
  "data": {
    "courierId": "courier_456",
    "name": "John Doe",
    "phone": "+255712345678",
    "vehicle": "motorcycle",
    "rating": 4.8,
    "status": "active",
    "currentLocation": {
      "lat": -6.7924,
      "lng": 39.2083
    },
    "stats": {
      "deliveriesCompleted": 145,
      "averageRating": 4.8,
      "onTimeDeliveryRate": 95.5
    }
  }
}

// Get today's deliveries
GET /api/logistics/deliveries?courierId=courier_456&dateFrom=2024-01-10T00:00:00Z

Response:
{
  "success": true,
  "data": {
    "deliveries": [
      {
        "deliveryId": "del_789",
        "orderId": "order_123",
        "status": "assigned",
        "pickupLocation": {
          "lat": -6.7924,
          "lng": 39.2083,
          "address": "123 Uhuru Street, Dar es Salaam"
        },
        "deliveryLocation": {
          "lat": -6.8000,
          "lng": 39.2800,
          "address": "456 Kariakoo, Dar es Salaam"
        },
        "estimatedPickupTime": "2024-01-10T10:00:00Z",
        "estimatedDeliveryTime": "2024-01-10T11:00:00Z",
        "priority": "standard",
        "totalCost": 5000
      }
    ],
    "total": 5,
    "page": 1,
    "limit": 10
  }
}
```

**Frontend Implementation**:
```typescript
// Dashboard Component
interface DashboardData {
  courier: CourierProfile;
  todayDeliveries: Delivery[];
  earnings: EarningsSummary;
}

async function loadDashboard(courierId: string): Promise<DashboardData> {
  const [courier, deliveries, earnings] = await Promise.all([
    fetch(`/api/logistics/couriers/${courierId}`),
    fetch(`/api/logistics/deliveries?courierId=${courierId}&dateFrom=${today}`),
    fetch(`/api/logistics/earnings/courier/${courierId}?period=today`)
  ]);
  
  return {
    courier: await courier.json(),
    todayDeliveries: await deliveries.json(),
    earnings: await earnings.json()
  };
}
```

---

### 2. Delivery Management

#### 2.1 View Assigned Deliveries

```typescript
GET /api/logistics/deliveries?courierId=courier_456&status=assigned

Response:
{
  "success": true,
  "data": {
    "deliveries": [
      {
        "deliveryId": "del_789",
        "orderId": "order_123",
        "status": "assigned",
        "customerName": "Jane Smith",
        "customerPhone": "+255712345679",
        "pickupLocation": {...},
        "deliveryLocation": {...},
        "packageDetails": {
          "weight": 2.5,
          "dimensions": "30x20x10 cm",
          "description": "Electronics"
        },
        "paymentMethod": "COD",
        "amountToCollect": 50000,
        "estimatedDeliveryTime": "2024-01-10T11:00:00Z"
      }
    ]
  }
}
```

#### 2.2 Update Delivery Status

```typescript
POST /api/logistics/deliveries/:deliveryId/status

Request:
{
  "status": "picked_up",
  "location": {
    "lat": -6.7924,
    "lng": 39.2083
  },
  "notes": "Package collected from seller"
}

Response:
{
  "success": true,
  "data": {
    "deliveryId": "del_789",
    "status": "picked_up",
    "updatedAt": "2024-01-10T10:15:00Z"
  }
}
```

**Status Flow**:
```
assigned → picked_up → in_transit → arrived → delivered
                                   ↓
                                cancelled
```

**Frontend Implementation**:
```typescript
// Delivery Status Component
const statusActions = {
  assigned: [
    { label: 'Start Pickup', nextStatus: 'picked_up' },
    { label: 'Cancel', nextStatus: 'cancelled' }
  ],
  picked_up: [
    { label: 'Start Delivery', nextStatus: 'in_transit' }
  ],
  in_transit: [
    { label: 'Mark Arrived', nextStatus: 'arrived' }
  ],
  arrived: [
    { label: 'Complete Delivery', nextStatus: 'delivered' }
  ]
};

async function updateDeliveryStatus(
  deliveryId: string,
  status: string,
  location: Coordinates
) {
  const response = await fetch(
    `/api/logistics/deliveries/${deliveryId}/status`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ status, location })
    }
  );
  
  return response.json();
}
```

---

### 3. Route Optimization

#### 3.1 Get Optimized Route

```typescript
GET /api/logistics/routes/courier/:courierId

Response:
{
  "success": true,
  "data": {
    "routeId": "route_123",
    "courierId": "courier_456",
    "status": "active",
    "totalDistance": 15.5,
    "estimatedDuration": 45,
    "waypoints": [
      {
        "sequence": 1,
        "type": "pickup",
        "location": {
          "lat": -6.7924,
          "lng": 39.2083,
          "address": "123 Uhuru Street"
        },
        "deliveryId": "del_789",
        "estimatedArrival": "2024-01-10T10:00:00Z"
      },
      {
        "sequence": 2,
        "type": "delivery",
        "location": {
          "lat": -6.8000,
          "lng": 39.2800,
          "address": "456 Kariakoo"
        },
        "deliveryId": "del_789",
        "estimatedArrival": "2024-01-10T10:30:00Z"
      }
    ],
    "progress": {
      "completedStops": 0,
      "totalStops": 4,
      "currentLocation": {
        "lat": -6.7924,
        "lng": 39.2083
      }
    }
  }
}
```

#### 3.2 Request Route Optimization

```typescript
POST /api/logistics/routes/optimize

Request:
{
  "courierId": "courier_456",
  "deliveryIds": ["del_789", "del_790", "del_791"],
  "startLocation": {
    "lat": -6.7924,
    "lng": 39.2083
  },
  "algorithm": "genetic" // Options: dijkstra, astar, genetic, ant_colony
}

Response:
{
  "success": true,
  "data": {
    "routeId": "route_124",
    "optimizedSequence": ["del_789", "del_791", "del_790"],
    "totalDistance": 12.3,
    "estimatedDuration": 38,
    "savings": {
      "distanceKm": 3.2,
      "timeMinutes": 7
    }
  }
}
```

**Frontend Implementation**:
```typescript
// Map Component with Route Display
import { GoogleMap, Polyline, Marker } from '@react-google-maps/api';

function RouteMap({ route }: { route: Route }) {
  const path = route.waypoints.map(wp => ({
    lat: wp.location.lat,
    lng: wp.location.lng
  }));
  
  return (
    <GoogleMap
      center={path[0]}
      zoom={13}
    >
      <Polyline
        path={path}
        options={{
          strokeColor: '#2196F3',
          strokeWeight: 4
        }}
      />
      {route.waypoints.map((wp, idx) => (
        <Marker
          key={idx}
          position={{ lat: wp.location.lat, lng: wp.location.lng }}
          label={`${idx + 1}`}
        />
      ))}
    </GoogleMap>
  );
}
```

---

### 4. Real-Time GPS Tracking

#### 4.1 Send Location Updates

```typescript
POST /api/logistics/tracking/location

Request:
{
  "courierId": "courier_456",
  "deliveryId": "del_789",
  "location": {
    "lat": -6.7950,
    "lng": 39.2100,
    "accuracy": 10,
    "speed": 25,
    "heading": 180
  },
  "timestamp": "2024-01-10T10:15:00Z"
}

Response:
{
  "success": true,
  "data": {
    "trackingId": "track_123",
    "recorded": true
  }
}
```

**Frontend Implementation**:
```typescript
// GPS Tracking Service
class GPSTrackingService {
  private watchId: number | null = null;
  private updateInterval = 30000; // 30 seconds
  
  startTracking(courierId: string, deliveryId: string) {
    if ('geolocation' in navigator) {
      this.watchId = navigator.geolocation.watchPosition(
        (position) => {
          this.sendLocationUpdate(courierId, deliveryId, {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy,
            speed: position.coords.speed || 0,
            heading: position.coords.heading || 0
          });
        },
        (error) => console.error('GPS Error:', error),
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    }
  }
  
  async sendLocationUpdate(
    courierId: string,
    deliveryId: string,
    location: Location
  ) {
    await fetch('/api/logistics/tracking/location', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        courierId,
        deliveryId,
        location,
        timestamp: new Date().toISOString()
      })
    });
  }
  
  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }
}
```

---

### 5. Earnings & Performance

#### 5.1 View Earnings

```typescript
GET /api/logistics/earnings/courier/:courierId?period=today

Response:
{
  "success": true,
  "data": {
    "courierId": "courier_456",
    "period": "today",
    "totalEarnings": 45000,
    "breakdown": {
      "deliveryFees": 40000,
      "bonuses": 5000,
      "tips": 0
    },
    "deliveriesCompleted": 8,
    "averagePerDelivery": 5625,
    "pendingPayout": 45000
  }
}

// Get detailed earnings report
GET /api/logistics/earnings/courier/:courierId?dateFrom=2024-01-01&dateTo=2024-01-31

Response:
{
  "success": true,
  "data": {
    "totalEarnings": 450000,
    "deliveries": [
      {
        "deliveryId": "del_789",
        "completedAt": "2024-01-10T11:00:00Z",
        "baseFee": 5000,
        "distanceBonus": 500,
        "speedBonus": 0,
        "total": 5500
      }
    ],
    "summary": {
      "totalDeliveries": 90,
      "averageEarningsPerDelivery": 5000,
      "bestDay": {
        "date": "2024-01-15",
        "earnings": 25000
      }
    }
  }
}
```

#### 5.2 Performance Analytics

```typescript
GET /api/logistics/analytics/courier/:courierId

Response:
{
  "success": true,
  "data": {
    "courierId": "courier_456",
    "period": "last_30_days",
    "metrics": {
      "totalDeliveries": 90,
      "successRate": 98.9,
      "onTimeRate": 95.5,
      "averageRating": 4.8,
      "customerSatisfaction": 96.0
    },
    "trends": {
      "deliveriesPerDay": 3.0,
      "earningsPerDay": 15000,
      "ratingTrend": "improving"
    },
    "rankings": {
      "cityRank": 12,
      "totalCouriers": 150,
      "percentile": 92
    }
  }
}
```

**Frontend Implementation**:
```typescript
// Earnings Dashboard Component
function EarningsDashboard({ courierId }: { courierId: string }) {
  const [earnings, setEarnings] = useState<EarningsData | null>(null);
  const [period, setPeriod] = useState<'today' | 'week' | 'month'>('today');
  
  useEffect(() => {
    loadEarnings(courierId, period);
  }, [courierId, period]);
  
  return (
    <div className="earnings-dashboard">
      <div className="period-selector">
        <button onClick={() => setPeriod('today')}>Today</button>
        <button onClick={() => setPeriod('week')}>This Week</button>
        <button onClick={() => setPeriod('month')}>This Month</button>
      </div>
      
      <div className="earnings-summary">
        <h2>Total Earnings</h2>
        <p className="amount">TZS {earnings?.totalEarnings.toLocaleString()}</p>
        <p className="deliveries">{earnings?.deliveriesCompleted} deliveries</p>
      </div>
      
      <div className="earnings-breakdown">
        <div>Delivery Fees: TZS {earnings?.breakdown.deliveryFees}</div>
        <div>Bonuses: TZS {earnings?.breakdown.bonuses}</div>
        <div>Tips: TZS {earnings?.breakdown.tips}</div>
      </div>
    </div>
  );
}
```

---

### 6. Cash on Delivery (COD)

#### 6.1 Generate OTP for COD Verification

```typescript
POST /api/logistics/cod/:deliveryId/otp

Response:
{
  "success": true,
  "data": {
    "deliveryId": "del_789",
    "otp": "123456",
    "expiresAt": "2024-01-10T11:05:00Z"
  }
}
```

#### 6.2 Verify COD Delivery

```typescript
POST /api/logistics/cod/:deliveryId/verify

Request:
{
  "otp": "123456",
  "amountCollected": 50000,
  "recipientName": "Jane Smith",
  "recipientSignature": "data:image/png;base64,..."
}

Response:
{
  "success": true,
  "data": {
    "deliveryId": "del_789",
    "verified": true,
    "status": "delivered",
    "completedAt": "2024-01-10T11:00:00Z"
  }
}
```

**Frontend Implementation**:
```typescript
// COD Verification Component
function CODVerification({ delivery }: { delivery: Delivery }) {
  const [otp, setOtp] = useState('');
  const [signature, setSignature] = useState<string | null>(null);
  
  async function handleVerify() {
    const response = await fetch(
      `/api/logistics/cod/${delivery.deliveryId}/verify`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          otp,
          amountCollected: delivery.amountToCollect,
          recipientName: delivery.customerName,
          recipientSignature: signature
        })
      }
    );
    
    if (response.ok) {
      // Navigate to success screen
    }
  }
  
  return (
    <div className="cod-verification">
      <h2>Verify Delivery</h2>
      <p>Amount to Collect: TZS {delivery.amountToCollect}</p>
      
      <input
        type="text"
        placeholder="Enter OTP"
        value={otp}
        onChange={(e) => setOtp(e.target.value)}
        maxLength={6}
      />
      
      <SignaturePad onSave={setSignature} />
      
      <button onClick={handleVerify}>Complete Delivery</button>
    </div>
  );
}
```

---

### 7. Courier Status Management

```typescript
PUT /api/logistics/couriers/:courierId/status

Request:
{
  "status": "active" // or "inactive"
}

Response:
{
  "success": true,
  "data": {
    "courierId": "courier_456",
    "status": "active",
    "updatedAt": "2024-01-10T08:00:00Z"
  }
}
```

**Frontend Implementation**:
```typescript
// Status Toggle Component
function StatusToggle({ courierId, currentStatus }: Props) {
  const [isActive, setIsActive] = useState(currentStatus === 'active');
  
  async function toggleStatus() {
    const newStatus = isActive ? 'inactive' : 'active';
    
    const response = await fetch(
      `/api/logistics/couriers/${courierId}/status`,
      {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      }
    );
    
    if (response.ok) {
      setIsActive(!isActive);
    }
  }
  
  return (
    <div className="status-toggle">
      <label>
        <input
          type="checkbox"
          checked={isActive}
          onChange={toggleStatus}
        />
        {isActive ? 'Available for Deliveries' : 'Offline'}
      </label>
    </div>
  );
}
```

---

## Expected Frontend Architecture

### Technology Stack

**Recommended**:
- **Framework**: React Native (mobile) or Next.js (PWA)
- **State Management**: Redux Toolkit or Zustand
- **Maps**: Google Maps API or Mapbox
- **Offline Support**: Service Workers + IndexedDB
- **Real-time**: WebSocket or Server-Sent Events

### App Structure

```
courier-app/
├── src/
│   ├── features/
│   │   ├── auth/
│   │   │   ├── LoginScreen.tsx
│   │   │   └── authSlice.ts
│   │   ├── dashboard/
│   │   │   ├── DashboardScreen.tsx
│   │   │   └── dashboardSlice.ts
│   │   ├── deliveries/
│   │   │   ├── DeliveryListScreen.tsx
│   │   │   ├── DeliveryDetailScreen.tsx
│   │   │   ├── DeliveryStatusScreen.tsx
│   │   │   └── deliveriesSlice.ts
│   │   ├── routes/
│   │   │   ├── RouteMapScreen.tsx
│   │   │   ├── RouteOptimizationScreen.tsx
│   │   │   └── routesSlice.ts
│   │   ├── tracking/
│   │   │   ├── GPSTrackingService.ts
│   │   │   └── trackingSlice.ts
│   │   ├── earnings/
│   │   │   ├── EarningsScreen.tsx
│   │   │   ├── EarningsDetailScreen.tsx
│   │   │   └── earningsSlice.ts
│   │   └── profile/
│   │       ├── ProfileScreen.tsx
│   │       ├── PerformanceScreen.tsx
│   │       └── profileSlice.ts
│   ├── services/
│   │   ├── api.ts
│   │   ├── auth.service.ts
│   │   ├── delivery.service.ts
│   │   ├── route.service.ts
│   │   ├── tracking.service.ts
│   │   └── earnings.service.ts
│   ├── components/
│   │   ├── Map/
│   │   ├── DeliveryCard/
│   │   ├── StatusBadge/
│   │   └── SignaturePad/
│   └── utils/
│       ├── location.ts
│       ├── offline.ts
│       └── notifications.ts
```

---

## Offline Support

### Required Offline Capabilities

1. **View Assigned Deliveries**: Cache delivery list
2. **Update Delivery Status**: Queue status updates
3. **GPS Tracking**: Buffer location updates
4. **View Route**: Cache route data

**Implementation**:
```typescript
// Offline Queue Service
class OfflineQueueService {
  private queue: QueueItem[] = [];
  
  async addToQueue(request: QueueItem) {
    this.queue.push(request);
    await this.saveToStorage();
  }
  
  async processQueue() {
    if (!navigator.onLine) return;
    
    while (this.queue.length > 0) {
      const item = this.queue[0];
      
      try {
        await fetch(item.url, item.options);
        this.queue.shift();
        await this.saveToStorage();
      } catch (error) {
        break; // Stop processing on error
      }
    }
  }
  
  private async saveToStorage() {
    localStorage.setItem('offlineQueue', JSON.stringify(this.queue));
  }
}

// Usage
window.addEventListener('online', () => {
  offlineQueue.processQueue();
});
```

---

## Push Notifications

### Expected Notification Types

```typescript
// New delivery assigned
{
  "type": "delivery_assigned",
  "title": "New Delivery",
  "body": "You have a new delivery to pickup at Uhuru Street",
  "data": {
    "deliveryId": "del_789",
    "action": "view_delivery"
  }
}

// Delivery reminder
{
  "type": "delivery_reminder",
  "title": "Delivery Reminder",
  "body": "Pickup time in 15 minutes",
  "data": {
    "deliveryId": "del_789"
  }
}

// Earnings update
{
  "type": "earnings_update",
  "title": "Earnings Updated",
  "body": "You earned TZS 5,000 from your last delivery",
  "data": {
    "amount": 5000
  }
}
```

---

## Error Handling

### Expected Error Responses

```typescript
// Validation Error
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [
      {
        "field": "location.lat",
        "message": "Latitude is required"
      }
    ]
  }
}

// Not Found Error
{
  "success": false,
  "error": {
    "code": "DELIVERY_NOT_FOUND",
    "message": "Delivery del_789 not found"
  }
}

// Server Error
{
  "success": false,
  "error": {
    "code": "INTERNAL_SERVER_ERROR",
    "message": "An unexpected error occurred",
    "timestamp": "2024-01-10T10:00:00Z"
  }
}
```

**Frontend Error Handling**:
```typescript
async function apiCall<T>(url: string, options?: RequestInit): Promise<T> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${getToken()}`,
        ...options?.headers
      }
    });
    
    const data = await response.json();
    
    if (!data.success) {
      throw new APIError(data.error.code, data.error.message);
    }
    
    return data.data;
  } catch (error) {
    if (error instanceof APIError) {
      // Handle specific error codes
      if (error.code === 'UNAUTHORIZED') {
        // Redirect to login
      }
    }
    throw error;
  }
}
```

---

## Performance Requirements

### Expected Performance Metrics

- **API Response Time**: < 200ms for 95% of requests
- **GPS Update Frequency**: Every 30 seconds during active delivery
- **Offline Queue Processing**: Within 5 seconds of coming online
- **Map Rendering**: < 1 second for route display
- **App Launch Time**: < 2 seconds

### Optimization Strategies

1. **API Caching**: Cache courier profile, delivery list for 5 minutes
2. **Image Optimization**: Compress delivery proof photos before upload
3. **Lazy Loading**: Load route details only when needed
4. **Background Sync**: Use Service Workers for GPS updates
5. **Data Pagination**: Load deliveries in batches of 10

---

## Security Requirements

### Data Protection

1. **Token Storage**: Store JWT in secure storage (Keychain/Keystore)
2. **HTTPS Only**: All API calls must use HTTPS in production
3. **Certificate Pinning**: Implement SSL pinning for API calls
4. **Sensitive Data**: Never log sensitive data (tokens, OTPs)

### Privacy

1. **Location Data**: Only collect GPS when delivery is active
2. **Data Retention**: Clear cached data after 7 days
3. **User Consent**: Request location permissions explicitly

---

## Testing Requirements

### Required Test Coverage

1. **Unit Tests**: API service functions, utility functions
2. **Integration Tests**: API endpoint integration
3. **E2E Tests**: Critical user flows (login, delivery completion)
4. **Offline Tests**: Offline queue functionality
5. **GPS Tests**: Location tracking accuracy

---

## Summary

The Logistics Frontend should be a **mobile-first PWA** that provides:

1. **Real-time delivery management** with status updates
2. **GPS tracking** with automatic location updates
3. **Route optimization** with map visualization
4. **Earnings tracking** with detailed breakdowns
5. **Offline support** for critical operations
6. **COD verification** with OTP and signature capture

All API endpoints follow RESTful conventions with consistent response formats and comprehensive error handling.
