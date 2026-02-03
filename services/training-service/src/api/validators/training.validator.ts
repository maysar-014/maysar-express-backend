export class TrainingValidator {
    public static validateStartRequest(body: any): { valid: boolean; errors?: string[] } {
        const errors: string[] = [];
        if (!body.learnerId) errors.push('learnerId is required');
        if (!body.learnerRole) errors.push('learnerRole is required');
        if (!body.moduleId) errors.push('moduleId is required');
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
        if (!params[paramName]) {
            errors.push(`${paramName} is required`);
        }
        // Basic UUID-ish check or just presence check
        return { valid: errors.length === 0, errors };
    }
}
