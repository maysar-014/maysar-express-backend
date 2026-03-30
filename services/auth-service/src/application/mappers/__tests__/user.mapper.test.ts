import { UserMapper } from '../user.mapper';
import { User, UserRole, UserStatus } from '../../../domain/entities/user.entity';

describe('UserMapper', () => {
    const rawData = {
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.BUYER,
        accountStatus: UserStatus.ACTIVE,
        profile: { name: 'Test User' },
        kycStatus: 'APPROVED'
    };

    const domainUser = User.create({
        id: 'user-123',
        email: 'test@example.com',
        role: UserRole.BUYER,
        status: UserStatus.ACTIVE,
        profile: { name: 'Test User' },
        kycStatus: 'APPROVED'
    });

    describe('toDomain', () => {
        it('should map valid raw data to User entity', () => {
            const user = UserMapper.toDomain(rawData);

            expect(user).toBeInstanceOf(User);
            expect(user.id).toBe(rawData.id);
            expect(user.email).toBe(rawData.email);
            expect(user.role).toBe(rawData.role);
            expect(user.status).toBe(rawData.accountStatus);
            expect(user.profile).toEqual(rawData.profile);
            expect(user.kycStatus).toBe(rawData.kycStatus);
        });

        it('should handle alternative status field mapping', () => {
            const rawWithStatus = {
                ...rawData,
                status: UserStatus.SUSPENDED,
                accountStatus: undefined
            };

            const user = UserMapper.toDomain(rawWithStatus);
            expect(user.status).toBe(UserStatus.SUSPENDED);
        });
    });

    describe('toPersistence', () => {
        it('should map User entity to persistence format', () => {
            const raw = UserMapper.toPersistence(domainUser);

            expect(raw.id).toBe(domainUser.id);
            expect(raw.email).toBe(domainUser.email);
            expect(raw.role).toBe(domainUser.role);
            expect(raw.accountStatus).toBe(domainUser.status);
            expect(raw.profile).toEqual(domainUser.profile);
            // Note: kycStatus might not be in toPersistence based on current code, checking what was in file
            // The file view showed: id, email, role, accountStatus, profile.
        });
    });
});
