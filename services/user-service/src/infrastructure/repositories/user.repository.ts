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
  publicCodeExists(code: string): Promise<boolean>;
  incrementLoginAttempts(userId: string): Promise<void>;
  resetLoginAttempts(userId: string): Promise<void>;
  lockAccount(userId: string, until: Date): Promise<void>;
  unlockAccount(userId: string): Promise<void>;
  updateLastLogin(userId: string, loginTime: Date): Promise<void>;
  updateMetadata(userId: string, metadata: any): Promise<void>;

  // COD Reputation Methods
  updateCODStanding(userId: string, updates: any): Promise<void>;
  saveCODHistory(history: any): Promise<void>;
}

/**
 * In-Memory User Repository Implementation
 * For development and testing purposes
 */
export class InMemoryUserRepository implements UserRepository {
  private users: Map<string, User> = new Map();
  private emailIndex: Map<string, string> = new Map();
  private phoneIndex: Map<string, string> = new Map();
  private publicCodeIndex: Map<string, string> = new Map();

  async save(user: User): Promise<void> {
    this.users.set(user.id, user);
    this.emailIndex.set(user.email.toString(), user.id);
    this.phoneIndex.set(user.phoneNumber.toString(), user.id);
    if (user.publicCode) {
      this.publicCodeIndex.set(user.publicCode, user.id);
    }
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
    if (entity.publicCode) {
      this.publicCodeIndex.set(entity.publicCode, entity.id);
    }
    return entity;
  }

  async update(entity: User): Promise<User> {
    this.users.set(entity.id, entity);
    if (entity.publicCode) {
      this.publicCodeIndex.set(entity.publicCode, entity.id);
    }
    return entity;
  }

  async delete(id: string): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.users.delete(id);
      this.emailIndex.delete(user.email.toString());
      this.phoneIndex.delete(user.phoneNumber.toString());
      if (user.publicCode) {
        this.publicCodeIndex.delete(user.publicCode);
      }
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

  async findByBusinessId(_businessId: string): Promise<User | null> {
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

  async publicCodeExists(code: string): Promise<boolean> {
    return this.publicCodeIndex.has(code);
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
        accountLockedUntil: undefined as any
      });
      this.users.set(userId, updatedUser);
    }
  }

  async updateLastLogin(userId: string): Promise<void> {
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

  async updateCODStanding(userId: string, updates: any): Promise<void> {
    const user = this.users.get(userId);
    if (user) {
      // In-memory update of "private" fields for simulation
      Object.assign(user, updates);
      this.users.set(userId, user);
    }
  }

  async saveCODHistory(history: any): Promise<void> {
    console.log(`[InMemory] Saved COD History for user ${history.userId}: ${history.action}`);
  }
}

/**
 * Database User Repository Implementation
 * For production use with Prisma ORM
 */
export class DatabaseUserRepository implements UserRepository {
  async save(user: User): Promise<void> {
    return this.fail();
  }

  async findById(id: string): Promise<User | null> {
    return this.fail();
  }

  async findByCriteria(criteria: Partial<User>): Promise<User[]> {
    return this.fail();
  }

  async create(entity: User): Promise<User> {
    return this.fail();
  }

  async update(entity: User): Promise<User> {
    return this.fail();
  }

  async delete(id: string): Promise<void> {
    return this.fail();
  }

  async count(criteria?: Partial<User>): Promise<number> {
    return this.fail();
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.fail();
  }

  async findByPhoneNumber(phoneNumber: string): Promise<User | null> {
    return this.fail();
  }

  async findByBusinessId(businessId: string): Promise<User | null> {
    return this.fail();
  }

  async findByRole(role: string): Promise<User[]> {
    return this.fail();
  }

  async findByStatus(status: string): Promise<User[]> {
    return this.fail();
  }

  async publicCodeExists(code: string): Promise<boolean> {
    return this.fail();
  }

  async incrementLoginAttempts(userId: string): Promise<void> {
    return this.fail();
  }

  async resetLoginAttempts(userId: string): Promise<void> {
    return this.fail();
  }

  async lockAccount(userId: string, until: Date): Promise<void> {
    return this.fail();
  }

  async unlockAccount(userId: string): Promise<void> {
    return this.fail();
  }

  async updateLastLogin(userId: string): Promise<void> {
    return this.fail();
  }

  async updateMetadata(userId: string, metadata: any): Promise<void> {
    return this.fail();
  }

  async updateCODStanding(userId: string, updates: any): Promise<void> {
    return this.fail();
  }

  async saveCODHistory(history: any): Promise<void> {
    return this.fail();
  }

  private fail(): never {
    throw new Error('DatabaseUserRepository is not implemented. Use PrismaUserRepository instead.');
  }
}
