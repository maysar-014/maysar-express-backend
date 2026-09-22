import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { EnablerCapabilityStatusDto } from '../dto/enabler-lifecycle.dto';
import { EnablerLifecyclePolicy } from '../../domain/policies/enabler-lifecycle.policy';

/**
 * Capability snapshot for the Enabler dashboard (§35, §53).
 *
 * The frontend must never *decide* what an enabler may do — it renders this
 * server-computed answer, which the API enforces again on every write.
 */
export class GetEnablerCapabilityStatusUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly options?: {
            requiredTermsVersion?: string;
            trainingRequired?: boolean;
        }
    ) { }

    async execute(enablerId: string): Promise<EnablerCapabilityStatusDto> {
        const enabler = await this.enablerRepository.findById(enablerId);
        if (!enabler) {
            throw new Error('Enabler not found');
        }

        const plain = enabler.toPlainObject();
        const requiredTermsVersion = this.options?.requiredTermsVersion;
        const trainingRequired = this.options?.trainingRequired;

        const termsSatisfied = !requiredTermsVersion || enabler.termsVersion === requiredTermsVersion;
        const trainingSatisfied = !trainingRequired || enabler.trainingStatus === 'completed';

        const decision = (capability: Parameters<typeof EnablerLifecyclePolicy.canPerform>[1]) =>
            EnablerLifecyclePolicy.canPerform(enabler.status, capability).allowed;

        return {
            enablerId: enabler.id,
            userId: enabler.userId,
            status: enabler.status,
            isOperational: enabler.isOperational,
            capabilities: {
                viewEligibleProducts: decision('VIEW_ELIGIBLE_PRODUCTS'),
                shareProduct: decision('SHARE_PRODUCT'),
                buildOrderDraft: decision('BUILD_ORDER_DRAFT'),
                generateCustomerLink: decision('GENERATE_CUSTOMER_LINK'),
                accessPermanentLink: decision('ACCESS_PERMANENT_LINK'),
                qualifyEarning: decision('QUALIFY_EARNING'),
            },
            activation: {
                termsVersion: enabler.termsVersion,
                termsAcceptedAt: enabler.termsAcceptedAt,
                trainingStatus: enabler.trainingStatus,
                trainingCompletedAt: enabler.trainingCompletedAt,
                activatedAt: enabler.activatedAt,
                // An already-active enabler is by definition requirement-complete;
                // otherwise report whether the requirements are currently met.
                requirementsSatisfied: enabler.isOperational || (termsSatisfied && trainingSatisfied),
            },
            lifecycle: {
                restrictedAt: plain.restrictedAt ?? null,
                restrictedReason: plain.restrictedReason ?? null,
                suspendedAt: plain.suspendedAt ?? null,
                suspendedReason: plain.suspendedReason ?? null,
                deactivatedAt: plain.deactivatedAt ?? null,
                deactivatedReason: plain.deactivatedReason ?? null,
            },
        };
    }
}