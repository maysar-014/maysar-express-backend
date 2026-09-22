import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { IEnablerEnforcementRepository } from '../../domain/repositories/enabler-enforcement.repository.interface';
import { ApplyEnablerEnforcementDto } from '../dto/enabler-lifecycle.dto';
import { EnablerLifecyclePolicy } from '../../domain/policies/enabler-lifecycle.policy';
import {
    EnablerDeactivatedEvent,
    EnablerReactivatedEvent,
    EnablerRestrictedEvent,
    EnablerSuspendedEvent,
} from '../../domain/events/enabler-events';
import { Enabler_Status } from '../../domain/types/enabler.types';

/**
 * Admin enforcement against an enabler capability profile (§52).
 *
 * Enforcement changes *capability state only*: the underlying Maysar user, its
 * wallet, orders and any seller/courier duties are untouched. Every decision is
 * written to an immutable enforcement trail (§34) and emitted as an event (§50).
 *
 * Applicability is decided by the lifecycle policy, not by this use case, so an
 * invalid transition (e.g. reactivating a PENDING enabler) is refused even if
 * the caller is an admin.
 */
export class ApplyEnablerEnforcementUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly enforcementRepository: IEnablerEnforcementRepository,
        private readonly eventPublisher?: any
    ) { }

    async execute(
        enablerId: string,
        dto: ApplyEnablerEnforcementDto,
        actorUserId?: string
    ): Promise<{ enablerId: string; previousStatus: string; status: string; action: string }> {
        if (!dto?.action) {
            throw new Error('An enforcement action is required');
        }

        const enabler = await this.enablerRepository.findById(enablerId);
        if (!enabler) {
            throw new Error('Enabler not found');
        }

        const previousStatus = enabler.status;

        const permitted = EnablerLifecyclePolicy.canApplyEnforcement(previousStatus, dto.action);
        if (!permitted.allowed) {
            throw new Error(`Cannot apply ${dto.action}: ${permitted.reason}`);
        }

        // A REACTIVATE may target either SUSPENDED or RESTRICTED state.
        if (dto.action === 'REACTIVATE' && previousStatus === Enabler_Status.RESTRICTED) {
            enabler.reactivate();
        } else {
            switch (dto.action) {
                case 'RESTRICT':
                    enabler.restrict(dto.reason || 'Restricted by Maysar operations');
                    break;
                case 'SUSPEND':
                    enabler.suspend(dto.reason || 'Suspended by Maysar operations');
                    break;
                case 'REACTIVATE':
                    enabler.reactivate();
                    break;
                case 'DEACTIVATE':
                    enabler.deactivate(dto.reason || 'Deactivated by Maysar operations');
                    break;
            }
        }

        await this.enablerRepository.update(enabler);

        await this.enforcementRepository.record({
            enablerId: enabler.id,
            action: dto.action,
            previousStatus,
            newStatus: enabler.status,
            reason: dto.reason ?? null,
            actorUserId: actorUserId ?? null,
        });

        await this.publishForAction(enabler.id, dto, this.eventPublisher);

        return {
            enablerId: enabler.id,
            previousStatus,
            status: enabler.status,
            action: dto.action,
        };
    }

    private async publishForAction(enablerId: string, dto: ApplyEnablerEnforcementDto, publisher: any): Promise<void> {
        const reason = dto.reason || '';
        switch (dto.action) {
            case 'RESTRICT':
                await publisher?.publish?.(new EnablerRestrictedEvent(enablerId, reason));
                break;
            case 'SUSPEND':
                await publisher?.publish?.(new EnablerSuspendedEvent(enablerId, reason));
                break;
            case 'REACTIVATE':
                await publisher?.publish?.(new EnablerReactivatedEvent(enablerId));
                break;
            case 'DEACTIVATE':
                await publisher?.publish?.(new EnablerDeactivatedEvent(enablerId, reason));
                break;
        }
    }
}