import axios from 'axios';
import {
    InitiatePayoutDTO,
    PayoutResponse,
    PayoutStatus,
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
        } catch (error: unknown) {
            const message = axios.isAxiosError(error)
                ? (error.response?.data as { error?: string } | undefined)?.error || error.message
                : error instanceof Error
                    ? error.message
                    : 'Unknown error';
            return {
                success: false,
                status: PayoutStatus.FAILED,
                message
            };
        }
    }

    async getPayoutStatus(payoutId: string): Promise<PayoutResponse> {
        try {
            const response = await axios.get(`${this.baseUrl}/api/payouts/${payoutId}`);
            return response.data;
        } catch (error: unknown) {
            const message = axios.isAxiosError(error)
                ? (error.response?.data as { error?: string } | undefined)?.error || error.message
                : error instanceof Error
                    ? error.message
                    : 'Unknown error';
            return {
                success: false,
                status: PayoutStatus.FAILED,
                message
            };
        }
    }

    async cancelPayout(payoutId: string, reason: string): Promise<void> {
        await axios.post(`${this.baseUrl}/api/payouts/${payoutId}/cancel`, { reason });
    }
}
