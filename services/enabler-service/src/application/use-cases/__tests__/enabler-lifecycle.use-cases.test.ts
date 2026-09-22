import { EnablerEntity, EnablerProfileProps } from '../../../domain/entities/enabler.entity';
import { Enabler_Status, Enabler_Tier } from '../../../domain/types/enabler.types';
import { AcceptEnablerTermsUseCase } from '../accept-enabler-terms.use-case';
import { ActivateEnablerCapabilityUseCase } from '../activate-enabler-capability.use-case';
import { GetEnablerCapabilityStatusUseCase } from '../get-enabler-capability-status.use-case';
import { ApplyEnablerEnforcementUseCase } from '../apply-enabler-enforcement.use-case';

const baseProps: EnablerProfileProps = {
    id: 'enb_01J0000000000000000000000',
    userId: 'usr_01J0000000000000000000000',
    enablerCode: 'ENB-ABC123',
    enablerCodeShort: 'EABC123',
    businessName: 'Maysar Enabler',
    contactEmail: 'enabler@example.com',
    status: Enabler_Status.APPROVED,
    verificationStatus: 'verified',
    tier: Enabler_Tier.BRONZE,
    commissionRate: 0.15,
    totalSales: 0,
    totalOrders: 0,
    conversionRate: 0,
    totalCommissionEarned: 0,
    createdAt: new Date('2026-01-01T00:00:00Z'),
    updatedAt: new Date('2026-01-01T00:00:00Z'),
};

const buildEnabler = (overrides: Partial<EnablerProfileProps> = {}) =>
    EnablerEntity.create({ ...baseProps, ...overrides });

/** In-memory repository double; mutating use cases write through to `current`. */
interface FakeEnablerRepo {
    current: EnablerEntity | null;
    findById: jest.Mock;
    findByUserId: jest.Mock;
    findByCode: jest.Mock;
    findByStatus: jest.Mock;
    save: jest.Mock;
    update: jest.Mock;
}

const createRepo = (enabler: EnablerEntity | null): FakeEnablerRepo => {
    const repo: FakeEnablerRepo = {
        current: enabler,
        findById: jest.fn(),
        findByUserId: jest.fn(),
        findByCode: jest.fn(),
        findByStatus: jest.fn(),
        save: jest.fn(),
        update: jest.fn(),
    };

    repo.findById = jest.fn(async (id: string) => (repo.current && repo.current.id === id ? repo.current : null));
    repo.findByUserId = jest.fn(async (userId: string) =>
        repo.current && repo.current.userId === userId ? repo.current : null
    );
    repo.findByCode = jest.fn(async () => null);
    repo.findByStatus = jest.fn(async () => []);
    repo.save = jest.fn(async (entity: EnablerEntity) => {
        repo.current = entity;
    });
    repo.update = jest.fn(async (entity: EnablerEntity) => {
        repo.current = entity;
    });

    return repo;
};

const createEnforcementRepo = () => ({
    record: jest.fn(async () => undefined),
    listForEnabler: jest.fn(async () => []),
});

