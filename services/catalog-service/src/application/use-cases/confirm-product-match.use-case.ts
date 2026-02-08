import { MatchConfirmationRequestDto, MatchConfirmationResponseDto } from '../dto/matching-dto';
import { IMatchConfirmationRepository, IProductMatchAuditRepository } from '../../domain/repositories/repository.interfaces';

export class ConfirmProductMatchUseCase {
    constructor(
        private readonly confirmationRepository: IMatchConfirmationRepository,
        private readonly auditRepository: IProductMatchAuditRepository
    ) { }

    async execute(confirmationId: string, request: MatchConfirmationRequestDto): Promise<MatchConfirmationResponseDto> {
        // 1. Validate confirmation exists and is pending
        const confirmation = await this.confirmationRepository.findById(confirmationId);
        if (!confirmation) {
            throw new Error('Confirmation not found');
        }
        if (confirmation.status !== 'PENDING') {
            throw new Error(`Confirmation is not pending (current status: ${confirmation.status})`);
        }

        // Check if expired
        if (new Date() > new Date(confirmation.expiresAt)) {
            throw new Error('Confirmation has expired');
        }

        // 2. Update confirmation status
        const choice = request.choice === 'confirm' ? request.selectedProductId || 'merged' : 'new';
        await this.confirmationRepository.updateStatus(
            confirmationId,
            request.choice === 'confirm' ? 'CONFIRMED' : 'REJECTED',
            choice
        );

        // 3. Update linked audit record with seller decision
        const audit = await this.auditRepository.findById(confirmation.auditId);
        if (audit) {
            // Update decision and decided by
            audit.decision = request.choice === 'confirm' ? 'SELLER_CONFIRMED' : 'SELLER_REJECTED';
            audit.decidedBy = 'SELLER';

            // If confirmed, update matched product ID
            if (request.choice === 'confirm' && request.selectedProductId) {
                audit.matchedProductId = request.selectedProductId;
            }

            // Update metadata to reflect confirmation
            audit.metadata = {
                ...(audit.metadata || {}),
                confirmedAt: new Date().toISOString(),
                confirmationId,
                sellerChoice: choice
            };

            await this.auditRepository.save(audit);
        }

        // 4. Return response
        return {
            success: true,
            actionTaken: request.choice === 'confirm' ? 'merged' : 'created_new',
            finalProductId: request.choice === 'confirm' ? (request.selectedProductId || '') : '',
        };
    }
}
