import { ContentModerationPolicy } from '../content-moderation.policy';
import { PostType } from '../../entities/post.entity';

describe('ContentModerationPolicy', () => {
    it('should approve clean content', () => {
        const result = ContentModerationPolicy.validateContent('This is a clean post', PostType.TEXT);
        expect(result.isValid).toBe(true);
    });

    it('should flag suspicious content', () => {
        const result = ContentModerationPolicy.containsSuspiciousContent('scam spam');
        expect(result).toBe(true);
    });
});
