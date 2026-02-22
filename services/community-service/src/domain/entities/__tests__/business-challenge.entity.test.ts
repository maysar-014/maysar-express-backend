import { BusinessChallenge } from '../business-challenge.entity';

describe('BusinessChallenge', () => {
    it('should create challenge', () => {
        const challenge = BusinessChallenge.create({ id: 'c1', title: 'Test', authorId: 'u1', description: 'Desc' });
        expect(challenge.getId()).toBe('c1');
    });

    it('should add solution', () => {
        const challenge = BusinessChallenge.create({ id: 'c1', title: 'Test', authorId: 'u1', description: 'Desc' });
        challenge.addSolution({ id: 's1', authorId: 'u2', content: 'Solution' });
        expect(challenge.getSolutionCount()).toBe(1);
    });
});
