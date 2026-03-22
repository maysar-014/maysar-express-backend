export class TrainingValidator {
    private static isNonEmptyString(value: unknown): value is string {
        return typeof value === 'string' && value.trim().length > 0;
    }

    public static validateStartRequest(body: any): { valid: boolean; errors?: string[] } {
        const errors: string[] = [];
        if (!TrainingValidator.isNonEmptyString(body?.learnerId)) errors.push('learnerId is required');
        if (!TrainingValidator.isNonEmptyString(body?.learnerRole)) errors.push('learnerRole is required');
        if (!TrainingValidator.isNonEmptyString(body?.moduleId)) errors.push('moduleId is required');
        return { valid: errors.length === 0, errors };
    }

    public static validateCompleteRequest(body: any): { valid: boolean; errors?: string[] } {
        const errors: string[] = [];
        if (body.score === undefined) errors.push('score is required');
        if (typeof body.score !== 'number' || body.score < 0 || body.score > 100) {
            errors.push('score must be a number between 0 and 100');
        }
        return { valid: errors.length === 0, errors };
    }

    public static validateIdParam(params: any, paramName: string = 'id'): { valid: boolean; errors?: string[] } {
        const errors: string[] = [];
        if (!TrainingValidator.isNonEmptyString(params?.[paramName])) {
            errors.push(`${paramName} is required`);
        }
        // Basic UUID-ish check or just presence check
        return { valid: errors.length === 0, errors };
    }

    public static validateTrackProgressRequest(body: any): { valid: boolean; errors?: string[] } {
        const errors: string[] = [];

        if (body === undefined || body === null) {
            return { valid: true };
        }

        if (typeof body !== 'object' || Array.isArray(body)) {
            errors.push('progress payload must be an object');
            return { valid: false, errors };
        }

        if (
            body.completionPercentage !== undefined
            && (
                typeof body.completionPercentage !== 'number'
                || body.completionPercentage < 0
                || body.completionPercentage > 100
            )
        ) {
            errors.push('completionPercentage must be a number between 0 and 100');
        }

        if (
            body.lastModuleSection !== undefined
            && !TrainingValidator.isNonEmptyString(body.lastModuleSection)
        ) {
            errors.push('lastModuleSection must be a non-empty string');
        }

        if (
            body.metadata !== undefined
            && (typeof body.metadata !== 'object' || body.metadata === null || Array.isArray(body.metadata))
        ) {
            errors.push('metadata must be an object');
        }

        return { valid: errors.length === 0, errors };
    }
}
