import type { Request, Response } from 'express';

const mockValidationResult = jest.fn();

const mockCreateDeliveryExecute = jest.fn();
const mockGetDeliveryExecute = jest.fn();
const mockGetDeliveriesExecute = jest.fn();
const mockUpdateDeliveryStatusExecute = jest.fn();

const mockDeliveryRepository = {
  save: jest.fn()
};

const mockRouteRepository = {
  save: jest.fn()
};

const mockCourierRepository = {
  findById: jest.fn()
};

const mockRouteCreationService = {
  createRouteForSingleDelivery: jest.fn()
};

const mockContainer = {
  getCreateDeliveryUseCase: jest.fn(() => ({ execute: mockCreateDeliveryExecute })),
  getDeliveryDomainService: jest.fn(() => ({})),
  getDeliveryRepository: jest.fn(() => mockDeliveryRepository),
  getRouteCreationService: jest.fn(() => mockRouteCreationService),
  getRouteRepository: jest.fn(() => mockRouteRepository),
  getCourierRepository: jest.fn(() => mockCourierRepository),
  getGetDeliveryUseCase: jest.fn(() => ({ execute: mockGetDeliveryExecute })),
  getGetDeliveriesUseCase: jest.fn(() => ({ execute: mockGetDeliveriesExecute })),
  getUpdateDeliveryStatusUseCase: jest.fn(() => ({ execute: mockUpdateDeliveryStatusExecute }))
};

const mockGeoPointCreate = jest.fn((lat: number, lng: number, address: string) => ({ lat, lng, address }));
const mockWeightFromKilograms = jest.fn((kg: number) => ({ kg }));
const mockCourierEntityCreate = jest.fn((payload: unknown) => payload);
const mockRouteCreate = jest.fn(() => ({ getId: () => 'route-1' }));
const mockRouteProgressCreate = jest.fn(() => ({ value: 'progress' }));

jest.mock(
  'express-validator',
  () => ({
    validationResult: (...args: unknown[]) => mockValidationResult(...args)
  }),
  { virtual: true }
);

jest.mock('../../infrastructure/container', () => ({
  DependencyContainer: {
    getInstance: jest.fn(() => mockContainer)
  }
}));

jest.mock('../../domain/value-objects/geopoint.value-object', () => ({
  GeoPoint: {
    create: (...args: unknown[]) => mockGeoPointCreate(...(args as [number, number, string]))
  }
}));

jest.mock('../../domain/value-objects/weight.value-object', () => ({
  Weight: {
    fromKilograms: (...args: unknown[]) => mockWeightFromKilograms(...(args as [number]))
  }
}));

jest.mock('../../domain/entities/courier.entity', () => ({
  CourierEntity: {
    create: (payload: unknown) => mockCourierEntityCreate(payload)
  }
}));

jest.mock('../../domain/entities/route.entity', () => ({
  Route: {
    create: () => mockRouteCreate()
  }
}));

jest.mock('../../domain/value-objects/route-progress.value-object', () => ({
  RouteProgress: {
    create: () => mockRouteProgressCreate()
  }
}));

import { DeliveryController } from './delivery.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

const validRequestBody = {
  orderId: 'order-1',
  pickupAddress: {
    street: 'Market St',
    city: 'Dar',
    postalCode: '11101',
    country: 'TZ',
    coordinates: { lat: -6.79, lng: 39.2 }
  },
  deliveryAddress: {
    street: 'Uhuru St',
    city: 'Dar',
    postalCode: '11102',
    country: 'TZ',
    coordinates: { lat: -6.8, lng: 39.22 }
  },
  packageDetails: { weight: 2 },
  priority: 'express'
};

