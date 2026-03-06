import { PostingPermissionsPolicy } from '../posting-permissions.policy';
import { User, UserRole, UserStatus } from '../../entities/user.entity';
import { PostType } from '../../entities/post.entity';

describe('PostingPermissionsPolicy', () => {
    it('should allow posting for active user', () => {
        const user = { role: UserRole.BUYER, status: UserStatus.ACTIVE } as User;
        const result = PostingPermissionsPolicy.canCreatePostType(user, PostType.TEXT);
        expect(result).toBe(true);
    });

    it('should deny posting for suspended user', () => {
        const user = { role: UserRole.BUYER, status: UserStatus.SUSPENDED } as User;
        const result = PostingPermissionsPolicy.canCreatePostType(user, PostType.TEXT);
        expect(result).toBe(false);
    });
});
