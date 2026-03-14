import { Prisma } from '@prisma/client';
import { StockManager } from '../stock/stockManager';
import { WarehouseManager } from '../warehouse/warehouseManager';
import { EventBus } from '@shared-events/eventBus';
import { StockEngine } from '../../domain/engines/stock.engine';

export interface OrderItem {
  id: string;
  variantId: string;
  quantity: number;
  price: number;
}

export interface ReservationRequest {
  orderId: string;
  items: OrderItem[];
  shippingAddress?: {
    latitude: number;
    longitude: number;
    country: string;
    city: string;
  };
}

export interface ReservationResult {
  success: boolean;
  reservationId?: string;
  reservations?: Array<{
    itemId: string;
    variantId: string;
    warehouseId: string;
    quantityReserved: number;
  }>;
  unavailableItems?: Array<{
    itemId: string;
    variantId: string;
    requestedQuantity: number;
    availableQuantity: number;
  }>;
  expiresAt?: string;
  error?: string;
}

interface ReservationWarehouseAddress {
  coordinates?: {
    lat: number;
    lng: number;
  };
}

interface WarehouseStockItem {
  productVariantId: string;
  quantityAvailable: number;
  reorderPoint?: number;
}

interface WarehouseRecord {
  id: string;
  type: string;
  status: string;
  address: Prisma.JsonValue | ReservationWarehouseAddress;
  operatingHours?: Prisma.JsonValue | null;
  stockItems: WarehouseStockItem[];
}

interface ReservationRecord {
  id: string;
  orderId: string;
  orderItemId: string;
  productVariantId: string;
  warehouseId: string;
  quantityReserved: number;
  status: string;
  createdAt: Date;
  expiresAt: Date;
  fulfilledAt?: Date | null;
  warehouse?: unknown;
  stockItem?: unknown;
}

interface WarehouseDelegate {
  findMany(args: Record<string, unknown>): Promise<WarehouseRecord[]>;
}

interface ReservationDelegate {
  findMany(args: Record<string, unknown>): Promise<ReservationRecord[]>;
  updateMany(args: Record<string, unknown>): Promise<{ count: number }>;
}

interface ReservationEnginePrisma {
  inventory_Warehouse?: WarehouseDelegate;
  warehouse?: WarehouseDelegate;
  inventory_Reservation?: ReservationDelegate;
  reservation?: ReservationDelegate;
}

type RedisReservationMode = 'off' | 'shadow';

interface ReservationRedisClient {
  get(key: string): Promise<string | null>;
  setex(key: string, seconds: number, value: string): Promise<unknown>;
  del(...keys: string[]): Promise<unknown>;
}

export class ReservationEngine {
  private static readonly REDIS_RESERVATION_TTL_SECONDS = 30 * 60;

  constructor(
    private prisma: ReservationEnginePrisma,
    private stockManager: StockManager,
    private warehouseManager: WarehouseManager,
    private eventBus: EventBus,
    private stockEngine?: StockEngine,
    private redisClient?: ReservationRedisClient,
    private redisReservationMode: RedisReservationMode = 'off'
  ) {}

