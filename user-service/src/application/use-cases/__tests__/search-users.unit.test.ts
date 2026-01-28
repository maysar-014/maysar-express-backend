import { SearchUsersUseCase } from '../search-users.use-case';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';

function makeUser(id: string, role = 'buyer', status = 'active', verified = false) {
  let u = User.create({
    id,
    email: Email.create(`${id}@example.com`),
    phoneNumber: PhoneNumber.create('+255712345678'),
    firstName: 'A',
    lastName: 'B',
    role
  } as any);
  if (verified) u = u.verifyEmail();
  (u as any).status = status;
  return u;
}

describe('SearchUsersUseCase', () => {
  let repo: any;
  let useCase: SearchUsersUseCase;

  beforeEach(() => {
    repo = {
      findById: jest.fn(),
      search: jest.fn(),
    };
    useCase = new SearchUsersUseCase(repo);
  });

  test('denies search when requesting user not found', async () => {
    repo.findById.mockResolvedValue(null);
    const out = await useCase.execute({
      filters: {},
      pagination: { page: 1, limit: 10 },
      requestingUserId: 'nope'
    });
    expect(out.success).toBe(false);
    expect(out.message).toMatch(/not found/i);
    expect(out.users).toHaveLength(0);
  });

  test('returns empty results and pagination when no query', async () => {
    const rUser = makeUser('r1', 'system');
    repo.findById.mockResolvedValue(rUser);
    repo.search.mockResolvedValue([]);
    jest.spyOn<any, any>(SearchUsersUseCase.prototype as any, 'getTotalCount').mockResolvedValue(0);

    const out = await useCase.execute({
      filters: {},
      pagination: { page: 1, limit: 10 },
      requestingUserId: 'r1'
    });

    expect(out.success).toBe(true);
    expect(out.users).toHaveLength(0);
    expect(out.pagination.total).toBe(0);
    expect(out.pagination.totalPages).toBe(0);
  });

  test('pagination math and hasNext/hasPrev flags', async () => {
    const rUser = makeUser('r2', 'system');
    repo.findById.mockResolvedValue(rUser);
    const sampleUsers = [makeUser('u1'), makeUser('u2')];
    repo.search.mockResolvedValue(sampleUsers);
    jest.spyOn<any, any>(SearchUsersUseCase.prototype as any, 'getTotalCount').mockResolvedValue(25);

    const out = await useCase.execute({
      filters: { query: 'foo' },
      pagination: { page: 2, limit: 10 },
      requestingUserId: 'r2'
    });

    expect(out.success).toBe(true);
    expect(out.users).toHaveLength(2);
    expect(out.pagination.total).toBe(25);
    expect(out.pagination.totalPages).toBe(3);
    expect(out.pagination.hasNext).toBe(true);
    expect(out.pagination.hasPrev).toBe(true);
  });

  test('searchWithAnalytics returns analytics and correct distribution', async () => {
    const rUser = makeUser('r3', 'system');
    repo.findById.mockResolvedValue(rUser);
    const u1 = makeUser('a', 'buyer', 'active', true);
    const u2 = makeUser('b', 'seller', 'active', false);
    repo.search.mockResolvedValue([u1, u2]);
    jest.spyOn<any, any>(SearchUsersUseCase.prototype as any, 'getTotalCount').mockResolvedValue(2);

    const res = await useCase.searchWithAnalytics({
      filters: { query: 'a' },
      pagination: { page: 1, limit: 10 },
      requestingUserId: 'r3'
    });

    expect(res.success).toBe(true);
    expect(res.analytics).toBeDefined();
    expect(res.analytics.filtersApplied).toContain('query');
    expect(res.analytics.resultDistribution.byRole['buyer']).toBe(1);
    expect(res.analytics.resultDistribution.verificationRate).toBeCloseTo(50);
  });
});
