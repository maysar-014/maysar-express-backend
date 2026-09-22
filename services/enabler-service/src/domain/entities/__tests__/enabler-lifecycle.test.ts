import { EnablerEntity, EnablerProfileProps } from '../enabler.entity';
import { Enabler_Status, Enabler_Tier } from '../../types/enabler.types';

const baseProps: EnablerProfileProps = {
    id: 'enabler-1',
    userId: 'user-1',
    enablerCode: null,
    enablerCodeShort: null,
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
    createdAt: new Date(),
    updatedAt: new Date(),
};

const build = (overrides: Partial<EnablerProfileProps> = {}) =>
    EnablerEntity.create({ ...baseProps, ...overrides });

describe('EnablerEntity lifecycle (spec §5–§6)', () => {
    it('keeps legacy callers working: toPlainObject round-trips unchanged props', () => {
        expect(build().toPlainObject()).toEqual(baseProps);
    });

    it('defaults training status to not_started when absent', () => {
        expect(build().trainingStatus).toBe('not_started');
        expect(build().termsVersion).toBeNull();
        expect(build().activatedAt).toBeNull();
    });

    describe('activation requirements', () => {
        it('records terms acceptance with version and timestamp', () => {
            const acceptedAt = new Date('2026-01-05T10:00:00Z');
            const enabler = build();
            enabler.acceptTerms('2026-01', acceptedAt);
            expect(enabler.termsVersion).toBe('2026-01');
            expect(enabler.termsAcceptedAt).toBe(acceptedAt);
        });

        it('rejects an empty terms version', () => {
            expect(() => build().acceptTerms('   ')).toThrow('terms version is required');
        });

        it('records training completion timestamp only for the completed status', () => {
            const completedAt = new Date('2026-01-06T10:00:00Z');
            const enabler = build();
            enabler.recordTrainingCompletion('in_progress');
            expect(enabler.trainingStatus).toBe('in_progress');
            expect(enabler.trainingCompletedAt).toBeNull();

            enabler.recordTrainingCompletion('completed', completedAt);
            expect(enabler.trainingStatus).toBe('completed');
            expect(enabler.trainingCompletedAt).toBe(completedAt);
        });

        it('refuses activation when the required terms were never accepted', () => {
            const enabler = build();
            expect(() => enabler.activate({ requiredTermsVersion: '2026-01' })).toThrow('Activation requirements not met');
            expect(enabler.status).toBe(Enabler_Status.APPROVED);
        });

        it('refuses activation when mandatory training is incomplete', () => {
            const enabler = build();
            enabler.acceptTerms('2026-01');
            enabler.recordTrainingCompletion('in_progress');
            expect(() => enabler.activate({ requiredTermsVersion: '2026-01', trainingRequired: true })).toThrow(
                'training must be completed'
            );
            expect(enabler.status).toBe(Enabler_Status.APPROVED);
        });

        it('activates and stamps activatedAt once requirements are met', () => {
            const activatedAt = new Date('2026-01-07T10:00:00Z');
            const enabler = build();
            enabler.acceptTerms('2026-01');
            enabler.recordTrainingCompletion('completed');
            enabler.activate({ activatedAt, requiredTermsVersion: '2026-01', trainingRequired: true });

            expect(enabler.status).toBe(Enabler_Status.ACTIVE);
            expect(enabler.activatedAt).toBe(activatedAt);
            expect(enabler.isOperational).toBe(true);
        });

        it('refuses to activate a non-approved enabler', () => {
            expect(() => build({ status: Enabler_Status.PENDING }).activate()).toThrow('Only approved enablers can be activated');
        });
    });

    describe('capability gating', () => {
        it('lets an ACTIVE enabler build drafts, generate links, share and qualify earnings', () => {
            const enabler = build({ status: Enabler_Status.ACTIVE });
            expect(enabler.canBuildOrderDraft()).toBe(true);
            expect(enabler.canGenerateCustomerLink()).toBe(true);
            expect(enabler.canShareProduct()).toBe(true);
            expect(enabler.canAccessPermanentLink()).toBe(true);
            expect(enabler.canQualifyEarning()).toBe(true);
        });

        it('refuses drafts, links and sharing for a non-activated APPROVED enabler', () => {
            const enabler = build({ status: Enabler_Status.APPROVED });
            expect(enabler.canBuildOrderDraft()).toBe(false);
            expect(enabler.canGenerateCustomerLink()).toBe(false);
            expect(enabler.canShareProduct()).toBe(false);
        });

        it('refuses drafts and customer links for a SUSPENDED enabler', () => {
            const enabler = build({ status: Enabler_Status.SUSPENDED });
            expect(enabler.canGenerateCustomerLink()).toBe(false);
            expect(enabler.canBuildOrderDraft()).toBe(false);
            expect(enabler.canShareProduct()).toBe(false);
            expect(enabler.canAccessPermanentLink()).toBe(false);
        });

        it('refuses drafts and the permanent link for a DEACTIVATED enabler', () => {
            const enabler = build({ status: Enabler_Status.DEACTIVATED });
            expect(enabler.canBuildOrderDraft()).toBe(false);
            expect(enabler.canAccessPermanentLink()).toBe(false);
        });
    });

    describe('lifecycle transitions', () => {
        it('restricts an active enabler: loses drafts but keeps sharing', () => {
            const enabler = build({ status: Enabler_Status.ACTIVE });
            enabler.restrict('excessive cancellations');
            expect(enabler.status).toBe(Enabler_Status.RESTRICTED);
            expect(enabler.isRestricted).toBe(true);
            expect(enabler.toPlainObject().restrictedReason).toBe('excessive cancellations');
            expect(enabler.canBuildOrderDraft()).toBe(false);
            expect(enabler.canShareProduct()).toBe(true);
        });

        it('refuses to restrict a non-active enabler', () => {
            expect(() => build({ status: Enabler_Status.SUSPENDED }).restrict('nope')).toThrow(
                'Only active enablers can be restricted'
            );
        });

        it('suspends an active enabler and stamps suspendedAt', () => {
            const at = new Date('2026-02-01T00:00:00Z');
            const enabler = build({ status: Enabler_Status.ACTIVE });
            enabler.suspend('fraud investigation', at);
            expect(enabler.status).toBe(Enabler_Status.SUSPENDED);
            expect(enabler.isSuspended).toBe(true);
            expect(enabler.toPlainObject().suspendedAt).toBe(at);
            expect(enabler.toPlainObject().suspendedReason).toBe('fraud investigation');
        });

        it('suspends a restricted enabler', () => {
            const enabler = build({ status: Enabler_Status.ACTIVE });
            enabler.restrict('review');
            enabler.suspend('escalated');
            expect(enabler.status).toBe(Enabler_Status.SUSPENDED);
        });

        it('refuses to suspend a deactivated enabler', () => {
            expect(() => build({ status: Enabler_Status.DEACTIVATED }).suspend('nope')).toThrow(
                'Only active or restricted enablers can be suspended'
            );
        });

        it('reactivates a suspended enabler and clears suspension state', () => {
            const enabler = build({ status: Enabler_Status.ACTIVE });
            enabler.suspend('investigation');
            enabler.reactivate();
            expect(enabler.status).toBe(Enabler_Status.ACTIVE);
            expect(enabler.toPlainObject().suspendedAt).toBeNull();
            expect(enabler.canGenerateCustomerLink()).toBe(true);
        });

        it('reactivates a restricted enabler', () => {
            const enabler = build({ status: Enabler_Status.ACTIVE });
            enabler.restrict('review');
            enabler.reactivate();
            expect(enabler.status).toBe(Enabler_Status.ACTIVE);
            expect(enabler.toPlainObject().restrictedAt).toBeNull();
        });

        it('refuses to reactivate a pending enabler', () => {
            expect(() => build({ status: Enabler_Status.PENDING }).reactivate()).toThrow(
                'Only suspended or restricted enablers can be reactivated'
            );
        });

        it('deactivates terminally but never deletes the Maysar user', () => {
            const enabler = build({ status: Enabler_Status.SUSPENDED });
            enabler.deactivate('left the programme');
            expect(enabler.status).toBe(Enabler_Status.DEACTIVATED);
            expect(enabler.isDeactivated).toBe(true);
            expect(enabler.toPlainObject().deactivatedReason).toBe('left the programme');
            expect(enabler.userId).toBe('user-1');
        });

        it('refuses to deactivate twice', () => {
            expect(() => build({ status: Enabler_Status.DEACTIVATED }).deactivate('again')).toThrow('already deactivated');
        });
    });
});