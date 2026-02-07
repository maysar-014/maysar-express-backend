import axios, { AxiosInstance } from 'axios';
import { BusinessRegistryClient } from '../../application/use-cases/validate-expertise.use-case';

export class HttpBusinessRegistryClient implements BusinessRegistryClient {
    private readonly client: AxiosInstance;

    constructor(baseUrl: string) {
        this.client = axios.create({
            baseURL: baseUrl,
            timeout: 5000,
            headers: {
                'Content-Type': 'application/json',
            },
        });
    }

    async verifyBusinessCredentials(userId: string, businessId: string): Promise<boolean> {
        try {
            const response = await this.client.get(`/businesses/${businessId}/verify`, {
                params: { userId },
            });

            return response.data.verified === true;
        } catch (error: any) {
            // Log error
            console.error('Business verification failed:', error.message);

            // If business not found or verification failed, return false
            if (error.response?.status === 404 || error.response?.status === 400) {
                return false;
            }

            // Re-throw for unexpected errors
            throw new Error(`Business registry service error: ${error.message}`);
        }
    }

    async getBusinessDetails(businessId: string): Promise<{
        id: string;
        name: string;
        industry: string;
        verificationStatus: string;
    } | null> {
        try {
            const response = await this.client.get(`/businesses/${businessId}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw new Error(`Business registry service error: ${error.message}`);
        }
    }
}
