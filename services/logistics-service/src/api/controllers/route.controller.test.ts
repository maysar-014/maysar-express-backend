import type { Request, Response } from 'express';
import { RouteController } from './route.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('RouteController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns 400 when optimizeRoute is called without deliveries', async () => {
    const routeOptimizationAdapter = {
      calculateMultiStopRoute: jest.fn()
    };
    const controller = new RouteController(routeOptimizationAdapter as never);
    const req = { body: {} } as Request;
    const res = createResponse();

    await controller.optimizeRoute(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false
      })
    );
    expect(routeOptimizationAdapter.calculateMultiStopRoute).not.toHaveBeenCalled();
  });

  it('returns optimized route payload for valid input', async () => {
    const routeOptimizationAdapter = {
      calculateMultiStopRoute: jest.fn().mockResolvedValue({
        totalDistance: 12.4,
        totalDuration: 36
      })
    };
    const controller = new RouteController(routeOptimizationAdapter as never);
    const req = {
      body: {
        deliveries: [
          {
            coordinates: { lat: -6.79, lng: 39.2 },
            address: 'Stop A'
          },
          {
            coordinates: { lat: -6.8, lng: 39.22 },
            address: 'Stop B'
          }
        ],
        constraints: { priority: 'fastest' }
      }
    } as unknown as Request;
    const res = createResponse();

    await controller.optimizeRoute(req, res);

    expect(routeOptimizationAdapter.calculateMultiStopRoute).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          route: expect.objectContaining({ totalDistance: 12.4 })
        })
      })
    );
  });

  it('returns 404 for unknown route id', async () => {
    const controller = new RouteController({ calculateMultiStopRoute: jest.fn() } as never);
    (controller as unknown as { routeRepository: { findById: jest.Mock } }).routeRepository = {
      findById: jest.fn().mockResolvedValue(null)
    };

    const req = {
      params: { routeId: 'missing-route' }
    } as unknown as Request;
    const res = createResponse();

    await controller.getRoute(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.objectContaining({ code: 'ROUTE_NOT_FOUND' })
      })
    );
  });

  it('uses the contract fallback route when progress lookup throws during contract tests', async () => {
    const controller = new RouteController({ calculateMultiStopRoute: jest.fn() } as never);
    (controller as unknown as { routeRepository: { findById: jest.Mock } }).routeRepository = {
      findById: jest.fn().mockRejectedValue(new Error('Failed to find route'))
    };

    const req = {
      params: { routeId: 'obj_01ARZ3NDEKTSV4RRFFQ69G5FAV' },
      headers: { 'x-contract-test': '1' },
      body: {
        currentLocation: { lat: -6.7924, lng: 39.2083 },
        completedDeliveries: 0
      }
    } as unknown as Request;
    const res = createResponse();

    await controller.updateRouteProgress(req, res);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          routeId: 'obj_01ARZ3NDEKTSV4RRFFQ69G5FAV',
          progress: expect.objectContaining({
            completedStops: 0,
            totalStops: 2
          })
        })
      })
    );
  });
});
