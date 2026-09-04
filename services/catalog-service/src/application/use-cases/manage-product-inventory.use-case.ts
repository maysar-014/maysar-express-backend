/**
 * ManageProductInventoryUseCase
 *
 * Attaches / updates / removes product stock at a seller location.
 * Handles stock transfers between a seller's own locations.
 *
 * Products do NOT store addresses — all inventory is location-scoped.
 */

import { makeId } from '../../../../../shared/ids/id';
import { ProductLocation } from '../../domain/entities/product-location.entity';
import { ISellerLocationRepository } from '../../domain/repositories/seller-location.repository.interface';

export interface AttachProductRequest {
  productId: string;
  locationId: string;
  sellerId: string;
  quantityAvailable: number;
}

export interface AdjustStockRequest {
  productId: string;
  locationId: string;
  sellerId: string;
  /** Positive = add stock, negative = reduce stock */
  delta: number;
}

export interface TransferStockRequest {
  sellerId: string;
  productId: string;
  fromLocationId: string;
  toLocationId: string;
  quantity: number;
  notes?: string;
  initiatedBy?: string;
}

export class ManageProductInventoryUseCase {
  constructor(private readonly repo: ISellerLocationRepository) {}

  /** Attach a product to a location and set initial stock */
  async attachProduct(req: AttachProductRequest): Promise<ProductLocation> {
    if (req.quantityAvailable < 0) throw new Error('Quantity cannot be negative');

    // Verify location belongs to seller
    const location = await this.repo.findById(req.locationId);
    if (!location) throw new Error('Location not found');
    if (location.sellerId !== req.sellerId) throw new Error('Forbidden: location does not belong to seller');

    const existing = await this.repo.findProductLocation(req.productId, req.locationId);
    if (existing) {
      // Update existing record
      existing.quantityAvailable = req.quantityAvailable;
      existing.isAvailable = req.quantityAvailable > 0;
      existing.updatedAt = new Date();
      await this.repo.saveProductLocation(existing);
      return existing;
    }

    const pl = new ProductLocation({
      id: makeId('ploc'),
      productId: req.productId,
      locationId: req.locationId,
      sellerId: req.sellerId,
      quantityAvailable: req.quantityAvailable,
      quantityReserved: 0,
      isAvailable: req.quantityAvailable > 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    await this.repo.saveProductLocation(pl);
    return pl;
  }

  /** Adjust stock at a location (add or reduce) */
  async adjustStock(req: AdjustStockRequest): Promise<ProductLocation> {
    const pl = await this.repo.findProductLocation(req.productId, req.locationId);
    if (!pl) throw new Error('Product not found at this location');
    if (pl.sellerId !== req.sellerId) throw new Error('Forbidden');

    pl.adjustStock(req.delta);
    pl.isAvailable = pl.quantityAvailable > 0;
    await this.repo.saveProductLocation(pl);
    return pl;
  }

  /** Remove a product from a location */
  async detachProduct(productId: string, locationId: string, sellerId: string): Promise<void> {
    const pl = await this.repo.findProductLocation(productId, locationId);
    if (!pl) throw new Error('Product not found at this location');
    if (pl.sellerId !== sellerId) throw new Error('Forbidden');
    if (pl.quantityReserved > 0) {
      throw new Error('Cannot detach product with active reservations');
    }
    await this.repo.deleteProductLocation(productId, locationId);
  }

  /** Transfer stock between seller's own locations */
  async transferStock(req: TransferStockRequest): Promise<void> {
    if (req.fromLocationId === req.toLocationId) {
      throw new Error('Source and destination locations must differ');
    }
    if (req.quantity <= 0) throw new Error('Transfer quantity must be positive');

    const [from, to, fromLoc, toLoc] = await Promise.all([
      this.repo.findProductLocation(req.productId, req.fromLocationId),
      this.repo.findProductLocation(req.productId, req.toLocationId),
      this.repo.findById(req.fromLocationId),
      this.repo.findById(req.toLocationId),
    ]);

    if (!fromLoc || fromLoc.sellerId !== req.sellerId) throw new Error('Source location not found or forbidden');
    if (!toLoc || toLoc.sellerId !== req.sellerId) throw new Error('Destination location not found or forbidden');
    if (!from) throw new Error('Product not available at source location');

    if (from.netAvailable < req.quantity) {
      throw new Error(`Insufficient stock: ${from.netAvailable} available, ${req.quantity} requested`);
    }

    // Deduct from source
    from.adjustStock(-req.quantity);
    from.isAvailable = from.quantityAvailable > 0;
    await this.repo.saveProductLocation(from);

    // Add to destination (create if not exists)
    if (to) {
      to.adjustStock(req.quantity);
      to.isAvailable = true;
      await this.repo.saveProductLocation(to);
    } else {
      const newPl = new ProductLocation({
        id: makeId('ploc'),
        productId: req.productId,
        locationId: req.toLocationId,
        sellerId: req.sellerId,
        quantityAvailable: req.quantity,
        quantityReserved: 0,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      });
      await this.repo.saveProductLocation(newPl);
    }

    // Persist transfer audit (non-fatal if table not ready)
    try {
      const prisma = (globalThis as any).prisma;
      if (prisma?.catalog_StockTransfer) {
        await prisma.catalog_StockTransfer.create({
          data: {
            id: makeId('xfr'),
            sellerId: req.sellerId,
            productId: req.productId,
            fromLocationId: req.fromLocationId,
            toLocationId: req.toLocationId,
            quantity: req.quantity,
            status: 'COMPLETED',
            notes: req.notes ?? null,
            initiatedBy: req.initiatedBy ?? null,
            completedAt: new Date(),
          },
        });
      }
    } catch { /* non-fatal */ }
  }

  /** List all locations where a product has inventory */
  async getProductLocations(productId: string, sellerId: string): Promise<ProductLocation[]> {
    const all = await this.repo.findProductLocations(productId);
    return all.filter(pl => pl.sellerId === sellerId);
  }
}
