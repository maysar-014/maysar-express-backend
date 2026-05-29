import { describe, test, expect, beforeAll, beforeEach } from '@jest/globals';

type ApiClientResponse = { data?: unknown };

interface ApiClient {
  get(path: string, payload?: unknown): Promise<ApiClientResponse>;
  post(path: string, payload?: unknown): Promise<ApiClientResponse>;
  put(path: string, payload?: unknown): Promise<ApiClientResponse>;
  delete(path: string, payload?: unknown): Promise<ApiClientResponse>;
}

interface LegacyWorkflowResult {
  approved?: boolean;
  fraudScore?: number;
  riskLevel?: string;
  checks?: {
    velocityCheck?: boolean;
    deviceFingerprint?: boolean;
    behaviorAnalysis?: boolean;
    blacklistCheck?: boolean;
  };
  status?: string;
  netAmount?: number;
  transactionId?: string;
  courierId?: string;
  courierName?: string;
  courierPhone?: string;
  vehicleType?: string;
  estimatedPickupTime?: string;
  nextState?: string;
  actions?: string[];
  timeline?: { estimatedCompletion?: Date };
  paymentId?: string;
  transactionRef?: string;
  modules?: string[];
  score?: number;
  passed?: boolean;
  completedAt?: Date;
  averageScore?: number;
  overallScore?: number;
  assessmentId?: string;
  certificationLevel?: string;
  certificateId?: string;
  issuedDate?: Date;
  validUntil?: Date;
  courierStatus?: string;
  deliveryZones?: string[];
  weakAreas?: string[];
  improvement?: number;
  focusModules?: string[];
  recovered?: boolean;
  resumed?: boolean;
  processed?: boolean;
  walletUpdated?: boolean;
  sellerEarnings?: number;
  platformFee?: number;
  balanceAfter?: number;
  courierEarnings?: number;
  deliveryFee?: number;
  bonusEarnings?: number;
  sent?: boolean;
  channels: {
    sms?: boolean;
    email?: boolean;
    push?: boolean;
  };
  deliveryIds?: string[];
  deliveryId?: string;
  tracked?: boolean;
  eventId?: string;
  insights?: Record<string, number>;
  recommendations?: Array<{
    productVariantId?: string;
    confidence?: number;
    reason?: string;
    available?: boolean;
  }>;
  optimizedRoute: {
    distance?: number;
    duration?: number;
    waypoints?: string[];
    algorithm?: string;
    trafficAdjusted?: boolean;
  };
  efficiency?: number;
  settlementId?: string;
}

type WorkflowRequest = {
  processId: string;
  currentState: string;
  event: string;
  context: Record<string, unknown>;
};

type NotificationRequest = {
  recipientId: string;
  channel: string;
  template: string;
  data: Record<string, unknown>;
  language?: string;
};

type AnalyticsRequest = {
  eventType: string;
  data: Record<string, unknown>;
  timestamp: Date;
  context: Record<string, unknown>;
};

type RouteOptimizationRequest = {
  origin: { lat: number; lng: number };
  destination: { lat: number; lng: number };
  waypoints: string[];
  algorithm: string;
  constraints: Record<string, unknown>;
};

type SettlementRequest = Record<string, unknown>;

const mockApiClient = {
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn()
};

const createLegacyResult = (overrides: Partial<LegacyWorkflowResult> = {}): LegacyWorkflowResult => ({
  nextState: '',
  channels: { sms: false, email: false, push: false },
  optimizedRoute: {
    distance: 0,
    duration: 0,
    waypoints: [],
    algorithm: 'unknown',
    trafficAdjusted: false
  },
  ...overrides
});

const unwrapResponse = <T extends LegacyWorkflowResult>(response: ApiClientResponse | undefined, fallback: T): T => {
  const data = response?.data;
  return {
    ...fallback,
    ...(data && typeof data === 'object' ? data as Partial<T> : {})
  } as T;
};

class WorkflowEngine {
  constructor(private readonly apiClient: ApiClient) {}

  async processEvent(request: WorkflowRequest): Promise<LegacyWorkflowResult> {
    const response = await this.apiClient.post('/workflow/events', request);
    return unwrapResponse(response, createLegacyResult({ nextState: request.currentState }));
  }
}

class AnalyticsEngine {
  constructor(private readonly apiClient: ApiClient) {}

  async trackEvent(request: AnalyticsRequest): Promise<LegacyWorkflowResult> {
    const response = await this.apiClient.post('/analytics/events', request);
    return unwrapResponse(response, createLegacyResult({ tracked: true }));
  }
}

