import type { Request, Response } from 'express';

const mockEarningsRepository = {
  findByCourierId: jest.fn(),
  save: jest.fn(),
  getPlatformEarningsSummary: jest.fn()
};

const mockDeliveryRepository = {
  findByCourierId: jest.fn()
};

const mockContainer = {
  getEarningsRepository: jest.fn(() => mockEarningsRepository),
  getDeliveryRepository: jest.fn(() => mockDeliveryRepository)
};

jest.mock('../../infrastructure/container', () => ({
  DependencyContainer: {
    getInstance: jest.fn(() => mockContainer)
  }
}));

import { EarningsController } from './earnings.controller';

const createResponse = (): Response => {
  const response = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis()
  };
  return response as unknown as Response;
};

describe('EarningsController', () => {
  beforeAll(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date('2026-03-27T12:00:00.000Z'));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterAll(() => {
    jest.useRealTimers();
  });

  it('returns courier earnings summary with derived totals', async () => {
    const controller = new EarningsController();
    const req = {
      query: {
        courierId: 'courier-1',
        startDate: '2026-02-01T00:00:00.000Z',
        endDate: '2026-02-28T23:59:59.999Z'
      }
    } as unknown as Request;
    const res = createResponse();

    mockEarningsRepository.findByCourierId.mockResolvedValue([
      {
        totalEarnings: 1000,
        commission: 100,
        netEarnings: 900,
        paymentStatus: 'pending',
        baseFare: 600,
        distanceFee: 400
      },
      {
        totalEarnings: 500,
        commission: 50,
        netEarnings: 450,
        paymentStatus: 'paid',
        baseFare: 300,
        distanceFee: 200
      }
    ]);

    await controller.getEarnings(req, res);

    expect(mockEarningsRepository.findByCourierId).toHaveBeenCalledWith('courier-1', {
      start: new Date('2026-02-01T00:00:00.000Z'),
      end: new Date('2026-02-28T23:59:59.999Z')
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({
            totalEarnings: 1500,
            totalCommissions: 150,
            netEarnings: 1350,
            pendingPayments: 900
          }),
          breakdown: expect.objectContaining({
            deliveryFees: 1500
          })
        })
      })
    );
  });

  it('returns empty platform data when courierId is absent', async () => {
    const controller = new EarningsController();
    const req = { query: {} } as Request;
    const res = createResponse();

    await controller.getEarnings(req, res);

    expect(mockEarningsRepository.findByCourierId).not.toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          summary: expect.objectContaining({
            totalEarnings: 0
          })
        })
      })
    );
  });

  it('handles repository failure in getEarnings', async () => {
    const controller = new EarningsController();
    const req = { query: { courierId: 'courier-9' } } as unknown as Request;
    const res = createResponse();

    mockEarningsRepository.findByCourierId.mockRejectedValue(new Error('read failed'));

    await controller.getEarnings(req, res);

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: 'read failed'
      })
    );
  });

  it('returns courier-level earnings KPIs including today earnings', async () => {
    const controller = new EarningsController();
    const req = {
      params: { courierId: 'courier-2' },
      query: { period: 'today' }
    } as unknown as Request;
    const res = createResponse();

    const today = new Date();
    mockEarningsRepository.findByCourierId.mockResolvedValue([
      {
        totalEarnings: 200,
        createdAt: new Date(today.getTime() - 10 * 60 * 1000)
      },
      {
        totalEarnings: 300,
        createdAt: new Date(today.getTime() - 24 * 60 * 60 * 1000)
      }
    ]);

    await controller.getCourierEarnings(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          courierId: 'courier-2',
          totalEarnings: 500,
          deliveriesCount: 2,
          averagePerDelivery: 250,
          todayEarnings: 200
        })
      })
    );
  });

  it('records earnings and persists computed totals', async () => {
    const controller = new EarningsController();
    const req = {
      body: {
        courierId: 'courier-5',
        deliveryId: 'delivery-7',
        baseFare: 1000,
        distanceFee: 200,
        weightFee: 100,
        priorityFee: 50,
        bonuses: 30,
        deductions: 20,
        currency: 'TZS'
      }
    } as Request;
    const res = createResponse();

    await controller.recordEarnings(req, res);

    expect(mockEarningsRepository.save).toHaveBeenCalledWith(
      expect.objectContaining({
        courierId: 'courier-5',
        deliveryId: 'delivery-7',
        totalEarnings: 1380,
        commission: 138,
        netEarnings: 1222,
        paymentStatus: 'pending'
      })
    );
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          amount: 1380
        })
      })
    );
  });

  it('validates commissions input before calculating', async () => {
    const controller = new EarningsController();
    const req = { body: { deliveries: null } } as unknown as Request;
    const res = createResponse();

    await controller.calculateCommissions(req, res);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false
      })
    );
  });

  it('calculates commissions for a delivery list', async () => {
    const controller = new EarningsController();
    const req = {
      body: {
        deliveries: [
          { deliveryId: 'd1', amount: 100 },
          { deliveryId: 'd2', amount: 200 }
        ],
        commissionRate: 0.2
      }
    } as Request;
    const res = createResponse();

    await controller.calculateCommissions(req, res);

    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          earnings: 300,
          commission: 60,
          total: 360
        })
      })
    );
  });

  it('returns platform earnings summary', async () => {
    const controller = new EarningsController();
    const req = { query: { period: 'month' } } as unknown as Request;
    const res = createResponse();

    mockEarningsRepository.getPlatformEarningsSummary.mockResolvedValue({
      totalRevenue: 40000,
      deliveryCount: 100
    });

    await controller.getEarningsSummary(req, res);

    expect(mockEarningsRepository.getPlatformEarningsSummary).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: true,
        data: expect.objectContaining({
          totalEarnings: 40000,
          totalDeliveries: 100,
          averagePerDelivery: 400
        })
      })
    );
  });
});
