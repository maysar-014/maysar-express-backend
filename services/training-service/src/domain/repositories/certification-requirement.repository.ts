import { CertificationRequirement } from '../entities/certification-requirement.entity';

export interface ICertificationRequirementRepository {
    findAll(): Promise<CertificationRequirement[]>;
    findByModule(module: string): Promise<CertificationRequirement | null>;
    findMandatory(): Promise<CertificationRequirement[]>;
}
