import { ContentModerationPolicy } from '../content-moderation.policy';

describe('ContentModerationPolicy', () => {
    let policy: ContentModerationPolicy;

    beforeEach(() => {
        policy = new ContentModerationPolicy();
    });

    it('should approve clean content', () => {
        const result = policy.moderate({ content: 'This is a clean post' });
        expect(result.approved).toBe(true);
    });

    it('should flag inappropriate content', () => {
        const result = policy.moderate({ content: 'spam spam spam' });
        expect(result.flagged).toBeDefined();
    });
});
