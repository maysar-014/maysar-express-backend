import { PrismaClient } from '@prisma/client';
import { User, UserRole, UserStatus } from '../../domain/entities/user.entity';
import { TrustMetadata } from '../../domain/value-objects/trust-metadata.value-object';
import { IUserRepository } from '../../domain/repositories';

/**
 * Prisma implementation of User repository
 * Adapts Prisma ORM to Domain repository interface
 */
export class PrismaUserRepository implements IUserRepository {
  constructor(private prisma: PrismaClient) {}

  async findById(id: string): Promise<User | null> {
    const userData = await this.prisma.user.findUnique({
      where: { id }
    });

    if (!userData) {
      return null;
    }

    // Convert database model to domain entity
    return this.mapToDomainEntity(userData);
  }

  async findByUsername(username: string): Promise<User | null> {
    // Note: In this schema, username is not unique, so we use findFirst
    const userData = await this.prisma.user.findFirst({
      where: { username }
    });

    if (!userData) {
      return null;
    }

    return this.mapToDomainEntity(userData);
  }

  async save(user: User): Promise<void> {
    const userData = this.mapToPrismaData(user);

    await this.prisma.user.upsert({
      where: { id: user.id },
      update: userData,
      create: userData
    });
  }

  async updateTrustMetadata(userId: string, metadata: TrustMetadata): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        reputation: metadata.ratingScore,
        isVerified: metadata.isVerified,
        updatedAt: new Date()
      }
    });
  }

  async findByRole(role: UserRole): Promise<User[]> {
    const usersData = await this.prisma.user.findMany({
      where: {
        // Note: Prisma schema uses string role, need to map
        // This is a simplified mapping - in real implementation,
        // you'd have proper enum conversion
      }
    });

    return usersData.map(userData => this.mapToDomainEntity(userData));
  }

  async searchUsers(query: string, limit: number = 20): Promise<User[]> {
    const usersData = await this.prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: query, mode: 'insensitive' } },
          { displayName: { contains: query, mode: 'insensitive' } },
          { bio: { contains: query, mode: 'insensitive' } }
        ]
      },
      take: limit,
      orderBy: { reputation: 'desc' }
    });

    return usersData.map(userData => this.mapToDomainEntity(userData));
  }

  // Private mapping methods
  private mapToDomainEntity(userData: any): User {
    // Create trust metadata from database fields
    const trustMetadata = TrustMetadata.createDefault();
    // Update with database values
    trustMetadata.updateRating(userData.reputation || 0);
    if (userData.isVerified) {
      trustMetadata.verify();
    }

    // Map database role to domain enum
    const roleMapping: { [key: string]: UserRole } = {
      'buyer': UserRole.BUYER,
      'seller': UserRole.SELLER,
      'supplier': UserRole.SUPPLIER,
      'courier': UserRole.COURIER,
      'enabler': UserRole.ENABLER,
      'system': UserRole.SYSTEM
    };

    const role = roleMapping[userData.role] || UserRole.BUYER;

    return User.create({
      id: userData.id,
      username: userData.username,
      displayName: userData.displayName,
      role,
      trustMetadata
    });
  }

  private mapToPrismaData(user: User): any {
    return {
      id: user.id,
      username: user.username,
      displayName: user.displayName,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      location: user.location,
      website: user.website,
      isVerified: user.isVerified,
      reputation: user.trustMetadata.ratingScore,
      followersCount: 0, // Would be calculated
      followingCount: 0, // Would be calculated
      status: user.status,
      lastActiveAt: user.lastActiveAt,
      updatedAt: new Date()
    };
  }
}
