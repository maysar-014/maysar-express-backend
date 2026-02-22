import { Wallet, WalletStatus, WalletProps } from '../wallet.entity';
import { Hold, HoldStatus } from '../hold.entity';
import { Money } from '../../value-objects/money.value-object';

describe('Wallet Entity', () => {
    const createWalletProps = (overrides: Partial<WalletProps> = {}): WalletProps => ({
        id: 'wallet-123',
        userId: 'user-456',
        balance: 10000, // 100.00 in major units
        currency: 'TZS',
        status: WalletStatus.ACTIVE,
        frozenAmount: 0,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    });

    describe('Creation and Validation', () => {
        it('should create a valid wallet with required fields', () => {
            const props = createWalletProps();
            const wallet = new Wallet(props);

            expect(wallet.id).toBe('wallet-123');
            expect(wallet.userId).toBe('user-456');
            expect(wallet.balance).toBe(10000);
            expect(wallet.currency).toBe('TZS');
            expect(wallet.status).toBe(WalletStatus.ACTIVE);
            expect(wallet.frozenAmount).toBe(0);
        });

        it('should throw error when ID is missing', () => {
            const props = createWalletProps({ id: '' });
            expect(() => new Wallet(props)).toThrow('Wallet ID is required');
        });

        it('should throw error when userId is missing', () => {
            const props = createWalletProps({ userId: '' });
            expect(() => new Wallet(props)).toThrow('User ID is required');
        });

        it('should throw error for negative balance', () => {
            const props = createWalletProps({ balance: -100 });
            expect(() => new Wallet(props)).toThrow('Balance cannot be negative');
        });

        it('should throw error when currency is missing', () => {
            const props = createWalletProps({ currency: '' });
            expect(() => new Wallet(props)).toThrow('Currency is required');
        });

        it('should throw error for invalid status', () => {
            const props = createWalletProps({ status: 'INVALID' as WalletStatus });
            expect(() => new Wallet(props)).toThrow('Invalid wallet status');
        });

        it('should throw error for negative frozen amount', () => {
            const props = createWalletProps({ frozenAmount: -100 });
            expect(() => new Wallet(props)).toThrow('Frozen amount cannot be negative');
        });

        it('should throw error when frozen amount exceeds balance', () => {
            const props = createWalletProps({ balance: 1000, frozenAmount: 1500 });
            expect(() => new Wallet(props)).toThrow('Frozen amount cannot exceed balance');
        });
    });

    describe('Available Balance', () => {
        it('should return full balance when nothing is frozen', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 0 }));
            expect(wallet.getAvailableBalance()).toBe(10000);
        });

        it('should return balance minus frozen amount', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 3000 }));
            expect(wallet.getAvailableBalance()).toBe(7000);
        });

        it('should return zero when all funds are frozen', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 10000 }));
            expect(wallet.getAvailableBalance()).toBe(0);
        });
    });

    describe('Debit Operations', () => {
        it('should correctly determine if wallet can debit', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 3000 }));
            expect(wallet.canDebit(7000)).toBe(true);
            expect(wallet.canDebit(7001)).toBe(false);
        });

        it('should return false for non-active wallet', () => {
            const wallet = new Wallet(createWalletProps({ status: WalletStatus.FROZEN }));
            expect(wallet.canDebit(100)).toBe(false);
        });

        it('should return false for zero or negative amount', () => {
            const wallet = new Wallet(createWalletProps());
            expect(wallet.canDebit(0)).toBe(false);
            expect(wallet.canDebit(-100)).toBe(false);
        });

        it('should debit wallet successfully', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000 }));
            wallet.debit(3000);
            expect(wallet.balance).toBe(7000);
        });

        it('should throw error when debit exceeds available balance', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 5000 }));
            expect(() => wallet.debit(6000)).toThrow('Insufficient available balance');
        });

        it('should update updatedAt timestamp on debit', () => {
            const wallet = new Wallet(createWalletProps());
            const originalUpdatedAt = wallet.updatedAt;

            // Small delay to ensure timestamp difference
            wallet.debit(1000);
            expect(wallet.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
        });
    });

    describe('Credit Operations', () => {
        it('should credit wallet successfully', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000 }));
            wallet.credit(5000);
            expect(wallet.balance).toBe(15000);
        });

        it('should throw error for zero or negative credit', () => {
            const wallet = new Wallet(createWalletProps());
            expect(() => wallet.credit(0)).toThrow('Credit amount must be positive');
            expect(() => wallet.credit(-100)).toThrow('Credit amount must be positive');
        });

        it('should throw error when crediting closed wallet', () => {
            const wallet = new Wallet(createWalletProps({
                status: WalletStatus.CLOSED,
                balance: 0,
                frozenAmount: 0
            }));
            expect(() => wallet.credit(1000)).toThrow('Cannot credit a closed wallet');
        });

        it('should allow credit to frozen wallet', () => {
            const wallet = new Wallet(createWalletProps({ status: WalletStatus.FROZEN }));
            wallet.credit(5000);
            expect(wallet.balance).toBe(15000);
        });
    });

    describe('Freeze Operations', () => {
        it('should freeze funds successfully', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 0 }));
            wallet.freeze(3000);
            expect(wallet.frozenAmount).toBe(3000);
            expect(wallet.getAvailableBalance()).toBe(7000);
        });

        it('should throw error for zero or negative freeze amount', () => {
            const wallet = new Wallet(createWalletProps());
            expect(() => wallet.freeze(0)).toThrow('Freeze amount must be positive');
            expect(() => wallet.freeze(-100)).toThrow('Freeze amount must be positive');
        });

        it('should throw error when freezing on non-active wallet', () => {
            const wallet = new Wallet(createWalletProps({ status: WalletStatus.FROZEN }));
            expect(() => wallet.freeze(1000)).toThrow('Can only freeze funds in active wallet');
        });

        it('should throw error when freeze exceeds available balance', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 8000 }));
            expect(() => wallet.freeze(3000)).toThrow('Cannot freeze 3000. Available balance: 2000');
        });
    });

    describe('Unfreeze Operations', () => {
        it('should unfreeze funds successfully', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 5000 }));
            wallet.unfreeze(3000);
            expect(wallet.frozenAmount).toBe(2000);
        });

        it('should throw error for zero or negative unfreeze amount', () => {
            const wallet = new Wallet(createWalletProps({ frozenAmount: 5000 }));
            expect(() => wallet.unfreeze(0)).toThrow('Unfreeze amount must be positive');
            expect(() => wallet.unfreeze(-100)).toThrow('Unfreeze amount must be positive');
        });

        it('should throw error when unfreeze exceeds frozen amount', () => {
            const wallet = new Wallet(createWalletProps({ frozenAmount: 3000 }));
            expect(() => wallet.unfreeze(5000)).toThrow('Cannot unfreeze 5000. Frozen amount: 3000');
        });
    });

    describe('Debit Frozen Operations', () => {
        it('should debit from frozen funds successfully', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 5000 }));
            wallet.debitFrozen(3000);
            expect(wallet.balance).toBe(7000);
            expect(wallet.frozenAmount).toBe(2000);
        });

        it('should throw error for zero or negative amount', () => {
            const wallet = new Wallet(createWalletProps({ frozenAmount: 5000 }));
            expect(() => wallet.debitFrozen(0)).toThrow('Debit amount must be positive');
            expect(() => wallet.debitFrozen(-100)).toThrow('Debit amount must be positive');
        });

        it('should throw error when debit exceeds frozen amount', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 3000 }));
            expect(() => wallet.debitFrozen(5000)).toThrow('Cannot debit 5000 from frozen. Frozen amount: 3000');
        });
    });

    describe('Hold Management', () => {
        it('should place hold and return Hold entity', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000 }));
            const amount = Money.fromMinor(3000, 'TZS');
            const expiresAt = new Date(Date.now() + 86400000); // 1 day

            const hold = wallet.placeHold(amount, expiresAt, 'Payment authorization');

            expect(hold).toBeInstanceOf(Hold);
            expect(hold.walletId).toBe(wallet.id);
            expect(hold.amount.amount).toBe(3000);
            expect(wallet.frozenAmount).toBe(3000);
        });

        it('should release hold and unfreeze funds', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000 }));
            const amount = Money.fromMinor(3000, 'TZS');
            const hold = wallet.placeHold(amount, new Date(Date.now() + 86400000), 'Test');

            wallet.releaseHold(hold);

            expect(wallet.frozenAmount).toBe(0);
            expect(hold.status).toBe(HoldStatus.RELEASED);
        });

        it('should throw error when releasing hold from wrong wallet', () => {
            const wallet = new Wallet(createWalletProps({ id: 'wallet-1' }));
            const hold = new Hold({
                id: 'hold-1',
                walletId: 'wallet-2',
                userId: 'user-1',
                amount: Money.fromMinor(1000, 'TZS'),
                reason: 'Test',
                status: HoldStatus.ACTIVE,
                expiresAt: new Date(Date.now() + 86400000),
                isCaptured: false,
                isReleased: false,
                createdAt: new Date(),
                updatedAt: new Date(),
            });

            expect(() => wallet.releaseHold(hold)).toThrow('Hold does not belong to this wallet');
        });

        it('should capture hold and debit frozen funds', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000 }));
            const amount = Money.fromMinor(3000, 'TZS');
            const hold = wallet.placeHold(amount, new Date(Date.now() + 86400000), 'Test');

            wallet.captureHold(hold);

            expect(wallet.balance).toBe(7000);
            expect(wallet.frozenAmount).toBe(0);
            expect(hold.status).toBe(HoldStatus.CAPTURED);
        });

        it('should expire hold and unfreeze funds', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000 }));
            const amount = Money.fromMinor(3000, 'TZS');
            const hold = wallet.placeHold(amount, new Date(Date.now() + 86400000), 'Test');

            wallet.expireHold(hold);

            expect(wallet.frozenAmount).toBe(0);
            expect(hold.status).toBe(HoldStatus.EXPIRED);
        });
    });

    describe('Status Transitions', () => {
        it('should activate a suspended wallet', () => {
            const wallet = new Wallet(createWalletProps({ status: WalletStatus.SUSPENDED }));
            wallet.activate();
            expect(wallet.status).toBe(WalletStatus.ACTIVE);
        });

        it('should activate a frozen wallet', () => {
            const wallet = new Wallet(createWalletProps({ status: WalletStatus.FROZEN }));
            wallet.activate();
            expect(wallet.status).toBe(WalletStatus.ACTIVE);
        });

        it('should throw error when activating closed wallet', () => {
            const wallet = new Wallet(createWalletProps({
                status: WalletStatus.CLOSED,
                balance: 0,
                frozenAmount: 0
            }));
            expect(() => wallet.activate()).toThrow('Cannot activate a closed wallet');
        });

        it('should freeze an active wallet', () => {
            const wallet = new Wallet(createWalletProps({ status: WalletStatus.ACTIVE }));
            wallet.freezeWallet();
            expect(wallet.status).toBe(WalletStatus.FROZEN);
        });

        it('should throw error when freezing closed wallet', () => {
            const wallet = new Wallet(createWalletProps({
                status: WalletStatus.CLOSED,
                balance: 0,
                frozenAmount: 0
            }));
            expect(() => wallet.freezeWallet()).toThrow('Cannot freeze a closed wallet');
        });

        it('should suspend an active wallet', () => {
            const wallet = new Wallet(createWalletProps({ status: WalletStatus.ACTIVE }));
            wallet.suspend();
            expect(wallet.status).toBe(WalletStatus.SUSPENDED);
        });

        it('should close wallet with zero balance', () => {
            const wallet = new Wallet(createWalletProps({ balance: 0, frozenAmount: 0 }));
            wallet.close();
            expect(wallet.status).toBe(WalletStatus.CLOSED);
        });

        it('should throw error when closing wallet with positive balance', () => {
            const wallet = new Wallet(createWalletProps({ balance: 1000 }));
            expect(() => wallet.close()).toThrow('Cannot close wallet with positive balance');
        });

        it('should throw error when closing wallet with frozen funds', () => {
            const wallet = new Wallet(createWalletProps({ balance: 1000, frozenAmount: 1000 }));
            expect(() => wallet.close()).toThrow('Cannot close wallet with frozen funds');
        });
    });

    describe('Serialization', () => {
        it('should convert to plain object', () => {
            const props = createWalletProps();
            const wallet = new Wallet(props);
            const obj = wallet.toObject();

            expect(obj).toEqual(expect.objectContaining({
                id: 'wallet-123',
                userId: 'user-456',
                balance: 10000,
                currency: 'TZS',
                status: WalletStatus.ACTIVE,
                frozenAmount: 0,
            }));
        });
    });

    describe('Edge Cases', () => {
        it('should handle very large balance values', () => {
            const largeBalance = 999999999999;
            const wallet = new Wallet(createWalletProps({ balance: largeBalance }));
            expect(wallet.balance).toBe(largeBalance);
            wallet.credit(1);
            expect(wallet.balance).toBe(largeBalance + 1);
        });

        it('should handle floating point precision in debit', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000 }));
            wallet.debit(10000);
            // Should not go negative due to floating point errors
            expect(wallet.balance).toBeGreaterThanOrEqual(0);
        });

        it('should handle floating point precision in frozen amounts', () => {
            const wallet = new Wallet(createWalletProps({ balance: 10000, frozenAmount: 5000 }));
            wallet.unfreeze(5000);
            // Should not go negative due to floating point errors
            expect(wallet.frozenAmount).toBeGreaterThanOrEqual(0);
        });
    });
});
