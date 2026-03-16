import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { EnablerApprovalPolicy } from '../../domain/policies/enabler-approval.policy';
import { EnablerResponseDto } from '../dto/enabler-registration.dto';
import { EnablerMapper } from '../mappers/enabler.mapper';
import { generateEnablerCode, toShortEnablerCode } from '@shared/ids/public-codes';

export class ApproveEnablerUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly eventPublisher: any
    ) { }

    async execute(enablerId: string, adminId: string, completenessEvents: string[]): Promise<EnablerResponseDto> {
        // 1. Fetch Enabler
        const enabler = await this.enablerRepository.findById(enablerId);
        if (!enabler) {
            throw new Error('Enabler not found');
        }

        if (!Array.isArray(completenessEvents) || completenessEvents.length === 0) {
            throw new Error('Completeness events are required for approval');
        }

        // 2. Validate Approval Policy
        const approvalCheck = EnablerApprovalPolicy.canApprove({
            status: enabler.status,
            verificationStatus: enabler.toPlainObject().verificationStatus,
            completenessEvents
        });

        if (!approvalCheck.allowed) {
            throw new Error(`Cannot approve enabler: ${approvalCheck.reason}`);
        }

        // 3. Approve Enabler
        enabler.approve(adminId);

        if (!enabler.enablerCode) {
            const code = await this.generateUniqueEnablerCode();
            enabler.assignEnablerCode(code, toShortEnablerCode(code) || undefined);
        }

        // 4. Save Changes
        await this.enablerRepository.update(enabler);

        // 5. Emit Event (EnablerApprovedEvent - to implement)
        // await this.eventPublisher.publish(new EnablerApprovedEvent(enabler.id));

        return EnablerMapper.toResponseDto(enabler);
    }

    private async generateUniqueEnablerCode(): Promise<string> {
        for (let attempt = 0; attempt < 10; attempt += 1) {
            const code = generateEnablerCode();
            const existing = await this.enablerRepository.findByCode(code);
            if (!existing) return code;
        }
        throw new Error('Unable to generate a unique enabler code');
    }
}
