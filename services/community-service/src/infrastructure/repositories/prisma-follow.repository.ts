import { PrismaClient } from '@prisma/client';
import { IFollowRepository, Follow } from '../../domain/repositories';
import { User, UserRole } from '../../domain/entities/user.entity';
import { TrustMetadata } from '../../domain/value-objects/trust-metadata.value-object';

export class PrismaFollowRepository implements IFollowRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUsers(followerId: string, followingId: string): Promise<Follow | null> {
    const row = await this.prisma.community_Follow.findUnique({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });

    return row ? this.toDomain(row) : null;
  }

  async findFollowers(userId: string): Promise<User[]> {
    const rows = await this.prisma.community_Follow.findMany({
      where: { followingId: userId, status: 'accepted' },
      include: { follower: true },
      orderBy: { createdAt: 'desc' }
    });

    return rows.map(row => this.toUser(row.follower));
  }

  async findFollowing(userId: string): Promise<User[]> {
    const rows = await this.prisma.community_Follow.findMany({
      where: { followerId: userId, status: 'accepted' },
      include: { following: true },
      orderBy: { createdAt: 'desc' }
    });

    return rows.map(row => this.toUser(row.following));
  }

  async save(follow: Follow): Promise<void> {
    await this.prisma.community_Follow.create({
      data: {
        id: follow.id,
        followerId: follow.followerId,
        followingId: follow.followingId,
        status: follow.status,
        createdAt: follow.createdAt
      }
    });
  }

  async delete(followerId: string, followingId: string): Promise<void> {
    await this.prisma.community_Follow.delete({
      where: {
        followerId_followingId: {
          followerId,
          followingId
        }
      }
    });
  }

  async getFollowerCount(userId: string): Promise<number> {
    return this.prisma.community_Follow.count({ where: { followingId: userId, status: 'accepted' } });
  }

  async getFollowingCount(userId: string): Promise<number> {
    return this.prisma.community_Follow.count({ where: { followerId: userId, status: 'accepted' } });
  }

  private toDomain(row: any): Follow {
    return {
      id: row.id,
      followerId: row.followerId,
      followingId: row.followingId,
      status: row.status,
      createdAt: row.createdAt
    };
  }

  private toUser(userData: any): User {
    const trustMetadata = TrustMetadata.createDefault();
    trustMetadata.updateRating(userData.reputation || 0);
    if (userData.isVerified) {
      trustMetadata.verify();
    }

    const roleMapping: { [key: string]: UserRole } = {
      buyer: UserRole.BUYER,
      seller: UserRole.SELLER,
      supplier: UserRole.SUPPLIER,
      courier: UserRole.COURIER,
      enabler: UserRole.ENABLER,
      system: UserRole.SYSTEM
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
}
