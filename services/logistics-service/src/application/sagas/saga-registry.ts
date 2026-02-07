import { DistributedSagaOrchestrator } from '../../../../../shared/saga/saga.orchestrator';

export class SagaRegistry {
  private static instance: SagaRegistry;
  private orchestrators: Map<string, DistributedSagaOrchestrator> = new Map();

  private constructor() { }

  static getInstance(): SagaRegistry {
    if (!SagaRegistry.instance) {
      SagaRegistry.instance = new SagaRegistry();
    }
    return SagaRegistry.instance;
  }

  registerOrchestrator(name: string, orchestrator: DistributedSagaOrchestrator): void {
    this.orchestrators.set(name, orchestrator);
  }

  async startSaga<T>(name: string, payload: T, correlationId?: string): Promise<string> {
    const orchestrator = this.orchestrators.get(name);
    if (!orchestrator) {
      throw new Error(`Saga orchestrator not found: ${name}`);
    }

    return await orchestrator.start(payload, correlationId);
  }

  getOrchestrator<T extends DistributedSagaOrchestrator>(name: string): T | null {
    return (this.orchestrators.get(name) as T) || null;
  }

  listSagas(): string[] {
    return Array.from(this.orchestrators.keys());
  }

  isSagaRegistered(name: string): boolean {
    return this.orchestrators.has(name);
  }

  getSagaCount(): number {
    return this.orchestrators.size;
  }

  clearRegistry(): void {
    this.orchestrators.clear();
  }
}

// Global saga registry instance
export const sagaRegistry = SagaRegistry.getInstance();

