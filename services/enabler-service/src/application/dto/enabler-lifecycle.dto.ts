import { EnforcementActionType } from '../../domain/repositories/enabler-enforcement.repository.interface';

/** POST /enablers/me/terms — the version the enabler is accepting. */
export class AcceptEnablerTermsDto {
    termsVersion!: string;
}

/**
 * POST /enablers/me/activation.
 *
 * `requiredTermsVersion` / `trainingRequired` come from server-side
 * configuration (admin policy), never from the request body. `trainingStatus`
 * is the outcome reported by the shared training domain.
 */
export class ActivateEnablerDto {
    requiredTermsVersion?: string;
    trainingRequired?: boolean;
    trainingStatus?: string;
}

/** POST /admin/enablers/:id/enforcement. */
export class ApplyEnablerEnforcementDto {
    action!: EnforcementActionType;
    reason?: string;
}

/** Capability snapshot returned to the Enabler dashboard (§53). */
export interface EnablerCapabilityStatusDto {
    enablerId: string;
    userId: string;
    status: string;
    isOperational: boolean;
    capabilities: {
        viewEligibleProducts: boolean;
        shareProduct: boolean;
        buildOrderDraft: boolean;
        generateCustomerLink: boolean;
        accessPermanentLink: boolean;
        qualifyEarning: boolean;
    };
    activation: {
        termsVersion: string | null;
        termsAcceptedAt: Date | null;
        trainingStatus: string;
        trainingCompletedAt: Date | null;
        activatedAt: Date | null;
        requirementsSatisfied: boolean;
    };
    lifecycle: {
        restrictedAt: Date | null;
        restrictedReason: string | null;
        suspendedAt: Date | null;
        suspendedReason: string | null;
        deactivatedAt: Date | null;
        deactivatedReason: string | null;
    };
}