  /**
   * Reserve stock for an order with deadlock prevention and multi-warehouse optimization
   */
  async reserveStock(request: ReservationRequest): Promise<ReservationResult> {
    const { orderId, items, shippingAddress } = request;

    // Sort items by variantId to prevent deadlocks (consistent locking order)
    const sortedItems = items.sort((a, b) => a.variantId.localeCompare(b.variantId));

    const reservations: Array<{
      itemId: string;
      variantId: string;
      warehouseId: string;
      quantityReserved: number;
    }> = [];

    const unavailableItems: Array<{
      itemId: string;
      variantId: string;
      requestedQuantity: number;
      availableQuantity: number;
    }> = [];

    // Track rollbacks for error recovery
    const rollbackOperations: Array<() => Promise<void>> = [];

    try {
      for (const item of sortedItems) {
        // Find optimal warehouse for this item
        const warehouse = await this.selectOptimalWarehouse(
          item.variantId,
          item.quantity,
          shippingAddress
        );

        if (!warehouse) {
          unavailableItems.push({
            itemId: item.id,
            variantId: item.variantId,
            requestedQuantity: item.quantity,
            availableQuantity: 0
          });
          continue;
        }

        // Check if sufficient stock is available
        const stockLevel = await this.stockManager.getStockLevel(item.variantId, warehouse.id);

        if (!stockLevel.length || stockLevel[0].available < item.quantity) {
          unavailableItems.push({
            itemId: item.id,
            variantId: item.variantId,
            requestedQuantity: item.quantity,
            availableQuantity: stockLevel[0]?.available || 0
          });
          continue;
        }

        // Reserve the stock
        await this.stockManager.reserveStock(
          orderId,
          item.id,
          item.variantId,
          warehouse.id,
          item.quantity
        );

        const redisReservationId = await this.tryShadowReserveRedis(orderId, item.variantId, item.quantity);
        if (redisReservationId) {
          rollbackOperations.push(() =>
            this.releaseRedisReservation(orderId, item.variantId, redisReservationId)
          );
        }

        reservations.push({
          itemId: item.id,
          variantId: item.variantId,
          warehouseId: warehouse.id,
          quantityReserved: item.quantity
        });

        // Add rollback operation
        rollbackOperations.push(() =>
          this.stockManager.releaseStock(orderId, 'cancelled')
        );
      }

      // If any items are unavailable, rollback all reservations
      if (unavailableItems.length > 0) {
        await Promise.all(rollbackOperations.map(rollback => rollback()));
        return {
          success: false,
          unavailableItems,
          error: 'Insufficient stock for some items'
        };
      }

      // All reservations successful
      const expiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString(); // 30 minutes

      // Emit reservation confirmation event
      await this.eventBus.emit('StockReserved.v1', {
        orderId,
        reservations,
        expiresAt,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        reservationId: `reservation-${orderId}-${Date.now()}`,
        reservations,
        expiresAt
      };

    } catch (error) {
      // Rollback all successful reservations on error
      console.error('Reservation failed, rolling back:', error);
      await Promise.all(rollbackOperations.map(rollback => rollback()));

      return {
        success: false,
        error: error instanceof Error ? error.message : 'Reservation failed due to system error'
      };
    }
  }

  /**
   * Select optimal warehouse based on multiple factors
   */
  private async selectOptimalWarehouse(
    variantId: string,
    quantity: number,
    shippingAddress?: { latitude: number; longitude: number; country: string; city: string }
  ): Promise<{ id: string; score: number } | null> {
    // Get all warehouses with available stock for this variant
    const warehouses = await this.warehouseDelegate.findMany({
      where: { status: 'active' },
      include: {
        stockItems: {
          where: {
            productVariantId: variantId,
            quantityAvailable: { gte: quantity }
          }
        }
      }
    });

    const candidates = warehouses.filter((warehouse) => warehouse.stockItems.length > 0);

    if (candidates.length === 0) {
      return null;
    }

    // Calculate scores for each warehouse
    const scoredWarehouses = await Promise.all(
      candidates.map(async (warehouse) => {
        const score = await this.calculateWarehouseScore(warehouse, variantId, quantity, shippingAddress);
        return { id: warehouse.id, score };
      })
    );

    // Return warehouse with highest score
    return scoredWarehouses.reduce((best, current) =>
      current.score > best.score ? current : best
    );
  }

  /**
   * Calculate warehouse score based on multiple factors
   */
  private async calculateWarehouseScore(
    warehouse: WarehouseRecord,
    variantId: string,
    quantity: number,
    shippingAddress?: { latitude: number; longitude: number; country: string; city: string }
  ): Promise<number> {
    let score = 0;

    // Factor 1: Geographic proximity (40% weight)
    if (shippingAddress) {
      const address = (warehouse.address ?? {}) as ReservationWarehouseAddress;
      const warehouseCoords = address.coordinates ?? { lat: 0, lng: 0 };
      const distance = await this.calculateDistance(
        warehouseCoords,
        { lat: shippingAddress.latitude, lng: shippingAddress.longitude }
      );

      // Closer warehouses get higher scores
      const proximityScore = Math.max(0, 40 - (distance / 100)); // Max 40 points for <4km
      score += proximityScore;
    } else {
      score += 20; // Neutral score when no shipping address
    }

    // Factor 2: Stock level efficiency (30% weight)
    const stockItem = warehouse.stockItems[0];
    const reorderPoint = Math.max(1, stockItem.reorderPoint ?? 1);
    const stockEfficiency = Math.min(1, stockItem.quantityAvailable / (reorderPoint * 2));
    score += stockEfficiency * 30;

    // Factor 3: Warehouse capacity utilization (15% weight)
    const utilizationScore = await this.calculateCapacityUtilization(warehouse);
    score += utilizationScore * 15;

    // Factor 4: Warehouse type priority (10% weight)
    const typeScore = warehouse.type === 'regional' ? 10 :
                     warehouse.type === 'central' ? 7 : 3;
    score += typeScore;

    // Factor 5: Operational status (5% weight)
    const operationalScore = this.isWarehouseOperational(warehouse) ? 5 : 0;
    score += operationalScore;

    return Math.round(score * 100) / 100; // Round to 2 decimal places
  }

  /**
   * Calculate distance between warehouse and shipping address
   */
  private async calculateDistance(
    warehouseCoords: { lat: number; lng: number },
    shippingCoords: { lat: number; lng: number }
  ): Promise<number> {
    // Great-circle distance (spherical law of cosines)
    const earthRadiusKm = 6371;
    const lat1 = this.toRadians(warehouseCoords.lat);
    const lat2 = this.toRadians(shippingCoords.lat);
    const deltaLon = this.toRadians(shippingCoords.lng - warehouseCoords.lng);

    const cosineCentralAngle =
      Math.sin(lat1) * Math.sin(lat2) +
      Math.cos(lat1) * Math.cos(lat2) * Math.cos(deltaLon);
    const normalized = Math.min(1, Math.max(-1, cosineCentralAngle));

    return earthRadiusKm * Math.acos(normalized);
  }

  /**
   * Calculate warehouse capacity utilization
   */
  private async calculateCapacityUtilization(warehouse: any): Promise<number> {
    // Simplified capacity calculation
    // In production, this would consider current vs max capacity
    return 0.7; // Assume 70% utilization
  }

  /**
   * Check if warehouse is operational
   */
  private isWarehouseOperational(warehouse: any): boolean {
    const now = new Date();
    const currentHour = now.getHours();

    // Check if within operating hours
    if (warehouse.operatingHours) {
      // Simplified check - in production would parse operating hours JSON
      return currentHour >= 8 && currentHour <= 18; // Assume 8 AM - 6 PM
    }

    return true; // Assume operational if no hours specified
  }

  /**
   * Release expired reservations
   */
  async releaseExpiredReservations(): Promise<number> {
    const expiredReservations = await this.reservationDelegate.findMany({
      where: {
        status: 'active',
        expiresAt: { lt: new Date() }
      }
    });

    for (const reservation of expiredReservations) {
      await this.stockManager.releaseStock(reservation.orderId, 'expired');
      await this.releaseRedisReservationByRecord(reservation).catch((error) => {
        console.error('Failed to release Redis reservation (expired):', error);
      });
    }

    return expiredReservations.length;
  }

  /**
   * Get active reservations for an order
   */
  async getActiveReservations(orderId: string): Promise<ReservationRecord[]> {
    return await this.reservationDelegate.findMany({
      where: {
        orderId,
        status: 'active'
      },
      include: {
        warehouse: true,
        stockItem: true
      }
    });
  }

  /**
   * Cancel reservations for an order
   */
  async cancelReservations(orderId: string): Promise<void> {
    const activeReservations = await this.getActiveReservations(orderId);
    await this.stockManager.releaseStock(orderId, 'cancelled');
    await this.releaseRedisReservations(orderId, activeReservations).catch((error) => {
      console.error('Failed to release Redis reservations (cancelled):', error);
    });

    // Emit cancellation event
    await this.eventBus.emit('StockReleased.v1', {
      orderId,
      reason: 'cancelled',
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Fulfill reservations (convert to actual stock reduction)
   */
  async fulfillReservations(orderId: string): Promise<void> {
    const reservations = await this.getActiveReservations(orderId);

    // Update reservation status
    await this.reservationDelegate.updateMany({
      where: { orderId, status: 'active' },
      data: { status: 'fulfilled', fulfilledAt: new Date() }
    });

    // Actually reduce stock (reservations are already accounted for)
    const items = reservations.map(r => ({
      variantId: r.productVariantId,
      warehouseId: r.warehouseId,
      quantity: r.quantityReserved
    }));

    await this.stockManager.reduceStock(orderId, items);
    await this.releaseRedisReservations(orderId, reservations).catch((error) => {
      console.error('Failed to release Redis reservations (fulfilled):', error);
    });
  }

  /**
   * Utility function to convert degrees to radians
   */
  private shouldUseRedisReservations(): boolean {
    return this.redisReservationMode !== 'off' && !!this.stockEngine && !!this.redisClient;
  }

  private buildRedisReservationKey(orderId: string, variantId: string): string {
    return `inventory:reservation:order:${orderId}:variant:${variantId}`;
  }

  private async tryShadowReserveRedis(orderId: string, variantId: string, quantity: number): Promise<string | null> {
    if (!this.shouldUseRedisReservations() || !this.stockEngine || !this.redisClient) {
      return null;
    }

    try {
      const reservation = await this.stockEngine.reserveStock(variantId, quantity, orderId);
      const key = this.buildRedisReservationKey(orderId, variantId);
      await this.redisClient.setex(key, ReservationEngine.REDIS_RESERVATION_TTL_SECONDS, reservation.reservationId);
      return reservation.reservationId;
    } catch (error) {
      console.error('Redis reservation shadow write failed:', error);
      return null;
    }
  }

  private async releaseRedisReservation(orderId: string, variantId: string, reservationId?: string | null): Promise<void> {
    if (!this.shouldUseRedisReservations() || !this.stockEngine || !this.redisClient) {
      return;
    }

    const key = this.buildRedisReservationKey(orderId, variantId);
    const id = reservationId || await this.redisClient.get(key);

    try {
      if (id) {
        await this.stockEngine.releaseReservation(id);
      }
    } finally {
      await this.redisClient.del(key);
    }
  }

  private async releaseRedisReservations(orderId: string, reservations: ReservationRecord[]): Promise<void> {
    if (!this.shouldUseRedisReservations()) {
      return;
    }

    for (const reservation of reservations) {
      await this.releaseRedisReservation(orderId, reservation.productVariantId);
    }
  }

  private async releaseRedisReservationByRecord(reservation: ReservationRecord): Promise<void> {
    if (!this.shouldUseRedisReservations()) {
      return;
    }

    await this.releaseRedisReservation(reservation.orderId, reservation.productVariantId);
  }

  private toRadians(degrees: number): number {
    return degrees * (Math.PI / 180);
  }

  private get warehouseDelegate(): WarehouseDelegate {
    const delegate = this.prisma.inventory_Warehouse ?? this.prisma.warehouse;
    if (!delegate) {
      throw new Error('Warehouse delegate is not configured on prisma client');
    }
    return delegate;
  }

  private get reservationDelegate(): ReservationDelegate {
    const delegate = this.prisma.inventory_Reservation ?? this.prisma.reservation;
    if (!delegate) {
      throw new Error('Reservation delegate is not configured on prisma client');
    }
    return delegate;
  }
}
