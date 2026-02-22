export interface CODDispute {
    id: string;
    orderId: string;
    disputeType: string;
    raisedBy: string;
    description: string;
    status: 'PENDING' | 'INVESTIGATING' | 'RESOLVED' | 'REJECTED';
    resolution?: string;
    resolvedAt?: Date;
}

export interface ICODDisputeRepository {
    findById(id: string): Promise<CODDispute | null>;
    save(dispute: CODDispute): Promise<void>;
    update(dispute: CODDispute): Promise<void>;
}

export interface ResolveCODDisputeRequest {
    disputeId: string;
    resolution: string;
    decision: 'REFUND_COMMITMENT' | 'FORFEIT_COMMITMENT' | 'PENALIZE_BOTH';
}

export class ResolveCODDisputeUseCase {
    constructor(
        private readonly disputeRepository: ICODDisputeRepository,
        private readonly eventPublisher: any
    ) { }

    async execute(request: ResolveCODDisputeRequest): Promise<void> {
        const dispute = await this.disputeRepository.findById(request.disputeId);
        if (!dispute) {
            throw new Error(`Dispute ${request.disputeId} not found`);
        }

        if (dispute.status === 'RESOLVED' || dispute.status === 'REJECTED') {
            throw new Error(`Dispute ${request.disputeId} is already closed`);
        }

        dispute.status = 'RESOLVED';
        dispute.resolution = request.resolution;
        dispute.resolvedAt = new Date();

        await this.disputeRepository.update(dispute);

        // Emit event for downstream processing (e.g. Wallet settlement, Reputation adjustment)
        await this.eventPublisher.publish({
            type: 'COD_DISPUTE_RESOLVED',
            payload: {
                disputeId: dispute.id,
                orderId: dispute.orderId,
                decision: request.decision,
                resolvedAt: dispute.resolvedAt
            }
        });

        console.log(`Dispute ${dispute.id} resolved with decision: ${request.decision}`);
    }
}
