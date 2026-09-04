/**
 * Live verification: CreateOrderShipmentsUseCase against the real dev DB.
 * Creates shipments for a fake order, verifies rows + outbox events, cleans up.
 * Run: npx tsx scripts/verify-shipment-creation.ts
 */
import { PrismaClient } from '@prisma/client';
import { CreateOrderShipmentsUseCase } from '../services/logistics-service/src/application/use-cases/create-order-shipments.use-case';

async function main() {
  const prisma = new PrismaClient();
  (globalThis as any).prisma = prisma;

  const masterOrderId = `mos_verify_${Date.now()}`;
  const useCase = new CreateOrderShipmentsUseCase();

  const result = await useCase.execute({
    masterOrderId,
    buyer: { lat: -6.7924, lng: 39.2083, address: 'City centre, Dar es Salaam' },
    sellers: [
      {
        sellerId: 'seller-verify-1',
        sellerOrderId: 'ord_verify_1',
        pickupLat: -6.77,
        pickupLng: 39.27,
        pickupAddress: 'Mikocheni, Dar es Salaam',
        packageWeightKg: 2.5,
        requiredVehicleClass: 'MOTORCYCLE',
      },
      {
        sellerId: 'seller-verify-2',
        sellerOrderId: 'ord_verify_2',
        pickupLat: -6.78,
        pickupLng: 39.28,
        pickupAddress: 'Masaki, Dar es Salaam',
        packageWeightKg: 1.0,
      },
    ],
  });

  console.log('result:', JSON.stringify(result));

  const rows = await prisma.logistics_Shipment.findMany({ where: { orderId: { in: ['ord_verify_1', 'ord_verify_2'] } } });
  console.log('shipment rows:', rows.map(r => ({ id: r.id, status: r.status, weight: r.packageWeightKg, vehicle: r.requiredVehicleClass })));

  const events = await prisma.logistics_OutboxEvent.findMany({
    where: { eventType: 'shipment.created', eventData: { path: ['masterOrderId'], equals: masterOrderId } },
  });
  console.log('outbox events:', events.length, events.map(e => (e.eventData as any)?.shipmentId));

  // Cleanup
  await prisma.logistics_OutboxEvent.deleteMany({
    where: { eventType: 'shipment.created', eventData: { path: ['masterOrderId'], equals: masterOrderId } },
  });
  await prisma.logistics_Shipment.deleteMany({ where: { id: { in: rows.map(r => r.id) } } });
  console.log('cleanup done');

  const ok = result.created === 2 && rows.length === 2 && events.length === 2
    && rows.every(r => r.status === 'CREATED' && r.deliveryJobId === null);
  console.log(ok ? 'VERIFY: PASS' : 'VERIFY: FAIL');
  await prisma.$disconnect();
  process.exit(ok ? 0 : 1);
}

main().catch(err => { console.error(err); process.exit(1); });
