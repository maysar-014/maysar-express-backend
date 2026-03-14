const flush = () => new Promise<void>(resolve => setImmediate(resolve));

describe('test-logistics-direct script', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('runs logistics engine and logs successful result output', async () => {
    const processLogisticsRequest = jest.fn().mockResolvedValue({
      deliveryId: 'd1',
      shippingCost: 15000,
      courierAssignment: {
        courierName: 'Courier A',
        vehicleType: 'BIKE',
        courierPhone: '+255700000000',
        rating: 4.8
      },
      trackingInfo: {
        trackingNumber: 'TRK-1',
        status: 'ASSIGNED'
      },
      route: {
        distance: 12,
        estimatedDuration: 45,
        trafficCondition: 'MODERATE'
      },
      estimatedDeliveryTime: new Date('2026-03-10T10:00:00.000Z'),
      confidence: 92,
      processingTime: 120,
      warnings: [],
      recommendations: []
    });
    const LogisticsEngine = jest.fn(() => ({ processLogisticsRequest }));
    jest.doMock('./engines/logistics.engine', () => ({ LogisticsEngine }), { virtual: true });
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    require('./test-logistics-direct');
    await flush();

    expect(LogisticsEngine).toHaveBeenCalledTimes(1);
    expect(processLogisticsRequest).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: 'test_order_001',
        serviceType: 'standard',
        priority: 'normal'
      })
    );
    expect(logSpy.mock.calls.flat().join(' ')).toContain('Logistics Engine is working perfectly');
  });

  it('logs failure when logistics engine throws', async () => {
    const processLogisticsRequest = jest.fn().mockRejectedValue(new Error('engine-failed'));
    const LogisticsEngine = jest.fn(() => ({ processLogisticsRequest }));
    jest.doMock('./engines/logistics.engine', () => ({ LogisticsEngine }), { virtual: true });
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

    require('./test-logistics-direct');
    await flush();

    expect(errorSpy).toHaveBeenCalledWith('âŒ Logistics Engine Test Failed:', 'engine-failed');
  });
});

export {};
