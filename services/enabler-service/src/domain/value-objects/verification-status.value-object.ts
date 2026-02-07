/**
 * Value Object for Verification Status
 */
export class VerificationStatus {
    private static readonly VALID_STATUSES = ['unverified', 'pending', 'verified', 'rejected'];

    private constructor(private readonly status: string) {
        this.validate(status);
    }

    static create(status: string): VerificationStatus {
        return new VerificationStatus(status);
    }

    static unverified(): VerificationStatus {
        return new VerificationStatus('unverified');
    }

    static pending(): VerificationStatus {
        return new VerificationStatus('pending');
    }

    static verified(): VerificationStatus {
        return new VerificationStatus('verified');
    }

    static rejected(): VerificationStatus {
        return new VerificationStatus('rejected');
    }

    private validate(status: string): void {
        if (!VerificationStatus.VALID_STATUSES.includes(status)) {
            throw new Error(`Invalid verification status: ${status}`);
        }
    }

    getValue(): string {
        return this.status;
    }

    isUnverified(): boolean {
        return this.status === 'unverified';
    }

    isPending(): boolean {
        return this.status === 'pending';
    }

    isVerified(): boolean {
        return this.status === 'verified';
    }

    isRejected(): boolean {
        return this.status === 'rejected';
    }

    canTransitionTo(newStatus: string): boolean {
        // Define valid state transitions
        const transitions: Record<string, string[]> = {
            'unverified': ['pending'],
            'pending': ['verified', 'rejected'],
            'verified': ['pending'], // Can re-verify
            'rejected': ['pending'], // Can re-apply
        };

        return transitions[this.status]?.includes(newStatus) || false;
    }

    equals(other: VerificationStatus): boolean {
        return this.status === other.status;
    }

    toString(): string {
        return this.status;
    }
}
