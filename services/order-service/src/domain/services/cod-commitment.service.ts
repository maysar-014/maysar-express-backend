export interface IWalletServiceClient {
    placeHold(userId: string, amount: number, currency: string, reason: string): Promise<string>;
    releaseHold(holdId: string): Promise<void>;
    captureHold(holdId: string): Promise<void>;
}

export class CODCommitmentService {
    private readonly COMMITMENT_FEE_PERCENTAGE = 0.05; // 5%
    private readonly MIN_COMMITMENT_FEE = 5000;       // 5,000 TZS

    constructor(
        private readonly walletService: IWalletServiceClient
    ) { }

    calculateCommitmentFee(orderAmount: number): number {
        const calculatedFee = orderAmount * this.COMMITMENT_FEE_PERCENTAGE;
        return Math.max(calculatedFee, this.MIN_COMMITMENT_FEE);
    }

    async secureCommitment(userId: string, orderId: string, amount: number, currency: string): Promise<string> {
        const reason = `COD Commitment Fee for Order ${orderId}`;
        return await this.walletService.placeHold(userId, amount, currency, reason);
    }

    async releaseCommitment(holdId: string): Promise<void> {
        await this.walletService.releaseHold(holdId);
    }

    async forfeitCommitment(holdId: string): Promise<void> {
        // Forfeiting means capturing the hold (transferring funds to platform/seller as penalty)
        await this.walletService.captureHold(holdId);
    }
}
