import { BusinessProfile } from '../business-profile.entity';

describe('BusinessProfile', () => {
    it('should create profile', () => {
        const profile = BusinessProfile.create({ id: 'bp1', userId: 'u1' });
        expect(profile.id).toBe('bp1');
    });

    it('should add expertise', () => {
        const profile = BusinessProfile.create({ id: 'bp1', userId: 'u1' });
        profile.addExpertise('farming', 'BEGINNER');
        expect(profile.expertiseAreas.length).toBe(1);
    });
});
