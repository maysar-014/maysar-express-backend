import { UserFactory } from './user.factory';
import { performance } from 'perf_hooks';

/**
 * User Entity Performance Tests
 * Follows Maysar Testing Constitution - Section 9.0
 */
describe('User Entity Performance', () => {
    const user = UserFactory.create({
        dateOfBirth: new Date(1990, 0, 1)
    });

    it('should validate user entity under 1ms', () => {
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
            user.validate();
        }
        const duration = (performance.now() - start) / 1000;

        expect(duration).toBeLessThan(1); // 1ms threshold for a single validation
    });

    it('should calculate age under 0.1ms', () => {
        const start = performance.now();
        for (let i = 0; i < 1000; i++) {
            user.getAge();
        }
        const duration = (performance.now() - start) / 1000;

        expect(duration).toBeLessThan(0.1);
    });

    it('should handle complex updates efficiently', () => {
        const start = performance.now();
        let updatedUser = user;
        for (let i = 0; i < 100; i++) {
            updatedUser = updatedUser.updateProfile({ firstName: `NewName${i}` });
            updatedUser = updatedUser.updateMetadata({ loginAttempts: i });
        }
        const duration = (performance.now() - start) / 100;

        expect(duration).toBeLessThan(2); // 2ms threshold for property updates
    });
});
