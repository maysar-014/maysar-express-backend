import { UUID } from './types';

export namespace BusinessRegistryService {
    export namespace Events {
        export interface BusinessRegistered {
            businessId: UUID;
            ownerId: UUID;
            name: string;
            registeredAt: Date;
        }

        export interface BusinessVerified {
            businessId: UUID;
            verifierId: UUID;
            verifiedAt: Date;
        }

        export interface BusinessOnboarded {
            businessId: UUID;
            completedAt: Date;
        }
    }

    export namespace Commands {
        export interface RegisterBusiness {
            ownerId: UUID;
            name: string;
            details: Record<string, unknown>;
        }

        export interface VerifyBusiness {
            businessId: UUID;
            verifierId: UUID;
            approved: boolean;
            comments?: string;
        }
    }
}
