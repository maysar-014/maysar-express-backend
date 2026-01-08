# Courier Saga Implementation Guide

بسم الله الرحمن الرحيم

## Quick Start Implementation

### 1. Basic Courier Saga Setup

```typescript
// courier-saga.ts
import { CourierAPI } from './api/courier-api';
import { EventBus } from './events/event-bus';

export class CourierSaga {
  constructor(
    private courierAPI: CourierAPI,
    private eventBus: EventBus
  ) {}

  // Main delivery completion saga
  async handleDeliveryCompletion(deliveryId: string) {
    try {
      // Step 1: Mark delivery as completed (courier side)
      const delivery = await this.courierAPI.completeDelivery(deliveryId);
      
      // Step 2: Notify buyer for confirmation
      await this.courierAPI.notifyBuyerForConfirmation(deliveryId);
      
      // Note: Earnings and performance are updated after buyer confirms
      // This is handled by Order Service saga, not Courier Service
      
      return { success: true, data: { delivery, status: 'awaiting_buyer_confirmation' } };
      
    } catch (error) {
      // Compensation: rollback delivery status
      await this.courierAPI.rollbackDelivery(deliveryId);
      throw error;
    }
  }
}
```

### 2. API Client Implementation

```typescript
// api/courier-api.ts
export class CourierAPI {
  private baseURL = 'http://localhost:3015/api/courier';

  async completeDelivery(deliveryId: string) {
    const response = await fetch(`${this.baseURL}/deliveries/${deliveryId}/complete`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }

  async calculateEarnings(deliveryId: string) {
    const response = await fetch(`${this.baseURL}/earnings/today`);
    return response.json();
  }

  async updatePerformance() {
    const response = await fetch(`${this.baseURL}/performance/overview`);
    return response.json();
  }

  async checkAchievements() {
    const response = await fetch(`${this.baseURL}/training/achievements`);
    return response.json();
  }
}
```

## Core Saga Patterns

### 1. Delivery Assignment Saga

```typescript
async handleDeliveryAssignment(deliveryId: string, courierId: string) {
  const saga = new SagaTransaction('DeliveryAssignment');
  
  try {
    // Step 1: Accept delivery
    saga.addStep(async () => {
      return await this.courierAPI.acceptDelivery(deliveryId);
    }, async () => {
      await this.courierAPI.releaseDelivery(deliveryId);
    });
    
    // Step 2: Optimize route
    saga.addStep(async () => {
      return await this.courierAPI.optimizeRoute([deliveryId]);
    }, async () => {
      await this.courierAPI.clearRoute();
    });
    
    // Step 3: Update courier status
    saga.addStep(async () => {
      return await this.courierAPI.updateStatus('busy');
    }, async () => {
      await this.courierAPI.updateStatus('available');
    });
    
    return await saga.execute();
    
  } catch (error) {
    await saga.compensate();
    throw error;
  }
}
```

### 2. Training Progress Saga

```typescript
async handleTrainingProgress(moduleId: string, courierId: string) {
  try {
    // Step 1: Complete module
    const completion = await this.courierAPI.completeTrainingModule(moduleId);
    
    // Step 2: Update progress
    const progress = await this.courierAPI.getTrainingProgress();
    
    // Step 3: Check for achievements
    const achievements = await this.courierAPI.getAchievements();
    
    // Step 4: Update delivery eligibility if needed
    if (progress.overallProgress === 100) {
      await this.courierAPI.updateDeliveryEligibility();
    }
    
    return { completion, progress, achievements };
    
  } catch (error) {
    // Rollback module completion
    await this.courierAPI.rollbackModuleCompletion(moduleId);
    throw error;
  }
}
```

### 3. Earnings Calculation Saga

```typescript
async handleEarningsCalculation(deliveryId: string) {
  try {
    // Step 1: Get delivery details
    const delivery = await this.courierAPI.getDelivery(deliveryId);
    
    // Step 2: Calculate base earnings
    const baseEarnings = await this.calculateBaseEarnings(delivery);
    
    // Step 3: Apply bonuses
    const bonuses = await this.calculateBonuses(delivery);
    
    // Step 4: Update total earnings
    const totalEarnings = baseEarnings + bonuses;
    await this.courierAPI.updateEarnings(totalEarnings);
    
    // Step 5: Check payout eligibility
    const payoutEligible = await this.checkPayoutEligibility();
    
    return { baseEarnings, bonuses, totalEarnings, payoutEligible };
    
  } catch (error) {
    // Compensation: reset earnings calculation
    await this.courierAPI.resetEarningsCalculation(deliveryId);
    throw error;
  }
}
```

## Event Handling Patterns

### 1. Event Listeners Setup

