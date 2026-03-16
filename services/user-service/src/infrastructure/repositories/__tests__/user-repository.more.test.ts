import { InMemoryUserRepository, DatabaseUserRepository } from '../user.repository';
import { User } from '../../../domain/entities/user.entity';
import { Email } from '../../../domain/value-objects/email.value-object';
import { PhoneNumber } from '../../../domain/value-objects/phone-number.value-object';
import { UserRole } from '../../../domain/types/user.types';

function makeUser(id: string, role: UserRole = UserRole.BUYER, status = 'active') {
  const u = User.create({
    id,
    email: Email.create(`${id}@example.com`),
    phoneNumber: PhoneNumber.create('+255712345678'),
    firstName: 'F',
    lastName: 'L',
    role
  });
  (u as any).status = status;
  return u;
}

describe('InMemoryUserRepository additional behaviors', () => {
  let repo: InMemoryUserRepository;

  beforeEach(() => {
    repo = new InMemoryUserRepository();
  });

  test('findByCriteria, findByRole, findByStatus work', async () => {
    const a = makeUser('a', UserRole.SELLER, 'active');
    const b = makeUser('b', UserRole.BUYER, 'suspended');
    await repo.create(a);
    await repo.create(b);

    const byRole = await repo.findByRole(UserRole.SELLER);
    expect(byRole.some(u => u.id === 'a')).toBe(true);

    const byStatus = await repo.findByStatus('suspended');
    expect(byStatus.some(u => u.id === 'b')).toBe(true);

    const criteria = await repo.findByCriteria({ role: UserRole.BUYER } as any);
    expect(criteria.length).toBeGreaterThanOrEqual(1);
  });

  test('increment/reset login attempts and metadata updates', async () => {
    const u = makeUser('meta1');
    await repo.create(u);

    await repo.incrementLoginAttempts('meta1');
    const afterInc = await repo.findById('meta1');
    expect(afterInc?.metadata.loginAttempts).toBeGreaterThanOrEqual(1);

    await repo.resetLoginAttempts('meta1');
    const afterReset = await repo.findById('meta1');
    expect(afterReset?.metadata.loginAttempts).toBe(0);

    await repo.updateMetadata('meta1', { foo: 'bar' } as any);
    const afterMeta = await repo.findById('meta1');
    expect((afterMeta?.metadata as any).foo).toBe('bar');
  });

  test('lockAccount and unlockAccount update metadata', async () => {
    const u = makeUser('lock1');
    await repo.create(u);

    const until = new Date(Date.now() + 1000 * 60 * 60);
    await repo.lockAccount('lock1', until);
    const locked = await repo.findById('lock1');
    expect(locked?.metadata.accountLockedUntil).toBeDefined();

    await repo.unlockAccount('lock1');
    const unlocked = await repo.findById('lock1');
    expect(unlocked?.metadata.accountLockedUntil).toBeUndefined();
  });

  test('updateLastLogin sets lastLoginAt', async () => {
    const u = makeUser('last1');
    await repo.create(u);
    await repo.updateLastLogin('last1');
    const got = await repo.findById('last1');
    expect(got?.lastLoginAt).toBeDefined();
  });

  test('findByBusinessId returns null (not implemented)', async () => {
    const res = await repo.findByBusinessId('bizx');
    expect(res).toBeNull();
  });
});

describe('DatabaseUserRepository', () => {
  test('throws without a real database implementation', async () => {
    const db = new DatabaseUserRepository();
    const u = makeUser('db1');
    const message = 'DatabaseUserRepository is not implemented';

    await expect(db.create(u)).rejects.toThrow(message);
    await expect(db.incrementLoginAttempts('db1')).rejects.toThrow(message);
    await expect(db.lockAccount('db1', new Date(Date.now() + 1000))).rejects.toThrow(message);
    await expect(db.updateLastLogin('db1')).rejects.toThrow(message);
    await expect(db.findById('db1')).rejects.toThrow(message);
    await expect(db.findByRole(u.role)).rejects.toThrow(message);
  });
});
