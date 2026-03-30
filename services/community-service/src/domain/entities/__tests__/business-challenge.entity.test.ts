import { BusinessChallenge, ChallengeStatus } from '../business-challenge.entity';

describe('BusinessChallenge', () => {
    it('should create challenge', () => {
        const challenge = BusinessChallenge.create({ 
            id: 'c1', 
            proposerId: 'u1', 
            title: 'Test Challenge', 
            description: 'This is a detailed description of the business challenge that needs to be at least one hundred characters long to meet validation requirements.', 
            category: 'OPERATIONS',
            industryTags: ['agriculture'],
            constraints: ['budget'],
            successCriteria: [{ description: 'Increase efficiency by 20%', measurable: true }]
        });
        expect(challenge.id).toBe('c1');
    });

    it('should approve challenge', () => {
        const challenge = BusinessChallenge.create({ 
            id: 'c1', 
            proposerId: 'u1', 
            title: 'Test Challenge', 
            description: 'This is a detailed description of the business challenge that needs to be at least one hundred characters long to meet validation requirements.', 
            category: 'OPERATIONS',
            industryTags: ['agriculture'],
            constraints: ['budget'],
            successCriteria: [{ description: 'Increase efficiency by 20%', measurable: true }]
        });
        challenge.approve();
        expect(challenge.status).toBe(ChallengeStatus.OPEN);
    });
});
