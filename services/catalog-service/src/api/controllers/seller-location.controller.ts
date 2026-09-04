/**
 * SellerLocationController
 *
 * All responses follow the canonical shape:
 *   { success: true, data: ... }          — success
 *   { success: false, error: { code, message, details?, timestamp, path } }  — error
 *
 * Errors are thrown as typed BaseApiError subclasses and caught by the global
 * error handler in shared/middleware/global-error-handler.middleware.ts.
 * Per-handler catch blocks map domain message patterns to the correct class.
 */

import { Request, Response, NextFunction } from 'express';
import {
  NotFoundError,
  ForbiddenError,
  ValidationError,
  BusinessRuleError,
  normaliseError,
} from '../../../../../shared/errors/api-errors';
import { ManageSellerLocationsUseCase } from '../../application/use-cases/manage-seller-locations.use-case';
import { ManageProductInventoryUseCase } from '../../application/use-cases/manage-product-inventory.use-case';

// ── Helper: extract sellerId from authenticated request ──────────────────────
function getSellerId(req: Request): string {
  const authUser = (req as any).user;
  return req.params.sellerId || authUser?.userId || authUser?.id || '';
}

// ── Helper: classify domain error message into typed API error ───────────────
function classifyError(err: unknown): never {
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('not found')) throw new NotFoundError(err.message);
    if (msg.includes('forbidden')) throw new ForbiddenError(err.message);
    if (msg.includes('cannot delete') || msg.includes('active reservation') || msg.includes('max')) {
      throw new BusinessRuleError(err.message);
    }
    if (msg.includes('bounds') || msg.includes('required') || msg.includes('negative') || msg.includes('must ')) {
      throw new ValidationError(err.message);
    }
  }
  // Re-throw unknown errors — the global handler will map them to 500
  throw err;
}

// ── Helper: send success response ────────────────────────────────────────────
function ok(res: Response, data: unknown, status = 200): void {
  res.status(status).json({ success: true, data });
}

export class SellerLocationController {
  constructor(
    private readonly locationUseCase: ManageSellerLocationsUseCase,
    private readonly inventoryUseCase: ManageProductInventoryUseCase,
  ) {}

  // ── Locations ────────────────────────────────────────────────────────────

  async createLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      if (!sellerId) throw new ValidationError('Seller identity could not be resolved from token');

      const location = await this.locationUseCase.createLocation({
        sellerId,
        name: req.body.name,
        type: req.body.type ?? 'SHOP',
        street: req.body.street,
        ward: req.body.ward,
        district: req.body.district,
        region: req.body.region,
        postalCode: req.body.postalCode,
        country: req.body.country ?? 'Tanzania',
        latitude: Number(req.body.latitude),
        longitude: Number(req.body.longitude),
        isPrimary: req.body.isPrimary,
        operatingHours: req.body.operatingHours,
        notes: req.body.notes,
      });
      ok(res, this.toDto(location), 201);
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async listLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      if (!sellerId) throw new ValidationError('Seller identity could not be resolved from token');
      const locations = await this.locationUseCase.listLocations(sellerId);
      ok(res, locations.map(l => this.toDto(l)));
    } catch (err) {
      next(err);
    }
  }

  async getLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const location = await this.locationUseCase.getLocation(req.params.locationId, sellerId);
      ok(res, this.toDto(location));
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async updateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const location = await this.locationUseCase.updateLocation(
        req.params.locationId,
        sellerId,
        req.body,
      );
      ok(res, this.toDto(location));
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async deleteLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      // Admin-only — requireRole(['admin']) is enforced at the route level.
      // No seller ownership check — admin can delete any seller's location.
      await this.locationUseCase.adminDeleteLocation(req.params.locationId);
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async deactivateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const location = await this.locationUseCase.updateLocation(
        req.params.locationId,
        sellerId,
        { isActive: false },
      );
      ok(res, this.toDto(location));
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async activateLocation(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const location = await this.locationUseCase.updateLocation(
        req.params.locationId,
        sellerId,
        { isActive: true },
      );
      ok(res, this.toDto(location));
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  // ── Product inventory ────────────────────────────────────────────────────

  async attachProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const qty = Number(req.body.quantityAvailable ?? 0);
      if (isNaN(qty) || qty < 0) throw new ValidationError('quantityAvailable must be a non-negative integer');

      const pl = await this.inventoryUseCase.attachProduct({
        productId: req.params.productId,
        locationId: req.params.locationId,
        sellerId,
        quantityAvailable: qty,
      });
      ok(res, this.toInventoryDto(pl), 201);
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async adjustStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const delta = Number(req.body.delta);
      if (isNaN(delta)) throw new ValidationError('delta must be a number (positive = add, negative = reduce)');

      const pl = await this.inventoryUseCase.adjustStock({
        productId: req.params.productId,
        locationId: req.params.locationId,
        sellerId,
        delta,
      });
      ok(res, this.toInventoryDto(pl));
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async detachProduct(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      await this.inventoryUseCase.detachProduct(
        req.params.productId,
        req.params.locationId,
        sellerId,
      );
      res.status(204).end();
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async transferStock(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const { productId, fromLocationId, toLocationId, quantity, notes } = req.body;
      if (!productId) throw new ValidationError('productId is required');
      if (!fromLocationId) throw new ValidationError('fromLocationId is required');
      if (!toLocationId) throw new ValidationError('toLocationId is required');
      const qty = Number(quantity);
      if (!qty || qty <= 0) throw new ValidationError('quantity must be a positive integer');

      await this.inventoryUseCase.transferStock({
        sellerId,
        productId,
        fromLocationId,
        toLocationId,
        quantity: qty,
        notes,
        initiatedBy: (req as any).user?.userId,
      });
      ok(res, { message: 'Stock transfer completed' });
    } catch (err) {
      if (err instanceof Error && !(err as any).httpStatus) {
        try { classifyError(err); } catch (classified) { return next(classified); }
      }
      next(err);
    }
  }

  async getProductLocations(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const sellerId = getSellerId(req);
      const pls = await this.inventoryUseCase.getProductLocations(req.params.productId, sellerId);
      ok(res, pls.map(pl => this.toInventoryDto(pl)));
    } catch (err) {
      next(err);
    }
  }

  // ── DTO mappers ──────────────────────────────────────────────────────────

  private toDto(location: any) {
    return {
      id: location.id,
      sellerId: location.sellerId,
      name: location.name,
      type: location.type,
      status: location.status,
      address: location.address,
      coordinates: {
        latitude: location.latitude,
        longitude: location.longitude,
      },
      isPrimary: location.isPrimary,
      isActive: location.isActive,
      operatingHours: location.operatingHours ?? null,
      notes: location.notes ?? null,
      displayAddress: location.displayAddress,
      createdAt: location.createdAt,
      updatedAt: location.updatedAt,
    };
  }

  private toInventoryDto(pl: any) {
    return {
      id: pl.id,
      productId: pl.productId,
      locationId: pl.locationId,
      sellerId: pl.sellerId,
      quantityAvailable: pl.quantityAvailable,
      quantityReserved: pl.quantityReserved,
      netAvailable: pl.netAvailable,
      isAvailable: pl.isAvailable,
      updatedAt: pl.updatedAt,
    };
  }
}
