const mockPrisma = {
  order_Order: {
    aggregate: jest.fn(),
    count: jest.fn(),
    findMany: jest.fn()
  },
  logistics_Delivery: {
    count: jest.fn()
  },
  user_User: {
    count: jest.fn()
  },
  user_Session: {
    findMany: jest.fn()
  }
};

jest.mock('../../infrastructure/database/prisma', () => ({
  __esModule: true,
  default: mockPrisma
}));

import express from 'express';
import request from 'supertest';
import type { Router, Request, Response } from 'express';
import { createAnalyticsRoutes } from './analyticsRoutes';
import type { AnalyticsController } from '../controllers/AnalyticsController';

interface Layer {
  route?: {
    path: string;
    methods: Record<string, boolean>;
  };
}

const getRouteSignatures = (router: Router): string[] => {
  const layers = (router as unknown as { stack: Layer[] }).stack;
  return layers
    .filter(layer => layer.route)
    .map(layer => {
      const route = layer.route as NonNullable<Layer['route']>;
      const method = Object.keys(route.methods)[0].toUpperCase();
      return `${method} ${route.path}`;
    });
};

describe('createAnalyticsRoutes', () => {
  const authHeaders = {
    'x-contract-test': 'true',
    'x-user-id': 'usr_analytics-test',
    'x-user-roles': 'seller'
  };

  it('registers analytics endpoints for seller, supplier, and courier', () => {
    const controller = {
      getSellerDashboardHandler: jest.fn(),
      getSalesAnalyticsHandler: jest.fn(),
      getSupplierAnalyticsHandler: jest.fn(),
      getCourierAnalyticsHandler: jest.fn()
    } as unknown as AnalyticsController;

    const signatures = getRouteSignatures(createAnalyticsRoutes(controller));
    expect(signatures).toEqual(
      expect.arrayContaining([
        'GET /analytics/dashboard/:sellerId',
        'GET /analytics/sales/:sellerId',
        'GET /supplier/analytics/:supplierId',
        'GET /courier/analytics/:courierId',
        'GET /platform/kpis',
        'GET /platform/stats'
      ])
    );
  });

  it('delegates requests to provided controller handlers', async () => {
    const getSellerDashboardHandler = jest.fn(async (_req: Request, res: Response) => {
      res.status(200).json({ handler: 'dashboard' });
    });
    const controller = {
      getSellerDashboardHandler,
      getSalesAnalyticsHandler: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ handler: 'sales' })),
      getSupplierAnalyticsHandler: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ handler: 'supplier' })),
      getCourierAnalyticsHandler: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ handler: 'courier' }))
    } as unknown as AnalyticsController;

    const app = express();
    app.use('/api', createAnalyticsRoutes(controller));

    const response = await request(app)
      .get('/api/analytics/dashboard/seller-1')
      .set(authHeaders);
    expect(response.status).toBe(200);
    expect(response.body.handler).toBe('dashboard');
    expect(getSellerDashboardHandler).toHaveBeenCalledTimes(1);
  });

  // --- Platform KPIs (admin guide Flow 1) ----------------------------------

  const buildController = (): AnalyticsController =>
    ({
      getSellerDashboardHandler: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ handler: 'dashboard' })),
      getSalesAnalyticsHandler: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ handler: 'sales' })),
      getSupplierAnalyticsHandler: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ handler: 'supplier' })),
      getCourierAnalyticsHandler: jest.fn(async (_req: Request, res: Response) => res.status(200).json({ handler: 'courier' }))
    }) as unknown as AnalyticsController;

  const adminHeaders = {
    'x-contract-test': 'true',
    'x-user-id': 'usr_platform-admin',
    'x-user-roles': 'admin'
  };

  const sellerHeaders = {
    'x-contract-test': 'true',
    'x-user-id': 'usr_platform-seller',
    'x-user-roles': 'seller'
  };

  const primePlatformMocks = () => {
    mockPrisma.order_Order.aggregate.mockReset();
    mockPrisma.order_Order.count.mockReset();
    mockPrisma.order_Order.findMany.mockReset();
    mockPrisma.logistics_Delivery.count.mockReset();
    mockPrisma.user_User.count.mockReset();
    mockPrisma.user_Session.findMany.mockReset();

    mockPrisma.order_Order.aggregate.mockResolvedValue({
      _sum: { totalAmount: 1000 },
      _count: { _all: 4 }
    });
    // Call order inside GetPlatformKpis.execute():
    // 1) getOrdersCount, 2) getBuyerConversionRate → getOrdersCount,
    // 3) COD delivered/completed, 4) COD cancelled.
    mockPrisma.order_Order.count
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(12)
      .mockResolvedValueOnce(8)
      .mockResolvedValueOnce(2);
    mockPrisma.order_Order.findMany.mockResolvedValue([{ sellerId: 's1' }]);
    mockPrisma.logistics_Delivery.count
      .mockResolvedValueOnce(9)
      .mockResolvedValueOnce(1);
    mockPrisma.user_User.count.mockResolvedValue(10);
    mockPrisma.user_Session.findMany.mockResolvedValue([
      { userId: 'u1' },
      { userId: 'u2' },
      { userId: 'u3' }
    ]);
  };

  const buildApp = () => {
    const app = express();
    app.use(express.json());
    app.use('/api', createAnalyticsRoutes(buildController()));
    return app;
  };

  it('serves platform KPIs to admins with live-computed values', async () => {
    primePlatformMocks();

    const response = await request(buildApp())
      .get('/api/platform/kpis')
      .set(adminHeaders);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(
      expect.objectContaining({
        windowDays: 30,
        gmv: 1000,
        activeUsers: 3,
        activeSellers: 1,
        totalSellers: 10,
        orderCount: 12,
        conversionRate: 0,
        averageOrderValue: 250,
        codAcceptanceRate: 80,
        deliverySuccessRate: 90
      })
    );
  });

  it('exposes /platform/stats as an alias with the same payload', async () => {
    primePlatformMocks();

    const response = await request(buildApp())
      .get('/api/platform/stats')
      .set(adminHeaders);

    expect(response.status).toBe(200);
    expect(response.body).toEqual(expect.objectContaining({ gmv: 1000, codAcceptanceRate: 80 }));
  });

  it('rejects non-admin roles with 403', async () => {
    const response = await request(buildApp())
      .get('/api/platform/kpis')
      .set(sellerHeaders);
    expect(response.status).toBe(403);
  });

  it('rejects unauthenticated requests with 401', async () => {
    const response = await request(buildApp()).get('/api/platform/kpis');
    expect(response.status).toBe(401);
  });
});