```typescript
// event-handlers.ts
export class CourierEventHandlers {
  constructor(private courierSaga: CourierSaga) {
    this.setupEventListeners();
  }

  private setupEventListeners() {
    // Delivery events
    this.eventBus.subscribe('DeliveryAssigned', this.handleDeliveryAssigned.bind(this));
    this.eventBus.subscribe('DeliveryCompleted', this.handleDeliveryCompleted.bind(this));
    
    // Training events
    this.eventBus.subscribe('TrainingModuleStarted', this.handleTrainingStarted.bind(this));
    this.eventBus.subscribe('TrainingModuleCompleted', this.handleTrainingCompleted.bind(this));
    
    // Performance events
    this.eventBus.subscribe('PerformanceUpdated', this.handlePerformanceUpdated.bind(this));
  }

  async handleDeliveryAssigned(event: DeliveryAssignedEvent) {
    await this.courierSaga.handleDeliveryAssignment(
      event.data.deliveryId,
      event.data.courierId
    );
  }

  async handleDeliveryCompleted(event: DeliveryCompletedEvent) {
    await this.courierSaga.handleDeliveryCompletion(event.data.deliveryId);
  }
}
```

### 2. Event Publishing

```typescript
// Event publishing in courier console
export class CourierConsoleEvents {
  constructor(private eventBus: EventBus) {}

  async publishDeliveryAccepted(deliveryId: string, courierId: string) {
    await this.eventBus.publish('DeliveryAccepted', {
      deliveryId,
      courierId,
      acceptedAt: new Date().toISOString()
    });
  }

  async publishTrainingStarted(moduleId: string, courierId: string) {
    await this.eventBus.publish('TrainingModuleStarted', {
      moduleId,
      courierId,
      startedAt: new Date().toISOString()
    });
  }
}
```

## Data Flow Examples

### 1. Complete Delivery Flow

```
Courier Console → API Call → Saga Orchestration → Event Publishing

1. User clicks "Complete Delivery"
2. POST /api/courier/deliveries/:id/complete
3. CourierSaga.handleDeliveryCompletion()
4. Multiple API calls orchestrated
5. DeliveryCompleted event published
6. UI updated with new data
```

### 2. Training Module Flow

```
Training Page → API Call → Progress Update → Achievement Check

1. User completes training module
2. POST /api/courier/training/modules/:id/complete
3. GET /api/courier/training/progress
4. GET /api/courier/training/achievements
5. UI shows updated progress and achievements
```

### 3. Earnings Update Flow

```
Delivery Completion → Earnings Calculation → Dashboard Update

1. Delivery marked complete
2. Earnings automatically calculated
3. GET /api/courier/earnings/today
4. Dashboard shows updated earnings
5. Performance metrics updated
```

## Error Handling Strategies

### 1. Retry Logic

```typescript
async function withRetry<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === maxRetries) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * attempt));
    }
  }
  throw new Error('Max retries exceeded');
}
```

### 2. Circuit Breaker

```typescript
class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'CLOSED' | 'OPEN' | 'HALF_OPEN' = 'CLOSED';

  async execute<T>(operation: () => Promise<T>): Promise<T> {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime > 60000) {
        this.state = 'HALF_OPEN';
      } else {
        throw new Error('Circuit breaker is OPEN');
      }
    }

    try {
      const result = await operation();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  private onSuccess() {
    this.failures = 0;
    this.state = 'CLOSED';
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
    if (this.failures >= 5) {
      this.state = 'OPEN';
    }
  }
}
```

## Testing Strategies

### 1. Saga Testing

```typescript
// courier-saga.test.ts
describe('CourierSaga', () => {
  let courierSaga: CourierSaga;
  let mockAPI: jest.Mocked<CourierAPI>;
  let mockEventBus: jest.Mocked<EventBus>;

  beforeEach(() => {
    mockAPI = createMockCourierAPI();
    mockEventBus = createMockEventBus();
    courierSaga = new CourierSaga(mockAPI, mockEventBus);
  });

  it('should complete delivery saga successfully', async () => {
    // Arrange
    const deliveryId = 'DEL-001';
    mockAPI.completeDelivery.mockResolvedValue({ success: true });
    mockAPI.calculateEarnings.mockResolvedValue({ total: 5000 });

    // Act
    const result = await courierSaga.handleDeliveryCompletion(deliveryId);

    // Assert
    expect(result.success).toBe(true);
    expect(mockAPI.completeDelivery).toHaveBeenCalledWith(deliveryId);
    expect(mockEventBus.publish).toHaveBeenCalledWith('DeliveryCompleted', expect.any(Object));
  });

  it('should handle delivery completion failure', async () => {
    // Arrange
    const deliveryId = 'DEL-001';
    mockAPI.completeDelivery.mockRejectedValue(new Error('API Error'));

    // Act & Assert
    await expect(courierSaga.handleDeliveryCompletion(deliveryId))
      .rejects.toThrow('API Error');
    expect(mockAPI.rollbackDelivery).toHaveBeenCalledWith(deliveryId);
  });
});
```

### 2. Integration Testing

