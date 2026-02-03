import { PrismaClient } from '@prisma/client';
import { ICertificationRequirementRepository } from '../../domain/repositories/certification-requirement.repository';
import { CertificationRequirement } from '../../domain/entities/certification-requirement.entity';

export class PrismaCertificationRequirementRepository implements ICertificationRequirementRepository {
    constructor(private readonly prisma: PrismaClient) { }

    public async findAll(): Promise<CertificationRequirement[]> {
        const requirements = await this.prisma.certificationRequirement.findMany();
        return requirements.map(req => CertificationRequirement.create(req));
    }

    public async findByModule(module: string): Promise<CertificationRequirement | null> {
        const requirement = await this.prisma.certificationRequirement.findUnique({
            where: { module }
        });
        return requirement ? CertificationRequirement.create(requirement) : null;
    }

    public async findMandatory(): Promise<CertificationRequirement[]> {
        const requirements = await this.prisma.certificationRequirement.findMany({
            where: { mandatory: true }
        });
        return requirements.map(req => CertificationRequirement.create(req));
    }
}
