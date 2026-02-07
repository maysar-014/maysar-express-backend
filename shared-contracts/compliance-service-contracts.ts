import { UUID } from './types';

export namespace ComplianceService {
    export namespace Events {
        export interface ComplianceCheckCompleted {
            checkId: UUID;
            entityId: UUID;
            entityType: string;
            passed: boolean;
            issues: string[];
            checkedAt: Date;
        }
    }

    export namespace Commands {
        export interface CheckCompliance {
            entityId: UUID;
            entityType: string;
            context?: any;
        }
    }
}
