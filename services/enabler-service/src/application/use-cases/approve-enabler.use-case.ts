import { IEnablerRepository } from '../../domain/repositories/enabler.repository.interface';
import { EnablerApprovalPolicy } from '../../domain/policies/enabler-approval.policy';
import { EnablerResponseDto } from '../dto/enabler-registration.dto';
import { EnablerMapper } from '../mappers/enabler.mapper';

export class ApproveEnablerUseCase {
    constructor(
        private readonly enablerRepository: IEnablerRepository,
        private readonly eventPublisher: any
    ) { }

    async execute(enablerId: string, adminId: string): Promise<EnablerResponseDto> {
        // 1. Fetch Enabler
        const enabler = await this.enablerRepository.findById(enablerId);
        if (!enabler) {
            throw new Error('Enabler not found');
        }

        // 2. Validate Approval Policy
        const approvalCheck = EnablerApprovalPolicy.canApprove({
            status: enabler.status,
            verificationStatus: enabler.toPlainObject().verificationStatus,
            completenessEvents: ['email_verified', 'phone_verified'] // Mock completeness for now
        });

        if (!approvalCheck.allowed) {
            throw new Error(`Cannot approve enabler: ${approvalCheck.reason}`);
        }

        // 3. Approve Enabler
        enabler.approve(adminId);

        // 4. Save Changes
        await this.enablerRepository.update(enabler);

        // 5. Emit Event (EnablerApprovedEvent - to implement)
        // await this.eventPublisher.publish(new EnablerApprovedEvent(enabler.id));

        return EnablerMapper.toResponseDto(enabler);
    }
}