class LogisticsEngine {
  constructor(private readonly apiClient: ApiClient) {
    void this.apiClient;
  }
}

class RouteOptimizationEngine {
  constructor(private readonly apiClient: ApiClient) {}

  async optimizeRoute(request: RouteOptimizationRequest): Promise<LegacyWorkflowResult> {
    const response = await this.apiClient.post('/routes/optimize', request);
    return unwrapResponse(response, createLegacyResult({
      optimizedRoute: {
        distance: 0,
        duration: 0,
        waypoints: [],
        algorithm: request.algorithm,
        trafficAdjusted: false
      },
      efficiency: 0
    }));
  }
}

class NotificationEngine {
  constructor(private readonly apiClient: ApiClient) {}

  async sendNotification(request: NotificationRequest): Promise<LegacyWorkflowResult> {
    const response = await this.apiClient.post('/notifications/send', request);
    return unwrapResponse(response, createLegacyResult({
      sent: true,
      channels: { sms: request.channel === 'sms' }
    }));
  }
}

class SettlementService {
  constructor(private readonly apiClient: ApiClient) {}

  async processSettlement(request: SettlementRequest): Promise<LegacyWorkflowResult> {
    const response = await this.apiClient.post('/settlements/process', request);
    return unwrapResponse(response, createLegacyResult({ settlementId: `SETTLEMENT_${Date.now()}` }));
  }
}

