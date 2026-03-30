import { KnowledgeArticle } from '../knowledge-article.entity';

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
            expertiseLevel: 'BEGINNER'
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
            expertiseLevel: 'BEGINNER'
        });
        article.submitForReview();
        article.startReview();
        article.approve(80);
        article.publish();
        expect(article.isPublished).toBe(true);
    });
});
