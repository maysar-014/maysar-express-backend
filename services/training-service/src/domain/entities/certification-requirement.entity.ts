export interface CertificationRequirementProps {
    module: string;
    minimumScore: number;
    validityPeriodDays: number;
    mandatory: boolean;
    maxAttempts: number;
}

export class CertificationRequirement {
    private constructor(private readonly props: CertificationRequirementProps) { }

    public static create(props: CertificationRequirementProps): CertificationRequirement {
        return new CertificationRequirement(props);
    }

    get module(): string { return this.props.module; }
    get minimumScore(): number { return this.props.minimumScore; }
    get validityPeriodDays(): number { return this.props.validityPeriodDays; }
    get mandatory(): boolean { return this.props.mandatory; }
    get maxAttempts(): number { return this.props.maxAttempts; }

    public isPassingScore(score: number): boolean {
        return score >= this.props.minimumScore;
    }

    public calculateExpirationDate(fromDate: Date = new Date()): Date {
        const expirationDate = new Date(fromDate);
        expirationDate.setDate(expirationDate.getDate() + this.props.validityPeriodDays);
        return expirationDate;
    }

    public isMandatory(): boolean {
        return this.props.mandatory;
    }
}
