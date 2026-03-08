import { AwardBadgeRequest, AwardBadgeResponse } from '../dto/award-badge.dto';
import { IBadgeRepository } from '../../domain/repositories/badge.repository';
import { ILeaderboardRepository } from '../../domain/repositories/leaderboard.repository';
import { IEventPublisher, eventBus } from '@shared-events/eventBus';
import { v4 as uuidv4 } from 'uuid';

export class AwardBadgeUseCase {
    constructor(
        private readonly badgeRepo: IBadgeRepository,
        private readonly leaderboardRepo: ILeaderboardRepository,
        private readonly events: IEventPublisher = eventBus
    ) { }

    public async execute(request: AwardBadgeRequest): Promise<AwardBadgeResponse> {
        const { learnerId, badgeType, reason, metadata } = request;

        const badge = {
            id: uuidv4(),
            learnerId,
            type: badgeType,
            reason,
            metadata,
            awardedAt: new Date()
        };

        await this.badgeRepo.save(badge);

        // Update leaderboard badge count
        const currentEntry = await this.leaderboardRepo.getEntry(learnerId);
        await this.leaderboardRepo.updateEntry({
            learnerId,
            badgesCount: (currentEntry?.badgesCount || 0) + 1
        });

        await this.events.publish('BadgeEarned.v1', {
            badgeId: badge.id,
            learnerId: badge.learnerId,
            badgeType: badge.type,
            awardedAt: badge.awardedAt
        });

        return {
            badgeId: badge.id,
            learnerId: badge.learnerId,
            badgeType: badge.type,
            awardedAt: badge.awardedAt
        };
    }
}
