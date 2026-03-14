import { KnowledgeArticle } from '../../domain/entities/knowledge-article.entity';
import { PrismaKnowledgeArticleRepository } from './prisma-knowledge-article.repository';

describe('PrismaKnowledgeArticleRepository', () => {
  const makePrisma = () => ({
    community_KnowledgeArticle: {
      upsert: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn()
    }
  });

  const buildArticle = () =>
    KnowledgeArticle.create({
      id: 'ka1',
      authorId: 'u1',
      title: 'Knowledge Article',
      summary: 'This is a valid summary with more than fifty characters total.',
      sections: [{ heading: 'Intro', content: 'Content', order: 1 }],
      category: 'Operations',
      industryTags: ['retail'],
      expertiseLevel: 'BEGINNER'
    });

  it('saves article via upsert and maps to domain', async () => {
    const prisma = makePrisma();
    const article = buildArticle();
    prisma.community_KnowledgeArticle.upsert.mockResolvedValue(article.toJSON());
    const repo = new PrismaKnowledgeArticleRepository(prisma as never);

    const saved = await repo.save(article);

    expect(prisma.community_KnowledgeArticle.upsert).toHaveBeenCalledWith({
      where: { id: 'ka1' },
      create: expect.objectContaining({
        id: 'ka1',
        authorId: 'u1'
      }),
      update: expect.objectContaining({
        id: 'ka1',
        authorId: 'u1'
      })
    });
    expect(saved).toBeInstanceOf(KnowledgeArticle);
  });

  it('findByTitleAndAuthor returns mapped article or null', async () => {
    const prisma = makePrisma();
    const article = buildArticle().toJSON();
    prisma.community_KnowledgeArticle.findFirst
      .mockResolvedValueOnce(article)
      .mockResolvedValueOnce(null);
    const repo = new PrismaKnowledgeArticleRepository(prisma as never);

    await expect(repo.findByTitleAndAuthor(article.title, article.authorId)).resolves.toBeInstanceOf(
      KnowledgeArticle
    );
    await expect(repo.findByTitleAndAuthor('missing', article.authorId)).resolves.toBeNull();
  });

  it('findById returns mapped article or null', async () => {
    const prisma = makePrisma();
    const article = buildArticle().toJSON();
    prisma.community_KnowledgeArticle.findUnique
      .mockResolvedValueOnce(article)
      .mockResolvedValueOnce(null);
    const repo = new PrismaKnowledgeArticleRepository(prisma as never);

    await expect(repo.findById('ka1')).resolves.toBeInstanceOf(KnowledgeArticle);
    await expect(repo.findById('missing')).resolves.toBeNull();
  });
});
