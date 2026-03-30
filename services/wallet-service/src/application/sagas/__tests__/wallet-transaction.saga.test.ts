import { WalletTransactionSaga, WalletSagaContext } from '../wallet-transaction.saga';

const mockSagaLogRepo = {
    update: jest.fn(),
    save: jest.fn()
};

const mockCredit = { execute: jest.fn() };
const mockDebit = { execute: jest.fn() };
const mockPlaceHold = { execute: jest.fn() };
const mockReleaseHold = { execute: jest.fn() };
const mockReverse = { execute: jest.fn() };
const mockEventPublisher = {
    publishWalletPaymentFailed: jest.fn(),
    publishWalletPaymentProcessed: jest.fn()
};

describe('WalletTransactionSaga', () => {
    let saga: WalletTransactionSaga;

    beforeEach(() => {
        jest.clearAllMocks();
        saga = new WalletTransactionSaga(
            mockSagaLogRepo as any,
            'wallet-service',
            mockCredit as any,
            mockDebit as any,
            mockPlaceHold as any,
            mockReleaseHold as any,
            mockReverse as any,
            mockEventPublisher as any
        );
    });

    // Helper to access protected getSagaOrThrow
    const mockGetSaga = (context: any) => {
        // @ts-ignore
        saga.getSagaOrThrow = jest.fn().mockResolvedValue({ context });
    };

    const basePayload = {
        transactionId: 't1',
        userId: 'u1',
        amount: 100,
        currency: 'TZS',
        idempotencyKey: 'key',
        correlationId: 'corr',
        auditInfo: {}
    };

    describe('ExecuteTransaction Step', () => {
        const getStep = () => (saga as any).defineSteps()[0];

        it('should execute CREDIT', async () => {
            const context = { ...basePayload, type: 'CREDIT' };
            mockGetSaga(context);
            mockCredit.execute.mockResolvedValue({ transactionId: 'tx-1' });

            await getStep().execute(basePayload, 'saga-1');

            expect(mockCredit.execute).toHaveBeenCalled();
            expect(mockSagaLogRepo.update).toHaveBeenCalledWith('saga-1', expect.objectContaining({
                context: expect.objectContaining({ resultTransactionId: 'tx-1' })
            }));
        });

        it('should execute DEBIT', async () => {
            const context = { ...basePayload, type: 'DEBIT' };
            mockGetSaga(context);
            mockDebit.execute.mockResolvedValue({ success: true, transactionId: 'tx-d' });

            await getStep().execute(basePayload, 'saga-1');

            expect(mockDebit.execute).toHaveBeenCalled();
        });

        it('should throw if DEBIT fails', async () => {
            const context = { ...basePayload, type: 'DEBIT' };
            mockGetSaga(context);
            mockDebit.execute.mockResolvedValue({ success: false, message: 'Fail' });

            await expect(getStep().execute(basePayload, 'saga-1'))
                .rejects.toThrow('Fail');
        });

        it('should execute HOLD', async () => {
            const context = { ...basePayload, type: 'HOLD' };
            mockGetSaga(context);
            mockPlaceHold.execute.mockResolvedValue({ holdId: 'h-1' });

            await getStep().execute(basePayload, 'saga-1');

            expect(mockPlaceHold.execute).toHaveBeenCalled();
            expect(mockSagaLogRepo.update).toHaveBeenCalledWith('saga-1', expect.objectContaining({
                context: expect.objectContaining({ resultHoldId: 'h-1' })
            }));
        });
    });

    describe('Compensation', () => {
        const getStep = () => (saga as any).defineSteps()[0];

        it('should compensate CREDIT/DEBIT with Reverse', async () => {
            const context = {
                ...basePayload,
                type: 'CREDIT',
                resultTransactionId: 'tx-1'
            };
            mockGetSaga(context);

            await getStep().compensate(basePayload, 'saga-1');

            expect(mockReverse.execute).toHaveBeenCalledWith(expect.objectContaining({
                transactionId: 'tx-1'
            }));
        });

        it('should compensate HOLD with Release', async () => {
            const context = {
                ...basePayload,
                type: 'HOLD',
                resultHoldId: 'h-1'
            };
            mockGetSaga(context);

            await getStep().compensate(basePayload, 'saga-1');

            expect(mockReleaseHold.execute).toHaveBeenCalledWith(expect.objectContaining({
                holdId: 'h-1'
            }));
        });
    });
});
