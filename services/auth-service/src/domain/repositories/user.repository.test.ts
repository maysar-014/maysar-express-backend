import type { User } from '../entities/user.entity';
import type { IUserRepository } from './user.repository';

class InMemoryUserRepository implements IUserRepository {
  private readonly usersById = new Map<string, User>();
  private readonly usersByEmail = new Map<string, User>();

  async save(user: User): Promise<void> {
    this.usersById.set(user.id, user);
    this.usersByEmail.set(user.email.toString(), user);
  }

  async findById(id: string): Promise<User | null> {
    return this.usersById.get(id) ?? null;
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.usersByEmail.get(email) ?? null;
  }
}

describe('IUserRepository contract', () => {
  it('can save and retrieve users by id and email', async () => {
    const repository = new InMemoryUserRepository();
    const user = {
      id: 'user-1',
      email: { toString: () => 'user@example.com' }
    } as unknown as User;

    await repository.save(user);

    await expect(repository.findById('user-1')).resolves.toBe(user);
    await expect(repository.findByEmail('user@example.com')).resolves.toBe(user);
    await expect(repository.findById('missing')).resolves.toBeNull();
  });
});
