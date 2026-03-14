jest.mock('@shared-events/eventBus', () => ({
  eventBus: {
    subscribe: jest.fn(),
    publish: jest.fn()
  }
}));

import { eventBus } from '@shared-events/eventBus';
import { PaymentEventHandlers } from './payment.event-handlers';

const mockedEventBus = eventBus as unknown as {
  subscribe: jest.Mock;
  publish: jest.Mock;
};

describe('PaymentEventHandlers', () => {
  const setup = () => {
    const paymentRepository = {
      findById: jest.fn(),
      findByUserId: jest.fn(),
      update: jest.fn()
    };

    const handlers = new PaymentEventHandlers(paymentRepository as never);
    return { handlers, paymentRepository };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockedEventBus.publish.mockResolvedValue(undefined);
  });

  it('registers all expected event subscriptions', () => {
    const { handlers } = setup();

    handlers.registerHandlers();

    expect(mockedEventBus.subscribe).toHaveBeenCalledTimes(13);
    expect(mockedEventBus.subscribe).toHaveBeenCalledWith(
      'TransactionDetailsRequested',
      expect.objectContaining({ name: 'payment-tx-details', handler: expect.any(Function) })
    );
    expect(mockedEventBus.subscribe).toHaveBeenCalledWith(
      'SupplierPaymentRequested',
      expect.objectContaining({ name: 'payment-supplier-req', handler: expect.any(Function) })
    );
  });

  it('publishes transaction details with related transactions when requested', async () => {
    const { handlers, paymentRepository } = setup();
    paymentRepository.findById.mockResolvedValue({ id: 'tx-1', userId: 'user-1' });
    paymentRepository.findByUserId.mockResolvedValue([{ id: 'tx-2' }]);

    await (handlers as any).handleTransactionDetailsRequested({
      data: {
        transactionId: 'tx-1',
        adminId: 'admin-1',
        includeRelatedTransactions: true
      },
      metadata: { correlationId: 'corr-1' }
    });

    expect(paymentRepository.findById).toHaveBeenCalledWith('tx-1');
    expect(paymentRepository.findByUserId).toHaveBeenCalledWith('user-1', 10);
    expect(mockedEventBus.publish).toHaveBeenCalledWith(
      'TransactionDetailsFetched',
      expect.objectContaining({
        transactionId: 'tx-1',
        relatedTransactions: [{ id: 'tx-2' }],
        adminId: 'admin-1'
      }),
      { correlationId: 'corr-1' }
    );
  });

  it('publishes failure when transaction details lookup fails', async () => {
    const { handlers, paymentRepository } = setup();
    paymentRepository.findById.mockResolvedValue(null);

    await (handlers as any).handleTransactionDetailsRequested({
      data: { transactionId: 'missing-tx' },
      metadata: { correlationId: 'corr-2' }
    });

    expect(mockedEventBus.publish).toHaveBeenCalledWith(
      'TransactionDetailsFetchFailed',
      expect.objectContaining({
        transactionId: 'missing-tx',
        error: 'Transaction not found'
      }),
      { correlationId: 'corr-2' }
    );
  });

  it('blocks transaction, updates repository, and publishes processed event', async () => {
    const { handlers, paymentRepository } = setup();
    const payment = {
      markAsFailed: jest.fn(),
      updateMetadata: jest.fn()
    };
    paymentRepository.findById.mockResolvedValue(payment);
    paymentRepository.update.mockResolvedValue(undefined);

    await (handlers as any).handleTransactionBlocked({
      data: { transactionId: 'tx-9', adminId: 'admin-9', reason: 'fraud' },
      metadata: { correlationId: 'corr-9' }
    });

    expect(payment.markAsFailed).toHaveBeenCalledWith('Blocked by admin: fraud');
    expect(payment.updateMetadata).toHaveBeenCalledWith(
      expect.objectContaining({
        blockedBy: 'admin-9',
        blockReason: 'fraud',
        blockedAt: expect.any(Date)
      })
    );
    expect(paymentRepository.update).toHaveBeenCalledWith(payment);
    expect(mockedEventBus.publish).toHaveBeenCalledWith(
      'TransactionBlockProcessed',
      { transactionId: 'tx-9', adminId: 'admin-9' },
      { correlationId: 'corr-9' }
    );
  });

  it('publishes block failure when transaction is missing', async () => {
    const { handlers, paymentRepository } = setup();
    paymentRepository.findById.mockResolvedValue(null);

    await (handlers as any).handleTransactionBlocked({
      data: { transactionId: 'tx-missing', adminId: 'admin-2', reason: 'risk' },
      metadata: { correlationId: 'corr-10' }
    });

    expect(mockedEventBus.publish).toHaveBeenCalledWith(
      'TransactionBlockFailed',
      expect.objectContaining({ transactionId: 'tx-missing', error: 'Transaction not found' }),
      { correlationId: 'corr-10' }
    );
  });

  it('publishes gathered dispute evidence and failure fallback', async () => {
    const { handlers, paymentRepository } = setup();
    paymentRepository.findById.mockResolvedValue({
      status: 'COMPLETED',
      amount: 5000,
      createdAt: new Date('2026-03-01T00:00:00.000Z')
    });

    await (handlers as any).handleDisputeEvidenceRequested({
      data: { transactionId: 'tx-11', disputeId: 'disp-1' },
      metadata: { correlationId: 'corr-11' }
    });

    expect(mockedEventBus.publish).toHaveBeenCalledWith(
      'DisputeEvidenceGathered',
      expect.objectContaining({
        disputeId: 'disp-1',
        transactionId: 'tx-11',
        evidence: expect.objectContaining({
          status: 'COMPLETED',
          amount: 5000
        })
      }),
      { correlationId: 'corr-11' }
    );

    paymentRepository.findById.mockResolvedValueOnce(null);
    await (handlers as any).handleDisputeEvidenceRequested({
      data: { transactionId: 'tx-missing', disputeId: 'disp-2' },
      metadata: { correlationId: 'corr-12' }
    });
    expect(mockedEventBus.publish).toHaveBeenCalledWith(
      'DisputeEvidenceGatheringFailed',
      expect.objectContaining({ disputeId: 'disp-2', error: 'Transaction not found' }),
      { correlationId: 'corr-12' }
    );
  });
});
