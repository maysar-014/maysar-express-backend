import { SearchUsersUseCase } from './search-users.use-case';
import { UserPolicies } from '../../domain/policies/user-policies';
import { User } from '../../domain/entities/user.entity';
import { Email } from '../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../domain/types/user.types';

const makeUser = (id: string, role: UserRole = UserRole.BUYER) =>
  User.create({
    id,
    email: Email.create(`${id}@gmail.com`),
    phoneNumber: PhoneNumber.create('+255712345678'),
    firstName: 'Test',
    lastName: 'User',
    role
  });

describe('SearchUsersUseCase', () => {
  beforeEach(() => {
    jest.restoreAllMocks();
    jest.clearAllMocks();
  });

  it('returns denial payload when requesting user cannot search', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(makeUser('requester-1')),
      search: jest.fn()
    };
    jest.spyOn(UserPolicies, 'canSearchUsers').mockReturnValue({
      allowed: false,
      reason: 'Search forbidden'
    });

    const useCase = new SearchUsersUseCase(repository as never);
    const result = await useCase.execute({
      filters: {},
      pagination: { page: 1, limit: 20 },
      requestingUserId: 'requester-1'
    });

    expect(result.success).toBe(false);
    expect(result.message).toBe('Search forbidden');
    expect(result.users).toEqual([]);
    expect(repository.search).not.toHaveBeenCalled();
  });

  it('normalizes pagination and search query before repository call', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(makeUser('admin-1', UserRole.SYSTEM)),
      search: jest.fn().mockResolvedValue([makeUser('u-1')])
    };
    const useCase = new SearchUsersUseCase(repository as never);
    jest
      .spyOn(SearchUsersUseCase.prototype as any, 'getTotalCount')
      .mockResolvedValue(150);

    const result = await useCase.execute({
      filters: { query: '   ali   ' },
      pagination: { page: 0, limit: 999, sortBy: 'email', sortOrder: 'asc' },
      requestingUserId: 'admin-1'
    });

    expect(repository.search).toHaveBeenCalledWith('ali', 100, 0);
    expect(result.success).toBe(true);
    expect(result.pagination.total).toBe(150);
    expect(result.pagination.totalPages).toBe(2);
    expect(result.pagination.hasNext).toBe(true);
    expect(result.pagination.hasPrev).toBe(false);
  });

  it('returns failure payload when repository throws', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(makeUser('admin-2', UserRole.SYSTEM)),
      search: jest.fn().mockRejectedValue(new Error('db timeout'))
    };
    const useCase = new SearchUsersUseCase(repository as never);

    const result = await useCase.execute({
      filters: { query: 'john' },
      pagination: { page: 2, limit: 10 },
      requestingUserId: 'admin-2'
    });

    expect(result).toEqual({
      users: [],
      pagination: {
        page: 1,
        limit: 0,
        total: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false
      },
      success: false,
      message: 'Failed to search users'
    });
  });

  it('returns analytics with applied filters and distribution', async () => {
    const repository = {
      findById: jest.fn().mockResolvedValue(makeUser('admin-3', UserRole.SYSTEM)),
      search: jest.fn().mockResolvedValue([
        makeUser('buyer-1', UserRole.BUYER).verifyEmail(),
        makeUser('seller-1', UserRole.SELLER)
      ])
    };
    const useCase = new SearchUsersUseCase(repository as never);
    jest
      .spyOn(SearchUsersUseCase.prototype as any, 'getTotalCount')
      .mockResolvedValue(2);

    const result = await useCase.searchWithAnalytics({
      filters: { query: 'e', role: 'seller', emailVerified: true },
      pagination: { page: 1, limit: 10 },
      requestingUserId: 'admin-3'
    });

    expect(result.success).toBe(true);
    expect(result.analytics.filtersApplied).toEqual(
      expect.arrayContaining(['query', 'role', 'emailVerified'])
    );
    expect(result.analytics.resultDistribution.byRole).toEqual(
      expect.objectContaining({ buyer: 1, seller: 1 })
    );
    expect(result.analytics.resultDistribution.verificationRate).toBe(50);
  });
});
