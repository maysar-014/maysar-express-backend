import { CertificationRequirement } from '../entities/certification-requirement.entity';

export interface ICertificationRequirementRepository {
    findAll(): Promise<CertificationRequirement[]>;
    findByModule(module: string): Promise<CertificationRequirement | null>;
    findMandatory(): Promise<CertificationRequirement[]>;

    // Write (admin only)
    save(requirement: CertificationRequirement): Promise<void>;
    update(module: string, data: Partial<{
        minimumScore: number;
        validityPeriodDays: number;
        mandatory: boolean;
        maxAttempts: number;
    }>): Promise<CertificationRequirement | null>;
    delete(module: string): Promise<void>;
}
