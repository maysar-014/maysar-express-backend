# Courier Service Saga Documentation

بسم الله الرحمن الرحيم

## Overview

The Courier Service Saga orchestrates the complete courier lifecycle within the Maysar Digital Community Trade Network. This saga manages delivery operations, performance tracking, earnings calculation, and courier development through a comprehensive API-driven architecture.

## Saga Architecture

### Core Components

```
Courier Console (Port 3500) ←→ Courier API Service (Port 3015) ←→ Event Bus
                                        ↓
                            Database & External Services
```

### Event-Driven Flow

```
CourierRegistered → VehicleVerified → TrainingStarted → 
DeliveryAssigned → RouteOptimized → DeliveryCompleted → 
EarningsCalculated → PerformanceUpdated
```

## API Service Structure

### Base URL: `http://localhost:3015/api/courier`

## 1. Delivery Management Saga

### Core Delivery Flow

```typescript
// 1. Get Available Deliveries
GET /deliveries/available
Response: { success: true, data: [], count: 0 }

// 2. Accept Delivery Assignment
POST /deliveries/:id/accept
Response: { success: true, data: { deliveryId, status: 'accepted' } }

// 3. Update Delivery Status
PUT /deliveries/:id/status
Body: { status: 'in_progress' | 'completed' | 'failed' }
Response: { success: true, data: { deliveryId, status } }

// 4. Complete Delivery (Courier marks as delivered)
POST /deliveries/:id/complete
Response: { success: true, data: { deliveryId, completedAt } }

// Note: Proof of delivery is handled by buyer confirmation in Order Service
// Courier only marks delivery as completed, buyer confirms receipt
```

### Active Deliveries Management

```typescript
GET /deliveries/active
Response: {
  success: true,
  data: [
    {
      id: 'DEL-001',
      type: 'Pickup',
      location: 'Kariakoo Market, Dar es Salaam',
      customer: 'Amina Hassan',
      eta: '14:30',
      packageType: 'Electronics',
      weight: '2.5kg',
      requiredAction: 'Photo + Signature',
      riskFlags: ['Fragile'],
      status: 'assigned'
    }
  ]
}
```

### Delivery Saga Events

```typescript
// Event Flow
DeliveryAssigned → CourierNotified → DeliveryAccepted → 
RouteCalculated → DeliveryInProgress → DeliveryCompleted → 
BuyerConfirmation → EarningsUpdated → PerformanceTracked
```

## 2. Route Optimization Saga

### Route Management Flow

```typescript
// 1. Optimize Route
POST /routes/optimize
Body: { deliveries: [], preferences: {} }
Response: { success: true, data: { routeId, waypoints, duration } }

// 2. Get Current Route
GET /routes/current
Response: {
  success: true,
  data: {
    id: 'ROUTE-001',
    distance: '24.5 km',
    estimatedTime: '45 mins',
    trafficStatus: 'Moderate traffic on main routes',
    waypoints: [
      {
        id: 'wp-1',
        location: 'Kariakoo Market',
        status: 'completed',
        eta: '14:30'
      }
    ]
  }
}

// 3. Update Route
PUT /routes/:id/update
Body: { waypoints: [], reason: 'traffic_update' }
Response: { success: true, data: { routeId, updated: true } }
```

### Route Saga Events

```typescript
// Event Flow
RouteOptimizationRequested → TrafficDataFetched → 
RouteCalculated → WaypointsGenerated → RouteUpdated → 
CourierNotified → ETAUpdated
```

## 3. Location Tracking Saga

### Location Management

```typescript
// 1. Update Location
PUT /location
Body: { lat: -6.7924, lng: 39.2083, timestamp: ISO_STRING }
Response: { success: true, data: { lat, lng, updated: true } }

// 2. Get Location History
GET /location/history
Query: { from: DATE, to: DATE, limit: 100 }
Response: { success: true, data: [] }
```

### Location Saga Events

```typescript
// Event Flow
LocationUpdated → RouteRecalculated → ETAUpdated → 
CustomerNotified → DeliveryStatusUpdated
```

## 4. Performance Tracking Saga

### Performance Metrics

