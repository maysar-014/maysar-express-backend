import type {
  CreatePaymentDto,
  PaymentResponseDto,
  RefundPaymentDto
} from './payment.dto';

describe('payment DTO contracts', () => {
  it('supports create payment payload shape', () => {
    const dto: CreatePaymentDto = {
      orderId: 'order-1',
      userId: 'user-1',
      amount: 22000,
      currency: 'TZS',
      method: 'MOBILE_MONEY',
      customerInfo: {
        phoneNumber: '+255712345678',
        name: 'Amina'
      },
      metadata: { source: 'checkout' }
    };

    expect(dto.customerInfo.phoneNumber).toBe('+255712345678');
    expect(dto.metadata?.source).toBe('checkout');
  });

  it('supports refund and payment response payloads', () => {
    const refund: RefundPaymentDto = {
      paymentId: 'payment-1',
      amount: 5000,
      reason: 'Duplicate charge',
      requestedBy: 'admin-1'
    };
    const response: PaymentResponseDto = {
      id: 'payment-1',
      orderId: 'order-1',
      userId: 'user-1',
      amount: 22000,
      currency: 'TZS',
      status: 'COMPLETED',
      method: 'MOBILE_MONEY',
      createdAt: new Date('2026-02-02T00:00:00.000Z'),
      updatedAt: new Date('2026-02-02T00:10:00.000Z')
    };

    expect(refund.reason).toBe('Duplicate charge');
    expect(response.status).toBe('COMPLETED');
  });
});
