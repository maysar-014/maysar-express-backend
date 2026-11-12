import { EventBusAdapter } from './EventBusAdapter';
import { EventEnvelope } from '@shared-events/eventBus';
import prisma from '../database/prisma';
import { logger } from '@modules/auth-service/src/infrastructure/services/logger.service';

/**
 * Subscribes to InventoryUpdated.v1 events emitted by StockManager.
 *
 * Since currentStock and stockStatus are now always derived live from
 * inventory_StockItem at query time (zero propagation delay), this handler
 * no longer needs to trigger a snapshot refresh for stock-change events.
 *
 * The handler retains the seller-ID resolution logic and the non-throwing
 * contract (analytics errors must never propagate to the inventory-service
 * publisher), but takes no further action after resolving sellers.
 *
 * salesVelocity and daysUntilStockout are still refreshed by the nightly
 * SellerMetricsCalculationJob, which remains the authoritative background
 * refresh mechanism for velocity fields.
 */
export class InventoryUpdatedHandler {
  constructor(private readonly eventBus: EventBusAdapter) {}

  initialize(): void {
    this.eventBus.subscribe('InventoryUpdated.v1', async (envelope: EventEnvelope) => {
      await this.handle(envelope);
    });
  }

  private async handle(envelope: EventEnvelope): Promise<void> {
    try {
      const data = envelope.data as { updates?: Array<{ variantId?: string }> };
      const variantIds = (data?.updates ?? [])
        .map(u => u.variantId)
        .filter((id): id is string => typeof id === 'string' && id.length > 0);

      if (variantIds.length === 0) return;

      // Resolve sellerIds from the affected product variants (preserved for observability)
      const variants = await prisma.productVariant.findMany({
        where: { id: { in: variantIds } },
        select: { product: { select: { sellerId: true } } }
      });

      const sellerIds = [...new Set(
        variants
          .map(v => v.product?.sellerId)
          .filter((id): id is string => Boolean(id))
      )];

      if (sellerIds.length > 0) {
        // No snapshot refresh needed — currentStock/stockStatus are now always live.
        // The nightly SellerMetricsCalculationJob refreshes salesVelocity/daysUntilStockout.
        logger.info(
          `[InventoryUpdatedHandler] Stock change detected for ${sellerIds.length} seller(s). ` +
          `No snapshot refresh needed — currentStock is always served live from inventory_StockItem.`
        );
      }
    } catch (error) {
      // Non-throwing: analytics errors must never surface to inventory-service callers
      logger.error('[InventoryUpdatedHandler] Error processing InventoryUpdated.v1 event:', error);
    }
  }
}
