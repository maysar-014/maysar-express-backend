import { EnablerLifecyclePolicy } from './enabler-lifecycle.policy';
import { Enabler_Status } from '../types/enabler.types';

const ALL_CAPABILITIES = [
    'VIEW_ELIGIBLE_PRODUCTS',
    'SHARE_PRODUCT',
    'BUILD_ORDER_DRAFT',
    'GENERATE_CUSTOMER_LINK',
    'ACCESS_PERMANENT_LINK',
    'QUALIFY_EARNING',
] as const;

describe('EnablerLifecyclePolicy', () => {
    describe('capability matrix (spec §5)', () => {
        it('grants every capability only to ACTIVE enablers', () => {
            ALL_CAPABILITIES.forEach((capability) => {
                expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.ACTIVE, capability).allowed).toBe(true);
            });
        });

        it('refuses order drafts, customer links, permanent link and earnings for RESTRICTED enablers', () => {
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.RESTRICTED, 'BUILD_ORDER_DRAFT').allowed).toBe(false);
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.RESTRICTED, 'GENERATE_CUSTOMER_LINK').allowed).toBe(false);
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.RESTRICTED, 'ACCESS_PERMANENT_LINK').allowed).toBe(false);
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.RESTRICTED, 'QUALIFY_EARNING').allowed).toBe(false);
        });

        it('still allows discovery and sharing for RESTRICTED enablers', () => {
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.RESTRICTED, 'VIEW_ELIGIBLE_PRODUCTS').allowed).toBe(true);
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.RESTRICTED, 'SHARE_PRODUCT').allowed).toBe(true);
        });

        it('refuses every capability for SUSPENDED enablers — including customer links', () => {
            ALL_CAPABILITIES.forEach((capability) => {
                const decision = EnablerLifecyclePolicy.canPerform(Enabler_Status.SUSPENDED, capability);
                expect(decision.allowed).toBe(false);
                expect(decision.code).toBe('STATUS_NOT_PERMITTED');
                expect(decision.reason).toContain('SUSPENDED');
            });
        });

        it('refuses order drafts and permanent links for DEACTIVATED enablers', () => {
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.DEACTIVATED, 'BUILD_ORDER_DRAFT').allowed).toBe(false);
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.DEACTIVATED, 'ACCESS_PERMANENT_LINK').allowed).toBe(false);
        });

        it('allows only discovery for APPROVED (not yet activated) enablers', () => {
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.APPROVED, 'VIEW_ELIGIBLE_PRODUCTS').allowed).toBe(true);
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.APPROVED, 'SHARE_PRODUCT').allowed).toBe(false);
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.APPROVED, 'BUILD_ORDER_DRAFT').allowed).toBe(false);
        });

        it('refuses everything for PENDING and REJECTED enablers', () => {
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.PENDING, 'VIEW_ELIGIBLE_PRODUCTS').allowed).toBe(false);
            expect(EnablerLifecyclePolicy.canPerform(Enabler_Status.REJECTED, 'SHARE_PRODUCT').allowed).toBe(false);
        });

        it('treats only ACTIVE as operational', () => {
            expect(EnablerLifecyclePolicy.isOperational(Enabler_Status.ACTIVE)).toBe(true);
            expect(EnablerLifecyclePolicy.isOperational(Enabler_Status.APPROVED)).toBe(false);
            expect(EnablerLifecyclePolicy.isOperational(Enabler_Status.RESTRICTED)).toBe(false);
            expect(EnablerLifecyclePolicy.isOperational(Enabler_Status.SUSPENDED)).toBe(false);
        });
    });

    describe('activation requirements (spec §6)', () => {
        it('rejects activation of a non-APPROVED enabler', () => {
            const decision = EnablerLifecyclePolicy.canActivate({ status: Enabler_Status.PENDING });
            expect(decision.allowed).toBe(false);
            expect(decision.reason).toContain('APPROVED');
        });

        it('requires accepted terms when a terms version is mandatory', () => {
            const decision = EnablerLifecyclePolicy.canActivate({
                status: Enabler_Status.APPROVED,
                requiredTermsVersion: '2026-01',
            });
            expect(decision.allowed).toBe(false);
            expect(decision.reason).toContain('terms must be accepted');
        });

        it('rejects a stale accepted terms version', () => {
            const decision = EnablerLifecyclePolicy.canActivate({
                status: Enabler_Status.APPROVED,
                requiredTermsVersion: '2026-02',
                termsVersion: '2025-12',
                termsAcceptedAt: new Date(),
            });
            expect(decision.allowed).toBe(false);
            expect(decision.reason).toContain('does not match required version');
        });

        it('requires completed training when training is mandatory', () => {
            const decision = EnablerLifecyclePolicy.canActivate({
                status: Enabler_Status.APPROVED,
                requiredTermsVersion: '2026-01',
                termsVersion: '2026-01',
                termsAcceptedAt: new Date(),
                trainingRequired: true,
                trainingStatus: 'in_progress',
            });
            expect(decision.allowed).toBe(false);
            expect(decision.reason).toContain('training must be completed');
        });

        it('allows activation once terms and training are satisfied', () => {
            const decision = EnablerLifecyclePolicy.canActivate({
                status: Enabler_Status.APPROVED,
                requiredTermsVersion: '2026-01',
                termsVersion: '2026-01',
                termsAcceptedAt: new Date(),
                trainingRequired: true,
                trainingStatus: 'completed',
            });
            expect(decision).toEqual({ allowed: true, code: 'ALLOWED' });
        });

        it('allows activation without a pinned terms version when none is required', () => {
            const decision = EnablerLifecyclePolicy.canActivate({ status: Enabler_Status.APPROVED });
            expect(decision.allowed).toBe(true);
        });
    });

    describe('admin enforcement transitions (spec §52)', () => {
        it('permits restrict only from ACTIVE', () => {
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.ACTIVE, 'RESTRICT').allowed).toBe(true);
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.SUSPENDED, 'RESTRICT').allowed).toBe(false);
        });

        it('permits suspend from ACTIVE, RESTRICTED and APPROVED', () => {
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.ACTIVE, 'SUSPEND').allowed).toBe(true);
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.RESTRICTED, 'SUSPEND').allowed).toBe(true);
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.APPROVED, 'SUSPEND').allowed).toBe(true);
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.DEACTIVATED, 'SUSPEND').allowed).toBe(false);
        });

        it('permits reactivation only from SUSPENDED or RESTRICTED', () => {
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.SUSPENDED, 'REACTIVATE').allowed).toBe(true);
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.RESTRICTED, 'REACTIVATE').allowed).toBe(true);
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.PENDING, 'REACTIVATE').allowed).toBe(false);
        });

        it('rejects deactivating an already deactivated enabler', () => {
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.DEACTIVATED, 'DEACTIVATE').allowed).toBe(false);
            expect(EnablerLifecyclePolicy.canApplyEnforcement(Enabler_Status.SUSPENDED, 'DEACTIVATE').allowed).toBe(true);
        });
    });
});