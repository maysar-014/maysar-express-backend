import { CreditWalletDTO, CreditWalletUseCase } from '../credit-wallet.use-case';
import { ActorType, AuditInfo } from '../../../domain/value-objects/audit-info.value-object';
import { RedisLock } from '../../../../../../shared/locking/redis-lock';

describe('CreditWalletUseCase', () => {
    const mockWalletRepository = {
        findByUserId: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
    };
    const mockTransactionRepository = {
        save: jest.fn(),
    };
    const mockIdempotencyService = {
        checkIdempotency: jest.fn(),
        storeResult: jest.fn(),
    };
    const mockEventPublisher = {
        publishWalletCredited: jest.fn(),
    };
    const mockAuditRepository = {
        save: jest.fn(),
    };
    const mockRedisLock = {
        withLock: jest.fn((_: string, callback: () => Promise<unknown>) => callback()),
    } as unknown as RedisLock;

    let useCase: CreditWalletUseCase;

    const createDto = (): CreditWalletDTO => ({
        userId: 'user-1',
        amount: 50,
        currency: 'TZS',
        description: 'top-up',
        idempotencyKey: 'idem-1',
        correlationId: 'corr-1',
        auditInfo: AuditInfo.create({
            actor: 'user-1',
            actorType: ActorType.USER,
            action: 'CREDIT',
            reason: 'Top up',
        }),
    });

    beforeEach(() => {
        jest.clearAllMocks();
        mockIdempotencyService.checkIdempotency.mockResolvedValue(null);
        useCase = new CreditWalletUseCase(
            mockWalletRepository as unknown as never,
            mockTransactionRepository as unknown as never,
            mockIdempotencyService as unknown as never,
            mockEventPublisher as unknown as never,
            mockAuditRepository as unknown as never,
            mockRedisLock
        );
    });

    it('credits an existing wallet', async () => {
        const wallet = {
            id: 'wallet-1',
            userId: 'user-1',
            balance: 100,
            frozenAmount: 0,
            currency: 'TZS',
            credit(amount: number) {
                this.balance += amount;
            },
        };
        mockWalletRepository.findByUserId.mockResolvedValue(wallet);

        const result = await useCase.execute(createDto());

        expect(result.success).toBe(true);
        expect(result.balanceAfter).toBe(150);
        expect(mockWalletRepository.update).toHaveBeenCalled();
        expect(mockEventPublisher.publishWalletCredited).toHaveBeenCalled();
    });

    it('returns cached idempotent result when present', async () => {
        const cached = { success: true, walletId: 'wallet-1', balanceAfter: 200 };
        mockIdempotencyService.checkIdempotency.mockResolvedValue(cached);

        const result = await useCase.execute(createDto());

        expect(result).toEqual(cached);
        expect(mockRedisLock.withLock).not.toHaveBeenCalled();
    });
});
