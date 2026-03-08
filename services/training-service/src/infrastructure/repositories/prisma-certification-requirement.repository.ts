import { PrismaClient } from '@prisma/client';
import { ICertificationRequirementRepository } from '../../domain/repositories/certification-requirement.repository';
import {
    CertificationRequirement,
    CertificationRequirementProps
} from '../../domain/entities/certification-requirement.entity';

interface CertificationRequirementDelegate {
    findMany(args?: Record<string, unknown>): Promise<unknown[]>;
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
}

interface CertificationRequirementRow {
    module: string;
    minimumScore: number;
    validityPeriodDays: number;
    mandatory: boolean;
    maxAttempts: number;
}

export class PrismaCertificationRequirementRepository implements ICertificationRequirementRepository {
    constructor(private readonly prisma: PrismaClient) { }

    public async findAll(): Promise<CertificationRequirement[]> {
        const requirements = await this.requirementDelegate.findMany();
        return requirements.map((req: unknown) => CertificationRequirement.create(this.toProps(req)));
    }

    public async findByModule(module: string): Promise<CertificationRequirement | null> {
        const requirement = await this.requirementDelegate.findUnique({
            where: { module }
        });
        return requirement ? CertificationRequirement.create(this.toProps(requirement)) : null;
    }

    public async findMandatory(): Promise<CertificationRequirement[]> {
        const requirements = await this.requirementDelegate.findMany({
            where: { mandatory: true }
        });
        return requirements.map((req: unknown) => CertificationRequirement.create(this.toProps(req)));
    }

    private get requirementDelegate(): CertificationRequirementDelegate {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = (client.certificationRequirement ??
            client.training_CertificationRequirement) as CertificationRequirementDelegate | undefined;
        if (!delegate) {
            throw new Error('Certification requirement delegate is not configured on prisma client');
        }
        return delegate;
    }

    private toProps(value: unknown): CertificationRequirementProps {
        const row = value as CertificationRequirementRow;
        return {
            module: row.module,
            minimumScore: row.minimumScore,
            validityPeriodDays: row.validityPeriodDays,
            mandatory: row.mandatory,
            maxAttempts: row.maxAttempts
        };
    }
}
