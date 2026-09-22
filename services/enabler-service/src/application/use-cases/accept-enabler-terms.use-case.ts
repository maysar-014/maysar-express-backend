import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { AcceptEnablerTermsDto } from '../dto/enabler-lifecycle.dto';
import { EnablerTermsAcceptedEvent } from '../../domain/events/enabler-events';
import { Enabler_Status } from '../../domain/types/enabler.types';

/**
 * Record an enabler's acceptance of a specific terms version (§6).
 *
 * The accepted version is persisted with its timestamp so activation can
 * require a *current* acceptance rather than any historical one. Acceptance is
 * allowed before approval (PENDING) because the terms are presented during
 * onboarding, and re-acceptance is allowed while ACTIVE/RESTRICTED so a new
 * terms version can be rolled out without suspending the network.
 *
 * Idempotent (§39): re-accepting the same version simply refreshes the
 * timestamp; it never creates a second profile or duplicate side effects.
 */
export class AcceptEnablerTermsUseCase {
    private static readonly ACCEPTABLE_STATUSES: ReadonlyArray<Enabler_Status> = [
        Enabler_Status.PENDING,
        Enabler_Status.APPROVED,
        Enabler_Status.ACTIVE,
        Enabler_Status.RESTRICTED,
    ];

    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly eventPublisher?: any
    ) { }

    async execute(enablerId: string, dto: AcceptEnablerTermsDto): Promise<{ enablerId: string; termsVersion: string; termsAcceptedAt: Date }> {
        if (!dto?.termsVersion || !dto.termsVersion.trim()) {
            throw new Error('A terms version is required');
        }

        const enabler = await this.enablerRepository.findById(enablerId);
        if (!enabler) {
            throw new Error('Enabler not found');
        }

        if (!AcceptEnablerTermsUseCase.ACCEPTABLE_STATUSES.includes(enabler.status)) {
            throw new Error(`Terms cannot be accepted while the enabler is ${enabler.status}`);
        }

        enabler.acceptTerms(dto.termsVersion);
        await this.enablerRepository.update(enabler);

        await this.eventPublisher?.publish?.(
            new EnablerTermsAcceptedEvent(enabler.id, enabler.userId, enabler.termsVersion as string)
        );

        return {
            enablerId: enabler.id,
            termsVersion: enabler.termsVersion as string,
            termsAcceptedAt: enabler.termsAcceptedAt as Date,
        };
    }
}