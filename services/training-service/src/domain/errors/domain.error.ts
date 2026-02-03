export abstract class DomainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Error.captureStackTrace(this, this.constructor);
    }
}

export class NotFoundError extends DomainError {
    constructor(resource: string, identifier: string) {
        super(`${resource} with identifier ${identifier} was not found`);
    }
}

export class BusinessRuleError extends DomainError {
    constructor(message: string) {
        super(message);
    }
}

export class ValidationError extends DomainError {
    public readonly errors: string[];

    constructor(errors: string[]) {
        super('Validation failed');
        this.errors = errors;
    }
}
