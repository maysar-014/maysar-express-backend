import type {
  CourierLocationUpdateDto,
  CourierPerformanceResponseDto,
  DeliveryAcceptanceDto,
  DeliveryRejectionDto,
  DeliveryResponseDto,
  EarningsFilterDto,
  EarningsResponseDto,
  LocationHistoryDto,
  PayoutRequestDto,
  PerformanceFilterDto,
  RouteOptimizationDto
} from './courier.dto';

describe('courier DTO contracts', () => {
  it('supports courier command/request payloads', () => {
    const location: CourierLocationUpdateDto = {
      latitude: -6.7924,
      longitude: 39.2083,
      accuracy: 8,
      speed: 22
    };
    const acceptance: DeliveryAcceptanceDto = {
      deliveryId: 'del-1',
      estimatedArrival: new Date('2026-03-10T10:00:00.000Z')
    };
    const rejection: DeliveryRejectionDto = {
      deliveryId: 'del-1',
      reason: 'Vehicle breakdown'
    };
    const payout: PayoutRequestDto = {
      amount: 120000,
      paymentMethod: 'mobile_money',
      accountDetails: { phoneNumber: '+255712345678' }
    };
    const routeOptimization: RouteOptimizationDto = {
      deliveryIds: ['del-1', 'del-2'],
      startLocation: { latitude: -6.79, longitude: 39.2 },
      preferences: {
        avoidTolls: true,
        avoidHighways: false,
        prioritizeUrgent: true
      }
    };
    const performanceFilter: PerformanceFilterDto = { period: 'week' };
    const locationHistory: LocationHistoryDto = { limit: 100, includeAccuracy: true };
    const earningsFilter: EarningsFilterDto = { includeBreakdown: true };

    expect(location.accuracy).toBe(8);
    expect(acceptance.deliveryId).toBe('del-1');
    expect(rejection.reason).toContain('breakdown');
    expect(payout.paymentMethod).toBe('mobile_money');
    expect(routeOptimization.deliveryIds).toHaveLength(2);
    expect(performanceFilter.period).toBe('week');
    expect(locationHistory.includeAccuracy).toBe(true);
    expect(earningsFilter.includeBreakdown).toBe(true);
  });

  it('supports courier response payloads', () => {
    const performance: CourierPerformanceResponseDto = {
      onTimeDeliveryRate: 0.94,
      customerRating: 4.8,
      completedDeliveries: 320,
      totalEarnings: 2400000,
      averageDeliveryTime: 34,
      efficiency: 91,
      ranking: 3
    };
    const earnings: EarningsResponseDto = {
      totalAmount: 180000,
      breakdown: {
        baseEarnings: 150000,
        bonuses: 25000,
        penalties: 0,
        tips: 5000
      },
      period: 'weekly',
      currency: 'TZS'
    };
    const delivery: DeliveryResponseDto = {
      id: 'del-1',
      orderId: 'ord-1',
      status: 'IN_TRANSIT',
      pickupAddress: 'Dar es Salaam CBD',
      deliveryAddress: 'Mikocheni',
      estimatedDeliveryTime: new Date('2026-03-10T12:00:00.000Z'),
      packageDetails: {
        weight: 2.1,
        value: 90000,
        fragile: false
      },
      customerInfo: {
        name: 'Amina',
        phone: '+255712345678'
      }
    };

    expect(performance.ranking).toBe(3);
    expect(earnings.breakdown.bonuses).toBe(25000);
    expect(delivery.status).toBe('IN_TRANSIT');
  });
});
