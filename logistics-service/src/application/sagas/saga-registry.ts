import { BaseSaga } from './base.saga';

export class SagaRegistry {
  private static instance: SagaRegistry;
  private sagas: Map<string, new () => BaseSaga> = new Map();

  private constructor() {}

  static getInstance(): SagaRegistry {
    if (!SagaRegistry.instance) {
      SagaRegistry.instance = new SagaRegistry();
    }
    return SagaRegistry.instance;
  }

  registerSaga<T extends BaseSaga>(name: string, sagaClass: new () => T): void {
    this.sagas.set(name, sagaClass);
  }

  async executeSaga<T>(name: string, data: T, metadata: any = {}): Promise<string> {
    const SagaClass = this.sagas.get(name);
    if (!SagaClass) {
      throw new Error(`Saga not found: ${name}`);
    }

    const saga = new SagaClass();
    return await saga.start(data, metadata);
  }

  getSaga<T extends BaseSaga>(name: string): T | null {
    const SagaClass = this.sagas.get(name);
    return SagaClass ? new SagaClass() as T : null;
  }

  listSagas(): string[] {
    return Array.from(this.sagas.keys());
  }

  isSagaRegistered(name: string): boolean {
    return this.sagas.has(name);
  }

  getSagaCount(): number {
    return this.sagas.size;
  }

  clearRegistry(): void {
    this.sagas.clear();
  }
}

// Global saga registry instance
export const sagaRegistry = SagaRegistry.getInstance();
