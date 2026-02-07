import axios, { AxiosInstance } from 'axios';
import { TrainingServiceClient } from '../../application/use-cases/validate-expertise.use-case';

export class HttpTrainingServiceClient implements TrainingServiceClient {
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

    async getCompletedModules(userId: string): Promise<string[]> {
        try {
            const response = await this.client.get(`/users/${userId}/completed-modules`);

            return response.data.modules || [];
        } catch (error: any) {
            console.error('Failed to fetch completed modules:', error.message);

            // If user not found, return empty array
            if (error.response?.status === 404) {
                return [];
            }

            // Re-throw for unexpected errors
            throw new Error(`Training service error: ${error.message}`);
        }
    }

    async getModuleDetails(moduleId: string): Promise<{
        id: string;
        title: string;
        category: string;
        expertiseArea: string;
        level: string;
    } | null> {
        try {
            const response = await this.client.get(`/modules/${moduleId}`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return null;
            }
            throw new Error(`Training service error: ${error.message}`);
        }
    }

    async getUserProgress(userId: string): Promise<{
        totalModulesCompleted: number;
        certificationsEarned: number;
        currentLevel: string;
        categories: Array<{ category: string; completedModules: number }>;
    }> {
        try {
            const response = await this.client.get(`/users/${userId}/progress`);
            return response.data;
        } catch (error: any) {
            if (error.response?.status === 404) {
                return {
                    totalModulesCompleted: 0,
                    certificationsEarned: 0,
                    currentLevel: 'BEGINNER',
                    categories: [],
                };
            }
            throw new Error(`Training service error: ${error.message}`);
        }
    }
}