```typescript
// 1. Get Performance Overview
GET /performance/overview
Response: {
  success: true,
  data: {
    onTimeDelivery: { level: 'Good', trend: 'stable', percentage: 94 },
    acceptanceConsistency: { level: 'Good', trend: 'improving', percentage: 87 },
    issueReportingQuality: { level: 'Needs Work', trend: 'improving', percentage: 72 },
    safetyCompliance: { level: 'Good', trend: 'stable', percentage: 96 }
  }
}

// 2. Get Performance Hints
GET /performance/hints
Response: {
  success: true,
  data: [
    {
      metric: 'Issue Reporting Quality',
      hint: 'Report issues immediately when they occur',
      action: 'Early reporting helps the system provide better support'
    }
  ]
}

// 3. Get Performance Insights
GET /performance/insights
Response: {
  success: true,
  data: [
    {
      period: 'Last 7 days',
      insight: 'Consistent on-time performance noted',
      impact: 'Positive',
      suggestion: 'Maintain current delivery speed standards'
    }
  ]
}
```

### Performance Saga Events

```typescript
// Event Flow
DeliveryCompleted → BuyerConfirmation → PerformanceCalculated → 
MetricsUpdated → HintsGenerated → InsightsUpdated → CourierNotified
```

## 5. Earnings Management Saga

### Earnings Calculation Flow

```typescript
// 1. Get Today's Earnings
GET /earnings/today
Response: {
  success: true,
  data: {
    total: 42300,
    breakdown: {
      base: 28000,
      distance: 8500,
      time: 3800,
      weightBonus: 1200,
      heavyItemBonus: 800
    }
  }
}

// 2. Get Pending Earnings
GET /earnings/pending
Response: {
  success: true,
  data: [
    { description: 'Base rate for 28 deliveries', amount: 28000 },
    { description: 'Distance bonus (124km)', amount: 8500 }
  ]
}

// 3. Get Payout History
GET /earnings/payout-history
Response: {
  success: true,
  data: [
    {
      period: 'Jan 6, 2026',
      amount: 156750,
      status: 'Completed',
      breakdown: { base: 112000, distance: 29800, time: 12950, bonuses: 2000 }
    }
  ]
}

// 4. Request Payout
POST /earnings/payout
Body: { amount: 50000, method: 'mobile_money' }
Response: { success: true, data: { payoutId, amount } }
```

### Earnings Saga Events

```typescript
// Event Flow
DeliveryCompleted → BuyerNotified → BuyerConfirmation → 
EarningsCalculated → BonusesApplied → PayoutEligibilityChecked → 
EarningsUpdated → CourierNotified
```

## 6. Vehicle Management Saga

### Vehicle Lifecycle

```typescript
// 1. Get Vehicle Overview
GET /vehicle/overview
Response: {
  success: true,
  data: {
    registeredVehicle: 'Motorcycle - Honda CB300R',
    maxAllowedWeight: '50kg',
    verificationStatus: 'Verified',
    registrationNumber: 'TZS 123 AB',
    insuranceExpiry: '2026-08-15',
    lastInspection: '2025-12-01',
    nextInspection: '2026-06-01'
  }
}

// 2. Get Vehicle Maintenance
GET /vehicle/maintenance
Response: {
  success: true,
  data: {
    lastInspection: '2025-12-01',
    nextInspection: '2026-06-01',
    overallStatus: 'Compliant'
  }
}

// 3. Get Delivery Eligibility
GET /vehicle/eligibility
Response: {
  success: true,
  data: [
    { type: 'Standard Deliveries', eligible: true },
    { type: 'Heavy Item Deliveries', eligible: true },
    { type: 'Oversized Items', eligible: false }
  ]
}

// 4. Request Vehicle Change
POST /vehicle/change-request
Body: { newVehicle: {}, reason: 'upgrade' }
Response: { success: true, data: { requestId, status: 'submitted' } }
```

### Vehicle Saga Events

```typescript
// Event Flow
VehicleRegistered → DocumentsVerified → InspectionScheduled → 
InspectionCompleted → EligibilityUpdated → DeliveryCapabilityUpdated
```

## 7. Account & KYC Saga

### KYC Management