describe('Saga Integration Tests - Payment, Delivery & Training', () => {
  let logisticsEngine: LogisticsEngine;
  let routeOptimizationEngine: RouteOptimizationEngine;
  let settlementService: SettlementService;
  let workflowEngine: WorkflowEngine;
  let notificationEngine: NotificationEngine;
  let analyticsEngine: AnalyticsEngine;
  const runLiveProbe = process.env.RUN_LIVE_ORDER_SMOKE === 'true';
  const describeIfLive = runLiveProbe ? describe : describe.skip;

  beforeAll(async () => {
    const apiClient = mockApiClient as ApiClient;
    logisticsEngine = new LogisticsEngine(apiClient);
    routeOptimizationEngine = new RouteOptimizationEngine(apiClient);
    settlementService = new SettlementService(apiClient);
    workflowEngine = new WorkflowEngine(apiClient);
    notificationEngine = new NotificationEngine(apiClient);
    analyticsEngine = new AnalyticsEngine(apiClient);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describeIfLive('Live platform smoke probe', () => {
    test('reaches the running readiness endpoint', async () => {
      const response = await fetch('http://127.0.0.1:3000/ready');

      expect(response.ok).toBe(true);
    });
  });

  describe('Payment Saga with Fraud Detection', () => {
    test('Complete Payment Flow: Validation → Processing → Settlement', async () => {
      const paymentData = {
        orderId: 'ORDER_TZ_001',
        customerId: 'CUST_TZ_001',
        amount: 125000, // TZS
        paymentMethod: 'MOBILE_MONEY',
        phoneNumber: '+255700123456',
        provider: 'MPESA'
      };

      // Step 1: Fraud Detection
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          fraudScore: 0.05, // Low risk
          riskLevel: 'LOW',
          checks: {
            velocityCheck: true,
            deviceFingerprint: true,
            behaviorAnalysis: true,
            blacklistCheck: true
          },
          approved: true
        }
      });

      const fraudResult = await workflowEngine.processEvent({
        processId: paymentData.orderId,
        currentState: 'PAYMENT_INITIATED',
        event: 'FRAUD_CHECK',
        context: paymentData
      });

      expect(fraudResult.approved).toBe(true);
      expect(fraudResult.fraudScore).toBeLessThan(0.1); // <10% fraud risk

      // Step 2: Payment Processing
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          transactionId: 'TXN_MPESA_001',
          status: 'COMPLETED',
          providerResponse: 'SUCCESS',
          fees: 2500, // TZS
          netAmount: 122500
        }
      });

      const paymentResult = await workflowEngine.processEvent({
        processId: paymentData.orderId,
        currentState: 'FRAUD_APPROVED',
        event: 'PROCESS_PAYMENT',
        context: { ...paymentData, fraudApproved: true }
      });

      expect(paymentResult.status).toBe('COMPLETED');
      expect(paymentResult.netAmount).toBe(122500);

      // Step 3: Wallet Operations
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          walletUpdated: true,
          sellerEarnings: 110000,
          platformFee: 12500,
          balanceAfter: 245000
        }
      });

      const walletResult = await settlementService.processSettlement({
        orderId: paymentData.orderId,
        sellerId: 'SELLER_001',
        amount: paymentResult.netAmount,
        transactionId: paymentResult.transactionId
      });

      expect(walletResult.walletUpdated).toBe(true);
      expect(walletResult.sellerEarnings).toBe(110000);
    });

    test('Payment Failure → Retry → Alternative Method', async () => {
      const failedPayment = {
        orderId: 'ORDER_TZ_002',
        customerId: 'CUST_TZ_002',
        amount: 85000,
        paymentMethod: 'MOBILE_MONEY',
        provider: 'TIGO_PESA'
      };

      // Primary payment fails
      mockApiClient.post
        .mockRejectedValueOnce(new Error('INSUFFICIENT_BALANCE'))
        .mockResolvedValueOnce({ data: { nextState: 'PAYMENT_FAILED' } })
        .mockResolvedValueOnce({ data: { sent: true } }) // Notification
        .mockResolvedValueOnce({ // Alternative payment
          data: {
            transactionId: 'TXN_AIRTEL_001',
            status: 'COMPLETED',
            provider: 'AIRTEL_MONEY'
          }
        });

      try {
        await workflowEngine.processEvent({
          processId: failedPayment.orderId,
          currentState: 'PAYMENT_PROCESSING',
          event: 'PROCESS_PAYMENT',
          context: failedPayment
        });
      } catch (error) {
        // Handle payment failure
        const failureResult = await workflowEngine.processEvent({
          processId: failedPayment.orderId,
          currentState: 'PAYMENT_PROCESSING',
          event: 'PAYMENT_FAILED',
          context: { error: error.message }
        });

        // Notify customer of failure and alternatives
        await notificationEngine.sendNotification({
          recipientId: failedPayment.customerId,
          channel: 'sms',
          template: 'PAYMENT_FAILED_TZ',
          data: {
            orderId: failedPayment.orderId,
            reason: 'Insufficient balance',
            alternatives: ['AIRTEL_MONEY', 'BANK_TRANSFER']
          }
        });

        // Process alternative payment
        const alternativeResult = await workflowEngine.processEvent({
          processId: failedPayment.orderId,
          currentState: 'PAYMENT_FAILED',
          event: 'RETRY_PAYMENT',
          context: { ...failedPayment, provider: 'AIRTEL_MONEY' }
        });

        expect(failureResult.nextState).toBe('PAYMENT_FAILED');
        expect(alternativeResult.status).toBe('COMPLETED');
      }
    });
  });

  describe('Delivery Saga - Complete Workflow', () => {
    test('End-to-End Delivery: Assignment → Route → Tracking → Completion', async () => {
      const deliveryOrder = {
        orderId: 'ORDER_TZ_003',
        customerId: 'CUST_TZ_003',
        pickupAddress: {
          street: 'Warehouse District',
          city: 'Dar es Salaam',
          coordinates: { lat: -6.7924, lng: 39.2083 }
        },
        deliveryAddress: {
          street: 'Mikocheni B, Plot 123',
          city: 'Dar es Salaam',
          coordinates: { lat: -6.7735, lng: 39.2395 }
        },
        packageDetails: {
          weight: 3.2,
          dimensions: { length: 35, width: 25, height: 20 },
          value: 150000,
          fragile: false
        }
      };

      // Step 1: Courier Assignment
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          courierId: 'COURIER_TZ_001',
          courierName: 'John Mwalimu',
          courierPhone: '+255700987654',
          vehicleType: 'MOTORCYCLE',
          estimatedPickupTime: '2024-01-15T10:30:00Z'
        }
      });

      const assignmentResult = await workflowEngine.processEvent({
        processId: deliveryOrder.orderId,
        currentState: 'READY_FOR_PICKUP',
        event: 'ASSIGN_COURIER',
        context: deliveryOrder
      });

      expect(assignmentResult.courierId).toBe('COURIER_TZ_001');

      // Step 2: Route Optimization
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          optimizedRoute: {
            distance: 12.8,
            duration: 35,
            waypoints: ['WAREHOUSE', 'MIKOCHENI_B'],
            algorithm: 'DIJKSTRA',
            trafficAdjusted: true
          },
          efficiency: 0.9577
        }
      });

      const routeResult = await routeOptimizationEngine.optimizeRoute({
        origin: deliveryOrder.pickupAddress.coordinates,
        destination: deliveryOrder.deliveryAddress.coordinates,
        waypoints: [],
        algorithm: 'DIJKSTRA',
        constraints: { maxDuration: 60, trafficAware: true }
      });

      expect(routeResult.efficiency).toBeGreaterThan(0.95);
      expect(routeResult.optimizedRoute.duration).toBeLessThan(40);

      // Step 3: Real-time Tracking
      mockApiClient.post
        .mockResolvedValueOnce({ data: { status: 'PICKED_UP', timestamp: new Date() } })
        .mockResolvedValueOnce({ data: { status: 'IN_TRANSIT', location: { lat: -6.7850, lng: 39.2200 } } })
        .mockResolvedValueOnce({ data: { status: 'DELIVERED', timestamp: new Date() } });

      const trackingUpdates = await Promise.all([
        workflowEngine.processEvent({
          processId: deliveryOrder.orderId,
          currentState: 'ASSIGNED',
          event: 'PACKAGE_PICKED_UP',
          context: { courierId: assignmentResult.courierId }
        }),
        workflowEngine.processEvent({
          processId: deliveryOrder.orderId,
          currentState: 'PICKED_UP',
          event: 'IN_TRANSIT',
          context: { location: { lat: -6.7850, lng: 39.2200 } }
        }),
        workflowEngine.processEvent({
          processId: deliveryOrder.orderId,
          currentState: 'IN_TRANSIT',
          event: 'DELIVERED',
          context: { deliveredAt: new Date(), signature: 'CUSTOMER_SIGNATURE' }
        })
      ]);

      expect(trackingUpdates[0].status).toBe('PICKED_UP');
      expect(trackingUpdates[1].status).toBe('IN_TRANSIT');
      expect(trackingUpdates[2].status).toBe('DELIVERED');

      // Step 4: Delivery Completion & Settlement
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          settlementId: 'SETTLE_DEL_001',
          courierEarnings: 8500,
          deliveryFee: 12000,
          bonusEarnings: 1500, // On-time delivery bonus
          processed: true
        }
      });

      const deliverySettlement = await settlementService.processSettlement({
        orderId: deliveryOrder.orderId,
        courierId: assignmentResult.courierId,
        deliveryAmount: 12000,
        distance: routeResult.optimizedRoute.distance,
        onTimeDelivery: true
      });

      expect(deliverySettlement.processed).toBe(true);
      expect(deliverySettlement.bonusEarnings).toBe(1500);
    });

    test('Delivery Exception Handling: Failed Delivery → Retry → Customer Pickup', async () => {
      const problematicDelivery = {
        orderId: 'ORDER_TZ_004',
        courierId: 'COURIER_TZ_002',
        attempts: 0,
        maxAttempts: 3
      };

      // First delivery attempt fails
      mockApiClient.post
        .mockResolvedValueOnce({ data: { nextState: 'DELIVERY_FAILED', reason: 'CUSTOMER_UNAVAILABLE' } })
        .mockResolvedValueOnce({ data: { sent: true } }) // Customer notification
        .mockResolvedValueOnce({ data: { nextState: 'DELIVERY_FAILED', reason: 'WRONG_ADDRESS' } })
        .mockResolvedValueOnce({ data: { nextState: 'CUSTOMER_PICKUP_ARRANGED' } });

      // First attempt
      const firstAttempt = await workflowEngine.processEvent({
        processId: problematicDelivery.orderId,
        currentState: 'OUT_FOR_DELIVERY',
        event: 'DELIVERY_ATTEMPT',
        context: { ...problematicDelivery, attempts: 1 }
      });

      expect(firstAttempt.nextState).toBe('DELIVERY_FAILED');

      // Notify customer
      await notificationEngine.sendNotification({
        recipientId: 'CUST_TZ_004',
        channel: 'sms',
        template: 'DELIVERY_FAILED_TZ',
        data: {
          orderId: problematicDelivery.orderId,
          reason: 'Customer unavailable',
          nextAttempt: 'Tomorrow 2-4 PM'
        }
      });

      // Second attempt
      const secondAttempt = await workflowEngine.processEvent({
        processId: problematicDelivery.orderId,
        currentState: 'DELIVERY_FAILED',
        event: 'RETRY_DELIVERY',
        context: { ...problematicDelivery, attempts: 2 }
      });

      expect(secondAttempt.nextState).toBe('DELIVERY_FAILED');

      // Arrange customer pickup
      const pickupArrangement = await workflowEngine.processEvent({
        processId: problematicDelivery.orderId,
        currentState: 'DELIVERY_FAILED',
        event: 'ARRANGE_CUSTOMER_PICKUP',
        context: { pickupLocation: 'Maysar Hub - Mikocheni' }
      });

      expect(pickupArrangement.nextState).toBe('CUSTOMER_PICKUP_ARRANGED');
    });
  });

  describe('Training Saga - Courier Certification', () => {
    test('Complete Training Program: Registration → Modules → Assessment → Certification', async () => {
      const traineeData = {
        courierId: 'TRAINEE_001',
        courierName: 'Mary Josephine',
        phoneNumber: '+255700555444',
        vehicleType: 'MOTORCYCLE',
        experience: 'BEGINNER'
      };

      // Step 1: Training Registration
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          trainingId: 'TRAIN_001',
          modules: [
            'SAFETY_PROTOCOLS',
            'CUSTOMER_SERVICE',
            'ROUTE_NAVIGATION',
            'PACKAGE_HANDLING',
            'MOBILE_APP_USAGE'
          ],
          estimatedDuration: '3 days',
          startDate: '2024-01-20'
        }
      });

      const registrationResult = await workflowEngine.processEvent({
        processId: `TRAINING_${traineeData.courierId}`,
        currentState: 'REGISTRATION_PENDING',
        event: 'REGISTER_FOR_TRAINING',
        context: traineeData
      });

      expect(registrationResult.modules).toHaveLength(5);

      // Step 2: Module Completion Tracking
      const moduleResults: Array<LegacyWorkflowResult & { score: number; passed: boolean }> = [];
      const modules = ['SAFETY_PROTOCOLS', 'CUSTOMER_SERVICE', 'ROUTE_NAVIGATION', 'PACKAGE_HANDLING', 'MOBILE_APP_USAGE'];

      for (let i = 0; i < modules.length; i++) {
        mockApiClient.post.mockResolvedValueOnce({
          data: {
            moduleId: modules[i],
            score: 85 + Math.random() * 10, // 85-95% scores
            passed: true,
            completedAt: new Date()
          }
        });

        const moduleResult = await workflowEngine.processEvent({
          processId: `TRAINING_${traineeData.courierId}`,
          currentState: i === 0 ? 'TRAINING_IN_PROGRESS' : 'MODULE_COMPLETED',
          event: 'COMPLETE_MODULE',
          context: { moduleId: modules[i], traineeId: traineeData.courierId }
        }) as LegacyWorkflowResult & { score: number; passed: boolean };

        moduleResults.push(moduleResult);
      }

      const averageScore = moduleResults.reduce((sum, result: { score: number }) => sum + result.score, 0) / moduleResults.length;
      expect(averageScore).toBeGreaterThan(85);
      expect(moduleResults.every(result => result.passed)).toBe(true);

      // Step 3: Final Assessment
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          assessmentId: 'ASSESS_001',
          practicalScore: 92,
          theoreticalScore: 88,
          overallScore: 90,
          passed: true,
          certificationLevel: 'CERTIFIED_COURIER'
        }
      });

      const assessmentResult = await workflowEngine.processEvent({
        processId: `TRAINING_${traineeData.courierId}`,
        currentState: 'ALL_MODULES_COMPLETED',
        event: 'FINAL_ASSESSMENT',
        context: { traineeId: traineeData.courierId, moduleScores: moduleResults }
      });

      expect(assessmentResult.passed).toBe(true);
      expect(assessmentResult.overallScore).toBeGreaterThan(85);

      // Step 4: Certification & Activation
      mockApiClient.post.mockResolvedValueOnce({
        data: {
          certificateId: 'CERT_TZ_001',
          issuedDate: new Date(),
          validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
          courierStatus: 'ACTIVE',
          deliveryZones: ['DAR_ES_SALAAM_CENTRAL', 'KINONDONI', 'TEMEKE']
        }
      });

      const certificationResult = await workflowEngine.processEvent({
        processId: `TRAINING_${traineeData.courierId}`,
        currentState: 'ASSESSMENT_PASSED',
        event: 'ISSUE_CERTIFICATE',
        context: {
          traineeId: traineeData.courierId,
          finalScore: assessmentResult.overallScore
        }
      });

      expect(certificationResult.courierStatus).toBe('ACTIVE');
      expect(certificationResult.deliveryZones).toContain('DAR_ES_SALAAM_CENTRAL');

      // Step 5: Welcome & Onboarding Notification
      mockApiClient.post.mockResolvedValueOnce({
        data: { sent: true, channels: { sms: true, email: true } }
      });

      await notificationEngine.sendNotification({
        recipientId: traineeData.courierId,
        channel: 'multi',
        template: 'COURIER_CERTIFIED_TZ',
        data: {
          courierName: traineeData.courierName,
          certificateId: certificationResult.certificateId,
          deliveryZones: certificationResult.deliveryZones,
          supportPhone: '+255-700-MAYSAR'
        }
      });

      // Step 6: Analytics Tracking
      mockApiClient.post.mockResolvedValueOnce({
        data: { tracked: true, eventId: 'EVT_CERTIFICATION_001' }
      });

      await analyticsEngine.trackEvent({
        eventType: 'COURIER_CERTIFIED',
        data: {
          courierId: traineeData.courierId,
          trainingDuration: 3,
          finalScore: assessmentResult.overallScore,
          certificationLevel: 'CERTIFIED_COURIER'
        },
        timestamp: new Date(),
        context: { region: 'Dar es Salaam', vehicleType: 'MOTORCYCLE' }
      });

      expect(mockApiClient.post).toHaveBeenCalledTimes(10); // 5 modules + assessment + certification + notification + analytics + registration
    });

    test('Training Failure → Remedial Training → Re-certification', async () => {
      const strugglingTrainee = {
        courierId: 'TRAINEE_002',
        courierName: 'Peter Mwangi',
        failedModules: ['CUSTOMER_SERVICE', 'PACKAGE_HANDLING']
      };

      // Failed assessment
      mockApiClient.post
        .mockResolvedValueOnce({
          data: {
            assessmentId: 'ASSESS_002',
            overallScore: 65, // Below 70% threshold
            passed: false,
            weakAreas: ['CUSTOMER_SERVICE', 'PACKAGE_HANDLING']
          }
        })
        .mockResolvedValueOnce({ data: { nextState: 'REMEDIAL_TRAINING_REQUIRED' } })
        .mockResolvedValueOnce({ data: { sent: true } }) // Notification
        .mockResolvedValueOnce({ // Remedial training
          data: {
            remedialTrainingId: 'REMEDIAL_001',
            focusModules: ['CUSTOMER_SERVICE', 'PACKAGE_HANDLING'],
            duration: '2 days'
          }
        })
        .mockResolvedValueOnce({ // Re-assessment
          data: {
            assessmentId: 'REASSESS_001',
            overallScore: 88,
            passed: true,
            improvement: 23
          }
        });

      // Initial assessment failure
      const failedAssessment = await workflowEngine.processEvent({
        processId: `TRAINING_${strugglingTrainee.courierId}`,
        currentState: 'ALL_MODULES_COMPLETED',
        event: 'FINAL_ASSESSMENT',
        context: strugglingTrainee
      });

      expect(failedAssessment.passed).toBe(false);

      // Trigger remedial training
      const remedialResult = await workflowEngine.processEvent({
        processId: `TRAINING_${strugglingTrainee.courierId}`,
        currentState: 'ASSESSMENT_FAILED',
        event: 'START_REMEDIAL_TRAINING',
        context: { weakAreas: failedAssessment.weakAreas }
      });

      expect(remedialResult.nextState).toBe('REMEDIAL_TRAINING_REQUIRED');

      // Notify trainee
      await notificationEngine.sendNotification({
        recipientId: strugglingTrainee.courierId,
        channel: 'sms',
        template: 'REMEDIAL_TRAINING_TZ',
        data: {
          courierName: strugglingTrainee.courierName,
          focusAreas: remedialResult.focusModules,
          supportContact: '+255-700-TRAINING'
        }
      });

      // Complete remedial training
      const remedialTraining = await workflowEngine.processEvent({
        processId: `TRAINING_${strugglingTrainee.courierId}`,
        currentState: 'REMEDIAL_TRAINING_REQUIRED',
        event: 'COMPLETE_REMEDIAL_TRAINING',
        context: { focusModules: remedialResult.focusModules }
      });

      // Re-assessment
      const reAssessment = await workflowEngine.processEvent({
        processId: `TRAINING_${strugglingTrainee.courierId}`,
        currentState: 'REMEDIAL_TRAINING_COMPLETED',
        event: 'FINAL_ASSESSMENT',
        context: { attempt: 2 }
      });

      expect(reAssessment.passed).toBe(true);
      expect(reAssessment.overallScore).toBeGreaterThan(85);
    });
  });
});
