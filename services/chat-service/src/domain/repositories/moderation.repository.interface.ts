import type { ModerationReport, UserBlock } from '../entities/moderation.entity';

export interface ModerationRepository {
  createReport(data: Omit<ModerationReport, 'id' | 'reportedAt'>): Promise<ModerationReport>;
  blockUser(blockerId: string, blockedId: string): Promise<void>;
  unblockUser(blockerId: string, blockedId: string): Promise<void>;
  isBlocked(blockerId: string, blockedId: string): Promise<boolean>;
  isBlockedEither(userA: string, userB: string): Promise<boolean>;
}
