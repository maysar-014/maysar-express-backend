import { FeedEngine } from '../feed-engine';
import { User } from '../../entities/user.entity';

describe('FeedEngine', () => {
    it('should generate feed', () => {
        const result = FeedEngine.generateFeed({} as User, [], {});
        expect(Array.isArray(result)).toBe(true);
    });
});
