export interface CanReserveResult {
  allowed: boolean;
  reason?: string;
}

export class StockPolicy {
  static canReserve(totalStock: number, availableStock: number, requestedQuantity: number): CanReserveResult {
    if (requestedQuantity <= 0) {
      return { allowed: false, reason: 'Requested quantity must be positive' };
    }

    if (availableStock < requestedQuantity) {
      return { allowed: false, reason: 'Insufficient available stock' };
    }

    if (totalStock < 0 || availableStock < 0) {
      return { allowed: false, reason: 'Stock values must be non-negative' };
    }

    return { allowed: true };
  }

  static shouldReorder(currentStock: number, reorderPoint: number): boolean {
    return currentStock <= reorderPoint;
  }

  static calculateReorderQuantity(currentStock: number, reorderPoint: number, maxStock: number): number {
    const targetStock = Math.max(reorderPoint, maxStock);
    return Math.max(0, targetStock - currentStock);
  }
}
