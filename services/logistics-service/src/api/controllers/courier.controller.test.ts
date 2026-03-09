import type { Request, Response } from 'express';
import { GeoPoint } from '../../domain/value-objects/geopoint.value-object';

const courierRepository = {
  findAvailableCouriers: jest.fn(),
  getCourierById: jest.fn(),
  updateCourierAvailability: jest.fn()
};

jest.mock('../../infrastructure/container', () => ({
  DependencyContainer: {
    getInstance: jest.fn(() => ({
      getCourierRepository: () => courierRepository
    }))
  }
}));

import { CourierController } from './courier.controller';

const createResponse = (): Response =>
  ({
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  } as unknown as Response);

describe('CourierController', () => {
  const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);

  afterAll(() => {
    errorSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('getCouriers returns mapped available couriers', async () => {
    const controller = new CourierController();
    const req = { query: {} } as Request;
    const res = createResponse();
    const point = GeoPoint.create(-6.8, 39.2, 'Cour 1');

    courierRepository.findAvailableCouriers.mockResolvedValue([
      {
        id: 'cour-1',
        name: 'Courier One',
        phone: '+255700000001',
        vehicle: { type: 'motorbike' },
        rating: 4.7,
        isAvailable: true,
        currentLocation: point
      }
    ]);

    await controller.getCouriers(req, res);

    expect(courierRepository.findAvailableCouriers).toHaveBeenCalledWith(expect.any(GeoPoint), 50000);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        couriers: [
          {
            courierId: 'cour-1',
            name: 'Courier One',
            phone: '+255700000001',
            vehicle: 'motorbike',
            rating: 4.7,
            status: 'active',
            currentLocation: { lat: -6.8, lng: 39.2 },
            stats: {
              deliveriesCompleted: 0,
              averageRating: 4.7,
              onTimeDeliveryRate: 0
            }
          }
        ],
        total: 1
      }
    });
  });

  it('getCouriers returns 500 when repository fails', async () => {
    const controller = new CourierController();
    const req = { query: {} } as Request;
    const res = createResponse();

    courierRepository.findAvailableCouriers.mockRejectedValue(new Error('find failed'));

    await controller.getCouriers(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'find failed'
    });
  });

  it('getCourier returns mapped courier payload', async () => {
    const controller = new CourierController();
    const req = { params: { courierId: 'cour-1' } } as unknown as Request;
    const res = createResponse();

    courierRepository.getCourierById.mockResolvedValue({
      id: 'cour-1',
      name: 'Courier One',
      phone: '+255700000001',
      vehicle: { type: 'motorbike' },
      rating: 4.7,
      isAvailable: false,
      currentLocation: GeoPoint.create(-6.81, 39.21, 'Cour 1')
    });

    await controller.getCourier(req, res);

    expect(courierRepository.getCourierById).toHaveBeenCalledWith('cour-1');
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: {
        courierId: 'cour-1',
        name: 'Courier One',
        phone: '+255700000001',
        vehicle: 'motorbike',
        rating: 4.7,
        status: 'inactive',
        currentLocation: { lat: -6.81, lng: 39.21 },
        stats: {
          deliveriesCompleted: 0,
          averageRating: 4.7,
          onTimeDeliveryRate: 0
        }
      }
    });
  });

  it('getCourier returns 404 when courier is missing', async () => {
    const controller = new CourierController();
    const req = { params: { courierId: 'cour-missing' } } as unknown as Request;
    const res = createResponse();

    courierRepository.getCourierById.mockResolvedValue(null);

    await controller.getCourier(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Courier not found'
    });
  });

  it('getCourier returns 500 for repository errors', async () => {
    const controller = new CourierController();
    const req = { params: { courierId: 'cour-err' } } as unknown as Request;
    const res = createResponse();

    courierRepository.getCourierById.mockRejectedValue(new Error('lookup failed'));

    await controller.getCourier(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'lookup failed'
    });
  });

  it('updateCourierStatus updates availability and returns payload', async () => {
    const controller = new CourierController();
    const req = {
      params: { courierId: 'cour-1' },
      body: { status: 'active' }
    } as unknown as Request;
    const res = createResponse();

    courierRepository.getCourierById.mockResolvedValue({ id: 'cour-1' });
    courierRepository.updateCourierAvailability.mockResolvedValue(undefined);

    await controller.updateCourierStatus(req, res);

    expect(courierRepository.updateCourierAvailability).toHaveBeenCalledWith('cour-1', true);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          courierId: 'cour-1',
          status: 'active',
          updatedAt: expect.any(Date)
        })
      })
    );
  });

  it('updateCourierStatus returns 404 when courier is missing', async () => {
    const controller = new CourierController();
    const req = {
      params: { courierId: 'cour-404' },
      body: { status: 'inactive' }
    } as unknown as Request;
    const res = createResponse();

    courierRepository.getCourierById.mockResolvedValue(null);

    await controller.updateCourierStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'Courier not found'
    });
    expect(courierRepository.updateCourierAvailability).not.toHaveBeenCalled();
  });

  it('updateCourierStatus returns 500 for repository errors', async () => {
    const controller = new CourierController();
    const req = {
      params: { courierId: 'cour-err' },
      body: { status: 'active' }
    } as unknown as Request;
    const res = createResponse();

    courierRepository.getCourierById.mockRejectedValue(new Error('update failed'));

    await controller.updateCourierStatus(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({
      success: false,
      error: 'update failed'
    });
  });
});
