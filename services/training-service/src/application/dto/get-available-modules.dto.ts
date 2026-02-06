import { TrainingModuleDTO } from './training-module.dto';

export interface GetAvailableModulesRequest {
    learnerId: string;
    learnerRole: string;
}

export interface GetAvailableModulesResponse {
    modules: TrainingModuleDTO[];
    recommendations: string[];
}