describe('Enabler capability lifecycle use cases (spec §5, §6, §35, §52)', () => {
    describe('AcceptEnablerTermsUseCase', () => {
        it('records the accepted terms version with a server timestamp', async () => {
            const repo = createRepo(buildEnabler());
            const useCase = new AcceptEnablerTermsUseCase(repo as any);

            const result = await useCase.execute(baseProps.id, { termsVersion: '2026-01' });

            expect(result.termsVersion).toBe('2026-01');
            expect(result.termsAcceptedAt).toBeInstanceOf(Date);
            expect(repo.update).toHaveBeenCalledTimes(1);
        });

        it('rejects a blank terms version', async () => {
            const useCase = new AcceptEnablerTermsUseCase(createRepo(buildEnabler()) as any);
            await expect(useCase.execute(baseProps.id, { termsVersion: '   ' })).rejects.toThrow('terms version is required');
        });

        it('refuses acceptance for a suspended enabler', async () => {
            const repo = createRepo(buildEnabler({ status: Enabler_Status.SUSPENDED }));
            const useCase = new AcceptEnablerTermsUseCase(repo as any);
            await expect(useCase.execute(baseProps.id, { termsVersion: '2026-01' })).rejects.toThrow(
                'Terms cannot be accepted while the enabler is SUSPENDED'
            );
            expect(repo.update).not.toHaveBeenCalled();
        });

        it('fails when the enabler does not exist', async () => {
            const useCase = new AcceptEnablerTermsUseCase(createRepo(null) as any);
            await expect(useCase.execute(baseProps.id, { termsVersion: '2026-01' })).rejects.toThrow('Enabler not found');
        });
    });

    describe('ActivateEnablerCapabilityUseCase', () => {
        it('activates an approved enabler once terms are accepted', async () => {
            const enabler = buildEnabler();
            enabler.acceptTerms('2026-01');
            const repo = createRepo(enabler);
            const publisher = { publish: jest.fn(async () => undefined) };
            const useCase = new ActivateEnablerCapabilityUseCase(repo as any, publisher);

            const result = await useCase.execute(baseProps.id, { requiredTermsVersion: '2026-01' });

            expect(result.status).toBe(Enabler_Status.ACTIVE);
            expect(repo.current?.activatedAt).toBeInstanceOf(Date);
            expect(publisher.publish).toHaveBeenCalledTimes(1);
        });

        it('refuses activation when the required terms were not accepted', async () => {
            const repo = createRepo(buildEnabler());
            const useCase = new ActivateEnablerCapabilityUseCase(repo as any);
            await expect(useCase.execute(baseProps.id, { requiredTermsVersion: '2026-01' })).rejects.toThrow(
                'Activation requirements not met'
            );
            expect(repo.update).not.toHaveBeenCalled();
        });

        it('refuses activation when mandatory training is incomplete', async () => {
            const enabler = buildEnabler();
            enabler.acceptTerms('2026-01');
            const useCase = new ActivateEnablerCapabilityUseCase(createRepo(enabler) as any);
            await expect(
                useCase.execute(baseProps.id, { requiredTermsVersion: '2026-01', trainingRequired: true, trainingStatus: 'in_progress' })
            ).rejects.toThrow('training must be completed');
        });

        it('is idempotent: re-activating an ACTIVE enabler emits nothing', async () => {
            const repo = createRepo(buildEnabler({ status: Enabler_Status.ACTIVE }));
            const publisher = { publish: jest.fn(async () => undefined) };
            const useCase = new ActivateEnablerCapabilityUseCase(repo as any, publisher);

            const result = await useCase.execute(baseProps.id, { requiredTermsVersion: '2026-01' });

            expect(result.status).toBe(Enabler_Status.ACTIVE);
            expect(repo.update).not.toHaveBeenCalled();
            expect(publisher.publish).not.toHaveBeenCalled();
        });
    });

    describe('GetEnablerCapabilityStatusUseCase', () => {
        it('reports full capability for an ACTIVE enabler', async () => {
            const useCase = new GetEnablerCapabilityStatusUseCase(createRepo(buildEnabler({ status: Enabler_Status.ACTIVE })) as any);
            const status = await useCase.execute(baseProps.id);

            expect(status.isOperational).toBe(true);
            expect(status.capabilities.buildOrderDraft).toBe(true);
            expect(status.capabilities.generateCustomerLink).toBe(true);
            expect(status.capabilities.shareProduct).toBe(true);
        });

        it('reports restricted capability plus the reason for a SUSPENDED enabler', async () => {
            const enabler = buildEnabler({ status: Enabler_Status.ACTIVE });
            enabler.suspend('fraud investigation');
            const useCase = new GetEnablerCapabilityStatusUseCase(createRepo(enabler) as any);

            const status = await useCase.execute(baseProps.id);

            expect(status.isOperational).toBe(false);
            expect(status.capabilities.buildOrderDraft).toBe(false);
            expect(status.capabilities.generateCustomerLink).toBe(false);
            expect(status.capabilities.viewEligibleProducts).toBe(false);
            expect(status.lifecycle.suspendedReason).toBe('fraud investigation');
        });

        it('keeps sharing available but blocks drafts for a RESTRICTED enabler', async () => {
            const enabler = buildEnabler({ status: Enabler_Status.ACTIVE });
            enabler.restrict('review');
            const useCase = new GetEnablerCapabilityStatusUseCase(createRepo(enabler) as any);

            const status = await useCase.execute(baseProps.id);

            expect(status.capabilities.shareProduct).toBe(true);
            expect(status.capabilities.buildOrderDraft).toBe(false);
            expect(status.capabilities.accessPermanentLink).toBe(false);
        });

        it('flags unsatisfied activation requirements before activation', async () => {
            const useCase = new GetEnablerCapabilityStatusUseCase(createRepo(buildEnabler()) as any, {
                requiredTermsVersion: '2026-01',
                trainingRequired: true,
            });
            const status = await useCase.execute(baseProps.id);
            expect(status.activation.requirementsSatisfied).toBe(false);
            expect(status.activation.termsVersion).toBeNull();
        });
    });

    describe('ApplyEnablerEnforcementUseCase', () => {
        it('restricts an active enabler, records the trail and emits an event', async () => {
            const repo = createRepo(buildEnabler({ status: Enabler_Status.ACTIVE }));
            const enforcementRepo = createEnforcementRepo();
            const publisher = { publish: jest.fn(async () => undefined) };
            const useCase = new ApplyEnablerEnforcementUseCase(repo as any, enforcementRepo as any, publisher);

            const result = await useCase.execute(baseProps.id, { action: 'RESTRICT', reason: 'abuse' }, 'adm_1');

            expect(result).toEqual({
                enablerId: baseProps.id,
                previousStatus: Enabler_Status.ACTIVE,
                status: Enabler_Status.RESTRICTED,
                action: 'RESTRICT',
            });
            expect(enforcementRepo.record).toHaveBeenCalledWith(
                expect.objectContaining({
                    enablerId: baseProps.id,
                    action: 'RESTRICT',
                    previousStatus: Enabler_Status.ACTIVE,
                    newStatus: Enabler_Status.RESTRICTED,
                    actorUserId: 'adm_1',
                })
            );
            expect(publisher.publish).toHaveBeenCalledTimes(1);
        });

        it('suspends an active enabler', async () => {
            const repo = createRepo(buildEnabler({ status: Enabler_Status.ACTIVE }));
            const useCase = new ApplyEnablerEnforcementUseCase(repo as any, createEnforcementRepo() as any);
            const result = await useCase.execute(baseProps.id, { action: 'SUSPEND', reason: 'investigation' });
            expect(result.status).toBe(Enabler_Status.SUSPENDED);
        });

        it('reactivates a suspended enabler back to ACTIVE', async () => {
            const enabler = buildEnabler({ status: Enabler_Status.ACTIVE });
            enabler.suspend('investigation');
            const repo = createRepo(enabler);
            const useCase = new ApplyEnablerEnforcementUseCase(repo as any, createEnforcementRepo() as any);

            const result = await useCase.execute(baseProps.id, { action: 'REACTIVATE' });

            expect(result.status).toBe(Enabler_Status.ACTIVE);
            expect(repo.current?.canGenerateCustomerLink()).toBe(true);
        });

        it('reactivates a restricted enabler', async () => {
            const enabler = buildEnabler({ status: Enabler_Status.ACTIVE });
            enabler.restrict('review');
            const useCase = new ApplyEnablerEnforcementUseCase(createRepo(enabler) as any, createEnforcementRepo() as any);
            const result = await useCase.execute(baseProps.id, { action: 'REACTIVATE' });
            expect(result.status).toBe(Enabler_Status.ACTIVE);
        });

        it('refuses an invalid transition (reactivating a pending enabler)', async () => {
            const repo = createRepo(buildEnabler({ status: Enabler_Status.PENDING }));
            const enforcementRepo = createEnforcementRepo();
            const useCase = new ApplyEnablerEnforcementUseCase(repo as any, enforcementRepo as any);

            await expect(useCase.execute(baseProps.id, { action: 'REACTIVATE' })).rejects.toThrow('Cannot apply REACTIVATE');
            expect(enforcementRepo.record).not.toHaveBeenCalled();
            expect(repo.update).not.toHaveBeenCalled();
        });

        it('refuses to act on an unknown enabler', async () => {
            const useCase = new ApplyEnablerEnforcementUseCase(createRepo(null) as any, createEnforcementRepo() as any);
            await expect(useCase.execute(baseProps.id, { action: 'SUSPEND' })).rejects.toThrow('Enabler not found');
        });

        it('deactivates terminally without touching the Maysar user', async () => {
            const repo = createRepo(buildEnabler({ status: Enabler_Status.SUSPENDED }));
            const useCase = new ApplyEnablerEnforcementUseCase(repo as any, createEnforcementRepo() as any);

            const result = await useCase.execute(baseProps.id, { action: 'DEACTIVATE', reason: 'left programme' });

            expect(result.status).toBe(Enabler_Status.DEACTIVATED);
            expect(repo.current?.userId).toBe(baseProps.userId);
            expect(repo.current?.canBuildOrderDraft()).toBe(false);
        });
    });
});