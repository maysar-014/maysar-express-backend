import { ReviewController } from './review.controller';

const createResponse = () => ({
  status: jest.fn().mockReturnThis(),
  json: jest.fn().mockReturnThis()
});

describe('ReviewController', () => {
  it('handles successful review submission, listing, and moderation', async () => {
    const submitReviewUseCase = {
      execute: jest.fn().mockResolvedValue({
        status: 'success',
        review: { id: 'review-1', rating: 5 }
      })
    };
    const getReviewsUseCase = {
      execute: jest.fn().mockResolvedValue({
        status: 'success',
        data: {
          reviews: [{ id: 'review-1', rating: 5 }],
          totalCount: 1,
          totalPages: 1,
          currentPage: 1,
          limit: 10
        }
      })
    };
    const moderateReviewUseCase = {
      execute: jest.fn().mockResolvedValue({
        status: 'success',
        review: { id: 'review-1', status: 'VISIBLE' }
      })
    };
    const controller = new ReviewController(
      submitReviewUseCase as never,
      getReviewsUseCase as never,
      moderateReviewUseCase as never
    );

    const submitRes = createResponse();
    await controller.submitReview(
      {
        params: { id: 'product-1' },
        body: { rating: 5, comment: 'Great' },
        user: { userId: 'buyer-1' }
      } as never,
      submitRes as never
    );

    const listRes = createResponse();
    await controller.getReviews(
      {
        params: { id: 'product-1' },
        query: { page: '1', limit: '10', sortBy: 'rating' }
      } as never,
      listRes as never
    );

    const moderateRes = createResponse();
    await controller.moderateReview(
      {
        params: { reviewId: 'review-1' },
        body: { newStatus: 'VISIBLE' },
        user: { userId: 'admin-1', roles: ['ADMIN'] }
      } as never,
      moderateRes as never
    );

    expect(submitReviewUseCase.execute).toHaveBeenCalledWith({
      productId: 'product-1',
      buyerId: 'buyer-1',
      rating: 5,
      comment: 'Great'
    });
    expect(submitRes.status).toHaveBeenCalledWith(201);
    expect(listRes.status).toHaveBeenCalledWith(200);
    expect(moderateRes.status).toHaveBeenCalledWith(200);
  });

  it('returns validation and auth errors consistently', async () => {
    const submitReviewUseCase = {
      execute: jest.fn().mockResolvedValue({
        status: 'forbidden',
        errorCode: 'REVIEW_PURCHASE_REQUIRED',
        message: 'Purchase required'
      })
    };
    const getReviewsUseCase = {
      execute: jest.fn().mockResolvedValue({
        status: 'validation_error',
        message: 'Bad query'
      })
    };
    const moderateReviewUseCase = {
      execute: jest.fn().mockResolvedValue({
        status: 'not_found',
        errorCode: 'NOT_FOUND',
        message: 'Missing'
      })
    };
    const controller = new ReviewController(
      submitReviewUseCase as never,
      getReviewsUseCase as never,
      moderateReviewUseCase as never
    );

    const unauthorizedSubmit = createResponse();
    await controller.submitReview(
      { params: { id: 'product-1' }, body: { rating: 5, comment: 'x' } } as never,
      unauthorizedSubmit as never
    );

    const rejectedSubmit = createResponse();
    await controller.submitReview(
      {
        params: { id: 'product-1' },
        body: { rating: 5, comment: 'x' },
        user: { userId: 'buyer-1' }
      } as never,
      rejectedSubmit as never
    );

    const listRes = createResponse();
    await controller.getReviews(
      { params: { id: 'product-1' }, query: {} } as never,
      listRes as never
    );

    const moderateRes = createResponse();
    await controller.moderateReview(
      {
        params: { reviewId: 'review-1' },
        body: { newStatus: 'HIDDEN' },
        user: { userId: 'admin-1', roles: ['ADMIN'] }
      } as never,
      moderateRes as never
    );

    expect(unauthorizedSubmit.status).toHaveBeenCalledWith(401);
    expect(rejectedSubmit.status).toHaveBeenCalledWith(403);
    expect(listRes.status).toHaveBeenCalledWith(422);
    expect(moderateRes.status).toHaveBeenCalledWith(404);
  });
});
