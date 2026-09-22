import { Enabler_Status } from '../types/enabler.types';

/**
 * Enabler lifecycle policy — the single source of truth for:
 *
 *  1. which operations an enabler in a given status may perform (§5, §35);
 *  2. whether the mandatory activation requirements are satisfied (§6).
 *
 * The backend enforces these rules; frontend visibility is only UX (§55).
 * An enabler is NEVER authorized by role alone — status, activation
 * requirements and (later) seller authorization are all evaluated together.
 */

export type EnablerCapability =
    | 'VIEW_ELIGIBLE_PRODUCTS'
    | 'SHARE_PRODUCT'
    | 'BUILD_ORDER_DRAFT'
    | 'GENERATE_CUSTOMER_LINK'
    | 'ACCESS_PERMANENT_LINK'
    | 'QUALIFY_EARNING';

/**
 * Capability matrix. Everything that mutates commercial state requires ACTIVE.
 * RESTRICTED keeps read/sharing capabilities (sharing only records attribution,
 * it cannot move money or create orders) but loses Order Builder and customer
 * links. PENDING/APPROVED have not completed activation, SUSPENDED/DEACTIVATED
 * have been cut off by Maysar/admin (§5).
 */
const CAPABILITY_MATRIX: Record<Enabler_Status, ReadonlyArray<EnablerCapability>> = {
    [Enabler_Status.PENDING]: [],
    [Enabler_Status.APPROVED]: ['VIEW_ELIGIBLE_PRODUCTS'],
    [Enabler_Status.ACTIVE]: [
        'VIEW_ELIGIBLE_PRODUCTS',
        'SHARE_PRODUCT',
        'BUILD_ORDER_DRAFT',
        'GENERATE_CUSTOMER_LINK',
        'ACCESS_PERMANENT_LINK',
        'QUALIFY_EARNING',
    ],
    [Enabler_Status.RESTRICTED]: ['VIEW_ELIGIBLE_PRODUCTS', 'SHARE_PRODUCT'],
    [Enabler_Status.SUSPENDED]: [],
    [Enabler_Status.REJECTED]: [],
    [Enabler_Status.DEACTIVATED]: [],
};

export interface CapabilityDecision {
    allowed: boolean;
    /** Stable machine-readable reason for logging/enforcement history. */
    code: 'ALLOWED' | 'STATUS_NOT_PERMITTED';
    reason?: string;
}

export const EnablerLifecyclePolicy = {
    capabilityMatrix: CAPABILITY_MATRIX,

    /** Does `status` permit `capability`? No other input is trusted. */
    canPerform(status: Enabler_Status, capability: EnablerCapability): CapabilityDecision {
        const allowed = (CAPABILITY_MATRIX[status] ?? []).includes(capability);
        if (allowed) {
            return { allowed: true, code: 'ALLOWED' };
        }
        return {
            allowed: false,
            code: 'STATUS_NOT_PERMITTED',
            reason: `Enabler status ${status} does not permit ${capability}`,
        };
    },

    /** Convenience guard used by the API middleware. */
    isOperational(status: Enabler_Status): boolean {
        return status === Enabler_Status.ACTIVE;
    },

    /**
     * Mandatory activation requirements (§6). An enabler must not become active
     * before terms are accepted (and training completed when required).
     */
    canActivate(input: {
        status: Enabler_Status;
        termsVersion?: string | null;
        termsAcceptedAt?: Date | null;
        trainingStatus?: string | null;
        requiredTermsVersion?: string;
        trainingRequired?: boolean;
    }): CapabilityDecision {
        if (input.status !== Enabler_Status.APPROVED) {
            return {
                allowed: false,
                code: 'STATUS_NOT_PERMITTED',
                reason: `Only APPROVED enablers can be activated (current status: ${input.status})`,
            };
        }

        if (input.requiredTermsVersion) {
            if (!input.termsAcceptedAt) {
                return {
                    allowed: false,
                    code: 'STATUS_NOT_PERMITTED',
                    reason: 'Enabler terms must be accepted before activation',
                };
            }
            if (input.termsVersion !== input.requiredTermsVersion) {
                return {
                    allowed: false,
                    code: 'STATUS_NOT_PERMITTED',
                    reason: `Accepted terms version ${input.termsVersion ?? 'none'} does not match required version ${input.requiredTermsVersion}`,
                };
            }
        }

        if (input.trainingRequired && input.trainingStatus !== 'completed') {
            return {
                allowed: false,
                code: 'STATUS_NOT_PERMITTED',
                reason: `Mandatory enabler training must be completed before activation (current: ${input.trainingStatus ?? 'not_started'})`,
            };
        }

        return { allowed: true, code: 'ALLOWED' };
    },

    /** Admin enforcement transitions permitted by the lifecycle (§52). */
    canApplyEnforcement(status: Enabler_Status, action: 'RESTRICT' | 'SUSPEND' | 'REACTIVATE' | 'DEACTIVATE'): CapabilityDecision {
        const allowed = (() => {
            switch (action) {
                case 'RESTRICT':
                    return status === Enabler_Status.ACTIVE;
                case 'SUSPEND':
                    return (
                        status === Enabler_Status.ACTIVE ||
                        status === Enabler_Status.RESTRICTED ||
                        status === Enabler_Status.APPROVED
                    );
                case 'REACTIVATE':
                    return status === Enabler_Status.SUSPENDED || status === Enabler_Status.RESTRICTED;
                case 'DEACTIVATE':
                    return status !== Enabler_Status.DEACTIVATED;
                default:
                    return false;
            }
        })();

        if (allowed) {
            return { allowed: true, code: 'ALLOWED' };
        }
        return {
            allowed: false,
            code: 'STATUS_NOT_PERMITTED',
            reason: `Cannot ${action} an enabler in status ${status}`,
        };
    },
};
