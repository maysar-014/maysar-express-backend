import express from 'express';
import request from 'supertest';

const stockApiHandlers = {
  getStockLevel: jest.fn((req, res) => res.status(200).json({ route: 'getStockLevel', variantId: req.params.variantId })),
  adjustStock: jest.fn((req, res) => res.status(200).json({ route: 'adjustStock', warehouseId: req.params.warehouseId })),
  listMaterials: jest.fn((_req, res) => res.status(200).json({ route: 'listMaterials' })),
  getMaterialStock: jest.fn((req, res) => res.status(200).json({ route: 'getMaterialStock', variantId: req.params.variantId })),
  updateMaterialInventory: jest.fn((req, res) => res.status(200).json({ route: 'updateMaterialInventory', warehouseId: req.params.warehouseId })),
  createReservation: jest.fn((_req, res) => res.status(201).json({ route: 'createReservation' })),
  cancelReservation: jest.fn((req, res) => res.status(200).json({ route: 'cancelReservation', orderId: req.params.orderId })),
  getOrderReservations: jest.fn((req, res) => res.status(200).json({ route: 'getOrderReservations', orderId: req.params.orderId })),
  getWarehouses: jest.fn((_req, res) => res.status(200).json({ route: 'getWarehouses' })),
  getWarehouse: jest.fn((req, res) => res.status(200).json({ route: 'getWarehouse', id: req.params.id })),
  startInventoryCount: jest.fn((_req, res) => res.status(201).json({ route: 'startInventoryCount' })),
  completeInventoryCount: jest.fn((req, res) => res.status(200).json({ route: 'completeInventoryCount', countId: req.params.countId })),
  getStockAnalytics: jest.fn((_req, res) => res.status(200).json({ route: 'getStockAnalytics' }))
};

jest.mock('../../shared/outbox/outboxPattern', () => ({
  TransactionalOutbox: jest.fn()
}));

jest.mock('../../shared/outbox/outbox.processor', () => ({
  OutboxProcessor: jest.fn().mockImplementation(() => ({
    start: jest.fn(),
    stop: jest.fn()
  }))
}));

jest.mock('../../shared/events/eventBus', () => ({
  eventBus: {
    emit: jest.fn(),
    publish: jest.fn(),
    on: jest.fn(),
    shutdown: jest.fn()
  }
}));

jest.mock('@shared/database/prisma-client', () => ({
  createPrismaClient: jest.fn(() => ({}))
}));

jest.mock('@shared/middleware/auth-context.middleware', () => ({
  requireAuth: (_req: unknown, _res: unknown, next: () => void) => next(),
  requireRoleOrService: () => (_req: unknown, _res: unknown, next: () => void) => next()
}));

jest.mock('@shared/middleware/idempotency', () => ({
  EventIdempotency: jest.fn().mockImplementation(() => ({})),
  IdempotencyMiddleware: jest.fn().mockImplementation(() => ({
    middleware: () => (_req: unknown, _res: unknown, next: () => void) => next()
  }))
}));

jest.mock('./src/infrastructure/redis/redis-stock-engine', () => ({
  resolveRedisReservationMode: jest.fn(() => 'off'),
  createRedisStockEngine: jest.fn(() => null)
}));

jest.mock('./src/infrastructure/messaging/inventory-outbox.repository', () => ({
  InventoryOutboxRepository: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('./src/infrastructure/monitoring/metrics', () => ({
  metricsRegistry: {
    contentType: 'text/plain',
    metrics: jest.fn().mockResolvedValue('ok')
  }
}));

jest.mock('./src/modules/stock/stockManager', () => ({
  StockManager: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('./src/modules/reservation/reservationEngine', () => ({
  ReservationEngine: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('./src/modules/warehouse/warehouseManager', () => ({
  WarehouseManager: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('./src/modules/events/eventHandlers', () => ({
  InventoryEventHandlers: jest.fn().mockImplementation(() => ({}))
}));

jest.mock('./src/modules/api/stockApi', () => ({
  StockApi: jest.fn().mockImplementation(() => stockApiHandlers)
}));

describe('InventoryModule routes', () => {
  const { InventoryModule } = require('./index');

  it('mounts supplier inventory business endpoints on the monolith module', async () => {
    const app = express();
    app.use('/inventory', InventoryModule.routes);

    const stockRes = await request(app).get('/inventory/stock/var-1').expect(200);
    expect(stockRes.body).toEqual(expect.objectContaining({ route: 'getStockLevel' }));

    const adjustRes = await request(app).put('/inventory/stock/var-1/wh-1').send({ quantity: 5 }).expect(200);
    expect(adjustRes.body).toEqual(expect.objectContaining({ route: 'adjustStock' }));

    const materialsRes = await request(app).get('/inventory/materials').expect(200);
    expect(materialsRes.body).toEqual(expect.objectContaining({ route: 'listMaterials' }));

    const materialDetailRes = await request(app).get('/inventory/materials/var-1').expect(200);
    expect(materialDetailRes.body).toEqual(expect.objectContaining({ route: 'getMaterialStock' }));

    const materialUpdateRes = await request(app)
      .put('/inventory/materials/var-1/warehouses/wh-1')
      .send({ reorderPoint: 10 })
      .expect(200);
    expect(materialUpdateRes.body).toEqual(expect.objectContaining({ route: 'updateMaterialInventory' }));

    const reservationRes = await request(app).post('/inventory/reservations').send({}).expect(201);
    expect(reservationRes.body).toEqual(expect.objectContaining({ route: 'createReservation' }));

    const warehousesRes = await request(app).get('/inventory/warehouses').expect(200);
    expect(warehousesRes.body).toEqual(expect.objectContaining({ route: 'getWarehouses' }));

    const countRes = await request(app).post('/inventory/inventory-counts').send({}).expect(201);
    expect(countRes.body).toEqual(expect.objectContaining({ route: 'startInventoryCount' }));

    const analyticsRes = await request(app).get('/inventory/analytics/stock-levels').expect(200);
    expect(analyticsRes.body).toEqual(expect.objectContaining({ route: 'getStockAnalytics' }));
  });
});
