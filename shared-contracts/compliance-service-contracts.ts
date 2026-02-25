import { UUID } from './types';

export namespace ComplianceService {
    export namespace Events {
        export interface KYCCheckCompleted {
            checkId: UUID;
            entityId: UUID;
            entityType: string;
            passed: boolean;
            issues: string[];
            checkedAt: Date;
        }
    }

    export namespace Commands {
        export interface CheckKYCCompliance {
            entityId: UUID;
            entityType: string;
            context?: Record<string, unknown>;
        }
    }
}
