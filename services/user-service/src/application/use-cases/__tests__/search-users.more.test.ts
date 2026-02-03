import { SearchUsersUseCase } from '../search-users.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

describe('SearchUsersUseCase - focused branches', () => {
  const makeUser = (id: string, role = UserRole.BUYER, verified = false) => {
    let u = User.create({
      id,
      email: Email.create(`${id}@example.com`),
      phoneNumber: PhoneNumber.create('+255712345678'),
      firstName: 'F',
      lastName: 'L',
      role
    } as any);
    if (verified) u = u.verifyEmail();
    return u;
  };

  test('applyAuthorizationFilters returns unchanged query for system and enabler', async () => {
    const repo: any = { findById: jest.fn() };
    const sut = new SearchUsersUseCase(repo);

    repo.findById.mockResolvedValue(makeUser('sys', UserRole.SYSTEM));
    await expect((sut as any).applyAuthorizationFilters('q', 'sys')).resolves.toBe('q');

    repo.findById.mockResolvedValue(makeUser('en', UserRole.ENABLER));
    await expect((sut as any).applyAuthorizationFilters('q2', 'en')).resolves.toBe('q2');
  });

  test('getAppliedFilters returns correct keys', () => {
    const sut = new SearchUsersUseCase({} as any);
    const filters = {
      query: 'x',
      role: 'seller',
      emailVerified: true,
      createdAfter: new Date(2020, 1, 1)
    } as any;

    const applied = (sut as any).getAppliedFilters(filters);
    expect(applied).toEqual(expect.arrayContaining(['query', 'role', 'emailVerified', 'createdAfter']));
  });

  test('calculateResultDistribution computes counts and verification rate', () => {
    const sut = new SearchUsersUseCase({} as any);
    const users = [
      makeUser('u1', UserRole.BUYER, true),
      makeUser('u2', UserRole.BUYER, false),
      makeUser('u3', UserRole.SELLER, true)
    ];

    const dist = (sut as any).calculateResultDistribution(users);
    expect(dist.byRole[UserRole.BUYER]).toBe(2);
    expect(dist.byRole[UserRole.SELLER]).toBe(1);
    expect(dist.verificationRate).toBeCloseTo((2 / 3) * 100);
  });

  test('searchWithAnalytics returns analytics and preserves result', async () => {
    const repo: any = {
      findById: jest.fn().mockResolvedValue(makeUser('admin', UserRole.SYSTEM)),
      search: jest.fn().mockResolvedValue([makeUser('a'), makeUser('b')])
    };

    const sut = new SearchUsersUseCase(repo);

    // Stub getTotalCount to return deterministic value
    jest.spyOn(SearchUsersUseCase.prototype as any, 'getTotalCount').mockResolvedValue(2);

    const input = { filters: {}, pagination: { page: 1, limit: 10 }, requestingUserId: 'admin' } as any;
    const res = await sut.searchWithAnalytics(input as any);

    expect(res.success).toBe(true);
    expect(res.analytics).toBeDefined();
    expect(res.pagination.total).toBe(2);
    expect(res.analytics.filtersApplied).toBeInstanceOf(Array);
  });
});
