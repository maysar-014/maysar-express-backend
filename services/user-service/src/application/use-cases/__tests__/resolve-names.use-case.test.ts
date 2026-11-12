import { ResolveNamesUseCase, NameResolutionCache, NAME_RESOLUTION_CACHE_PREFIX } from '../resolve-names.use-case';
import { UserMapper } from '../../mappers/user-mapper';
import { User } from '../../../domain/entities/user.entity';
import { UserRole } from '../../../domain/types/user.types';

/**
 * In-memory cache stub for testing. Implements the NameResolutionCache
 * interface exactly as the use case expects it.
 */
class InMemoryCache implements NameResolutionCache {
  private store = new Map<string, { value: string; expiresAt: number | null }>();
  public getSpy = jest.fn();
  public setSpy = jest.fn();
  public delSpy = jest.fn();
  public shouldThrow = false;

  async get(key: string): Promise<string | null> {
    this.getSpy(key);
    if (this.shouldThrow) throw new Error('cache down');
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt !== null && Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value;
  }

  async set(key: string, value: string, ttlSeconds: number): Promise<void> {
    this.setSpy(key, value, ttlSeconds);
    if (this.shouldThrow) throw new Error('cache down');
    const expiresAt = ttlSeconds > 0 ? Date.now() + ttlSeconds * 1000 : null;
    this.store.set(key, { value, expiresAt });
  }

  async del(key: string): Promise<void> {
    this.delSpy(key);
    if (this.shouldThrow) throw new Error('cache down');
    this.store.delete(key);
  }

  size(): number {
    return this.store.size;
  }

  has(key: string): boolean {
    return this.store.has(key);
  }
}

function makeUser(id: string, firstName: string, lastName: string, role: UserRole = UserRole.SELLER, publicCode?: string): User {
  // Use the mapper's toEntity helper (which calls User.create with sensible defaults)
  // then override the id so multiple users in one test don't collide.
  const user = UserMapper.toEntity({
    email: `${firstName.toLowerCase()}@example.com`,
    phoneNumber: '+255712345678',
    firstName,
    lastName,
    role,
  } as any, publicCode ? { publicCode } : undefined);
  // toEntity generates a fresh ULID for the id; we override it here for test
  // predictability. The User entity exposes `id` as readonly, so we use a cast
  // to bypass TypeScript — the runtime value is what the test cares about.
  (user as any).id = id;
  return user;
}

function makeUserRepository(users: User[]) {
  return {
    findByIds: jest.fn(async (ids: string[]) => users.filter((u) => ids.includes(u.id))),
    findById: jest.fn(),
    findByEmail: jest.fn(),
    findByPhoneNumber: jest.fn(),
  } as any;
}

