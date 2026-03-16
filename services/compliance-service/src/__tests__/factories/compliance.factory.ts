import { getModelPrefix, makeId } from '@shared/ids/id';

export class ComplianceFactory {
    static createSubjectRightsRequest(overrides: any = {}) {
        return {
            id: makeId(getModelPrefix('Compliance_SubjectRightsRequest')),
            userId: makeId(getModelPrefix('User_User')),
            requestType: 'access',
            status: 'pending',
            requestedAt: new Date(),
            ...overrides
        };
    }

    static createKYCRecord(overrides: any = {}) {
        return {
            id: makeId(getModelPrefix('Compliance_KYCRecord')),
            userId: makeId(getModelPrefix('User_User')),
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