```typescript
// 1. Get Account Status
GET /account/status
Response: {
  success: true,
  data: {
    overall: 'Verified',
    lastVerification: '2025-11-15',
    nextReview: '2026-05-15',
    riskLevel: 'Low'
  }
}

// 2. Get Documents Status
GET /account/documents
Response: {
  success: true,
  data: [
    {
      id: 'national_id',
      name: 'National ID',
      status: 'Verified',
      expiry: '2030-01-15',
      lastUpdated: '2025-11-15',
      required: true
    }
  ]
}

// 3. Upload Document
POST /account/documents/:id/upload
Body: FormData with document file
Response: { success: true, data: { documentId, uploadId, status: 'uploaded' } }

// 4. Get Account Restrictions
GET /account/restrictions
Response: {
  success: true,
  data: [
    {
      type: 'Document Expiry Warning',
      details: 'Insurance certificate expires in 7 months',
      severity: 'Medium',
      actionRequired: false
    }
  ]
}
```

### KYC Saga Events

```typescript
// Event Flow
DocumentUploaded → DocumentVerified → ComplianceChecked → 
RiskAssessed → AccountStatusUpdated → RestrictionsUpdated
```

## 8. Training & Development Saga

### Training Management

```typescript
// 1. Get Training Modules
GET /training/modules
Response: {
  success: true,
  data: [
    {
      id: 'module-1',
      title: 'Getting Started as a Courier',
      description: 'Learn the basics of the Maysar courier platform',
      duration: '15 mins',
      difficulty: 'Beginner',
      category: 'Onboarding',
      progress: 100,
      topics: ['Platform Overview', 'Account Setup', 'Vehicle Registration']
    }
  ]
}

// 2. Get Training Progress
GET /training/progress
Response: {
  success: true,
  data: {
    completedModules: ['module-1'],
    overallProgress: 33,
    totalModules: 3
  }
}

// 3. Get Achievements
GET /training/achievements
Response: {
  success: true,
  data: {
    learning: [
      {
        id: 'first-steps',
        title: 'First Steps',
        description: 'Complete the Getting Started training module',
        icon: '✓',
        unlocked: true,
        category: 'Learning'
      }
    ],
    performance: [
      {
        id: 'consistent-courier',
        title: 'Reliability Champion',
        description: 'Maintain 95%+ on-time delivery rate',
        icon: 'TARGET',
        unlocked: false,
        category: 'Performance'
      }
    ]
  }
}

// 4. Start Training Module
POST /training/modules/:id/start
Response: { success: true, data: { moduleId, status: 'started', startedAt } }

// 5. Complete Training Module
POST /training/modules/:id/complete
Response: { success: true, data: { moduleId, status: 'completed', completedAt, progress: 100 } }
```

### Training Saga Events

```typescript
// Event Flow
TrainingStarted → ProgressTracked → ModuleCompleted → 
AchievementUnlocked → SkillsUpdated → EligibilityUpdated
```

## 9. Issue Reporting Saga

### Issue Management

```typescript
// 1. Get Issue Types
GET /issues/types
Response: {
  success: true,
  data: [
    {
      id: 'customer_unavailable',
      title: 'Customer Not Available',
      description: 'Recipient is not present at delivery location'
    }
  ]
}

// 2. Report Issue
POST /issues/report
Body: { type: 'customer_unavailable', description: '', location: {} }
Response: {
  success: true,
  data: {
    issueId: 'issue-123',
    type: 'customer_unavailable',
    reportedAt: ISO_STRING,
    status: 'reported'
  }
}
```

### Issue Saga Events

```typescript
// Event Flow
IssueReported → IssueClassified → SupportNotified → 
ResolutionInitiated → IssueResolved → PerformanceUpdated
```

## 10. Communication Saga

### Message Management

```typescript
// 1. Send Message to Customer
POST /messages/:customerId
Body: { message: 'On my way to pickup location', type: 'delivery_update' }
Response: { success: true, data: { messageId, sent: true } }

// 2. Get Message History
GET /messages
Query: { customerId: 'optional', limit: 50 }
Response: { success: true, data: [] }
```

### Communication Saga Events

```typescript
// Event Flow
MessageSent → DeliveryStatusUpdated → CustomerNotified → 
ResponseReceived → ConversationUpdated
```

## 11. Dashboard & Monitoring Saga

### Dashboard Data