describe('DeliveryController', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
  const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);

  afterAll(() => {
    logSpy.mockRestore();
    errorSpy.mockRestore();
    warnSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    mockValidationResult.mockReturnValue({
      isEmpty: () => true,
      array: () => []
    });
    mockContainer.getRouteCreationService.mockReturnValue(mockRouteCreationService);
  });

  it('creates a delivery and persists it', async () => {
    const controller = new DeliveryController();
    const req = { body: validRequestBody } as Request;
    const res = createResponse();

    mockCreateDeliveryExecute.mockResolvedValue({
      deliveryId: 'delivery-1',
      courierId: 'courier-1',
      estimatedPickupTime: new Date('2026-01-01T10:00:00.000Z'),
      estimatedDeliveryTime: new Date('2026-01-01T11:00:00.000Z'),
      route: { distance: 10, duration: 20 },
      totalCost: 5000
    });

    const routeSpy = jest.spyOn(controller as unknown as { createRouteForDelivery: () => Promise<void> }, 'createRouteForDelivery');
    routeSpy.mockResolvedValue(undefined);

    await controller.createDelivery(req, res);

    expect(mockCreateDeliveryExecute).toHaveBeenCalled();
    expect(mockDeliveryRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'delivery-1',
        courierId: 'courier-1',
        totalCost: 5000
      })
    );
    expect(routeSpy).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true
      })
    );
  });

  it('returns validation errors for invalid create delivery payload', async () => {
    const controller = new DeliveryController();
    const req = { body: {} } as Request;
    const res = createResponse();
    mockValidationResult.mockReturnValue({
      isEmpty: () => false,
      array: () => [{ msg: 'invalid' }]
    });

    await controller.createDelivery(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'VALIDATION_ERROR'
        })
      })
    );
  });

  it('keeps createDelivery successful when route creation fails', async () => {
    const controller = new DeliveryController();
    const req = { body: validRequestBody } as Request;
    const res = createResponse();

    mockCreateDeliveryExecute.mockResolvedValue({
      deliveryId: 'delivery-2',
      courierId: 'courier-2',
      estimatedPickupTime: new Date('2026-01-01T10:00:00.000Z'),
      estimatedDeliveryTime: new Date('2026-01-01T11:00:00.000Z'),
      route: { distance: 12, duration: 24 },
      totalCost: 7000
    });
    jest
      .spyOn(controller as unknown as { createRouteForDelivery: () => Promise<void> }, 'createRouteForDelivery')
      .mockRejectedValue(new Error('route failed'));

    await controller.createDelivery(req, res);

    expect(res.status).toHaveBeenCalledWith(201);
  });

  it('returns createDelivery failure response on use case errors', async () => {
    const controller = new DeliveryController();
    const req = { body: validRequestBody } as Request;
    const res = createResponse();
    mockCreateDeliveryExecute.mockRejectedValue(new Error('invalid delivery'));

    await controller.createDelivery(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({
          code: 'DELIVERY_CREATION_FAILED'
        })
      })
    );
  });

  it('creates optimized route for a delivery', async () => {
    const controller = new DeliveryController();
    mockCourierRepository.findById.mockResolvedValue({
      id: 'courier-1',
      name: 'Courier',
      phone: '255700000001',
      vehicle: 'bike',
      rating: 4.8,
      completionRate: 0.92,
      currentLocation: { lat: -6.79, lng: 39.21 },
      isAvailable: true,
      trafficExperience: 3
    });
    mockRouteCreationService.createRouteForSingleDelivery.mockResolvedValue({
      route: { getId: () => 'route-42' },
      optimizationScore: 91,
      estimatedSavings: { timeMinutes: 8, distanceKm: 2 }
    });

    await (controller as unknown as { createRouteForDelivery: (d: string, c: string, i: unknown) => Promise<void> })
      .createRouteForDelivery('delivery-1', 'courier-1', {
        pickupLocation: { lat: -6.79, lng: 39.21, address: 'Pickup' },
        deliveryLocation: { lat: -6.81, lng: 39.25, address: 'Dropoff' },
        weight: 2,
        priority: 'express'
      });

    expect(mockCourierEntityCreate).toHaveBeenCalled();
    expect(mockRouteCreationService.createRouteForSingleDelivery).toHaveBeenCalled();
    expect(mockRouteRepository.save).toHaveBeenCalledWith(expect.objectContaining({ getId: expect.any(Function) }));
  });

  it('falls back to basic route creation when route service is unavailable', async () => {
    const controller = new DeliveryController();
    mockContainer.getRouteCreationService.mockReturnValue(undefined as never);
    const basicRouteSpy = jest.spyOn(controller as unknown as { createBasicRoute: () => Promise<void> }, 'createBasicRoute');
    basicRouteSpy.mockResolvedValue(undefined);

    await (controller as unknown as { createRouteForDelivery: (d: string, c: string, i: unknown) => Promise<void> })
      .createRouteForDelivery('delivery-2', 'courier-2', {
        pickupLocation: { lat: -6.79, lng: 39.21, address: 'Pickup' },
        deliveryLocation: { lat: -6.81, lng: 39.25, address: 'Dropoff' },
        weight: 1
      });

    expect(basicRouteSpy).toHaveBeenCalled();
  });

  it('throws when creating route for unknown courier', async () => {
    const controller = new DeliveryController();
    mockCourierRepository.findById.mockResolvedValue(null);

    await expect(
      (controller as unknown as { createRouteForDelivery: (d: string, c: string, i: unknown) => Promise<void> })
        .createRouteForDelivery('delivery-3', 'courier-x', {
          pickupLocation: { lat: -6.79, lng: 39.21, address: 'Pickup' },
          deliveryLocation: { lat: -6.81, lng: 39.25, address: 'Dropoff' },
          weight: 1
        })
    ).rejects.toThrow('Courier courier-x not found');
  });

  it('creates a basic route when fallback path is used', async () => {
    const controller = new DeliveryController();
    mockCourierRepository.findById.mockResolvedValue({
      id: 'courier-3',
      name: 'Courier 3'
    });

    await (controller as unknown as { createBasicRoute: (d: string, c: string, i: unknown) => Promise<void> })
      .createBasicRoute('delivery-4', 'courier-3', {
        pickupLocation: { lat: -6.79, lng: 39.21, address: 'Pickup' },
        deliveryLocation: { lat: -6.81, lng: 39.25, address: 'Dropoff' }
      });

    expect(mockRouteProgressCreate).toHaveBeenCalled();
    expect(mockRouteCreate).toHaveBeenCalled();
    expect(mockRouteRepository.save).toHaveBeenCalled();
  });

  it('returns delivery by id', async () => {
    const controller = new DeliveryController();
    const req = { params: { deliveryId: 'delivery-8' } } as unknown as Request;
    const res = createResponse();
    mockGetDeliveryExecute.mockResolvedValue({ id: 'delivery-8' });

    await controller.getDelivery(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({ id: 'delivery-8' })
      })
    );
  });

  it('maps getDelivery not found and generic failures to correct status codes', async () => {
    const controller = new DeliveryController();
    const req = { params: { deliveryId: 'missing' } } as unknown as Request;
    const res = createResponse();

    mockGetDeliveryExecute.mockRejectedValueOnce(new Error('delivery not found'));
    await controller.getDelivery(req, res);
    expect(res.status).toHaveBeenCalledWith(404);

    mockGetDeliveryExecute.mockRejectedValueOnce(new Error('unexpected'));
    await controller.getDelivery(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('returns paginated deliveries and handles fetch errors', async () => {
    const controller = new DeliveryController();
    const req = {
      query: { page: '2', limit: '20', status: 'assigned', courierId: 'courier-1' }
    } as unknown as Request;
    const res = createResponse();

    mockGetDeliveriesExecute.mockResolvedValue({ items: [{ id: 'd1' }], total: 1 });
    await controller.getDeliveries(req, res);
    expect(mockGetDeliveriesExecute).toHaveBeenCalledWith(
      expect.objectContaining({
        page: 2,
        limit: 20,
        status: 'assigned',
        courierId: 'courier-1'
      })
    );
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    mockGetDeliveriesExecute.mockRejectedValueOnce(new Error('fetch failed'));
    await controller.getDeliveries(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('updates delivery status and maps failure branches', async () => {
    const controller = new DeliveryController();
    const req = {
      params: { deliveryId: 'delivery-10' },
      body: { status: 'delivered', notes: 'ok' }
    } as unknown as Request;
    const res = createResponse();

    mockUpdateDeliveryStatusExecute.mockResolvedValue({ updated: true });
    await controller.updateDeliveryStatus(req, res);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true }));

    mockUpdateDeliveryStatusExecute.mockRejectedValueOnce(new Error('Invalid status transition'));
    await controller.updateDeliveryStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(400);

    mockUpdateDeliveryStatusExecute.mockRejectedValueOnce(new Error('delivery not found'));
    await controller.updateDeliveryStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(404);

    mockUpdateDeliveryStatusExecute.mockRejectedValueOnce(new Error('unknown'));
    await controller.updateDeliveryStatus(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
  });
});