describe('ResolveNamesUseCase', () => {
  it('resolves all IDs from the DB when the cache is empty', async () => {
    const users = [makeUser('u1', 'Asha', 'Mwakalobo'), makeUser('u2', 'Juma', 'Mussa')];
    const repo = makeUserRepository(users);
    const useCase = new ResolveNamesUseCase(repo, new InMemoryCache());

    const result = await useCase.execute({ ids: ['u1', 'u2', 'unknown-id'] });

    expect(result.size).toBe(3);
    expect(result.get('u1')?.fullName).toBe('Asha Mwakalobo');
    expect(result.get('u2')?.fullName).toBe('Juma Mussa');
    expect(result.get('unknown-id')).toBeNull();
  });

  it('returns results from the cache without querying the DB', async () => {
    const cache = new InMemoryCache();
    await cache.set(NAME_RESOLUTION_CACHE_PREFIX + 'u1', JSON.stringify({
      fullName: 'Cached Name', publicCode: 'MYS-SLR-01', role: 'seller',
    }), 300);

    const repo = makeUserRepository([]); // empty DB — must not be called
    const useCase = new ResolveNamesUseCase(repo, cache);

    const result = await useCase.execute({ ids: ['u1'] });

    expect(repo.findByIds).not.toHaveBeenCalled();
    expect(result.get('u1')?.fullName).toBe('Cached Name');
  });

  it('serves some IDs from cache and fetches the rest from the DB (mixed)', async () => {
    const cache = new InMemoryCache();
    await cache.set(NAME_RESOLUTION_CACHE_PREFIX + 'u1', JSON.stringify({
      fullName: 'Cached One', publicCode: 'MYS-SLR-01', role: 'seller',
    }), 300);

    const users = [makeUser('u2', 'Fresh', 'User')];
    const repo = makeUserRepository(users);
    const useCase = new ResolveNamesUseCase(repo, cache);

    const result = await useCase.execute({ ids: ['u1', 'u2'] });

    // Only the cache miss (u2) should be fetched from the DB
    expect(repo.findByIds).toHaveBeenCalledWith(['u2']);
    expect(result.get('u1')?.fullName).toBe('Cached One');
    expect(result.get('u2')?.fullName).toBe('Fresh User');
  });

  it('returns null for every ID when all IDs are unknown', async () => {
    const repo = makeUserRepository([]);
    const cache = new InMemoryCache();
    const useCase = new ResolveNamesUseCase(repo, cache);

    const result = await useCase.execute({ ids: ['unknown1', 'unknown2', 'unknown3'] });

    expect(result.size).toBe(3);
    expect(result.get('unknown1')).toBeNull();
    expect(result.get('unknown2')).toBeNull();
    expect(result.get('unknown3')).toBeNull();

    // Unresolved IDs must NOT be cached
    expect(cache.has(NAME_RESOLUTION_CACHE_PREFIX + 'unknown1')).toBe(false);
  });

  it('deduplicates IDs and returns one entry per unique ID', async () => {
    const users = [makeUser('u1', 'Asha', 'Mwakalobo')];
    const repo = makeUserRepository(users);
    const useCase = new ResolveNamesUseCase(repo, new InMemoryCache());

    const result = await useCase.execute({ ids: ['u1', 'u1', 'u1', 'u1'] });

    expect(result.size).toBe(1);
    expect(result.get('u1')?.fullName).toBe('Asha Mwakalobo');
  });

  it('preserves first-occurrence order of unique IDs in the result Map', async () => {
    const users = [
      makeUser('u3', 'Charlie', 'Smith'),
      makeUser('u1', 'Asha', 'Mwakalobo'),
      makeUser('u2', 'Juma', 'Mussa'),
    ];
    const repo = makeUserRepository(users);
    const useCase = new ResolveNamesUseCase(repo, new InMemoryCache());

    const result = await useCase.execute({ ids: ['u3', 'u1', 'u2'] });

    expect(Array.from(result.keys())).toEqual(['u3', 'u1', 'u2']);
  });

  it('returns the same value when called twice (idempotence)', async () => {
    const users = [makeUser('u1', 'Asha', 'Mwakalobo')];
    const repo = makeUserRepository(users);
    const cache = new InMemoryCache();
    const useCase = new ResolveNamesUseCase(repo, cache);

    const first = await useCase.execute({ ids: ['u1'] });
    const second = await useCase.execute({ ids: ['u1'] });

    expect(second.get('u1')).toEqual(first.get('u1'));
  });

  it('falls back to the DB when the cache is down and still returns results', async () => {
    const users = [makeUser('u1', 'Asha', 'Mwakalobo')];
    const repo = makeUserRepository(users);
    const cache = new InMemoryCache();
    cache.shouldThrow = true;
    const useCase = new ResolveNamesUseCase(repo, cache);

    const result = await useCase.execute({ ids: ['u1'] });

    // Despite cache failures, the use case still resolved the user from the DB.
    expect(result.get('u1')?.fullName).toBe('Asha Mwakalobo');
  });

  it('works without a cache wired in (DB-only path)', async () => {
    const users = [makeUser('u1', 'Asha', 'Mwakalobo')];
    const repo = makeUserRepository(users);
    const useCase = new ResolveNamesUseCase(repo); // no cache

    const result = await useCase.execute({ ids: ['u1', 'unknown'] });

    expect(result.get('u1')?.fullName).toBe('Asha Mwakalobo');
    expect(result.get('unknown')).toBeNull();
  });

  it('caches freshly resolved entries with the configured TTL', async () => {
    const users = [makeUser('u1', 'Asha', 'Mwakalobo')];
    const repo = makeUserRepository(users);
    const cache = new InMemoryCache();
    const useCase = new ResolveNamesUseCase(repo, cache);

    await useCase.execute({ ids: ['u1'] });

    expect(cache.has(NAME_RESOLUTION_CACHE_PREFIX + 'u1')).toBe(true);
  });

  it('returns an empty Map for an empty ids array', async () => {
    const repo = makeUserRepository([]);
    const useCase = new ResolveNamesUseCase(repo, new InMemoryCache());

    const result = await useCase.execute({ ids: [] });

    expect(result.size).toBe(0);
    expect(repo.findByIds).not.toHaveBeenCalled();
  });

  it('returns null for every ID when the DB batch fetch throws', async () => {
    const repo = {
      findByIds: jest.fn().mockRejectedValue(new Error('DB down')),
    } as any;
    const useCase = new ResolveNamesUseCase(repo, new InMemoryCache());

    const result = await useCase.execute({ ids: ['u1', 'u2'] });

    expect(result.size).toBe(2);
    expect(result.get('u1')).toBeNull();
    expect(result.get('u2')).toBeNull();
  });
});
