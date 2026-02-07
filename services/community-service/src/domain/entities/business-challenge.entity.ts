export enum ChallengeStatus {
    PROPOSED = 'PROPOSED',
    OPEN = 'OPEN',
    IN_PROGRESS = 'IN_PROGRESS',
    SOLVED = 'SOLVED',
    ARCHIVED = 'ARCHIVED',
}

export interface SuccessCriteria {
    description: string;
    measurable: boolean;
    targetValue?: string;
}

export interface BusinessChallengeProps {
    id: string;
    proposerId: string;
    title: string;
    description: string;
    category: string;
    industryTags: string[];
    constraints: string[];
    successCriteria: SuccessCriteria[];
    status: ChallengeStatus;
    deadline?: Date;
    acceptedSolutionId?: string;
    collaborators: string[];
    createdAt: Date;
    updatedAt: Date;
    solvedAt?: Date;
}

export class BusinessChallenge {
    private props: BusinessChallengeProps;

    constructor(props: BusinessChallengeProps) {
        this.props = props;
        this.validate();
    }

    private validate(): void {
        if (!this.props.title || this.props.title.trim().length === 0) {
            throw new Error('Challenge must have a title');
        }

        if (this.props.title.length > 200) {
            throw new Error('Title must not exceed 200 characters');
        }

        if (!this.props.description || this.props.description.trim().length < 100) {
            throw new Error('Description must be at least 100 characters');
        }

        if (!this.props.category) {
            throw new Error('Challenge must have a category');
        }

        if (!this.props.successCriteria || this.props.successCriteria.length === 0) {
            throw new Error('Challenge must have at least one success criterion');
        }

        if (this.props.deadline && this.props.deadline < new Date()) {
            throw new Error('Deadline cannot be in the past');
        }
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get proposerId(): string {
        return this.props.proposerId;
    }

    get title(): string {
        return this.props.title;
    }

    get description(): string {
        return this.props.description;
    }

    get category(): string {
        return this.props.category;
    }

    get industryTags(): string[] {
        return [...this.props.industryTags];
    }

    get constraints(): string[] {
        return [...this.props.constraints];
    }

    get successCriteria(): SuccessCriteria[] {
        return [...this.props.successCriteria];
    }

    get status(): ChallengeStatus {
        return this.props.status;
    }

    get deadline(): Date | undefined {
        return this.props.deadline;
    }

    get acceptedSolutionId(): string | undefined {
        return this.props.acceptedSolutionId;
    }

    get collaborators(): string[] {
        return [...this.props.collaborators];
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    get solvedAt(): Date | undefined {
        return this.props.solvedAt;
    }

    // Business methods
    approve(): void {
        if (this.props.status !== ChallengeStatus.PROPOSED) {
            throw new Error('Can only approve PROPOSED challenges');
        }

        this.props.status = ChallengeStatus.OPEN;
        this.props.updatedAt = new Date();
    }

    startProgress(): void {
        if (this.props.status !== ChallengeStatus.OPEN) {
            throw new Error('Can only start progress on OPEN challenges');
        }

        this.props.status = ChallengeStatus.IN_PROGRESS;
        this.props.updatedAt = new Date();
    }

    markSolved(solutionId: string): void {
        if (this.props.status !== ChallengeStatus.IN_PROGRESS &&
            this.props.status !== ChallengeStatus.OPEN) {
            throw new Error('Can only mark OPEN or IN_PROGRESS challenges as solved');
        }

        this.props.status = ChallengeStatus.SOLVED;
        this.props.acceptedSolutionId = solutionId;
        this.props.solvedAt = new Date();
        this.props.updatedAt = new Date();
    }

    archive(): void {
        if (this.props.status === ChallengeStatus.ARCHIVED) {
            throw new Error('Challenge is already archived');
        }

        this.props.status = ChallengeStatus.ARCHIVED;
        this.props.updatedAt = new Date();
    }

    addCollaborator(userId: string): void {
        if (this.props.status === ChallengeStatus.ARCHIVED ||
            this.props.status === ChallengeStatus.SOLVED) {
            throw new Error('Cannot add collaborators to ARCHIVED or SOLVED challenges');
        }

        if (this.props.collaborators.includes(userId)) {
            throw new Error('User is already a collaborator');
        }

        this.props.collaborators.push(userId);
        this.props.updatedAt = new Date();
    }

    removeCollaborator(userId: string): void {
        if (!this.props.collaborators.includes(userId)) {
            throw new Error('User is not a collaborator');
        }

        this.props.collaborators = this.props.collaborators.filter(id => id !== userId);
        this.props.updatedAt = new Date();
    }

    addSuccessCriterion(criterion: SuccessCriteria): void {
        if (this.props.status !== ChallengeStatus.PROPOSED) {
            throw new Error('Can only add success criteria to PROPOSED challenges');
        }

        this.props.successCriteria.push(criterion);
        this.props.updatedAt = new Date();
    }

    addConstraint(constraint: string): void {
        if (this.props.status !== ChallengeStatus.PROPOSED) {
            throw new Error('Can only add constraints to PROPOSED challenges');
        }

        if (this.props.constraints.includes(constraint)) {
            return;
        }

        this.props.constraints.push(constraint);
        this.props.updatedAt = new Date();
    }

    updateDeadline(deadline: Date): void {
        if (this.props.status === ChallengeStatus.SOLVED ||
            this.props.status === ChallengeStatus.ARCHIVED) {
            throw new Error('Cannot update deadline for SOLVED or ARCHIVED challenges');
        }

        if (deadline < new Date()) {
            throw new Error('Deadline cannot be in the past');
        }

        this.props.deadline = deadline;
        this.props.updatedAt = new Date();
    }

    isExpired(): boolean {
        if (!this.props.deadline) {
            return false;
        }

        return this.props.deadline < new Date() &&
            this.props.status !== ChallengeStatus.SOLVED;
    }

    canUserCollaborate(userId: string): boolean {
        if (this.props.status === ChallengeStatus.ARCHIVED ||
            this.props.status === ChallengeStatus.SOLVED) {
            return false;
        }

        if (userId === this.props.proposerId) {
            return true;
        }

        return this.props.status === ChallengeStatus.OPEN ||
            this.props.status === ChallengeStatus.IN_PROGRESS;
    }

    toJSON(): BusinessChallengeProps {
        return { ...this.props };
    }

    static create(params: {
        id: string;
        proposerId: string;
        title: string;
        description: string;
        category: string;
        industryTags: string[];
        constraints: string[];
        successCriteria: SuccessCriteria[];
        deadline?: Date;
    }): BusinessChallenge {
        return new BusinessChallenge({
            ...params,
            status: ChallengeStatus.PROPOSED,
            collaborators: [],
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
}
