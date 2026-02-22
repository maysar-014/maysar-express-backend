import { v4 as uuidv4 } from 'uuid';

export interface StockItemFactoryProps {
  id?: string;
  productVariantId?: string;
  warehouseId?: string;
  quantityAvailable?: number;
  quantityReserved?: number;
  reorderPoint?: number;
  maxStock?: number;
  unitCost?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

export class StockItemFactory {
  static create(overrides: StockItemFactoryProps = {}) {
    const now = new Date();
    
    return {
      id: overrides.id ?? uuidv4(),
      productVariantId: overrides.productVariantId ?? uuidv4(),
      warehouseId: overrides.warehouseId ?? 'warehouse-main',
      quantityAvailable: overrides.quantityAvailable ?? 100,
      quantityReserved: overrides.quantityReserved ?? 0,
      reorderPoint: overrides.reorderPoint ?? 20,
      maxStock: overrides.maxStock ?? 1000,
      unitCost: overrides.unitCost ?? 5000,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now
    };
  }

  static createLowStock(overrides: StockItemFactoryProps = {}) {
    return this.create({
      ...overrides,
      quantityAvailable: 15,
      reorderPoint: 20
    });
  }

  static createOutOfStock(overrides: StockItemFactoryProps = {}) {
    return this.create({
      ...overrides,
      quantityAvailable: 0,
      quantityReserved: 0
    });
  }

  static createHighStock(overrides: StockItemFactoryProps = {}) {
    return this.create({
      ...overrides,
      quantityAvailable: 800,
      maxStock: 1000
    });
  }

  static createWithReservations(overrides: StockItemFactoryProps = {}) {
    return this.create({
      ...overrides,
      quantityAvailable: 100,
      quantityReserved: 30
    });
  }
}

export interface ReservationFactoryProps {
  id?: string;
  orderId?: string;
  orderItemId?: string;
  productVariantId?: string;
  warehouseId?: string;
  quantityReserved?: number;
  status?: string;
  expiresAt?: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

export class ReservationFactory {
  static create(overrides: ReservationFactoryProps = {}) {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 1800000); // 30 minutes from now
    
    return {
      id: overrides.id ?? uuidv4(),
      orderId: overrides.orderId ?? uuidv4(),
      orderItemId: overrides.orderItemId ?? uuidv4(),
      productVariantId: overrides.productVariantId ?? uuidv4(),
      warehouseId: overrides.warehouseId ?? 'warehouse-main',
      quantityReserved: overrides.quantityReserved ?? 10,
      status: overrides.status ?? 'active',
      expiresAt: overrides.expiresAt ?? expiresAt,
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now
    };
  }

  static createExpired(overrides: ReservationFactoryProps = {}) {
    const pastDate = new Date(Date.now() - 3600000); // 1 hour ago
    return this.create({
      ...overrides,
      expiresAt: pastDate,
      status: 'expired'
    });
  }

  static createFulfilled(overrides: ReservationFactoryProps = {}) {
    return this.create({
      ...overrides,
      status: 'fulfilled'
    });
  }

  static createCancelled(overrides: ReservationFactoryProps = {}) {
    return this.create({
      ...overrides,
      status: 'cancelled'
    });
  }
}

export interface WarehouseFactoryProps {
  id?: string;
  code?: string;
  name?: string;
  type?: string;
  status?: string;
  address?: any;
  capacity?: number;
  operatingHours?: any;
  createdAt?: Date;
  updatedAt?: Date;
}

export class WarehouseFactory {
  static create(overrides: WarehouseFactoryProps = {}) {
    const now = new Date();
    
    return {
      id: overrides.id ?? uuidv4(),
      code: overrides.code ?? `WH-${Date.now()}`,
      name: overrides.name ?? 'Main Warehouse',
      type: overrides.type ?? 'DISTRIBUTION',
      status: overrides.status ?? 'ACTIVE',
      address: overrides.address ?? {
        street: '123 Warehouse St',
        city: 'Dar es Salaam',
        region: 'Dar es Salaam',
        country: 'Tanzania',
        postalCode: '12345'
      },
      capacity: overrides.capacity ?? 10000,
      operatingHours: overrides.operatingHours ?? {
        monday: { open: '08:00', close: '18:00' },
        tuesday: { open: '08:00', close: '18:00' },
        wednesday: { open: '08:00', close: '18:00' },
        thursday: { open: '08:00', close: '18:00' },
        friday: { open: '08:00', close: '18:00' },
        saturday: { open: '09:00', close: '14:00' },
        sunday: { closed: true }
      },
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now
    };
  }

  static createFulfillmentCenter(overrides: WarehouseFactoryProps = {}) {
    return this.create({
      ...overrides,
      type: 'FULFILLMENT',
      name: 'Fulfillment Center'
    });
  }

  static createRetailStore(overrides: WarehouseFactoryProps = {}) {
    return this.create({
      ...overrides,
      type: 'RETAIL',
      name: 'Retail Store'
    });
  }

  static createInactive(overrides: WarehouseFactoryProps = {}) {
    return this.create({
      ...overrides,
      status: 'INACTIVE'
    });
  }
}
