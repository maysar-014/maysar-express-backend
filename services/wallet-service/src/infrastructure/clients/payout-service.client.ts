import axios from 'axios';
import {
    InitiatePayoutDTO,
    PayoutResponse,
    IPayoutServiceClient
} from '../../../../../shared-contracts/payout-service-contracts';

export class PayoutServiceClient implements IPayoutServiceClient {
    private readonly baseUrl: string;

    constructor(baseUrl?: string) {
        this.baseUrl = baseUrl || process.env.PAYOUT_SERVICE_URL || 'http://payout-service:3005';
    }

    async initiatePayout(dto: InitiatePayoutDTO): Promise<PayoutResponse> {
        try {
            const response = await axios.post(`${this.baseUrl}/api/payouts`, dto);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                status: 'FAILED' as any,
                message: error.response?.data?.error || error.message || 'Unknown error'
            };
        }
    }

    async getPayoutStatus(payoutId: string): Promise<PayoutResponse> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/payouts/${payoutId}`);
            return response.data;
        } catch (error: any) {
            return {
                success: false,
                status: 'FAILED' as any,
                message: error.response?.data?.error || error.message || 'Unknown error'
            };
        }
    }

    async cancelPayout(payoutId: string, reason: string): Promise<void> {
        await axios.post(`${this.baseUrl}/api/payouts/${payoutId}/cancel`, { reason });
    }
}
