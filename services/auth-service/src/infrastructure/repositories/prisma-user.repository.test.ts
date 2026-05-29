import { PasswordHash } from '../../domain/value-objects/password-hash.value-object';
import { User, UserRole, UserStatus } from '../../domain/entities/user.entity';
import { PrismaUserRepository } from './prisma-user.repository';

const createUser = (): User =>
  User.create({
    id: 'user-1',
    publicCode: 'MSR-0001',
    email: 'buyer@example.com',
    role: UserRole.USER,
    status: UserStatus.ACTIVE,
    profile: { name: 'Buyer One' },
    kycStatus: 'APPROVED',
    passwordHash: new PasswordHash('hashed-password')
  });

describe('PrismaUserRepository', () => {
  it('persists users with the mapped payload', async () => {
    const prisma = {
      user: {
        upsert: jest.fn().mockResolvedValue(undefined),
        findUnique: jest.fn(),
        count: jest.fn()
      }
    };
    const repository = new PrismaUserRepository(prisma as never);
    const user = createUser();

    await repository.save(user);

    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: 'user-1' },
      update: expect.objectContaining({
        id: 'user-1',
        publicCode: 'MSR-0001',
        email: 'buyer@example.com',
        role: UserRole.USER,
        accountStatus: UserStatus.ACTIVE,
        profile: { name: 'Buyer One' },
        kycStatus: 'APPROVED',
        passwordHash: 'hashed-password'
      }),
      create: expect.objectContaining({
        id: 'user-1',
        publicCode: 'MSR-0001'
      })
    });
  });

  it('maps lookups back into domain users and handles missing records', async () => {
    const prisma = {
      user: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
        count: jest.fn().mockResolvedValueOnce(2).mockResolvedValueOnce(0)
      }
    };
    const repository = new PrismaUserRepository(prisma as never);
    const rawUser = {
      id: 'user-1',
      publicCode: 'MSR-0001',
      email: 'buyer@example.com',
      role: UserRole.USER,
      status: UserStatus.ACTIVE,
      profile: { name: 'Buyer One' },
      kycStatus: 'APPROVED',
      passwordHash: 'hashed-password'
    };
    prisma.user.findUnique
      .mockResolvedValueOnce(rawUser)
      .mockResolvedValueOnce(rawUser)
      .mockResolvedValueOnce(null);

    const byId = await repository.findById('user-1');
    const byEmail = await repository.findByEmail('buyer@example.com');
    const missing = await repository.findByEmail('missing@example.com');
    const emailExists = await repository.emailExists('buyer@example.com');
    const missingEmailExists = await repository.emailExists('missing@example.com');

    expect(byId?.id).toBe('user-1');
    expect(byId?.email).toBe('buyer@example.com');
    expect(byId?.publicCode).toBe('MSR-0001');
    expect(byId?.status).toBe(UserStatus.ACTIVE);
    expect(byId?.passwordHash.toString()).toBe('hashed-password');
    expect(byEmail?.id).toBe('user-1');
    expect(byEmail?.email).toBe('buyer@example.com');
    expect(missing).toBeNull();
    expect(emailExists).toBe(true);
    expect(missingEmailExists).toBe(false);
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(1, { where: { id: 'user-1' } });
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(2, { where: { email: 'buyer@example.com' } });
    expect(prisma.user.findUnique).toHaveBeenNthCalledWith(3, { where: { email: 'missing@example.com' } });
    expect(prisma.user.count).toHaveBeenNthCalledWith(1, { where: { email: 'buyer@example.com' } });
    expect(prisma.user.count).toHaveBeenNthCalledWith(2, { where: { email: 'missing@example.com' } });
  });
});
