import { DistributedSagaOrchestrator } from './saga.orchestrator';
import { ISagaLogRepository } from './saga.log';

export interface SagaDependencies {
    sagaLogRepository: ISagaLogRepository;
    serviceName: string;
    outbox?: any;
}

export class SagaFactory {
    private static instances: Map<string, DistributedSagaOrchestrator> = new Map();

    static create<T extends DistributedSagaOrchestrator>(
        SagaClass: new (deps: SagaDependencies) => T,
        deps: SagaDependencies
    ): T {
        const key = `${deps.serviceName}-${SagaClass.name}`;
        if (!this.instances.has(key)) {
            this.instances.set(key, new SagaClass(deps));
        }
        return this.instances.get(key) as T;
    }

    /**
     * Returns the internal orchestrator registry map.
     * Used by SagaRecoveryWorker to look up orchestrators by saga type.
     */
    static getRegistry(): Map<string, DistributedSagaOrchestrator> {
        return this.instances;
    }

    /**
     * Clear instances (useful for testing)
     */
    static clear(): void {
        this.instances.clear();
    }
}
