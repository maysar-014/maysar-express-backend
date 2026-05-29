import { PrismaProductReviewRepository } from './prisma-product-review.repository';

const buildPrismaMock = () => ({
  catalog_ProductReview: {
    create: jest.fn(),
    findUnique: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    update: jest.fn(),
  },
  catalog_ReviewModerationLog: {
    create: jest.fn(),
  },
  user_User: {
    findMany: jest.fn(),
  },
  $queryRaw: jest.fn(),
  $transaction: jest.fn(),
});

describe('PrismaProductReviewRepository', () => {
  it('saves and maps reviews', async () => {
    const prisma = buildPrismaMock();
    prisma.catalog_ProductReview.create.mockResolvedValue({
      id: 'review-1',
      productId: 'product-1',
      buyerId: 'buyer-1',
      rating: 5,
      comment: 'Great',
      moderationStatus: 'VISIBLE',
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });

    const repository = new PrismaProductReviewRepository(prisma as never);
    const saved = await repository.save({
      productId: 'product-1',
      buyerId: 'buyer-1',
      rating: 5,
      comment: 'Great',
      moderationStatus: 'VISIBLE',
    });

    expect(saved).toMatchObject({
      id: 'review-1',
      productId: 'product-1',
      buyerId: 'buyer-1',
      rating: 5,
      comment: 'Great',
      moderationStatus: 'VISIBLE',
    });
    expect(prisma.catalog_ProductReview.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        productId: 'product-1',
        buyerId: 'buyer-1',
        rating: 5,
        moderationStatus: 'VISIBLE',
      }),
    });
  });

  it('reads reviews with display names and aggregate stats', async () => {
    const prisma = buildPrismaMock();
    prisma.catalog_ProductReview.findUnique.mockResolvedValue({
      id: 'review-1',
      productId: 'product-1',
      buyerId: 'buyer-1',
      rating: 4,
      comment: 'Solid',
      moderationStatus: 'VISIBLE',
      submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
    });
    prisma.catalog_ProductReview.findMany.mockResolvedValue([
      {
        id: 'review-1',
        productId: 'product-1',
        buyerId: 'buyer-1',
        rating: 4,
        comment: 'Solid',
        moderationStatus: 'VISIBLE',
        submittedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ]);
    prisma.catalog_ProductReview.count.mockResolvedValue(1);
    prisma.user_User.findMany.mockResolvedValue([
      { id: 'buyer-1', firstName: 'Amina', lastName: 'Juma', email: 'buyer@example.com' },
    ]);
    prisma.$queryRaw
      .mockResolvedValueOnce([
        {
          averageRating: '4.00',
          reviewCount: BigInt(1),
          dist1: BigInt(0),
          dist2: BigInt(0),
          dist3: BigInt(0),
          dist4: BigInt(1),
          dist5: BigInt(0),
        },
      ])
      .mockResolvedValueOnce([{ count: BigInt(1) }]);

    const repository = new PrismaProductReviewRepository(prisma as never);

    await expect(repository.findById('review-1')).resolves.toMatchObject({
      id: 'review-1',
      productId: 'product-1',
      buyerId: 'buyer-1',
    });
    await expect(repository.findByBuyerAndProduct('buyer-1', 'product-1')).resolves.toMatchObject({
      id: 'review-1',
    });
    await expect(repository.findByProductId('product-1', { page: 1, limit: 10 })).resolves.toMatchObject({
      totalCount: 1,
      currentPage: 1,
      reviews: [
        expect.objectContaining({
          id: 'review-1',
          displayName: 'Amina Juma',
        }),
      ],
    });
    await expect(repository.getAggregateStats('product-1')).resolves.toMatchObject({
      averageRating: 4,
      reviewCount: 1,
      ratingDistribution: { 4: 1 },
    });
    await expect(repository.hasPurchasedProduct('buyer-1', 'product-1')).resolves.toBe(true);
  });

  it('updates moderation status inside a transaction', async () => {
    const prisma = buildPrismaMock();
    prisma.$transaction.mockImplementation(async (callback: any) => callback({
      catalog_ProductReview: {
        update: jest.fn().mockResolvedValue({
          id: 'review-1',
          productId: 'product-1',
          buyerId: 'buyer-1',
          rating: 4,
          comment: 'Solid',
          moderationStatus: 'HIDDEN',
          submittedAt: new Date('2026-01-01T00:00:00.000Z'),
          updatedAt: new Date('2026-01-02T00:00:00.000Z'),
        }),
      },
      catalog_ReviewModerationLog: {
        create: jest.fn().mockResolvedValue(undefined),
      },
    }));

    const repository = new PrismaProductReviewRepository(prisma as never);
    const updated = await repository.updateModerationStatus('review-1', 'HIDDEN', 'admin-1', 'VISIBLE');

    expect(updated.moderationStatus).toBe('HIDDEN');
    expect(prisma.$transaction).toHaveBeenCalled();
  });
});
