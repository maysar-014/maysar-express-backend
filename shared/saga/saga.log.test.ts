import { SagaStatus, SagaStepStatus } from './saga.log';

describe('saga log enums', () => {
  it('exposes all saga lifecycle states', () => {
    expect(SagaStatus.STARTED).toBe('STARTED');
    expect(SagaStatus.IN_PROGRESS).toBe('IN_PROGRESS');
    expect(SagaStatus.COMPLETED).toBe('COMPLETED');
    expect(SagaStatus.FAILED).toBe('FAILED');
    expect(SagaStatus.COMPENSATING).toBe('COMPENSATING');
    expect(SagaStatus.COMPENSATED).toBe('COMPENSATED');
  });

  it('exposes all saga step states', () => {
    expect(SagaStepStatus.PENDING).toBe('PENDING');
    expect(SagaStepStatus.STARTED).toBe('STARTED');
    expect(SagaStepStatus.COMPLETED).toBe('COMPLETED');
    expect(SagaStepStatus.FAILED).toBe('FAILED');
    expect(SagaStepStatus.COMPENSATED).toBe('COMPENSATED');
  });
});
