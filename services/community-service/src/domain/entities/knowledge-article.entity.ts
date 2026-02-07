export enum ReviewStatus {
    DRAFT = 'DRAFT',
    PENDING_REVIEW = 'PENDING_REVIEW',
    IN_REVIEW = 'IN_REVIEW',
    APPROVED = 'APPROVED',
    REJECTED = 'REJECTED',
    PUBLISHED = 'PUBLISHED',
}

export interface ArticleSection {
    heading: string;
    content: string;
    order: number;
}

export interface KnowledgeArticleProps {
    id: string;
    authorId: string;
    title: string;
    summary: string;
    sections: ArticleSection[];
    category: string;
    industryTags: string[];
    expertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    reviewStatus: ReviewStatus;
    qualityScore: number;
    version: number;
    trainingModuleId?: string;
    publishedAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}

export class KnowledgeArticle {
    private props: KnowledgeArticleProps;

    constructor(props: KnowledgeArticleProps) {
        this.props = props;
        this.validate();
    }

    private validate(): void {
        if (!this.props.title || this.props.title.trim().length === 0) {
            throw new Error('Article must have a title');
        }

        if (this.props.title.length > 200) {
            throw new Error('Title must not exceed 200 characters');
        }

        if (!this.props.summary || this.props.summary.trim().length < 50) {
            throw new Error('Summary must be at least 50 characters');
        }

        if (this.props.summary.length > 500) {
            throw new Error('Summary must not exceed 500 characters');
        }

        if (!this.props.sections || this.props.sections.length === 0) {
            throw new Error('Article must have at least one section');
        }

        if (!this.props.category) {
            throw new Error('Article must have a category');
        }

        if (this.props.qualityScore < 0 || this.props.qualityScore > 100) {
            throw new Error('Quality score must be between 0 and 100');
        }

        if (this.props.version < 1) {
            throw new Error('Version must be at least 1');
        }

        // Validate sections
        const orders = this.props.sections.map(s => s.order);
        const uniqueOrders = new Set(orders);
        if (orders.length !== uniqueOrders.size) {
            throw new Error('Section orders must be unique');
        }
    }

    // Getters
    get id(): string {
        return this.props.id;
    }

    get authorId(): string {
        return this.props.authorId;
    }

    get title(): string {
        return this.props.title;
    }

    get summary(): string {
        return this.props.summary;
    }

    get sections(): ArticleSection[] {
        return [...this.props.sections].sort((a, b) => a.order - b.order);
    }

    get category(): string {
        return this.props.category;
    }

    get industryTags(): string[] {
        return [...this.props.industryTags];
    }

    get expertiseLevel(): string {
        return this.props.expertiseLevel;
    }

    get reviewStatus(): ReviewStatus {
        return this.props.reviewStatus;
    }

    get qualityScore(): number {
        return this.props.qualityScore;
    }

    get version(): number {
        return this.props.version;
    }

    get trainingModuleId(): string | undefined {
        return this.props.trainingModuleId;
    }

    get publishedAt(): Date | undefined {
        return this.props.publishedAt;
    }

    get createdAt(): Date {
        return this.props.createdAt;
    }

    get updatedAt(): Date {
        return this.props.updatedAt;
    }

    get isPublished(): boolean {
        return this.props.reviewStatus === ReviewStatus.PUBLISHED;
    }

    get isDraft(): boolean {
        return this.props.reviewStatus === ReviewStatus.DRAFT;
    }

    // Business methods
    submitForReview(): void {
        if (this.props.reviewStatus !== ReviewStatus.DRAFT) {
            throw new Error('Can only submit DRAFT articles for review');
        }

        this.props.reviewStatus = ReviewStatus.PENDING_REVIEW;
        this.props.updatedAt = new Date();
    }

    startReview(): void {
        if (this.props.reviewStatus !== ReviewStatus.PENDING_REVIEW) {
            throw new Error('Can only start review on PENDING_REVIEW articles');
        }

        this.props.reviewStatus = ReviewStatus.IN_REVIEW;
        this.props.updatedAt = new Date();
    }

