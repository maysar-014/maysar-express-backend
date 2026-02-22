import { BusinessProfile } from '../business-profile.entity';

describe('BusinessProfile', () => {
    it('should create profile', () => {
        const profile = BusinessProfile.create({ id: 'bp1', userId: 'u1', businessName: 'Test Co' });
        expect(profile.getId()).toBe('bp1');
    });

    it('should update reputation', () => {
        const profile = BusinessProfile.create({ id: 'bp1', userId: 'u1', businessName: 'Test Co' });
        profile.updateReputation(85);
        expect(profile.getReputation()).toBe(85);
    });
});
