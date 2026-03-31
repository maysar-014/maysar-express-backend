export interface IWalletServiceClient {
    placeHold(userId: string, amount: number, currency: string, reason: string): Promise<string>;
    releaseHold(holdId: string): Promise<void>;
    captureHold(holdId: string): Promise<void>;
}

export class CODCommitmentService {
    constructor(
        private readonly walletService: IWalletServiceClient
    ) { }

    calculateCommitmentFee(deliveryFee: number): number {
        if (!Number.isFinite(deliveryFee) || deliveryFee <= 0) {
            throw new Error('Delivery fee must be greater than zero');
        }

        return deliveryFee;
    }

    async secureCommitment(userId: string, orderId: string, amount: number, currency: string): Promise<string> {
        const reason = `COD Delivery Fee Commitment for Order ${orderId}`;
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
