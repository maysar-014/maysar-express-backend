import { User } from '../user.entity';

describe('User Entity', () => {
    const createValidUser = () => User.create({
        id: 'user-1',
        email: 'test@example.com',
        role: 'buyer',
        status: 'ACTIVE',
        profile: { name: 'Test' },
        kycStatus: 'APPROVED'
    });

    it('should create valid user', () => {
        const user = createValidUser();
        expect(user.id).toBe('user-1');
        expect(user.email).toBe('test@example.com');
    });

    it('should check kyc status', () => {
        const user = createValidUser();
        expect(user.isApproved()).toBe(true);

        const unverified = User.create({
            id: 'u2',
            email: 'test2@example.com',
            role: 'buyer',
            status: 'ACTIVE',
            profile: {},
            kycStatus: 'PENDING'
        });
        expect(unverified.isApproved()).toBe(false);
    });

    it('should check active status', () => {
        const user = createValidUser();
        expect(user.isActive()).toBe(true);

        const suspended = User.create({
            id: 'u2',
            email: 'test2@example.com',
            role: 'buyer',
            status: 'SUSPENDED',
            profile: {}
        });
        expect(suspended.isActive()).toBe(false);
    });
});