    approve(qualityScore: number): void {
        if (this.props.reviewStatus !== ReviewStatus.IN_REVIEW) {
            throw new Error('Can only approve articles IN_REVIEW');
        }

        if (qualityScore < 0 || qualityScore > 100) {
            throw new Error('Quality score must be between 0 and 100');
        }

        this.props.reviewStatus = ReviewStatus.APPROVED;
        this.props.qualityScore = qualityScore;
        this.props.updatedAt = new Date();
    }

    reject(reason: string): void {
        if (this.props.reviewStatus !== ReviewStatus.IN_REVIEW) {
            throw new Error('Can only reject articles IN_REVIEW');
        }

        if (!reason || reason.trim().length === 0) {
            throw new Error('Rejection must include a reason');
        }

        this.props.reviewStatus = ReviewStatus.REJECTED;
        this.props.updatedAt = new Date();
    }

    publish(): void {
        if (this.props.reviewStatus !== ReviewStatus.APPROVED) {
            throw new Error('Can only publish APPROVED articles');
        }

        this.props.reviewStatus = ReviewStatus.PUBLISHED;
        this.props.publishedAt = new Date();
        this.props.updatedAt = new Date();
    }

    revertToDraft(): void {
        if (this.props.reviewStatus === ReviewStatus.PUBLISHED) {
            throw new Error('Cannot revert published articles to draft');
        }

        this.props.reviewStatus = ReviewStatus.DRAFT;
        this.props.updatedAt = new Date();
    }

    updateContent(params: {
        title?: string;
        summary?: string;
        sections?: ArticleSection[];
        industryTags?: string[];
    }): void {
        if (this.props.reviewStatus !== ReviewStatus.DRAFT &&
            this.props.reviewStatus !== ReviewStatus.REJECTED) {
            throw new Error('Can only update DRAFT or REJECTED articles');
        }

        if (params.title !== undefined) {
            this.props.title = params.title;
        }

        if (params.summary !== undefined) {
            this.props.summary = params.summary;
        }

        if (params.sections !== undefined) {
            this.props.sections = params.sections;
        }

        if (params.industryTags !== undefined) {
            this.props.industryTags = params.industryTags;
        }

        this.props.version += 1;
        this.props.updatedAt = new Date();
        this.validate();
    }

    linkToTrainingModule(moduleId: string): void {
        if (!this.isPublished) {
            throw new Error('Can only link published articles to training modules');
        }

        this.props.trainingModuleId = moduleId;
        this.props.updatedAt = new Date();
    }

    addSection(heading: string, content: string): void {
        if (this.props.reviewStatus !== ReviewStatus.DRAFT) {
            throw new Error('Can only add sections to DRAFT articles');
        }

        const maxOrder = Math.max(...this.props.sections.map(s => s.order), 0);

        this.props.sections.push({
            heading,
            content,
            order: maxOrder + 1,
        });

        this.props.updatedAt = new Date();
    }

    updateSection(order: number, params: { heading?: string; content?: string }): void {
        if (this.props.reviewStatus !== ReviewStatus.DRAFT) {
            throw new Error('Can only update sections in DRAFT articles');
        }

        const section = this.props.sections.find(s => s.order === order);
        if (!section) {
            throw new Error(`Section with order ${order} not found`);
        }

        if (params.heading !== undefined) {
            section.heading = params.heading;
        }

        if (params.content !== undefined) {
            section.content = params.content;
        }

        this.props.updatedAt = new Date();
    }

    removeSection(order: number): void {
        if (this.props.reviewStatus !== ReviewStatus.DRAFT) {
            throw new Error('Can only remove sections from DRAFT articles');
        }

        this.props.sections = this.props.sections.filter(s => s.order !== order);

        if (this.props.sections.length === 0) {
            throw new Error('Article must have at least one section');
        }

        this.props.updatedAt = new Date();
    }

    meetsQualityThreshold(threshold: number): boolean {
        return this.props.qualityScore >= threshold;
    }

    toJSON(): KnowledgeArticleProps {
        return { ...this.props };
    }

    static create(params: {
        id: string;
        authorId: string;
        title: string;
        summary: string;
        sections: ArticleSection[];
        category: string;
        industryTags: string[];
        expertiseLevel: 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED' | 'EXPERT';
    }): KnowledgeArticle {
        return new KnowledgeArticle({
            ...params,
            reviewStatus: ReviewStatus.DRAFT,
            qualityScore: 0,
            version: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
        });
    }
}
