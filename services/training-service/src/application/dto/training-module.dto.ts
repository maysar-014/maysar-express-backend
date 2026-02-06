export class TrainingModuleDTO {
    id!: string;
    name!: string;
    description!: string;
    contentType!: string;
    content!: any;
    durationMinutes!: number;
    category!: string;
    prerequisites!: string[];
    targetRoles!: string[];
    isPublic!: boolean;
    difficulty!: string;
}
