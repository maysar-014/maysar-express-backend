import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { RegisterEnablerDto, EnablerResponseDto } from '../dto/enabler-registration.dto';
import { EnablerEligibilityEngine } from '../../domain/engines/enabler-eligibility.engine';
import { EnablerEntity } from '../../domain/entities/enabler.entity';
import { EnablerMapper } from '../mappers/enabler.mapper';
import { EnablerRegisteredEvent } from '../../domain/events/enabler-events';
import { Enabler_Status } from '@prisma/client';
import { getModelPrefix, makeId } from '@shared/ids/id';
import { IEnablerAnalyticsRepository } from '../../domain/repositories/enabler-analytics.repository.interface';
import { IEnablerPolicyRepository } from '../../domain/repositories/enabler-policy.repository.interface';

export class RegisterEnablerUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly eventPublisher: any, // Interface to be defined in infra
        private readonly analyticsRepository?: IEnablerAnalyticsRepository,
        private readonly policyRepository?: IEnablerPolicyRepository
    ) { }

    async execute(dto: RegisterEnablerDto): Promise<EnablerResponseDto> {
        // 1. Check if user is already an enabler
        const existingEnabler = await this.enablerRepository.findByUserId(dto.userId);
        if (existingEnabler) {
            throw new Error('User is already registered as an enabler');
        }

        // 2. Check eligibility
        const eligibility = EnablerEligibilityEngine.determineEligibility({
            businessName: dto.businessName,
            businessDescription: dto.businessDescription,
            taxId: dto.taxId,
            yearsInBusiness: dto.yearsInBusiness,
            hasBusinessLicense: dto.hasBusinessLicense,
            salesExperience: dto.salesExperience
        });

        if (!eligibility.isEligible) {
            throw new Error(`Enabler eligibility failed: ${eligibility.requirements.join(', ')}`);
        }

        // 3. Create Enabler Entity
        const enabler = EnablerEntity.create({
            id: makeId(getModelPrefix('Enabler_Profile')),
            userId: dto.userId,
            enablerCode: null,
            enablerCodeShort: null,
            businessName: dto.businessName,
            contactEmail: dto.contactEmail,
            contactPhone: dto.contactPhone,
            businessDescription: dto.businessDescription,
            status: Enabler_Status.PENDING,
            verificationStatus: 'pending',
            tier: eligibility.initialTier,
            commissionRate: eligibility.commissionRate,
            totalSales: 0,
            totalOrders: 0,
            conversionRate: 0,
            totalCommissionEarned: 0,
            taxId: dto.taxId,
            createdAt: new Date(),
            updatedAt: new Date()
        });

        // 4. Save to Repository
        await this.enablerRepository.save(enabler);

        // 4b. Initialize analytics + default policy
        if (this.analyticsRepository) {
            await this.analyticsRepository.upsertInitial(enabler.id);
        }
        if (this.policyRepository) {
            await this.policyRepository.createDefaultPolicy(enabler.id, dto.userId);
        }

        // 5. Publish Event
        await this.eventPublisher.publish(new EnablerRegisteredEvent(enabler.id, dto.userId));

        // 6. Return DTO
        return EnablerMapper.toResponseDto(enabler);
    }
}