```typescript
// 1. Get Dashboard Overview
GET /dashboard
Response: {
  success: true,
  data: {
    activeDeliveries: 2,
    todayEarnings: 42300,
    completedDeliveries: 28,
    rating: 4.8,
    alerts: [
      { type: 'info', message: '2 deliveries pending acceptance', priority: 'medium' }
    ],
    vehicleStatus: 'verified',
    complianceStatus: 'compliant'
  }
}

// 2. Get Critical Alerts
GET /alerts/critical
Response: {
  success: true,
  data: [
    {
      id: 'module-2',
      title: 'Delivery Excellence',
      description: 'Complete training to improve performance',
      category: 'Training'
    }
  ]
}

// 3. Get GPS Status
GET /gps/status
Response: {
  success: true,
  data: {
    active: true,
    accuracy: 'High (±5m)',
    lastUpdate: ISO_STRING
  }
}
```

## 12. Support Ticket Saga

### Support Management

```typescript
// Get Support Tickets
GET /support/tickets
Response: {
  success: true,
  data: [
    {
      id: 'TICKET-001',
      subject: 'Delivery Route Optimization Issue',
      status: 'open',
      priority: 'high',
      createdAt: '2025-01-06T14:30:00Z',
      category: 'Technical',
      responses: [
        {
          id: 'RESP-001',
          author: 'Technical Team',
          message: 'Fix has been deployed',
          timestamp: '2025-01-06T16:45:00Z',
          type: 'support'
        }
      ]
    }
  ]
}
```

## Saga Orchestration Patterns

### 1. Delivery Completion Saga

```typescript
// Orchestrated Flow
async function completeDeliverySaga(deliveryId: string) {
  try {
    // 1. Complete delivery
    await courierAPI.completeDelivery(deliveryId);
    
    // 2. Calculate earnings
    const earnings = await courierAPI.calculateEarnings(deliveryId);
    
    // 3. Update performance metrics
    await courierAPI.updatePerformance(deliveryId);
    
    // 4. Generate insights
    await courierAPI.generateInsights();
    
    // 5. Check achievements
    await courierAPI.checkAchievements();
    
    // 6. Notify courier
    await courierAPI.sendNotification('delivery_completed');
    
  } catch (error) {
    // Compensation logic
    await courierAPI.rollbackDelivery(deliveryId);
    throw error;
  }
}
```

### 2. Training Progress Saga

```typescript
// Orchestrated Flow
async function trainingProgressSaga(moduleId: string) {
  try {
    // 1. Complete module
    await courierAPI.completeTrainingModule(moduleId);
    
    // 2. Update progress
    const progress = await courierAPI.updateTrainingProgress();
    
    // 3. Check achievements
    const achievements = await courierAPI.checkTrainingAchievements();
    
    // 4. Update eligibility
    await courierAPI.updateDeliveryEligibility();
    
    // 5. Generate recommendations
    await courierAPI.generateTrainingRecommendations();
    
  } catch (error) {
    await courierAPI.rollbackTrainingProgress(moduleId);
    throw error;
  }
}
```

### 3. Vehicle Update Saga

```typescript
// Orchestrated Flow
async function vehicleUpdateSaga(vehicleData: VehicleData) {
  try {
    // 1. Submit change request
    const request = await courierAPI.submitVehicleChangeRequest(vehicleData);
    
    // 2. Verify documents
    await courierAPI.verifyVehicleDocuments(request.id);
    
    // 3. Schedule inspection
    await courierAPI.scheduleInspection(request.id);
    
    // 4. Update eligibility
    await courierAPI.updateDeliveryEligibility();
    
    // 5. Notify courier
    await courierAPI.sendNotification('vehicle_updated');
    
  } catch (error) {
    await courierAPI.rollbackVehicleChange(request.id);
    throw error;
  }
}
```

## Error Handling & Compensation

### Saga Error Patterns

