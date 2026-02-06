export enum ContentType {
    TEXT = 'TEXT',
    VIDEO = 'VIDEO',
    INTERACTIVE = 'INTERACTIVE'
}

export interface TrainingContent {
    type: ContentType;
    body?: string; // Markdown or rich text
    url?: string; // Video or external resource URL
    duration?: number; // In seconds, for video
    metadata?: Record<string, any>;
}

export enum DifficultyLevel {
    BEGINNER = 'BEGINNER',
    INTERMEDIATE = 'INTERMEDIATE',
    ADVANCED = 'ADVANCED'
}

export interface TrainingModuleProps {
    id: string;
    name: string;
    description: string;
    contentType: ContentType;
    content: TrainingContent;
    durationMinutes: number;
    category: string;
    prerequisites: string[]; // List of module IDs (soft recommendations)
    targetRoles: string[]; // Empty array means available to all roles
    isPublic: boolean; // Default true for universal accessibility
    difficulty: DifficultyLevel;
}

export class TrainingModule {
    private constructor(private readonly props: TrainingModuleProps) { }

    public static create(props: TrainingModuleProps): TrainingModule {
        return new TrainingModule(props);
    }

    get id(): string { return this.props.id; }
    get name(): string { return this.props.name; }
    get description(): string { return this.props.description; }
    get contentType(): ContentType { return this.props.contentType; }
    get content(): TrainingContent { return this.props.content; }
    get durationMinutes(): number { return this.props.durationMinutes; }
    get category(): string { return this.props.category; }
    get prerequisites(): string[] { return this.props.prerequisites; }
    get targetRoles(): string[] { return this.props.targetRoles; }
    get isPublic(): boolean { return this.props.isPublic; }
    get difficulty(): DifficultyLevel { return this.props.difficulty; }

    public hasPrerequisites(): boolean {
        return this.props.prerequisites.length > 0;
    }

    public isTargetedForRole(role: string): boolean {
        // Empty targetRoles means available to all
        return this.props.targetRoles.length === 0 || this.props.targetRoles.includes(role);
    }

    public validatePrerequisites(completedModuleIds: string[]): boolean {
        // Returns true if prerequisites are met (informational, not blocking)
        return this.props.prerequisites.every(prereqId => completedModuleIds.includes(prereqId));
    }

    public getMissingPrerequisites(completedModuleIds: string[]): string[] {
        return this.props.prerequisites.filter(prereqId => !completedModuleIds.includes(prereqId));
    }
}

