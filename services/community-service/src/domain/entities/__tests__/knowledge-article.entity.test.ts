import { KnowledgeArticle } from '../knowledge-article.entity';
import { ExpertiseLevel } from '../../value-objects/expertise-badge.value-object';

describe('KnowledgeArticle', () => {
    it('should create article', () => {
        const article = KnowledgeArticle.create({ 
            id: 'a1', 
            authorId: 'u1', 
            title: 'Test Article', 
            summary: 'This is a detailed summary of the article that needs to be at least fifty characters long to meet validation.',
            sections: [{ order: 1, heading: 'Introduction', content: 'Content here' }],
            category: 'BEST_PRACTICES',
            industryTags: ['agriculture'],
            expertiseLevel: ExpertiseLevel.BEGINNER
        });
        expect(article.id).toBe('a1');
    });

    it('should publish article after approval', () => {
        const article = KnowledgeArticle.create({ 
            id: 'a1', 
            authorId: 'u1', 
            title: 'Test Article', 
            summary: 'This is a detailed summary of the article that needs to be at least fifty characters long to meet validation.',
            sections: [{ order: 1, heading: 'Introduction', content: 'Content here' }],
            category: 'BEST_PRACTICES',
            industryTags: ['agriculture'],
            expertiseLevel: ExpertiseLevel.BEGINNER
        });
        article.submitForReview();
        article.startReview();
        article.approve(80);
        article.publish();
        expect(article.isPublished).toBe(true);
    });
});
