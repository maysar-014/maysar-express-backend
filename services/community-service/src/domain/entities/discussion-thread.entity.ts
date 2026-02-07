export enum ThreadStatus {
    OPEN = 'OPEN',
    ACTIVE = 'ACTIVE',
    RESOLVED = 'RESOLVED',
    CLOSED = 'CLOSED',
}

export enum ExpertiseLevel {
    BEGINNER = 'BEGINNER',
    INTERMEDIATE = 'INTERMEDIATE',
    ADVANCED = 'ADVANCED',
    EXPERT = 'EXPERT',
}

export interface BusinessContext {
    industry: string[];
    businessStage: string;
    tags: string[];
}

export interface DiscussionThreadProps {
    id: string;
    authorId: string;
    topic: string;
    content: string;
    category: string;
    status: ThreadStatus;
    expertiseLevel: ExpertiseLevel;
    businessContext: BusinessContext;
    maxResponsesPerUser: number;
    acceptedAnswerId?: string;
    resolvedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export class DiscussionThread {
    private props: DiscussionThreadProps;

    constructor(props: DiscussionThreadProps) {
        this.props = props;
        this.validate();
    }

    private validate(): void {
        if (!this.props.topic || this.props.topic.trim().length === 0) {
            throw new Error('Discussion thread must have a topic');
        }

        if (this.props.topic.length > 200) {
            throw new Error('Topic must not exceed 200 characters');
        }

        if (!this.props.content || this.props.content.trim().length < 50) {
            throw new Error('Content must be at least 50 characters');
        }

        if (!this.props.category || this.props.category.trim().length === 0) {
            throw new Error('Discussion thread must have a category');
        }

        if (this.props.maxResponsesPerUser < 1) {
            throw new Error('Max responses per user must be at least 1');
        }

        if (!this.props.businessContext.industry || this.props.businessContext.industry.length === 0) {
            throw new Error('Business context must include at least one industry');
        }
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get authorId(): string {
        return this.props.authorId;
    }

    get topic(): string {
        return this.props.topic;
    }

    get content(): string {
        return this.props.content;
    }

    get category(): string {
        return this.props.category;
    }

    get status(): ThreadStatus {
        return this.props.status;
    }

    get expertiseLevel(): ExpertiseLevel {
        return this.props.expertiseLevel;
    }

    get businessContext(): BusinessContext {
        return this.props.businessContext;
    }

    get maxResponsesPerUser(): number {
        return this.props.maxResponsesPerUser;
    }

    get acceptedAnswerId(): string | undefined {
        return this.props.acceptedAnswerId;
    }

    get resolvedAt(): Date | undefined {
        return this.props.resolvedAt;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    // Business methods
    activate(): void {
        if (this.props.status !== ThreadStatus.OPEN) {
            throw new Error('Only OPEN threads can be activated');
        }
        this.props.status = ThreadStatus.ACTIVE;
        this.props.updatedAt = new Date();
    }

    resolve(acceptedAnswerId?: string): void {
        if (this.props.status === ThreadStatus.CLOSED) {
            throw new Error('Cannot resolve a CLOSED thread');
        }

        this.props.status = ThreadStatus.RESOLVED;
        this.props.resolvedAt = new Date();
        this.props.updatedAt = new Date();

        if (acceptedAnswerId) {
            this.props.acceptedAnswerId = acceptedAnswerId;
        }
    }

    close(): void {
        if (this.props.status === ThreadStatus.CLOSED) {
            throw new Error('Thread is already closed');
        }

        this.props.status = ThreadStatus.CLOSED;
        this.props.updatedAt = new Date();
    }

    acceptAnswer(answerId: string): void {
        if (this.props.status === ThreadStatus.CLOSED) {
            throw new Error('Cannot accept answer on a CLOSED thread');
        }

        this.props.acceptedAnswerId = answerId;
        this.props.status = ThreadStatus.RESOLVED;
        this.props.resolvedAt = new Date();
        this.props.updatedAt = new Date();
    }

    reopen(): void {
        if (this.props.status !== ThreadStatus.RESOLVED && this.props.status !== ThreadStatus.CLOSED) {
            throw new Error('Can only reopen RESOLVED or CLOSED threads');
        }

        this.props.status = ThreadStatus.ACTIVE;
        this.props.acceptedAnswerId = undefined;
        this.props.resolvedAt = undefined;
        this.props.updatedAt = new Date();
    }

    canUserRespond(userId: string, currentResponseCount: number): boolean {
        if (this.props.status === ThreadStatus.CLOSED) {
            return false;
        }

        if (userId === this.props.authorId) {
            return true; // Author can always respond
        }

        return currentResponseCount < this.props.maxResponsesPerUser;
    }

    toJSON(): DiscussionThreadProps {
        return { ...this.props };
    }

    static create(params: {
        id: string;
        authorId: string;
        topic: string;
        content: string;
        category: string;
        expertiseLevel: ExpertiseLevel;
        businessContext: BusinessContext;
        maxResponsesPerUser?: number;
    }): DiscussionThread {
        return new DiscussionThread({
            ...params,
            status: ThreadStatus.OPEN,
            maxResponsesPerUser: params.maxResponsesPerUser || 5,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
}
