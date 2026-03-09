import { Enabler_Status } from '../types/enabler.types';

export interface EnablerApprovalContext {
    status: Enabler_Status;
    verificationStatus: string;
    completenessEvents: string[]; // e.g. ['email_verified', 'phone_verified', 'bank_verified']
    riskScore?: number;
}

export class EnablerApprovalPolicy {
    private static readonly REQUIRED_EVENTS = ['email_verified', 'phone_verified'];

    static canApprove(context: EnablerApprovalContext): { allowed: boolean; reason?: string } {
        if (context.status !== Enabler_Status.PENDING) {
            return { allowed: false, reason: 'Enabler is not in pending status' };
        }

        const missingEvents = this.REQUIRED_EVENTS.filter(e => !context.completenessEvents.includes(e));
        if (missingEvents.length > 0) {
            return { allowed: false, reason: `Missing verification steps: ${missingEvents.join(', ')}` };
        }

        if (context.verificationStatus === 'rejected') {
            return { allowed: false, reason: 'Business verification was rejected' };
        }

        if (context.riskScore && context.riskScore > 80) {
            return { allowed: false, reason: 'High risk score detected, requires manual review' };
        }

        return { allowed: true };
    }

    static requiresManualReview(context: EnablerApprovalContext): boolean {
        return (context.riskScore !== undefined && context.riskScore > 50) ||
            context.verificationStatus === 'pending';
    }
}
