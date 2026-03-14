import { BusinessChallenge } from '../../domain/entities/business-challenge.entity';
import { PrismaBusinessChallengeRepository } from './prisma-business-challenge.repository';

describe('PrismaBusinessChallengeRepository', () => {
  const makePrisma = () => ({
    community_BusinessChallenge: {
      upsert: jest.fn(),
      findMany: jest.fn()
    }
  });

  const buildChallenge = () =>
    BusinessChallenge.create({
      id: 'bc1',
      proposerId: 'u1',
      title: 'Improve conversion funnel',
      description:
        'This challenge describes a significant operational issue and provides enough detail to exceed one hundred characters.',
      category: 'GROWTH',
      industryTags: ['retail'],
      constraints: ['budget'],
      successCriteria: [{ description: 'Increase conversion by 5%', measurable: true }],
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    });

  it('saves challenge via upsert and returns domain object', async () => {
    const prisma = makePrisma();
    const challenge = buildChallenge();
    prisma.community_BusinessChallenge.upsert.mockResolvedValue(challenge.toJSON());
    const repo = new PrismaBusinessChallengeRepository(prisma as never);

    const saved = await repo.save(challenge);

    expect(prisma.community_BusinessChallenge.upsert).toHaveBeenCalledWith({
      where: { id: 'bc1' },
      create: expect.objectContaining({
        id: 'bc1',
        title: 'Improve conversion funnel'
      }),
      update: expect.objectContaining({
        id: 'bc1',
        proposerId: 'u1'
      })
    });
    expect(saved).toBeInstanceOf(BusinessChallenge);
  });

  it('findSimilar queries recent challenges by title/category and maps to domain', async () => {
    const prisma = makePrisma();
    const challenge = buildChallenge().toJSON();
    prisma.community_BusinessChallenge.findMany.mockResolvedValue([challenge]);
    const repo = new PrismaBusinessChallengeRepository(prisma as never);

    const result = await repo.findSimilar('conversion', 'GROWTH', 14);

    expect(prisma.community_BusinessChallenge.findMany).toHaveBeenCalledWith({
      where: {
        category: 'GROWTH',
        title: {
          contains: 'conversion',
          mode: 'insensitive'
        },
        createdAt: {
          gte: expect.any(Date)
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });
    expect(result[0]).toBeInstanceOf(BusinessChallenge);
  });
});
