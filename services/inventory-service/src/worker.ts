import { PrismaClient } from '@prisma/client';
import { eventBus } from '@shared-events/eventBus';
import { StockManager } from './modules/stock/stockManager';
import { ReservationEngine } from './modules/reservation/reservationEngine';
import { WarehouseManager } from './modules/warehouse/warehouseManager';
import { InventoryEventHandlers } from './modules/events/eventHandlers';
import { EventIdempotency } from '@shared/middleware/idempotency';

async function startWorker() {
  const prisma = new PrismaClient();
  const stockManager = new StockManager(prisma, eventBus);
  const warehouseManager = new WarehouseManager(prisma);
  const reservationEngine = new ReservationEngine(prisma, stockManager, warehouseManager, eventBus);
  const eventIdempotency = new EventIdempotency(process.env.REDIS_URL!, prisma);
  const eventHandlers = new InventoryEventHandlers(stockManager, reservationEngine, eventIdempotency);

  console.log('Inventory worker started - running background tasks');

  // Clean up expired reservations every 5 minutes
  setInterval(async () => {
    try {
      await eventHandlers.cleanupExpiredReservations();
    } catch (err) {
      console.error('Error in expired reservations cleanup:', err);
    }
  }, 5 * 60 * 1000);

  // Monitor low stock every 10 minutes
  setInterval(async () => {
    try {
      console.log('Running low stock monitoring...');
      // TODO: implement actual scan & alerting calls
    } catch (err) {
      console.error('Error in low stock monitor:', err);
    }
  }, 10 * 60 * 1000);

  process.on('SIGINT', async () => {
    console.log('Worker shutting down...');
    await prisma.$disconnect();
    process.exit(0);
  });
}

startWorker().catch(err => {
  console.error('Worker failed to start:', err);
  process.exit(1);
});