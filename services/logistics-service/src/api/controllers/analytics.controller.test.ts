import type { Request, Response } from 'express';

const mockDeliveryRepository = {
  findAll: jest.fn(),
  findByCourierId: jest.fn()
};

const mockCourierRepository = {
  findAvailable: jest.fn(),
  findById: jest.fn()
};

const mockEarningsRepository = {
  findAllEarnings: jest.fn(),
  findByCourierId: jest.fn()
};

const mockContainer = {
  getDeliveryRepository: jest.fn(() => mockDeliveryRepository),
  getCourierRepository: jest.fn(() => mockCourierRepository),
  getEarningsRepository: jest.fn(() => mockEarningsRepository)
};

jest.mock('../../infrastructure/container', () => ({
  DependencyContainer: {
    getInstance: jest.fn(() => mockContainer)
  }
}));

import { AnalyticsController } from './analytics.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('AnalyticsController', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('builds aggregate analytics overview and performance metrics', async () => {
    const controller = new AnalyticsController();
    const req = {
      query: {
        period: 'month',
        startDate: '2026-01-01T00:00:00.000Z',
        endDate: '2026-01-31T23:59:59.999Z'
      }
    } as unknown as Request;
    const res = createResponse();

    mockDeliveryRepository.findAll.mockResolvedValue([
      {
        status: 'delivered',
        createdAt: '2026-01-01T10:00:00.000Z',
        completedAt: '2026-01-01T10:40:00.000Z',
        estimatedDeliveryTime: '2026-01-01T11:00:00.000Z',
        customerRating: 4,
        courierRating: 5
      },
      {
        status: 'delivered',
        createdAt: '2026-01-02T10:00:00.000Z',
        completedAt: '2026-01-02T10:20:00.000Z',
        estimatedDeliveryTime: '2026-01-02T10:15:00.000Z',
        customerRating: 3,
        courierRating: 4
      },
      { status: 'assigned', createdAt: '2026-01-03T10:00:00.000Z' }
    ]);
    mockCourierRepository.findAvailable.mockResolvedValue([{ id: 'c1', isAvailable: true }]);
    mockEarningsRepository.findAllEarnings.mockResolvedValue([
      { totalEarnings: 12000 },
      { totalEarnings: 8000 }
    ]);

    await controller.getAnalytics(req, res);

    expect(mockDeliveryRepository.findAll).toHaveBeenCalledWith({
      start: new Date('2026-01-01T00:00:00.000Z'),
      end: new Date('2026-01-31T23:59:59.999Z')
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          overview: expect.objectContaining({
            totalDeliveries: 3,
            completedDeliveries: 2,
            pendingDeliveries: 1,
            averageDeliveryTime: 30,
            successRate: 66.7
          }),
          performance: expect.objectContaining({
            onTimeDeliveryRate: 50,
            customerSatisfaction: 3.5,
            averageRating: 4.5,
            totalRevenue: 20000
          })
        })
      })
    );
  });

  it('returns 500 for analytics failures', async () => {
    const controller = new AnalyticsController();
    const req = { query: {} } as Request;
    const res = createResponse();

    mockDeliveryRepository.findAll.mockRejectedValue(new Error('db unavailable'));

    await controller.getAnalytics(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'db unavailable'
      })
    );
  });

  it('returns courier-specific performance metrics', async () => {
    const controller = new AnalyticsController();
    const req = { query: { courierId: 'courier-1' } } as unknown as Request;
    const res = createResponse();

    mockCourierRepository.findById.mockResolvedValue({ id: 'courier-1', rating: 4.8 });
    mockEarningsRepository.findByCourierId.mockResolvedValue([{ totalEarnings: 5000 }]);
    mockDeliveryRepository.findByCourierId.mockResolvedValue([
      { status: 'delivered', estimatedDeliveryTime: '2026-01-01T11:00:00.000Z', completedAt: '2026-01-01T10:50:00.000Z' },
      { status: 'assigned' }
    ]);

    await controller.getPerformanceMetrics(req, res);

    expect(mockCourierRepository.findById).toHaveBeenCalledWith('courier-1');
    expect(mockEarningsRepository.findByCourierId).toHaveBeenCalledWith('courier-1');
    expect(mockDeliveryRepository.findByCourierId).toHaveBeenCalledWith('courier-1');
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          courierId: 'courier-1',
          performance: expect.objectContaining({
            totalDeliveries: 2,
            averageRating: 4.8
          })
        })
      })
    );
  });

  it('returns platform-wide performance metrics when courierId is absent', async () => {
    const controller = new AnalyticsController();
    const req = { query: {} } as Request;
    const res = createResponse();

    mockDeliveryRepository.findAll.mockResolvedValue([{ status: 'assigned' }]);
    mockCourierRepository.findAvailable.mockResolvedValue([
      { id: 'c1', isAvailable: true },
      { id: 'c2', isAvailable: false }
    ]);

    await controller.getPerformanceMetrics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          platform: expect.objectContaining({
            totalCouriers: 2,
            activeCouriers: 1,
            averageOnTimeDeliveryRate: 0,
            averageCustomerSatisfaction: 4.5,
            averageCourierRating: 4.6
          })
        })
      })
    );
  });

  it('returns courier analytics KPI payload', async () => {
    const controller = new AnalyticsController();
    const req = {
      params: { courierId: 'courier-9' },
      query: { period: 'week' }
    } as unknown as Request;
    const res = createResponse();

    mockCourierRepository.findById.mockResolvedValue({ id: 'courier-9', rating: 4.9 });
    mockEarningsRepository.findByCourierId.mockResolvedValue([{ totalEarnings: 1000 }, { totalEarnings: 500 }]);
    mockDeliveryRepository.findByCourierId.mockResolvedValue([
      { status: 'delivered', estimatedDeliveryTime: '2026-01-01T11:00:00.000Z', completedAt: '2026-01-01T10:45:00.000Z' },
      { status: 'delivered', estimatedDeliveryTime: '2026-01-01T11:00:00.000Z', completedAt: '2026-01-01T11:15:00.000Z' }
    ]);

    await controller.getCourierAnalytics(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          courierId: 'courier-9',
          period: 'week',
          kpis: expect.objectContaining({
            deliveriesCompleted: 2,
            earnings: 1500
          })
        })
      })
    );
  });
});
