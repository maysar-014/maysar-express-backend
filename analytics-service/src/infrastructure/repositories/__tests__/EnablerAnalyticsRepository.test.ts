import { EnablerAnalyticsRepository } from '../EnablerAnalyticsRepository';

describe('EnablerAnalyticsRepository Integration', () => {
    let repository: EnablerAnalyticsRepository;

    beforeEach(() => {
        repository = new EnablerAnalyticsRepository();
    });

    it('should exist', () => {
        expect(repository).toBeDefined();
    });
});
