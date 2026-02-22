import { Hold, HoldStatus, HoldProps } from '../hold.entity';
import { Money } from '../../value-objects/money.value-object';

describe('Hold Entity', () => {
    const createHoldProps = (overrides: Partial<HoldProps> = {}): HoldProps => ({
        id: 'hold-123',
        walletId: 'wallet-456',
        userId: 'user-789',
        amount: Money.fromMinor(5000, 'TZS'),
        reason: 'Payment authorization',
        status: HoldStatus.ACTIVE,
        expiresAt: new Date(Date.now() + 86400000), // 1 day from now
        isCaptured: false,
        isReleased: false,
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        ...overrides,
    });

    describe('Creation and Validation', () => {
        it('should create a valid hold with required fields', () => {
            const props = createHoldProps();
            const hold = new Hold(props);

            expect(hold.id).toBe('hold-123');
            expect(hold.walletId).toBe('wallet-456');
            expect(hold.userId).toBe('user-789');
            expect(hold.amount.amount).toBe(5000);
            expect(hold.reason).toBe('Payment authorization');
            expect(hold.status).toBe(HoldStatus.ACTIVE);
            expect(hold.isCaptured).toBe(false);
            expect(hold.isReleased).toBe(false);
        });

        it('should throw error when ID is missing', () => {
            const props = createHoldProps({ id: '' });
            expect(() => new Hold(props)).toThrow('Hold ID required');
        });

        it('should throw error when walletId is missing', () => {
            const props = createHoldProps({ walletId: '' });
            expect(() => new Hold(props)).toThrow('Wallet ID required');
        });

        it('should throw error when userId is missing', () => {
            const props = createHoldProps({ userId: '' });
            expect(() => new Hold(props)).toThrow('User ID required');
        });

        it('should throw error when amount is missing', () => {
            const props = createHoldProps({ amount: undefined as any });
            expect(() => new Hold(props)).toThrow('Amount required');
        });

        it('should throw error for zero or negative amount', () => {
            const zeroAmount = Money.fromMinor(0, 'TZS');
            const props = createHoldProps({ amount: zeroAmount });
            expect(() => new Hold(props)).toThrow('Hold amount must be positive');
        });

        it('should throw error when expiresAt is missing', () => {
            const props = createHoldProps({ expiresAt: undefined as any });
            expect(() => new Hold(props)).toThrow('Expiry date required');
        });
    });

    describe('Expiration Check', () => {
        it('should return false for active hold with future expiry', () => {
            const hold = new Hold(createHoldProps({
                expiresAt: new Date(Date.now() + 86400000),
            }));
            expect(hold.isExpired()).toBe(false);
        });

        it('should return true for active hold with past expiry', () => {
            const hold = new Hold(createHoldProps({
                expiresAt: new Date(Date.now() - 1000),
            }));
            expect(hold.isExpired()).toBe(true);
        });

        it('should return false for non-active hold even with past expiry', () => {
            const hold = new Hold(createHoldProps({
                status: HoldStatus.RELEASED,
                expiresAt: new Date(Date.now() - 1000),
            }));
            expect(hold.isExpired()).toBe(false);
        });
    });

    describe('Active Check', () => {
        it('should return true for active hold with future expiry', () => {
            const hold = new Hold(createHoldProps({
                status: HoldStatus.ACTIVE,
                expiresAt: new Date(Date.now() + 86400000),
            }));
            expect(hold.isActive()).toBe(true);
        });

        it('should return false for active hold with past expiry', () => {
            const hold = new Hold(createHoldProps({
                status: HoldStatus.ACTIVE,
                expiresAt: new Date(Date.now() - 1000),
            }));
            expect(hold.isActive()).toBe(false);
        });

        it('should return false for released hold', () => {
            const hold = new Hold(createHoldProps({
                status: HoldStatus.RELEASED,
            }));
            expect(hold.isActive()).toBe(false);
        });

        it('should return false for captured hold', () => {
            const hold = new Hold(createHoldProps({
                status: HoldStatus.CAPTURED,
            }));
            expect(hold.isActive()).toBe(false);
        });

        it('should return false for expired hold', () => {
            const hold = new Hold(createHoldProps({
                status: HoldStatus.EXPIRED,
            }));
            expect(hold.isActive()).toBe(false);
        });
    });

    describe('Release Operation', () => {
        it('should release an active hold', () => {
            const hold = new Hold(createHoldProps());
            hold.release();

            expect(hold.status).toBe(HoldStatus.RELEASED);
            expect(hold.isReleased).toBe(true);
            expect(hold.releasedAt).toBeInstanceOf(Date);
        });

        it('should throw error when releasing non-active hold', () => {
            const hold = new Hold(createHoldProps({ status: HoldStatus.RELEASED }));
            expect(() => hold.release()).toThrow('Cannot release hold in status RELEASED');
        });

        it('should throw error when releasing captured hold', () => {
            const hold = new Hold(createHoldProps({ status: HoldStatus.CAPTURED }));
            expect(() => hold.release()).toThrow('Cannot release hold in status CAPTURED');
        });

        it('should throw error when releasing expired hold', () => {
            const hold = new Hold(createHoldProps({ status: HoldStatus.EXPIRED }));
            expect(() => hold.release()).toThrow('Cannot release hold in status EXPIRED');
        });
    });

    describe('Capture Operation', () => {
        it('should capture an active hold', () => {
            const hold = new Hold(createHoldProps({
                expiresAt: new Date(Date.now() + 86400000),
            }));
            hold.capture();

            expect(hold.status).toBe(HoldStatus.CAPTURED);
            expect(hold.isCaptured).toBe(true);
            expect(hold.capturedAt).toBeInstanceOf(Date);
        });

        it('should throw error when capturing non-active hold', () => {
            const hold = new Hold(createHoldProps({ status: HoldStatus.RELEASED }));
            expect(() => hold.capture()).toThrow('Cannot capture hold in status RELEASED');
        });

        it('should throw error when capturing expired hold', () => {
            const hold = new Hold(createHoldProps({
                status: HoldStatus.ACTIVE,
                expiresAt: new Date(Date.now() - 1000),
            }));
            expect(() => hold.capture()).toThrow('Cannot capture expired hold');
        });
    });

    describe('Expire Operation', () => {
        it('should expire an active hold', () => {
            const hold = new Hold(createHoldProps());
            hold.expire();

            expect(hold.status).toBe(HoldStatus.EXPIRED);
        });

        it('should be idempotent for non-active hold', () => {
            const hold = new Hold(createHoldProps({ status: HoldStatus.RELEASED }));
            hold.expire();

            // Should not change status, should not throw
            expect(hold.status).toBe(HoldStatus.RELEASED);
        });
    });

    describe('Extend Operation', () => {
        it('should extend an active hold', () => {
            const hold = new Hold(createHoldProps());
            const newExpiry = new Date(Date.now() + 172800000); // 2 days from now
            hold.extend(newExpiry);

            expect(hold.expiresAt).toEqual(newExpiry);
        });

        it('should throw error when extending non-active hold', () => {
            const hold = new Hold(createHoldProps({ status: HoldStatus.RELEASED }));
            const newExpiry = new Date(Date.now() + 86400000);
            expect(() => hold.extend(newExpiry)).toThrow('Cannot extend non-active hold');
        });

        it('should throw error when extending with past date', () => {
            const hold = new Hold(createHoldProps());
            const pastDate = new Date(Date.now() - 1000);
            expect(() => hold.extend(pastDate)).toThrow('New expiry date must be in the future');
        });
    });

    describe('Serialization', () => {
        it('should convert to plain object', () => {
            const props = createHoldProps();
            const hold = new Hold(props);
            const obj = hold.toObject();

            expect(obj).toEqual(expect.objectContaining({
                id: 'hold-123',
                walletId: 'wallet-456',
                userId: 'user-789',
                status: HoldStatus.ACTIVE,
                isCaptured: false,
                isReleased: false,
            }));
            expect(obj.amount.amount).toBe(5000);
        });
    });

    describe('Optional Fields', () => {
        it('should handle metadata', () => {
            const hold = new Hold(createHoldProps({
                metadata: { orderId: 'order-123' },
            }));
            expect(hold.metadata).toEqual({ orderId: 'order-123' });
        });

        it('should return undefined for missing optional fields', () => {
            const hold = new Hold(createHoldProps());
            expect(hold.releasedAt).toBeUndefined();
            expect(hold.capturedAt).toBeUndefined();
            expect(hold.metadata).toBeUndefined();
        });
    });

    describe('State Consistency', () => {
        it('should update updatedAt on release', () => {
            const hold = new Hold(createHoldProps());
            const originalUpdatedAt = hold.updatedAt;

            hold.release();

            expect(hold.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
        });

        it('should update updatedAt on capture', () => {
            const hold = new Hold(createHoldProps({
                expiresAt: new Date(Date.now() + 86400000),
            }));
            const originalUpdatedAt = hold.updatedAt;

            hold.capture();

            expect(hold.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
        });

        it('should update updatedAt on extend', () => {
            const hold = new Hold(createHoldProps());
            const originalUpdatedAt = hold.updatedAt;

            hold.extend(new Date(Date.now() + 172800000));

            expect(hold.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
        });
    });
});
