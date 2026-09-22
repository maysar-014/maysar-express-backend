jest.mock('@shared-events/eventBus', () => ({}), { virtual: true });
jest.mock('@shared/middleware/idempotency', () => ({ EventIdempotency: jest.fn() }), { virtual: true });
jest.mock('@shared/ids/id', () => ({
    makeId: jest.fn(() => 'wlt-test-id'),
    getModelPrefix: jest.fn(() => 'wlt'),
}), { virtual: true });

import { UserRegisteredHandler } from './user-registered.handler';
import { WalletStatus } from '../../domain/entities/wallet.entity';

const makeEnvelope = (data: unknown, eventId = 'evt-001') => ({
    eventId,
    eventType: 'UserRegistered.v1',
    data,
    timestamp: new Date(),
});

describe('UserRegisteredHandler', () => {
    let walletRepository: { findByUserId: jest.Mock; save: jest.Mock };
    let eventIdempotency: { withIdempotency: jest.Mock };

    beforeEach(() => {
        jest.restoreAllMocks();
        walletRepository = {
            findByUserId: jest.fn().mockResolvedValue(null),
            save: jest.fn().mockResolvedValue(undefined),
        };
        // Execute the callback immediately (no real Redis needed in unit tests)
        eventIdempotency = {
            withIdempotency: jest.fn(async (_id: string, _consumer: string, run: () => Promise<void>) => run()),
        };
    });

    it('creates a wallet for a new user', async () => {
        const handler = new UserRegisteredHandler(walletRepository as never, eventIdempotency as never);

        await handler.handle(makeEnvelope({ userId: 'user-abc' }) as never);

        expect(eventIdempotency.withIdempotency).toHaveBeenCalledWith(
            'evt-001',
            'UserRegisteredHandler',
            expect.any(Function)
        );
        expect(walletRepository.findByUserId).toHaveBeenCalledWith('user-abc');
        expect(walletRepository.save).toHaveBeenCalledTimes(1);

        const savedWallet = walletRepository.save.mock.calls[0][0];
        expect(savedWallet.userId).toBe('user-abc');
        expect(savedWallet.balance).toBe(0);
        expect(savedWallet.currency).toBe('TZS');
        expect(savedWallet.status).toBe(WalletStatus.ACTIVE);
        expect(savedWallet.frozenAmount).toBe(0);
    });

    it('skips wallet creation when wallet already exists (idempotent)', async () => {
        walletRepository.findByUserId.mockResolvedValue({ userId: 'user-abc' }); // wallet exists
        const logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
        const handler = new UserRegisteredHandler(walletRepository as never, eventIdempotency as never);

        await handler.handle(makeEnvelope({ userId: 'user-abc' }) as never);

        expect(walletRepository.save).not.toHaveBeenCalled();
        expect(logSpy).toHaveBeenCalledWith(
            '[UserRegisteredHandler] Wallet already exists for user user-abc — skipping'
        );
    });

    it('does not call idempotency or repository when userId is missing', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const handler = new UserRegisteredHandler(walletRepository as never, eventIdempotency as never);

        await handler.handle(makeEnvelope({ email: 'no-id@example.com' }) as never);

        expect(eventIdempotency.withIdempotency).not.toHaveBeenCalled();
        expect(walletRepository.findByUserId).not.toHaveBeenCalled();
        expect(walletRepository.save).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalledWith(
            '[UserRegisteredHandler] Received UserRegistered.v1 with missing or invalid userId — skipping'
        );
    });

    it('does not call idempotency or repository when data is null', async () => {
        const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => undefined);
        const handler = new UserRegisteredHandler(walletRepository as never, eventIdempotency as never);

        await handler.handle(makeEnvelope(null) as never);

        expect(eventIdempotency.withIdempotency).not.toHaveBeenCalled();
        expect(walletRepository.save).not.toHaveBeenCalled();
        expect(warnSpy).toHaveBeenCalled();
    });

    it('swallows repository errors and does not rethrow', async () => {
        walletRepository.save.mockRejectedValue(new Error('db-error'));
        const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => undefined);
        const handler = new UserRegisteredHandler(walletRepository as never, eventIdempotency as never);

        await expect(
            handler.handle(makeEnvelope({ userId: 'user-xyz' }) as never)
        ).resolves.toBeUndefined();

        expect(errorSpy).toHaveBeenCalledWith(
            '[UserRegisteredHandler] Fallback wallet creation also failed for user user-xyz:',
            expect.any(Error)
        );
    });
});
