import { BusinessRegistryClient } from '../../application/use-cases/validate-expertise.use-case';
import { businessRepository } from '../../../../business-registry-service/src/infrastructure';
import { VerificationStatus } from '../../../../business-registry-service/src/domain/entities/business.entity';

export class HttpBusinessRegistryClient implements BusinessRegistryClient {
    async verifyBusinessCredentials(userId: string, businessId: string): Promise<boolean> {
        const business = await businessRepository.findById(businessId);
        if (!business) {
            return false;
        }
        if (business.ownerId !== userId) {
            return false;
        }
        return business.verificationStatus === VerificationStatus.VERIFIED;
    }

    async getBusinessDetails(businessId: string): Promise<{
        id: string;
        name: string;
        industry: string[];
        verificationStatus: string;
    } | null> {
        const business = await businessRepository.findById(businessId);
        if (!business) {
            return null;
        }
        return {
            id: business.id,
            name: business.name,
            industry: business.industry || [],
            verificationStatus: business.verificationStatus
        };
    }
}
