import { v4 as uuidv4 } from 'uuid';

export interface PaymentFactoryProps {
  id?: string;
  orderId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  status?: string;
  providerId?: string;
  providerTransactionId?: string;
  metadata?: Record<string, any>;
  createdAt?: Date;
  updatedAt?: Date;
  completedAt?: Date | null;
  failedAt?: Date | null;
  failureReason?: string | null;
}

export class PaymentFactory {
  static create(overrides: PaymentFactoryProps = {}) {
    const now = new Date();
    
    return {
      id: overrides.id ?? uuidv4(),
      orderId: overrides.orderId ?? uuidv4(),
      userId: overrides.userId ?? uuidv4(),
      amount: overrides.amount ?? 50000,
      currency: overrides.currency ?? 'TZS',
      paymentMethod: overrides.paymentMethod ?? 'MPESA',
      status: overrides.status ?? 'PENDING',
      providerId: overrides.providerId ?? 'mpesa-provider',
      providerTransactionId: overrides.providerTransactionId ?? null,
      metadata: overrides.metadata ?? {
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
        deviceFingerprint: 'device-123'
      },
      createdAt: overrides.createdAt ?? now,
      updatedAt: overrides.updatedAt ?? now,
      completedAt: overrides.completedAt ?? null,
      failedAt: overrides.failedAt ?? null,
      failureReason: overrides.failureReason ?? null
    };
  }

  static createMpesa(overrides: PaymentFactoryProps = {}) {
    return this.create({
      ...overrides,
      paymentMethod: 'MPESA',
      providerId: 'mpesa-provider'
    });
  }

  static createTigoPesa(overrides: PaymentFactoryProps = {}) {
    return this.create({
      ...overrides,
      paymentMethod: 'TIGO_PESA',
      providerId: 'tigopesa-provider'
    });
  }

  static createAirtelMoney(overrides: PaymentFactoryProps = {}) {
    return this.create({
      ...overrides,
      paymentMethod: 'AIRTEL_MONEY',
      providerId: 'airtelmoney-provider'
    });
  }

  static createCompleted(overrides: PaymentFactoryProps = {}) {
    const now = new Date();
    return this.create({
      ...overrides,
      status: 'COMPLETED',
      providerTransactionId: `txn-${Date.now()}`,
      completedAt: now
    });
  }

  static createFailed(overrides: PaymentFactoryProps = {}) {
    const now = new Date();
    return this.create({
      ...overrides,
      status: 'FAILED',
      failedAt: now,
      failureReason: overrides.failureReason ?? 'Insufficient funds'
    });
  }

  static createProcessing(overrides: PaymentFactoryProps = {}) {
    return this.create({
      ...overrides,
      status: 'PROCESSING',
      providerTransactionId: `txn-${Date.now()}`
    });
  }

  static createLargeAmount(overrides: PaymentFactoryProps = {}) {
    return this.create({
      ...overrides,
      amount: 5000000 // 5 million TZS
    });
  }

  static createSmallAmount(overrides: PaymentFactoryProps = {}) {
    return this.create({
      ...overrides,
      amount: 1000 // 1000 TZS
    });
  }
}

export interface TransactionDataFactoryProps {
  transactionId?: string;
  userId?: string;
  amount?: number;
  currency?: string;
  paymentMethod?: string;
  ipAddress?: string;
  deviceFingerprint?: string;
  billingAddress?: any;
  shippingAddress?: any;
  timestamp?: Date;
}

export class TransactionDataFactory {
  static create(overrides: TransactionDataFactoryProps = {}) {
    return {
      transactionId: overrides.transactionId ?? uuidv4(),
      userId: overrides.userId ?? uuidv4(),
      amount: overrides.amount ?? 50000,
      currency: overrides.currency ?? 'TZS',
      paymentMethod: overrides.paymentMethod ?? 'MPESA',
      ipAddress: overrides.ipAddress ?? '192.168.1.1',
      deviceFingerprint: overrides.deviceFingerprint ?? `device-${Date.now()}`,
      billingAddress: overrides.billingAddress ?? {
        street: '123 Main St',
        city: 'Dar es Salaam',
        country: 'TZ'
      },
      shippingAddress: overrides.shippingAddress ?? {
        street: '123 Main St',
        city: 'Dar es Salaam',
        country: 'TZ'
      },
      timestamp: overrides.timestamp ?? new Date()
    };
  }

  static createHighRisk(overrides: TransactionDataFactoryProps = {}) {
    return this.create({
      ...overrides,
      amount: 10000000, // Very large amount
      deviceFingerprint: 'new-device-unknown'
    });
  }

  static createLowRisk(overrides: TransactionDataFactoryProps = {}) {
    return this.create({
      ...overrides,
      amount: 10000,
      deviceFingerprint: 'known-device-123'
    });
  }
}
