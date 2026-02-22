import { KnowledgeArticle } from '../knowledge-article.entity';

describe('KnowledgeArticle', () => {
    it('should create article', () => {
        const article = KnowledgeArticle.create({ id: 'a1', title: 'Test', authorId: 'u1', content: 'Content' });
        expect(article.getId()).toBe('a1');
    });

    it('should publish article', () => {
        const article = KnowledgeArticle.create({ id: 'a1', title: 'Test', authorId: 'u1', content: 'Content' });
        article.publish();
        expect(article.isPublished()).toBe(true);
    });
});
