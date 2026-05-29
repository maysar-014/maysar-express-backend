import { PrismaCheckoutRepository } from './prisma-checkout.repository';

const buildPrismaMock = () => ({
  checkout_CheckoutSession: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    delete: jest.fn(),
    deleteMany: jest.fn(),
  },
});

describe('PrismaCheckoutRepository', () => {
  it('saves and reads checkout sessions using the prisma delegate', async () => {
    const prisma = buildPrismaMock();
    prisma.checkout_CheckoutSession.findUnique.mockResolvedValue({
      id: 'session-1',
      cartId: 'cart-1',
      userId: 'user-1',
      enablerId: 'enabler-1',
      enablerCode: 'ENCODE-1',
      shippingAddressId: 'ship-1',
      billingAddressId: 'bill-1',
      shippingMethodId: 'method-1',
      shippingCost: '12.50',
      subtotal: '100.00',
      taxAmount: '5.00',
      discountAmount: '2.00',
      totalAmount: '115.50',
      status: 'PENDING',
      paymentMethodId: 'pay-1',
      paymentStatus: 'INITIATED',
      metadata: { items: [{ productId: 'p1', quantity: 1, priceAtTime: 100 }] },
      items: [{ productId: 'p1', quantity: 1, priceAtTime: 100 }],
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T01:00:00.000Z'),
    });

    const repository = new PrismaCheckoutRepository(prisma as never);
    const session = await repository.getCheckoutSession('session-1');

    expect(session).toMatchObject({
      id: 'session-1',
      cartId: 'cart-1',
      userId: 'user-1',
      status: 'PENDING',
      paymentStatus: 'INITIATED',
    });

    await repository.saveCheckoutSession({
      id: 'session-1',
      cartId: 'cart-1',
      userId: 'user-1',
      shippingAddressId: 'ship-1',
      billingAddressId: 'bill-1',
      shippingMethodId: 'method-1',
      shippingCost: 12.5,
      subtotal: 100,
      taxAmount: 5,
      discountAmount: 2,
      totalAmount: 115.5,
      status: 'PENDING',
      metadata: { items: [{ productId: 'p1', quantity: 1, priceAtTime: 100 }] },
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T01:00:00.000Z'),
    });

    expect(prisma.checkout_CheckoutSession.upsert).toHaveBeenCalledWith({
      where: { id: 'session-1' },
      update: expect.objectContaining({
        totalAmount: 115.5,
      }),
      create: expect.objectContaining({
        id: 'session-1',
        totalAmount: 115.5,
      }),
    });
  });

  it('falls back to in-memory semantics when the prisma delegate is missing', async () => {
    const prisma = {};
    const repository = new PrismaCheckoutRepository(prisma as never);

    await repository.saveCheckoutSession({
      id: 'session-2',
      cartId: 'cart-2',
      userId: 'user-2',
      shippingAddressId: 'ship-2',
      billingAddressId: 'bill-2',
      shippingMethodId: 'method-2',
      shippingCost: 10,
      subtotal: 50,
      taxAmount: 5,
      discountAmount: 0,
      expiresAt: new Date('2026-01-02T00:00:00.000Z'),
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    await expect(repository.getCheckoutSession('session-2')).resolves.toMatchObject({
      id: 'session-2',
      cartId: 'cart-2',
      userId: 'user-2',
    });
    await repository.deleteCheckoutSession('session-2');
    await repository.clearExpiredSessions(new Date('2026-01-03T00:00:00.000Z'));
  });
});