```typescript
// integration.test.ts
describe('Courier Integration Tests', () => {
  let testServer: TestServer;
  let courierAPI: CourierAPI;

  beforeAll(async () => {
    testServer = await createTestServer();
    courierAPI = new CourierAPI(testServer.url);
  });

  it('should complete full delivery flow', async () => {
    // 1. Accept delivery
    const acceptance = await courierAPI.acceptDelivery('DEL-001');
    expect(acceptance.success).toBe(true);

    // 2. Complete delivery
    const completion = await courierAPI.completeDelivery('DEL-001');
    expect(completion.success).toBe(true);

    // 3. Check earnings update
    const earnings = await courierAPI.getTodayEarnings();
    expect(earnings.data.total).toBeGreaterThan(0);
  });
});
```

## Performance Optimization

### 1. Caching Strategy

```typescript
class CourierDataCache {
  private cache = new Map<string, { data: any; expiry: number }>();

  async get<T>(key: string, fetcher: () => Promise<T>, ttl: number = 300000): Promise<T> {
    const cached = this.cache.get(key);
    
    if (cached && cached.expiry > Date.now()) {
      return cached.data;
    }

    const data = await fetcher();
    this.cache.set(key, {
      data,
      expiry: Date.now() + ttl
    });

    return data;
  }
}
```

### 2. Batch Operations

```typescript
class BatchProcessor {
  private queue: Array<() => Promise<any>> = [];
  private processing = false;

  async add<T>(operation: () => Promise<T>): Promise<T> {
    return new Promise((resolve, reject) => {
      this.queue.push(async () => {
        try {
          const result = await operation();
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });

      this.processBatch();
    });
  }

  private async processBatch() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;
    const batch = this.queue.splice(0, 10); // Process 10 at a time

    await Promise.allSettled(batch.map(op => op()));
    
    this.processing = false;
    
    if (this.queue.length > 0) {
      setTimeout(() => this.processBatch(), 100);
    }
  }
}
```

## Monitoring & Metrics

### 1. Saga Metrics Collection

```typescript
class SagaMetrics {
  private metrics = {
    sagaExecutions: 0,
    sagaFailures: 0,
    averageExecutionTime: 0,
    compensationActions: 0
  };

  recordSagaExecution(sagaName: string, duration: number, success: boolean) {
    this.metrics.sagaExecutions++;
    
    if (!success) {
      this.metrics.sagaFailures++;
    }

    // Update average execution time
    this.metrics.averageExecutionTime = 
      (this.metrics.averageExecutionTime + duration) / 2;
  }

  recordCompensation(sagaName: string) {
    this.metrics.compensationActions++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      successRate: (this.metrics.sagaExecutions - this.metrics.sagaFailures) / this.metrics.sagaExecutions * 100
    };
  }
}
```

### 2. Health Checks

```typescript
class CourierSagaHealthCheck {
  async checkHealth(): Promise<HealthStatus> {
    const checks = await Promise.allSettled([
      this.checkAPIConnectivity(),
      this.checkEventBusHealth(),
      this.checkDatabaseHealth(),
      this.checkCacheHealth()
    ]);

    const failures = checks.filter(check => check.status === 'rejected');
    
    return {
      status: failures.length === 0 ? 'healthy' : 'unhealthy',
      checks: checks.map((check, index) => ({
        name: ['API', 'EventBus', 'Database', 'Cache'][index],
        status: check.status,
        error: check.status === 'rejected' ? check.reason : null
      }))
    };
  }
}
```

## Deployment Considerations

### 1. Environment Configuration

```typescript
// config/courier-saga.config.ts
export const courierSagaConfig = {
  api: {
    baseURL: process.env.COURIER_API_URL || 'http://localhost:3015',
    timeout: parseInt(process.env.API_TIMEOUT || '5000'),
    retries: parseInt(process.env.API_RETRIES || '3')
  },
  eventBus: {
    brokers: process.env.KAFKA_BROKERS?.split(',') || ['localhost:9092'],
    groupId: process.env.CONSUMER_GROUP_ID || 'courier-saga-group'
  },
  saga: {
    compensationTimeout: parseInt(process.env.COMPENSATION_TIMEOUT || '30000'),
    maxRetries: parseInt(process.env.SAGA_MAX_RETRIES || '3')
  }
};
```

### 2. Docker Configuration

```dockerfile
# Dockerfile.courier-saga
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 3016

CMD ["npm", "start"]
```

### 3. Kubernetes Deployment

```yaml
# k8s/courier-saga-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: courier-saga
spec:
  replicas: 3
  selector:
    matchLabels:
      app: courier-saga
  template:
    metadata:
      labels:
        app: courier-saga
    spec:
      containers:
      - name: courier-saga
        image: maysar/courier-saga:latest
        ports:
        - containerPort: 3016
        env:
        - name: COURIER_API_URL
          value: "http://courier-api:3015"
        - name: KAFKA_BROKERS
          value: "kafka:9092"
        resources:
          requests:
            memory: "256Mi"
            cpu: "250m"
          limits:
            memory: "512Mi"
            cpu: "500m"
```

---

**This implementation guide provides practical examples for building and deploying the courier saga system using the established API structure.**