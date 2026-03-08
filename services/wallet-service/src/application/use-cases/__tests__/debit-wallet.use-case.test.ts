import { DebitWalletDTO, DebitWalletUseCase } from '../debit-wallet.use-case';
import { ActorType, AuditInfo } from '../../../domain/value-objects/audit-info.value-object';
import { RedisLock } from '../../../../../../shared/locking/redis-lock';

describe('DebitWalletUseCase', () => {
    const mockWalletRepository = {
        findByUserId: jest.fn(),
        update: jest.fn(),
    };
    const mockTransactionRepository = {
        save: jest.fn(),
        findByUserId: jest.fn(),
    };
    const mockWalletEngine = {
        validateTransaction: jest.fn(),
    };
    const mockLimitPolicy = {
        canDebit: jest.fn(),
    };
    const mockVelocityService = {
        checkVelocity: jest.fn(),
    };
    const mockIdempotencyService = {
        checkIdempotency: jest.fn(),
        storeResult: jest.fn(),
    };
    const mockEventPublisher = {
        publishWalletDebited: jest.fn(),
    };
    const mockAuditRepository = {
        save: jest.fn(),
    };
    const mockRedisLock = {
        withLock: jest.fn((_: string, callback: () => Promise<unknown>) => callback()),
    } as unknown as RedisLock;

    let useCase: DebitWalletUseCase;

    const createDto = (): DebitWalletDTO => ({
        userId: 'user-1',
        amount: 30,
        currency: 'TZS',
        description: 'purchase',
        idempotencyKey: 'idem-1',
        correlationId: 'corr-1',
        auditInfo: AuditInfo.create({
            actor: 'user-1',
            actorType: ActorType.USER,
            action: 'DEBIT',
            reason: 'Order payment',
        }),
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockIdempotencyService.checkIdempotency.mockResolvedValue(null);
        mockTransactionRepository.findByUserId.mockResolvedValue([]);
        mockLimitPolicy.canDebit.mockReturnValue({ allowed: true });
        mockVelocityService.checkVelocity.mockResolvedValue({ decision: 'ALLOW', riskScore: 0, reason: 'ok' });
        mockWalletEngine.validateTransaction.mockReturnValue({ isValid: true, errors: [] });

        useCase = new DebitWalletUseCase(
            mockWalletRepository as unknown as never,
            mockTransactionRepository as unknown as never,
            mockWalletEngine as unknown as never,
            mockLimitPolicy as unknown as never,
            mockVelocityService as unknown as never,
            mockIdempotencyService as unknown as never,
            mockEventPublisher as unknown as never,
            mockAuditRepository as unknown as never,
            mockRedisLock
        );
    });

    it('debits wallet successfully', async () => {
        const wallet = {
            id: 'wallet-1',
            userId: 'user-1',
            balance: 100,
            frozenAmount: 0,
            currency: 'TZS',
            debit(amount: number) {
                this.balance -= amount;
            },
        };
        mockWalletRepository.findByUserId.mockResolvedValue(wallet);

        const result = await useCase.execute(createDto());

        expect(result.success).toBe(true);
        expect(result.balanceAfter).toBe(70);
        expect(mockWalletRepository.update).toHaveBeenCalled();
        expect(mockEventPublisher.publishWalletDebited).toHaveBeenCalled();
    });

    it('returns failure when wallet is missing', async () => {
        mockWalletRepository.findByUserId.mockResolvedValue(null);

        const result = await useCase.execute(createDto());

        expect(result.success).toBe(false);
        expect(result.message).toContain('Wallet not found');
    });
});
