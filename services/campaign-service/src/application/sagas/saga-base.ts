export interface Saga {
    readonly sagaId: string;
    readonly sagaType: string;
    start(context: any): Promise<void>;
    handleEvent(event: any): Promise<void>;
    getState(): any;
    isCompleted(): boolean;
    compensate(): Promise<void>;
}

export abstract class BaseSaga implements Saga {
    abstract readonly sagaId: string;
    abstract readonly sagaType: string;

    protected state: any = {};
    protected steps: Array<{
        id: string;
        operation: () => Promise<any>;
        compensation: () => Promise<void>;
        completed: boolean;
        compensated: boolean;
    }> = [];

    async start(context: any): Promise<void> {
        this.initializeState(context);
        await this.executeNextStep();
    }

    async handleEvent(event: any): Promise<void> {
        await this.processEvent(event);
    }

    getState(): any {
        return { ...this.state };
    }

    isCompleted(): boolean {
        return this.steps.every(step => step.completed);
    }

    async compensate(): Promise<void> {
        for (let i = this.steps.length - 1; i >= 0; i--) {
            const step = this.steps[i];
            if (step.completed && !step.compensated) {
                await step.compensation();
                step.compensated = true;
            }
        }
    }

    protected abstract initializeState(context: any): void;
    protected abstract executeNextStep(): Promise<void>;
    protected abstract processEvent(event: any): Promise<void>;

    protected addStep(id: string, operation: () => Promise<any>, compensation: () => Promise<void>): void {
        this.steps.push({
            id,
            operation,
            compensation,
            completed: false,
            compensated: false
        });
    }

    protected markStepCompleted(stepId: string): void {
        const step = this.steps.find(s => s.id === stepId);
        if (step) {
            step.completed = true;
        }
    }
}
