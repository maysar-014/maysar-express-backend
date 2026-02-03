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

export interface TrainingModuleProps {
    id: string;
    name: string;
    description: string;
    contentType: ContentType;
    content: TrainingContent;
    durationMinutes: number;
    category: string;
    prerequisites: string[]; // List of module IDs
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

    public hasPrerequisites(): boolean {
        return this.props.prerequisites.length > 0;
    }

    public validatePrerequisites(completedModuleIds: string[]): boolean {
        return this.props.prerequisites.every(prereqId => completedModuleIds.includes(prereqId));
    }
}
