import { Progress } from '../progress.value-object';

describe('Progress', () => {
    it('should create progress', () => {
        const progress = Progress.create(50, 100);
        expect(progress.getPercentage()).toBe(50);
    });

    it('should calculate completion', () => {
        const progress = Progress.create(100, 100);
        expect(progress.isComplete()).toBe(true);
    });
});
