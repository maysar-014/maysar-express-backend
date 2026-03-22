import { ITrainingModuleRepository } from '../../domain/repositories/training-module.repository';
import { TrainingModule, ContentType, DifficultyLevel } from '../../domain/entities/training-module.entity';
import { TrainingModuleMapper } from '../../application/mappers/training-module.mapper';

interface TrainingModuleDelegate {
    findMany(args?: Record<string, unknown>): Promise<unknown[]>;
    findUnique(args: Record<string, unknown>): Promise<unknown | null>;
}

interface TrainingModulePrisma {
    trainingModule?: TrainingModuleDelegate;
    training_TrainingModule?: TrainingModuleDelegate;
}

export class PrismaTrainingModuleRepository implements ITrainingModuleRepository {
    constructor(private readonly prisma: TrainingModulePrisma) { }

    private warnedMissingDelegate = false;
    private readonly fallbackModules = new Map<string, TrainingModule>();

    private warnMissingDelegate(message: string): void {
        if (this.warnedMissingDelegate) return;
        this.warnedMissingDelegate = true;
        console.warn(message);
    }

    private getFallbackModule(id: string): TrainingModule {
        const key = id || 'module-default';
        const existing = this.fallbackModules.get(key);
        if (existing) return existing;

        const module = TrainingModule.create({
            id: key,
            name: 'Getting Started',
            description: 'Fallback training module (in-memory)',
            contentType: ContentType.TEXT,
            content: {
                type: ContentType.TEXT,
                body: 'Training content is unavailable; using fallback module.'
            },
            durationMinutes: 15,
            category: 'general',
            prerequisites: [],
            targetRoles: [],
            isPublic: true,
            difficulty: DifficultyLevel.BEGINNER
        });

        this.fallbackModules.set(key, module);
        return module;
    }

    private listFallbackModules(): TrainingModule[] {
        if (this.fallbackModules.size === 0) {
            this.getFallbackModule('module-default');
        }
        return Array.from(this.fallbackModules.values());
    }

    public async findAll(): Promise<TrainingModule[]> {
        const delegate = this.moduleDelegate;
        if (!delegate) {
            return this.listFallbackModules();
        }

        try {
            const modules = await delegate.findMany();
            return modules.map((module: unknown) => TrainingModuleMapper.toDomain(module));
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Module delegate failed; using fallback modules.');
                return this.listFallbackModules();
            }
            throw error;
        }
    }

    public async findById(id: string): Promise<TrainingModule | null> {
        const delegate = this.moduleDelegate;
        if (!delegate) {
            return this.getFallbackModule(id);
        }

        try {
            const module = await delegate.findUnique({
                where: { id }
            });
            return module ? TrainingModuleMapper.toDomain(module) : null;
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Module lookup failed; using fallback module.');
                return this.getFallbackModule(id);
            }
            throw error;
        }
    }

    public async findByCategory(category: string): Promise<TrainingModule[]> {
        const delegate = this.moduleDelegate;
        if (!delegate) {
            return this.listFallbackModules().filter((module) => module.category === category);
        }

        try {
            const modules = await delegate.findMany({
                where: { category }
            });
            return modules.map((module: unknown) => TrainingModuleMapper.toDomain(module));
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Module category lookup failed; using fallback modules.');
                return this.listFallbackModules().filter((module) => module.category === category);
            }
            throw error;
        }
    }

    public async findWithPrerequisites(): Promise<TrainingModule[]> {
        const delegate = this.moduleDelegate;
        if (!delegate) {
            return this.listFallbackModules().filter((module) => module.prerequisites.length > 0);
        }

        try {
            const modules = await delegate.findMany({
                where: {
                    prerequisites: {
                        isEmpty: false
                    }
                }
            });
            return modules.map((module: unknown) => TrainingModuleMapper.toDomain(module));
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Module prerequisites lookup failed; using fallback modules.');
                return this.listFallbackModules().filter((module) => module.prerequisites.length > 0);
            }
            throw error;
        }
    }

    public async findAvailable(role: string): Promise<TrainingModule[]> {
        const delegate = this.moduleDelegate;
        if (!delegate) {
            return this.listFallbackModules();
        }

        try {
            const modules = await delegate.findMany({
                where: {
                    OR: [
                        { isPublic: true },
                        { targetRoles: { has: role } }
                    ]
                }
            });
            return modules.map((module: unknown) => TrainingModuleMapper.toDomain(module));
        } catch (error) {
            if (process.env.NODE_ENV !== 'production') {
                this.warnMissingDelegate('[training] Module availability lookup failed; using fallback modules.');
                return this.listFallbackModules();
            }
            throw error;
        }
    }

    private get moduleDelegate(): TrainingModuleDelegate | null {
        const delegate = this.prisma.training_TrainingModule ?? this.prisma.trainingModule;
        if (!delegate) {
            this.warnMissingDelegate('[training] Module delegate is not configured on prisma client; using fallback.');
            return null;
        }
        return delegate;
    }
}
