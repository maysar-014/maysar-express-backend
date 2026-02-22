import { v4 as uuidv4 } from 'uuid';

export class ComplianceFactory {
    static createSubjectRightsRequest(overrides: any = {}) {
        return {
            id: uuidv4(),
            userId: uuidv4(),
            requestType: 'access',
            status: 'pending',
            requestedAt: new Date(),
            ...overrides
        };
    }

    static createKYCRecord(overrides: any = {}) {
        return {
            id: uuidv4(),
            userId: uuidv4(),
            verificationStatus: 'pending',
            submittedAt: new Date(),
            ...overrides
        };
    }

    static createRiskAssessment(overrides: any = {}) {
        return {
            riskLevel: 'low',
            riskFactors: [],
            score: 20,
            recommendedActions: ['Standard monitoring'],
            assessedAt: new Date(),
            ...overrides
        };
    }
}
