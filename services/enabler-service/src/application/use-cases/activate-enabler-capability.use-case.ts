import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { ActivateEnablerDto } from '../dto/enabler-lifecycle.dto';
import { EnablerMapper } from '../mappers/enabler.mapper';
import { EnablerResponseDto } from '../dto/enabler-registration.dto';
import { EnablerActivatedEvent, EnablerTrainingRecordedEvent } from '../../domain/events/enabler-events';

/**
 * Activate an enabler capability profile (§6).
 *
 * Mandatory requirements — eligibility (already enforced by approval), accepted
 * terms version and, where configured, completed training — are validated by
 * the domain before the transition. The backend is the enforcement point; the
 * frontend only reflects it (§55).
 *
 * Idempotent (§39): activating an already-ACTIVE enabler is a no-op that simply
 * returns the current state, so a retried request cannot create a second
 * activation or duplicate events.
 */
export class ActivateEnablerCapabilityUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly eventPublisher?: any
    ) { }

    async execute(enablerId: string, dto: ActivateEnablerDto = {}): Promise<EnablerResponseDto> {
        const enabler = await this.enablerRepository.findById(enablerId);
        if (!enabler) {
            throw new Error('Enabler not found');
        }

        // Idempotent re-activation: nothing to do, nothing to emit.
        if (enabler.isOperational) {
            return EnablerMapper.toResponseDto(enabler);
        }

        // Training outcome is reported by the shared training domain (§37); we
        // only mirror it before evaluating the requirement gate.
        if (dto.trainingStatus) {
            enabler.recordTrainingCompletion(dto.trainingStatus);
        }

        enabler.activate({
            requiredTermsVersion: dto.requiredTermsVersion,
            trainingRequired: dto.trainingRequired,
        });

        await this.enablerRepository.update(enabler);

        if (dto.trainingStatus) {
            await this.eventPublisher?.publish?.(
                new EnablerTrainingRecordedEvent(enabler.id, enabler.userId, enabler.trainingStatus)
            );
        }
        await this.eventPublisher?.publish?.(new EnablerActivatedEvent(enabler.id, enabler.userId));

        return EnablerMapper.toResponseDto(enabler);
    }
}