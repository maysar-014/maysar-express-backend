const containerMock = {
  getCreateDeliveryUseCase: jest.fn(() => 'createDeliveryUseCase'),
  getDeliverySaga: jest.fn(() => 'deliverySaga'),
  getSagaRegistry: jest.fn(() => 'sagaRegistry'),
  getLogisticsEngine: jest.fn(() => 'logisticsEngine'),
  getCourierAssignmentPolicy: jest.fn(() => 'courierAssignmentPolicy'),
  getDistanceAlgorithm: jest.fn(() => 'distanceAlgorithm'),
  getCourierRepository: jest.fn(() => 'courierRepository'),
  getWeatherProvider: jest.fn(() => 'weatherProvider'),
  getTrafficProvider: jest.fn(() => 'trafficProvider'),
  getRouteOptimizationProvider: jest.fn(() => 'routeOptimizationProvider'),
  getTrackingProvider: jest.fn(() => 'trackingProvider'),
  getEventPublisher: jest.fn(() => 'eventPublisher'),
  healthCheck: jest.fn().mockResolvedValue({ ok: true })
};

jest.mock('./infrastructure/container', () => ({
  container: containerMock
}));

jest.mock('./api/controllers/delivery.controller', () => ({
  DeliveryController: jest.fn().mockImplementation(() => ({ id: 'delivery-controller' }))
}));

import { CompositionRoot, compositionRoot } from './bootstrap';

describe('CompositionRoot', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates delivery controller and exposes application/domain/infrastructure services', () => {
    expect(CompositionRoot.createDeliveryController()).toEqual({ id: 'delivery-controller' });
    expect(CompositionRoot.getApplicationServices()).toEqual({
      createDeliveryUseCase: 'createDeliveryUseCase',
      deliverySaga: 'deliverySaga',
      sagaRegistry: 'sagaRegistry'
    });
    expect(CompositionRoot.getDomainServices()).toEqual({
      logisticsEngine: 'logisticsEngine',
      courierAssignmentPolicy: 'courierAssignmentPolicy',
      distanceAlgorithm: 'distanceAlgorithm'
    });
    expect(CompositionRoot.getInfrastructureServices()).toEqual({
      courierRepository: 'courierRepository',
      weatherProvider: 'weatherProvider',
      trafficProvider: 'trafficProvider',
      routeOptimizationProvider: 'routeOptimizationProvider',
      trackingProvider: 'trackingProvider',
      eventPublisher: 'eventPublisher'
    });
  });

  it('delegates health check and initializes with log message', async () => {
    const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);

    await expect(CompositionRoot.healthCheck()).resolves.toEqual({ ok: true });
    await CompositionRoot.initialize();

    expect(containerMock.healthCheck).toHaveBeenCalledTimes(1);
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('Composition Root initialized'));
    expect(compositionRoot).toBe(CompositionRoot);
  });
});
