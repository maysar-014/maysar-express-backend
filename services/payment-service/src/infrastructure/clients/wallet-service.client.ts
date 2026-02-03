import axios from 'axios';

export class WalletServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl: string) {
        this.baseUrl = baseUrl || process.env.WALLET_SERVICE_URL || 'http://wallet-service:3002';
    }

    async getBalance(userId: string): Promise<{ balance: number; availableBalance: number }> {
        const response = await axios.get(`${this.baseUrl}/api/wallets/${userId}/balance`);
        return response.data;
    }

    async checkEligibility(userId: string, amount: number): Promise<{ canPayout: boolean; reason?: string }> {
        const response = await axios.get(`${this.baseUrl}/api/wallets/${userId}/eligibility`, {
            params: { amount }
        });
        return response.data;
    }

    async freezeFunds(data: { userId: string, amount: number, description: string }): Promise<void> {
        await axios.post(`${this.baseUrl}/api/wallets/${data.userId}/freeze`, data);
    }

    async unfreezeFunds(data: { userId: string, amount: number, description: string }): Promise<void> {
        await axios.post(`${this.baseUrl}/api/wallets/${data.userId}/unfreeze`, data);
    }

    async debitFrozenFunds(data: { userId: string, amount: number, description: string }): Promise<void> {
        await axios.post(`${this.baseUrl}/api/wallets/${data.userId}/debit-frozen`, data);
    }
}
