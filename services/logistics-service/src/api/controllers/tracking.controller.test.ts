import type { Request, Response } from 'express';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

const trackingRepository = {
  findByDeliveryId: jest.fn(),
  findByCourierId: jest.fn()
};

const deliveryRepository = {
  findById: jest.fn()
};

jest.mock('../../infrastructure/container', () => ({
  DependencyContainer: {
    getInstance: jest.fn(() => ({
      getTrackingRepository: () => trackingRepository,
      getDeliveryRepository: () => deliveryRepository
    }))
  }
}));

import { TrackingController } from './tracking.controller';

const createResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  } as unknown as Response);

describe('TrackingController', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => {
    errorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getTrackingHistory returns filtered and paginated history', async () => {
    const controller = new TrackingController();
    const req = {
      params: { trackingNumber: 'del-1' },
      query: {
        startDate: '2026-03-08T10:05:00.000Z',
        endDate: '2026-03-08T10:20:00.000Z',
        page: '1',
        limit: '1'
      }
    } as unknown as Request;
    const res = createResponse();

    trackingRepository.findByDeliveryId.mockResolvedValue([
      {
        timestamp: new Date('2026-03-08T10:00:00.000Z'),
        location: GeoPoint.create(-6.79, 39.2, 'Start'),
        status: 'picked_up',
        speed: 10,
        heading: 20,
        accuracy: 5,
        batteryLevel: 90
      },
      {
        timestamp: new Date('2026-03-08T10:10:00.000Z'),
        location: GeoPoint.create(-6.8, 39.21, 'Mid'),
        status: 'in_transit',
        speed: 20,
        heading: 40,
        accuracy: 5,
        batteryLevel: 80
      },
      {
        timestamp: new Date('2026-03-08T10:15:00.000Z'),
        location: GeoPoint.create(-6.81, 39.22, 'End'),
        status: 'in_transit',
        speed: 25,
        heading: 45,
        accuracy: 4,
        batteryLevel: 75
      }
    ]);
    deliveryRepository.findById.mockResolvedValue({
      status: 'in_transit',
      estimatedDeliveryTime: new Date('2026-03-08T11:00:00.000Z')
    });

    await controller.getTrackingHistory(req, res);

    expect(trackingRepository.findByDeliveryId).toHaveBeenCalledWith('del-1');
    expect(deliveryRepository.findById).toHaveBeenCalledWith('del-1');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          trackingNumber: 'del-1',
          status: 'in_transit',
          currentLocation: 'Mid',
          history: [expect.objectContaining({ location: 'Mid' })],
          pagination: expect.objectContaining({ page: 1, limit: 1, total: 2, pages: 2 })
        })
      })
    );
  });

  it('getTrackingHistory handles repository failures', async () => {
    const controller = new TrackingController();
    const req = {
      params: { trackingNumber: 'del-err' },
      query: {}
    } as unknown as Request;
    const res = createResponse();

    trackingRepository.findByDeliveryId.mockRejectedValue(new Error('query failed'));

    await controller.getTrackingHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'query failed'
    });
  });

  it('storeLocationUpdate returns success payload and defaults', async () => {
    const controller = new TrackingController();
    const req = {
      body: {
        courierId: 'cour-1',
        location: { latitude: -6.79, longitude: 39.2, accuracy: 3, address: 'Point A' }
      }
    } as unknown as Request;
    const res = createResponse();

    await controller.storeLocationUpdate(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          courierId: 'cour-1',
          locationStored: true,
          timestamp: expect.any(Date)
        })
      })
    );
  });

  it('storeLocationUpdate handles malformed payloads', async () => {
    const controller = new TrackingController();
    const req = {
      body: { courierId: 'cour-2' }
    } as unknown as Request;
    const res = createResponse();

    await controller.storeLocationUpdate(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: expect.any(String)
      })
    );
  });

  it('getCourierLocationHistory applies time and accuracy filters with pagination', async () => {
    const controller = new TrackingController();
    const req = {
      params: { courierId: 'cour-1' },
      query: {
        period: 'day',
        startDate: '2026-03-08T00:00:00.000Z',
        endDate: '2026-03-08T23:59:59.999Z',
        includeAccuracy: 'true',
        minAccuracy: '5',
        page: '1',
        limit: '1'
      }
    } as unknown as Request;
    const res = createResponse();

    trackingRepository.findByCourierId.mockResolvedValue([
      {
        location: GeoPoint.create(-6.79, 39.2, 'A'),
        timestamp: new Date('2026-03-08T10:00:00.000Z'),
        accuracy: 4,
        speed: 10,
        heading: 50,
        batteryLevel: 90,
        status: 'moving'
      },
      {
        location: GeoPoint.create(-6.8, 39.21, 'B'),
        timestamp: new Date('2026-03-08T10:10:00.000Z'),
        accuracy: 6,
        speed: 20,
        heading: 60,
        batteryLevel: 80,
        status: 'moving'
      }
    ]);

    await controller.getCourierLocationHistory(req, res);

    expect(trackingRepository.findByCourierId).toHaveBeenCalledWith('cour-1', {
      start: new Date('2026-03-08T00:00:00.000Z'),
      end: new Date('2026-03-08T23:59:59.999Z')
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          courierId: 'cour-1',
          locations: [expect.objectContaining({ lat: -6.8, lng: 39.21 })],
          pagination: expect.objectContaining({ page: 1, limit: 1, total: 1, pages: 1 })
        })
      })
    );
  });

  it('getCourierLocationHistory handles failures', async () => {
    const controller = new TrackingController();
    const req = {
      params: { courierId: 'cour-err' },
      query: {}
    } as unknown as Request;
    const res = createResponse();

    trackingRepository.findByCourierId.mockRejectedValue(new Error('history failed'));
    await controller.getCourierLocationHistory(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'history failed'
    });
  });
});