```typescript
// Compensation Actions
const compensationActions = {
  DeliveryFailed: async (deliveryId) => {
    await courierAPI.releaseDelivery(deliveryId);
    await courierAPI.notifyCustomer(deliveryId, 'delivery_failed');
    await courierAPI.updateAvailability('available');
  },
  
  PaymentFailed: async (payoutId) => {
    await courierAPI.rollbackPayout(payoutId);
    await courierAPI.notifyCourier('payout_failed');
    await courierAPI.updateEarningsStatus('pending');
  },
  
  TrainingFailed: async (moduleId) => {
    await courierAPI.resetModuleProgress(moduleId);
    await courierAPI.notifyCourier('training_reset');
  }
};
```

## Event Schema Definitions

### Core Events

```typescript
interface CourierEvent {
  eventId: string;
  eventType: string;
  courierId: string;
  timestamp: string;
  data: any;
  version: string;
}

// Delivery Events
interface DeliveryAssignedEvent extends CourierEvent {
  eventType: 'DeliveryAssigned';
  data: {
    deliveryId: string;
    customerId: string;
    pickupLocation: Location;
    deliveryLocation: Location;
    packageDetails: PackageDetails;
  };
}

interface DeliveryCompletedEvent extends CourierEvent {
  eventType: 'DeliveryCompleted';
  data: {
    deliveryId: string;
    completedAt: string;
    proofOfDelivery: ProofData;
    earnings: EarningsBreakdown;
  };
}

// Performance Events
interface PerformanceUpdatedEvent extends CourierEvent {
  eventType: 'PerformanceUpdated';
  data: {
    metrics: PerformanceMetrics;
    achievements: Achievement[];
    insights: Insight[];
  };
}
```

## Integration Points

### External Service Integration

```typescript
// GPS Service Integration
interface GPSService {
  updateLocation(courierId: string, location: Location): Promise<void>;
  getOptimalRoute(waypoints: Waypoint[]): Promise<Route>;
  trackDelivery(deliveryId: string): Promise<TrackingData>;
}

// Payment Service Integration
interface PaymentService {
  calculateEarnings(deliveryId: string): Promise<EarningsBreakdown>;
  processPayout(courierId: string, amount: number): Promise<PayoutResult>;
  getPayoutHistory(courierId: string): Promise<PayoutHistory[]>;
}

// Notification Service Integration
interface NotificationService {
  sendPushNotification(courierId: string, message: string): Promise<void>;
  sendSMS(phoneNumber: string, message: string): Promise<void>;
  sendEmail(email: string, subject: string, body: string): Promise<void>;
}
```

## Monitoring & Observability

### Saga Metrics

```typescript
// Key Performance Indicators
const sagaMetrics = {
  deliveryCompletionRate: 98.5,
  averageDeliveryTime: 45, // minutes
  courierSatisfactionScore: 4.8,
  trainingCompletionRate: 87.3,
  earningsAccuracy: 99.9,
  systemUptime: 99.95
};

// Health Checks
const healthChecks = {
  '/health/delivery-saga': () => checkDeliverySagaHealth(),
  '/health/earnings-saga': () => checkEarningsSagaHealth(),
  '/health/training-saga': () => checkTrainingSagaHealth(),
  '/health/vehicle-saga': () => checkVehicleSagaHealth()
};
```

## Security & Compliance

### Data Protection

```typescript
// PII Handling
interface CourierPII {
  nationalId: string; // Encrypted
  phoneNumber: string; // Masked
  location: Location; // Anonymized after delivery
  earnings: number; // Access controlled
}

// Audit Trail
interface AuditEvent {
  eventId: string;
  courierId: string;
  action: string;
  timestamp: string;
  ipAddress: string;
  userAgent: string;
  result: 'success' | 'failure';
}
```

## Future Enhancements

### Planned Features

1. **AI-Powered Route Optimization**: Machine learning for traffic prediction
2. **Advanced Training Paths**: Personalized learning recommendations
3. **Gamification**: Enhanced achievement system with rewards
4. **Social Features**: Courier community and peer support
5. **Advanced Analytics**: Predictive performance insights

### Scalability Considerations

- **Horizontal Scaling**: Microservice architecture supports independent scaling
- **Event Sourcing**: Complete audit trail and replay capabilities
- **CQRS Pattern**: Separate read/write models for optimal performance
- **Circuit Breakers**: Fault tolerance and graceful degradation

---

**Built with ❤️ for the Maysar Digital Community Trade Network**

*This documentation reflects the current API implementation and will be updated as the system evolves In shaa Allah.*