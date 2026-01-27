import { Repository } from '@domain/interfaces';
import { User } from '@domain/entities/user.entity';

/**
 * User Repository Interface
 * Defines contract for user persistence operations
 */
export interface UserRepository extends Repository<User> {
  findByEmail(email: string): Promise<User | null>;
  findByPhoneNumber(phoneNumber: string): Promise<User | null>;
  findByBusinessId(businessId: string): Promise<User | null>;
  findByRole(role: string): Promise<User[]>;
  findByStatus(status: string): Promise<User[]>;
  incrementLoginAttempts(userId: string): Promise<void>;
  resetLoginAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, until: Date): Promise<void>;
  unlockAccount(userId: string): Promise<void>;
  updateLastLogin(userId: string, loginTime: Date): Promise<void>;
  updateMetadata(userId: string, metadata: any): Promise<void>;
}

/**
 * In-Memory User Repository Implementation
 * For development and testing purposes
 */
export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map();
  private phoneIndex: Map<string, string> = new Map();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toString(), user.id);
    this.phoneIndex.set(user.phoneNumber.toString(), user.id);
  }

  async findById(id: string): Promise<User | null> {
    return this.users.get(id) || null;
  }

  async findByCriteria(criteria: Partial<User>): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => {
      return Object.entries(criteria).every(([key, value]) => {
        return user[key as keyof User] === value;
      });
    });
  }

  async create(entity: User): Promise<User> {
    this.users.set(entity.id, entity);
    this.emailIndex.set(entity.email.toString(), entity.id);
    this.phoneIndex.set(entity.phoneNumber.toString(), entity.id);
    return entity;
  }

  async update(entity: User): Promise<User> {
    this.users.set(entity.id, entity);
    return entity;
  }

  async delete(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.users.delete(id);
      this.emailIndex.delete(user.email.toString());
      this.phoneIndex.delete(user.phoneNumber.toString());
    }
  }

  async count(criteria?: Partial<User>): Promise<number> {
    if (!criteria) {
      return this.users.size;
    }
    const results = await this.findByCriteria(criteria);
    return results.length;
  }

  async findByEmail(email: string): Promise<User | null> {
    const userId = this.emailIndex.get(email);
    return userId ? this.users.get(userId) || null : null;
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    const userId = this.phoneIndex.get(phoneNumber);
    return userId ? this.users.get(userId) || null : null;
  }

  async findByBusinessId(businessId: string): Promise<User | null> {
    // TODO: Implement business ID lookup once BusinessInfo is integrated
    // For now, return null as businessId is not yet part of UserMetadata
    return null;
  }

  async findByRole(role: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.role === role);
  }

  async findByStatus(status: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(user => user.status === status);
  }

  async incrementLoginAttempts(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = user.updateMetadata({ 
        loginAttempts: user.metadata.loginAttempts + 1 
      });
      this.users.set(userId, updatedUser);
    }
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = user.updateMetadata({ 
        loginAttempts: 0 
      });
      this.users.set(userId, updatedUser);
    }
  }

  async lockAccount(userId: string, until: Date): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = user.updateMetadata({ 
        accountLockedUntil: until 
      });
      this.users.set(userId, updatedUser);
    }
  }

  async unlockAccount(userId: string): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = user.updateMetadata({ 
        accountLockedUntil: undefined 
      });
      this.users.set(userId, updatedUser);
    }
  }

  async updateLastLogin(userId: string, loginTime: Date): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = user.updateLastLogin();
      this.users.set(userId, updatedUser);
    }
  }

  async updateMetadata(userId: string, metadata: any): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      const updatedUser = user.updateMetadata(metadata);
      this.users.set(userId, updatedUser);
    }
  }
}

/**
 * Database User Repository Implementation
 * For production use with Prisma ORM
 */
export class DatabaseUserRepository implements UserRepository {
  // TODO: Implement with Prisma ORM
  // This would require setting up Prisma schema and client
  // For now, we'll use the in-memory implementation

  private fallbackRepository: InMemoryUserRepository;

  constructor() {
    this.fallbackRepository = new InMemoryUserRepository();
  }

  async save(user: User): Promise<void> {
    // TODO: Implement database save with Prisma
    return this.fallbackRepository.save(user);
  }

  async findById(id: string): Promise<User | null> {
    // TODO: Implement database find with Prisma
    return this.fallbackRepository.findById(id);
  }

  async findByCriteria(criteria: Partial<User>): Promise<User[]> {
    // TODO: Implement database find with Prisma
    return this.fallbackRepository.findByCriteria(criteria);
  }

  async create(entity: User): Promise<User> {
    // TODO: Implement database create with Prisma
    return this.fallbackRepository.create(entity);
  }

  async update(entity: User): Promise<User> {
    // TODO: Implement database update with Prisma
    return this.fallbackRepository.update(entity);
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement database delete with Prisma
    return this.fallbackRepository.delete(id);
  }

  async count(criteria?: Partial<User>): Promise<number> {
    // TODO: Implement database count with Prisma
    return this.fallbackRepository.count(criteria);
  }

  async findByEmail(email: string): Promise<User | null> {
    // TODO: Implement database find with Prisma
    return this.fallbackRepository.findByEmail(email);
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    // TODO: Implement database find with Prisma
    return this.fallbackRepository.findByPhoneNumber(phoneNumber);
  }

  async findByBusinessId(businessId: string): Promise<User | null> {
    // TODO: Implement database find with Prisma
    return this.fallbackRepository.findByBusinessId(businessId);
  }

  async findByRole(role: string): Promise<User[]> {
    // TODO: Implement database find with Prisma
    return this.fallbackRepository.findByRole(role);
  }

  async findByStatus(status: string): Promise<User[]> {
    // TODO: Implement database find with Prisma
    return this.fallbackRepository.findByStatus(status);
  }

  async incrementLoginAttempts(userId: string): Promise<void> {
    // TODO: Implement database update with Prisma
    return this.fallbackRepository.incrementLoginAttempts(userId);
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    // TODO: Implement database update with Prisma
    return this.fallbackRepository.resetLoginAttempts(userId);
  }

  async lockAccount(userId: string, until: Date): Promise<void> {
    // TODO: Implement database update with Prisma
    return this.fallbackRepository.lockAccount(userId, until);
  }

  async unlockAccount(userId: string): Promise<void> {
    // TODO: Implement database update with Prisma
    return this.fallbackRepository.unlockAccount(userId);
  }

  async updateLastLogin(userId: string, loginTime: Date): Promise<void> {
    // TODO: Implement database update with Prisma
    return this.fallbackRepository.updateLastLogin(userId, loginTime);
  }

  async updateMetadata(userId: string, metadata: any): Promise<void> {
    // TODO: Implement database update with Prisma
    return this.fallbackRepository.updateMetadata(userId, metadata);
  }
}
