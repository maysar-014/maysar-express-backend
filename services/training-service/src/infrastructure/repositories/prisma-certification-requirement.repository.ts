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

    private warnedMissingDelegate = false;
    private readonly fallbackRequirements = new Map<string, CertificationRequirement>();

    private warnMissingDelegate(message: string): void {
        if (this.warnedMissingDelegate) return;
        this.warnedMissingDelegate = true;
        console.warn(message);
    }

    private getFallbackRequirement(module: string): CertificationRequirement {
        const key = module || 'module-default';
        const existing = this.fallbackRequirements.get(key);
        if (existing) return existing;

        const requirement = CertificationRequirement.create({
            module: key,
            minimumScore: 50,
            validityPeriodDays: 365,
            mandatory: false,
            maxAttempts: 3
        });

        this.fallbackRequirements.set(key, requirement);
        return requirement;
    }

    private listFallbackRequirements(): CertificationRequirement[] {
        if (this.fallbackRequirements.size === 0) {
            this.getFallbackRequirement('module-default');
        }
        return Array.from(this.fallbackRequirements.values());
    }

    public async findAll(): Promise<CertificationRequirement[]> {
        const delegate = this.requirementDelegate;
        if (!delegate) {
            return this.listFallbackRequirements();
        }

        try {
            const requirements = await delegate.findMany();
            return requirements.map((req: unknown) => CertificationRequirement.create(this.toProps(req)));
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Requirement lookup failed; using fallback.');
                return this.listFallbackRequirements();
            }
            throw error;
        }
    }

    public async findByModule(module: string): Promise<CertificationRequirement | null> {
        const delegate = this.requirementDelegate;
        if (!delegate) {
            return this.getFallbackRequirement(module);
        }

        try {
            const requirement = await delegate.findUnique({
                where: { module }
            });
            return requirement ? CertificationRequirement.create(this.toProps(requirement)) : null;
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Requirement lookup failed; using fallback.');
                return this.getFallbackRequirement(module);
            }
            throw error;
        }
    }

    public async findMandatory(): Promise<CertificationRequirement[]> {
        const delegate = this.requirementDelegate;
        if (!delegate) {
            return this.listFallbackRequirements().filter((req) => req.mandatory);
        }

        try {
            const requirements = await delegate.findMany({
                where: { mandatory: true }
            });
            return requirements.map((req: unknown) => CertificationRequirement.create(this.toProps(req)));
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Requirement lookup failed; using fallback.');
                return this.listFallbackRequirements().filter((req) => req.mandatory);
            }
            throw error;
        }
    }

    private get requirementDelegate(): CertificationRequirementDelegate | null {
        const client = this.prisma as unknown as Record<string, unknown>;
        const delegate = (client.certificationRequirement ??
            client.training_CertificationRequirement) as CertificationRequirementDelegate | undefined;
        if (!delegate) {
            this.warnMissingDelegate('[training] Certification requirement delegate missing; using fallback.');
            return null;
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
