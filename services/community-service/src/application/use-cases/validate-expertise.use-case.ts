import { ExpertiseBadge, ExpertiseLevel } from '../../domain/value-objects/expertise-badge.value-object';
import { BusinessProfile } from '../../domain/entities/business-profile.entity';
import { ExpertiseValidationPolicy } from '../../domain/policies/expertise-validation.policy';

export interface ValidateExpertiseRequest {
    userId: string;
    expertiseArea: string;
    targetLevel: ExpertiseLevel;
}

export interface ValidateExpertiseResponse {
    badge: ExpertiseBadge;
    verified: boolean;
    missingRequirements: string[];
}

export interface BusinessProfileRepository {
    findByUserId(userId: string): Promise<BusinessProfile | null>;
    save(profile: BusinessProfile): Promise<BusinessProfile>;
}

export interface TrainingServiceClient {
    getCompletedModules(userId: string): Promise<string[]>;
}

export interface BusinessRegistryClient {
    verifyBusinessCredentials(userId: string, businessId: string): Promise<boolean>;
}

export interface EventPublisher {
    publish(eventName: string, payload: any): Promise<void>;
}

export class ValidateExpertiseUseCase {
    constructor(
        private readonly profileRepository: BusinessProfileRepository,
        private readonly trainingService: TrainingServiceClient,
        private readonly businessRegistry: BusinessRegistryClient,
        private readonly eventPublisher: EventPublisher
    ) { }

    async execute(request: ValidateExpertiseRequest): Promise<ValidateExpertiseResponse> {
        // 1. Get user's business profile
        const profile = await this.profileRepository.findByUserId(request.userId);
        if (!profile) {
            throw new Error('User business profile not found');
        }

        // 2. Check if expertise area already exists
        const existingExpertise = profile.expertiseAreas.find(e => e.area === request.expertiseArea);
        let badge: ExpertiseBadge;

        if (existingExpertise) {
            // Validate upgrade to new level
            badge = ExpertiseBadge.create(existingExpertise.area, existingExpertise.level);

            // Copy existing data
            if (existingExpertise.verifiedAt) {
                badge.verify('system', existingExpertise.verifiedAt);
            }
        } else {
            // Create new expertise badge
            badge = ExpertiseBadge.create(request.expertiseArea, request.targetLevel);
        }

        // 3. Collect peer endorsements from profile
        const peerEndorsements = await this.countPeerEndorsements(request.userId, request.expertiseArea);

        // 4. Get training completions from training service
        const completedModules = await this.trainingService.getCompletedModules(request.userId);
        const relevantCompletions = this.filterRelevantModules(completedModules, request.expertiseArea);

        // 5. Check business verification
        let businessVerified = false;
        if (profile.businessId) {
            businessVerified = await this.businessRegistry.verifyBusinessCredentials(
                request.userId,
                profile.businessId
            );
        }

        // 6. Check if user meets requirements for the requested level
        const eligibility = ExpertiseValidationPolicy.canEarnBadge(request.targetLevel, {
            peerEndorsements: peerEndorsements.length,
            trainingCompletions: relevantCompletions.length,
            businessVerified,
            contributionScore: profile.contributionScore,
            reputationTier: profile.reputationTier,
        });

        let verified = false;

        if (eligibility.eligible) {
            // Award or upgrade badge
            if (existingExpertise) {
                profile.updateExpertiseLevel(request.expertiseArea, request.targetLevel);
            } else {
                profile.addExpertise(request.expertiseArea, request.targetLevel);
            }

            // Verify the badge
            profile.verifyExpertise(request.expertiseArea);

            // Set verification data
            badge.verify('system', this.getExpirationDate(request.targetLevel));

            if (businessVerified) {
                badge.markBusinessVerified();
            }

            // Add endorsements and completions
            for (const endorserId of peerEndorsements) {
                badge.addPeerEndorsement(endorserId);
            }

            for (const moduleId of relevantCompletions) {
                badge.addTrainingCompletion(moduleId);
            }

            // Save updated profile
            await this.profileRepository.save(profile);

            verified = true;

            // Publish event
            await this.eventPublisher.publish('ExpertiseValidated', {
                userId: request.userId,
                expertiseArea: request.expertiseArea,
                level: request.targetLevel,
                verified: true,
                peerEndorsements: peerEndorsements.length,
                trainingCompletions: relevantCompletions.length,
                businessVerified,
                timestamp: new Date(),
            });
        } else {
            // Publish validation failed event
            await this.eventPublisher.publish('ExpertiseValidationFailed', {
                userId: request.userId,
                expertiseArea: request.expertiseArea,
                level: request.targetLevel,
                missingRequirements: eligibility.missingRequirements,
                timestamp: new Date(),
            });
        }

        return {
            badge,
            verified,
            missingRequirements: eligibility.missingRequirements,
        };
    }

    private async countPeerEndorsements(userId: string, expertiseArea: string): Promise<string[]> {
        // This would query endorsements from the database
        // For now, return empty array
        return [];
    }

    private filterRelevantModules(allModules: string[], expertiseArea: string): string[] {
        // Filter modules that match the expertise area
        // This would use more sophisticated matching logic
        return allModules.filter(moduleId =>
            moduleId.toLowerCase().includes(expertiseArea.toLowerCase())
        );
    }

    private getExpirationDate(level: ExpertiseLevel): Date | undefined {
        const expirationDate = ExpertiseValidationPolicy.getExpirationDate(level, new Date());
        return expirationDate || undefined;
    }
}
