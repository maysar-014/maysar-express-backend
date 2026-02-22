import { PostingPermissionsPolicy } from '../posting-permissions.policy';

describe('PostingPermissionsPolicy', () => {
    let policy: PostingPermissionsPolicy;

    beforeEach(() => {
        policy = new PostingPermissionsPolicy();
    });

    it('should allow posting with permissions', () => {
        const result = policy.canPost({ userId: 'u1', reputation: 50 });
        expect(result).toBe(true);
    });

    it('should deny posting without permissions', () => {
        const result = policy.canPost({ userId: 'u1', reputation: 0, banned: true });
        expect(result).toBe(false);
    });
});
