import { CommunityFactory } from './factories/community.factory';
import { UserRole, UserStatus } from '../domain/entities/user.entity';

describe('User Entity', () => {
    it('should create a new user with default state', () => {
        const user = CommunityFactory.createUser({
            role: UserRole.BUYER
        });

        expect(user.status).toBe(UserStatus.ACTIVE);
        expect(user.isVerified).toBe(false);
        expect(user.canPost()).toBe(true);
    });

    it('should update profile fields', () => {
        const user = CommunityFactory.createUser();
        user.updateProfile({
            displayName: 'New Name',
            bio: 'New bio'
        });

        expect(user.displayName).toBe('New Name');
        expect(user.bio).toBe('New bio');
    });

    it('should handle suspension and reactivation', () => {
        const user = CommunityFactory.createUser();

        user.suspend();
        expect(user.status).toBe(UserStatus.SUSPENDED);
        expect(user.canPost()).toBe(false);

        user.reactivate();
        expect(user.status).toBe(UserStatus.ACTIVE);
        expect(user.canPost()).toBe(true);
    });

    it('should enforce role-based permissions', () => {
        const seller = CommunityFactory.createUser({ role: UserRole.SELLER });
        const buyer = CommunityFactory.createUser({ role: UserRole.BUYER });
        const enabler = CommunityFactory.createUser({ role: UserRole.ENABLER });

        expect(seller.canCreateCommercialPosts()).toBe(true);
        expect(buyer.canCreateCommercialPosts()).toBe(false);

        expect(enabler.canModerate()).toBe(true);
        expect(seller.canModerate()).toBe(false);
    });

    it('should verify user and allow access to private content', () => {
        const user = CommunityFactory.createUser();
        expect(user.canAccessPrivateContent()).toBe(false);

        user.verify();
        expect(user.isVerified).toBe(true);
        expect(user.canAccessPrivateContent()).toBe(true);
    });
});
