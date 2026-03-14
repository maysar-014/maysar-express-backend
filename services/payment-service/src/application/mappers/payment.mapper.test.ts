import { PaymentMapper } from './payment.mapper';
import {
  Payment,
  PaymentMethod,
  PaymentProvider,
  PaymentStatus
} from '../../domain/entities/payment.entity';

const buildPayment = (providerReference?: string): Payment =>
  new Payment({
    id: 'pay-1',
    orderId: 'ord-1',
    userId: 'user-1',
    amount: 120000,
    currency: 'TZS',
    method: PaymentMethod.MPESA,
    provider: PaymentProvider.PESAPAL,
    status: PaymentStatus.COMPLETED,
    metadata: {
      providerReference
    },
    createdAt: new Date('2026-01-01T00:00:00.000Z'),
    updatedAt: new Date('2026-01-01T01:00:00.000Z')
  });

describe('PaymentMapper', () => {
  it('maps a payment entity into a payment response dto', () => {
    const dto = PaymentMapper.toDto(buildPayment('PESAPAL-REF-1'));

    expect(dto).toEqual({
      id: 'pay-1',
      orderId: 'ord-1',
      userId: 'user-1',
      amount: 120000,
      currency: 'TZS',
      status: PaymentStatus.COMPLETED,
      method: PaymentMethod.MPESA,
      providerReference: 'PESAPAL-REF-1',
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T01:00:00.000Z')
    });
  });

  it('preserves undefined provider reference when metadata is missing one', () => {
    const dto = PaymentMapper.toDto(buildPayment(undefined));
    expect(dto.providerReference).toBeUndefined();
  });
});

